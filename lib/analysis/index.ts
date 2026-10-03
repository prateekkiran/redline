/**
 * The analysis module's public surface. Everything that asks a model about
 * a document goes through here, and every model call goes through the one
 * OpenRouter client in ./openrouter.
 */

import { checkDocumentText, MAX_DOCUMENT_CHARS } from "./limits";
import { createOpenRouterClient, ModelCallError, type ModelClient } from "./openrouter";
import { buildFlags, countHedged, readCandidateList, type FlagDiagnostics } from "./flags";
import { ensureCounterOffers } from "./counter-offers";
import { locateSentence } from "./citations";
import {
  buildRedLineHits,
  MAX_RED_LINE_CHARS,
  MAX_RED_LINES,
  mergeRanked,
  normalizeRedLines,
  RED_LINE_CATEGORY,
  unionRedLines,
  type RedLineDiagnostics,
  type RedLineHit,
} from "./red-lines";
import {
  ANSWER_SCHEMA,
  ANSWER_SCHEMA_NAME,
  ANSWER_SYSTEM,
  answerUserMessage,
  COUNTER_OFFERS_SCHEMA,
  COUNTER_OFFERS_SCHEMA_NAME,
  COUNTER_OFFERS_SYSTEM,
  counterOffersUserMessage,
  FLAGS_SCHEMA,
  FLAGS_SCHEMA_NAME,
  FLAGS_SYSTEM,
  flagsUserMessage,
  RED_LINE_FLAGS_SCHEMA,
  RED_LINE_FLAGS_SCHEMA_NAME,
  RED_LINE_FLAGS_SYSTEM,
  redLineFlagsUserMessage,
  SUMMARY_SCHEMA,
  SUMMARY_SCHEMA_NAME,
  SUMMARY_SYSTEM,
  summaryUserMessage,
} from "./prompts";

export {
  MAX_DOCUMENT_CHARS,
  MAX_RED_LINE_CHARS,
  MAX_RED_LINES,
  ModelCallError,
  normalizeRedLines,
  RED_LINE_CATEGORY,
};
export type { FlagDiagnostics, ModelClient, RedLineDiagnostics };

/**
 * One finding tied to exactly one clause and one cited source sentence
 * (ADR 0001). The shape is fixed here so later tickets extend it rather
 * than redefine it.
 */
export type Flag = {
  /** Verbatim substring of the document text. */
  sourceSentence: string;
  /** Ordering only: higher means more overreach (ADR 0003). No labels. */
  severity: number;
  description: string;
  counterOffer: string;
  category: string;
  /** "red-line" flags come from the user's own red lines (ADR 0006). */
  origin: "baseline" | "red-line";
  /** On a "red-line" flag: the red line that raised it. */
  redLine?: string;
  /**
   * Every red line that hit this flag's sentence. On a baseline flag the
   * red lines are attached here and nothing else about the flag changes
   * (ADR 0006); on a red-line flag it includes `redLine`.
   */
  matchedRedLines?: string[];
};

export type AnalysisResult = {
  summary: string;
  flags: Flag[];
};

export type AnalysisInputReason = "empty" | "too_long" | "question_empty" | "question_too_long";

/** The document text (or a question about it) can't be used as given. */
export class AnalysisInputError extends Error {
  readonly reason: AnalysisInputReason;
  constructor(reason: AnalysisInputReason, message: string) {
    super(message);
    this.name = "AnalysisInputError";
    this.reason = reason;
  }
}

/** The model answered, but not in the shape the analysis needs. */
export class AnalysisOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisOutputError";
  }
}

export type AnalyzeDeps = {
  client?: ModelClient;
  /**
   * Called once per analysis with how many candidate flags the model
   * proposed and why any were dropped. For scripts and logs; never shown
   * to the reader, and not part of the result.
   */
  onDiagnostics?: (diagnostics: FlagDiagnostics & { redLines?: RedLineDiagnostics }) => void;
};

/**
 * Summarises the document and flags its clauses. Red lines only add flags
 * (ADR 0006): the baseline flags are detected exactly as they would be with
 * no red lines (that call never sees them), then a separate call looks for
 * clauses meeting the user's red lines and its verified hits are added on
 * top. A hit on a sentence the baseline already flagged is attached to that
 * flag rather than added again. No baseline flag is ever removed or changed.
 */
