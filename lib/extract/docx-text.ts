/**
 * Turns the raw text mammoth reads out of a .docx into document text. Pure
 * and deterministic, like the PDF joiner in `./text`: the sentences a flag
 * later quotes must be exact substrings of what was sent, so this only
 * touches whitespace between lines and never rewords, reorders or drops
 * anything inside a sentence.
 *
 * Mammoth ends every paragraph with "\n\n", so an empty paragraph (Word's
 * usual spacer) shows up as an extra "\n\n". The result keeps one paragraph
 * per line, an empty paragraph as a blank line, and never more than one
 * blank line in a row.
 */

/** No-break spaces Word inserts (U+00A0, U+202F narrow, U+2007 figure). */
const NO_BREAK_SPACE = /[\u00A0\u202F\u2007]/g;

export function normalizeDocxText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(NO_BREAK_SPACE, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .split("\n\n")
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Whether a picked file is a Word .docx, by MIME type or extension. */
export function isDocx(file: { name: string; type: string }): boolean {
  return file.type === DOCX_MIME || /\.docx$/i.test(file.name);
}

/**
 * Whether extracted text is enough to analyse. A .docx has no pages, so this
 * is the PDF check (`hasTextLayer`) for a one-page document: at least 100
 * non-space characters. A Word file holding only a pasted scan of a contract
 * comes out near-empty and is refused; Redline does no OCR (ADR 0001).
 */
export function hasEnoughDocxText(text: string): boolean {
  return text.replace(/\s/g, "").length >= 100;
}
