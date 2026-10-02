/**
 * The analysis module's public surface. Everything that asks a model about
 * a document goes through here, and every model call goes through the one
 * OpenRouter client in ./openrouter.
 */

import { checkDocumentText, MAX_DOCUMENT_CHARS } from "./limits";
import { createOpenRouterClient, ModelCallError, type ModelClient } from "./openrouter";
import { SUMMARY_SCHEMA, SUMMARY_SCHEMA_NAME, SUMMARY_SYSTEM, summaryUserMessage } from "./prompts";

export { MAX_DOCUMENT_CHARS, ModelCallError };
export type { ModelClient };

/**
 * One finding tied to exactly one clause and one cited source sentence
 * (ADR 0001). Ticket 03 starts producing these; the shape is fixed here so
 * later tickets extend it rather than redefine it.
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

/** The document text can't be analysed as given (empty, too long). */
export class AnalysisInputError extends Error {
  readonly reason: "empty" | "too_long";
  constructor(reason: "empty" | "too_long", message: string) {
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

export type AnalyzeDeps = { client?: ModelClient };

export async function analyzeDocument(
  documentText: string,
  redLines: string[],
  deps: AnalyzeDeps = {},
): Promise<AnalysisResult> {
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
  // Red lines only add flags (ADR 0006); flags arrive in ticket 03.
  void redLines;

  const client = deps.client ?? createOpenRouterClient();
  const summary = await summarize(client, documentText);
  return { summary, flags: [] };
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