export async function analyzeDocument(
  documentText: string,
  redLines: string[],
  deps: AnalyzeDeps = {},
): Promise<AnalysisResult> {
  assertDocumentText(documentText);
  const lines = normalizeRedLines(redLines);

  const client = deps.client ?? createOpenRouterClient();
  // Independent calls, run side by side: the summary describes without
  // judging, the flags call judges, and the red-line call (only when there
  // are red lines) looks for the user's own lines. Separate prompts keep
  // each one honest and keep the baseline blind to the red lines.
  const [summary, found, hits] = await Promise.all([
    summarize(client, documentText),
    detectFlags(client, documentText),
    lines.length > 0 ? detectRedLineHits(client, documentText, lines) : null,
  ]);

  if (!hits) {
    deps.onDiagnostics?.(found.diagnostics);
    return { summary, flags: found.flags };
  }
  const merged = await addRedLineFlags(client, documentText, found.flags, hits);
  deps.onDiagnostics?.({ ...found.diagnostics, redLines: merged.diagnostics });
  return { summary, flags: merged.flags };
}

async function detectRedLineHits(
  client: ModelClient,
  documentText: string,
  redLines: string[],
): Promise<ReturnType<typeof buildRedLineHits>> {
  const out = await client.completeJson<unknown>({
    system: RED_LINE_FLAGS_SYSTEM,
    user: redLineFlagsUserMessage(documentText, redLines),
    schemaName: RED_LINE_FLAGS_SCHEMA_NAME,
    schema: RED_LINE_FLAGS_SCHEMA,
  });
  const candidates = readCandidateList(out);
  // A missing list fails the analysis rather than quietly showing a result
  // with no red-line flags, which would read as "none of your red lines hit".
  if (!candidates) {
    throw new AnalysisOutputError("The model's red-line list was missing.");
  }
  return buildRedLineHits(documentText, redLines, candidates);
}

/**
 * Baseline flags plus red-line flags. Baseline flags keep their content and
 * relative order; a red-line hit on a baseline sentence only adds to that
 * flag's matchedRedLines. New red-line flags go through the same
 * counter-offer rule as baseline flags, then are ranked in by severity.
 */
async function addRedLineFlags(
  client: ModelClient,
  documentText: string,
  baseline: Flag[],
  found: ReturnType<typeof buildRedLineHits>,
): Promise<{ flags: Flag[]; diagnostics: RedLineDiagnostics }> {
  const flags = baseline.map((f) => ({ ...f }));
  const bySentence = new Map<string, Flag[]>();
  for (const f of flags) {
    const list = bySentence.get(f.sourceSentence);
    if (list) list.push(f);
    else bySentence.set(f.sourceSentence, [f]);
  }

  let matchedBaseline = 0;
  const fresh: RedLineHit[] = [];
  for (const hit of found.hits) {
    const same = bySentence.get(hit.sourceSentence);
    if (same) {
      matchedBaseline++;
      for (const f of same) f.matchedRedLines = unionRedLines(f.matchedRedLines, hit.matchedRedLines);
    } else {
      fresh.push(hit);
    }
  }

  const drafted = await ensureCounterOffers(fresh, (clauses) =>
    client.completeJson<unknown>({
      system: COUNTER_OFFERS_SYSTEM,
      user: counterOffersUserMessage(documentText, clauses),
      schemaName: COUNTER_OFFERS_SCHEMA_NAME,
      schema: COUNTER_OFFERS_SCHEMA,
    }),
  );
  const added: Flag[] = drafted.flags.map((h) => ({
    sourceSentence: h.sourceSentence,
    severity: h.severity,
    description: h.description,
    counterOffer: h.counterOffer,
    category: RED_LINE_CATEGORY,
    origin: "red-line",
    redLine: h.redLine,
    matchedRedLines: h.matchedRedLines,
  }));

  return {
    flags: mergeRanked(flags, added),
    diagnostics: {
      ...found.diagnostics,
      matchedBaseline,
      counterOfferFollowUp: drafted.followUp,
      missingCounterOffer: drafted.missing,
      added: added.length,
    },
  };
}

