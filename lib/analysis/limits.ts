/**
 * Input limits shared by the browser (to refuse early) and the server (to
 * refuse for real). Pure, so client components can import it without
 * pulling in the model client.
 */

/**
 * The longest document Redline accepts, in characters of extracted text.
 * 120,000 characters is roughly 20,000 words, or 40-60 pages of contract:
 * well past any freelance agreement, and small enough that the whole text
 * fits in one model request with room left for the instructions and output.
 */
export const MAX_DOCUMENT_CHARS = 120_000;

export type DocumentTextProblem = "empty" | "too_long";

/** Why this text can't be analysed, or null when it can. */
export function checkDocumentText(text: string): DocumentTextProblem | null {
  if (text.trim() === "") return "empty";
  if (text.length > MAX_DOCUMENT_CHARS) return "too_long";
  return null;
}
