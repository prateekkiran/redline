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
  SUMMARY_SCHEMA,
  SUMMARY_SCHEMA_NAME,
  SUMMARY_SYSTEM,
  summaryUserMessage,
} from "./prompts";

export { MAX_DOCUMENT_CHARS, ModelCallError };
export type { FlagDiagnostics, ModelClient };

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
  redLine?: string;
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
  onDiagnostics?: (diagnostics: FlagDiagnostics) => void;
};

export async function analyzeDocument(
  documentText: string,
  redLines: string[],
  deps: AnalyzeDeps = {},
): Promise<AnalysisResult> {
  assertDocumentText(documentText);
  // Red lines only add flags (ADR 0006); ticket 09 wires them in.
  void redLines;

  const client = deps.client ?? createOpenRouterClient();
  // Two independent calls, run side by side: the summary describes without
  // judging, the flags call judges. Separate prompts keep each one honest
  // and let ticket 04 tune flag detection without touching the summary.
  const [summary, found] = await Promise.all([
    summarize(client, documentText),
    detectFlags(client, documentText),
  ]);
  deps.onDiagnostics?.(found.diagnostics);
  return { summary, flags: found.flags };
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