async function detectFlags(
  client: ModelClient,
  documentText: string,
): Promise<{ flags: Flag[]; diagnostics: FlagDiagnostics }> {
  const out = await client.completeJson<unknown>({
    system: FLAGS_SYSTEM,
    user: flagsUserMessage(documentText),
    schemaName: FLAGS_SCHEMA_NAME,
    schema: FLAGS_SCHEMA,
  });
  const candidates = readCandidateList(out);
  if (!candidates) {
    throw new AnalysisOutputError("The model's flag list was missing.");
  }
  const built = buildFlags(documentText, candidates);
  // Every flag ships with a counter-offer (ticket 06). Flags without one get
  // one follow-up call for just those clauses; any still without one are
  // dropped. Code never writes a counter-offer.
  const { flags, followUp, missing } = await ensureCounterOffers(built.flags, (clauses) =>
    client.completeJson<unknown>({
      system: COUNTER_OFFERS_SYSTEM,
      user: counterOffersUserMessage(documentText, clauses),
      schemaName: COUNTER_OFFERS_SCHEMA_NAME,
      schema: COUNTER_OFFERS_SCHEMA,
    }),
  );
  const diagnostics: FlagDiagnostics = {
    ...built.diagnostics,
    counterOfferFollowUp: followUp,
    missingCounterOffer: missing,
    hedged: countHedged(flags),
    kept: flags.length,
  };
  return {
    flags: flags.map((f) => ({
      sourceSentence: f.sourceSentence,
      severity: f.severity,
      description: f.description,
      counterOffer: f.counterOffer,
      category: f.category,
      origin: "baseline",
    })),
    diagnostics,
  };
}

async function summarize(client: ModelClient, documentText: string): Promise<string> {
  const out = await client.completeJson<unknown>({
    system: SUMMARY_SYSTEM,
    user: summaryUserMessage(documentText),
    schemaName: SUMMARY_SCHEMA_NAME,
    schema: SUMMARY_SCHEMA,
  });
  const summary =
    out && typeof out === "object" ? (out as { summary?: unknown }).summary : undefined;
  if (typeof summary !== "string" || summary.trim() === "") {
    throw new AnalysisOutputError("The model's summary was missing or empty.");
  }
  return summary.trim();
}

function assertDocumentText(documentText: string): void {
  const problem = checkDocumentText(documentText);
  if (problem === "empty") {
    throw new AnalysisInputError("empty", "The document has no text.");
  }
  if (problem === "too_long") {
    throw new AnalysisInputError(
      "too_long",
      `The document is ${documentText.length.toLocaleString("en-US")} characters; the limit is ${MAX_DOCUMENT_CHARS.toLocaleString("en-US")}.`,
    );
  }
}

/* ------------------------------------------------------------------ */
/* Q&A (ticket 07)                                                    */
/* ------------------------------------------------------------------ */

/** Longest question, in characters, that answerQuestion accepts. */
export const MAX_QUESTION_CHARS = 500;

/**
 * An answer always carries the verbatim document sentence it rests on, so
 * the reader can check it. `quote` is a slice of the document text, never
 * model text.
 */
export type QuestionAnswer = { answer: string; quote: string } | { declined: true };

export type AnswerDeps = { client?: ModelClient };

/**
 * Answers a question from the document's text alone, or declines.
 *
 * Grounding is enforced here, not trusted to the prompt: an answer is
 * returned only when the model says the document answers the question,
 * the answer is non-empty, and its supporting quote is found in the
 * document as an exact span (citations.ts). Anything else is a decline.
 */
export async function answerQuestion(
  documentText: string,
  question: string,
  deps: AnswerDeps = {},
): Promise<QuestionAnswer> {
  assertDocumentText(documentText);
  const asked = question.trim();
  if (asked === "") {
    throw new AnalysisInputError("question_empty", "The question is empty.");
  }
  if (asked.length > MAX_QUESTION_CHARS) {
    throw new AnalysisInputError(
      "question_too_long",
      `The question is ${asked.length} characters; the limit is ${MAX_QUESTION_CHARS}.`,
    );
  }

  const client = deps.client ?? createOpenRouterClient();
  const out = await client.completeJson<unknown>({
    system: ANSWER_SYSTEM,
    user: answerUserMessage(documentText, asked),
    schemaName: ANSWER_SCHEMA_NAME,
    schema: ANSWER_SCHEMA,
  });
  if (!out || typeof out !== "object" || Array.isArray(out)) {
    throw new AnalysisOutputError("The model's answer was missing.");
  }
  const { answerable, answer, supportingQuote } = out as Record<string, unknown>;
  if (typeof answerable !== "boolean") {
    throw new AnalysisOutputError("The model's answer didn't say whether the document answers it.");
  }
  if (!answerable) return { declined: true };
  if (typeof answer !== "string" || answer.trim() === "") return { declined: true };
  if (typeof supportingQuote !== "string") return { declined: true };
  const span = locateSentence(documentText, supportingQuote);
  if (!span || documentText.slice(span.start, span.end) !== span.text) {
    return { declined: true };
  }
  return { answer: answer.trim(), quote: span.text };
}
