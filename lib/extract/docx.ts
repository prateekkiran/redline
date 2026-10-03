/**
 * Reads the text out of a Word .docx in the browser. The file never leaves
 * the device: mammoth unzips it here and only the normalised text is
 * returned. Bundlers pick mammoth's browser build through its package.json
 * "browser" field; under Node (tests) the same call works on the buffer.
 */

import { hasEnoughDocxText, isDocx, normalizeDocxText } from "./docx-text";

export { DOCX_MIME, hasEnoughDocxText, isDocx, normalizeDocxText } from "./docx-text";

export type DocxExtractErrorReason = "not_docx" | "unreadable" | "no_text";

export class DocxExtractError extends Error {
  readonly reason: DocxExtractErrorReason;
  constructor(reason: DocxExtractErrorReason, message: string) {
    super(message);
    this.name = "DocxExtractError";
    this.reason = reason;
  }
}

/** Extracts and normalises the text of a .docx held in memory. */
export async function extractDocxText(data: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const extractRawText = mammoth.extractRawText ?? mammoth.default.extractRawText;
  let raw: string;
  try {
    // The browser build reads `arrayBuffer`, the Node build `buffer`; JSZip
    // underneath accepts an ArrayBuffer for either, so pass both.
    const input = { arrayBuffer: data, buffer: data } as unknown as { arrayBuffer: ArrayBuffer };
    raw = (await extractRawText(input)).value;
  } catch {
    throw new DocxExtractError("unreadable", "could not be parsed");
  }
  const text = normalizeDocxText(raw);
  if (!hasEnoughDocxText(text)) {
    throw new DocxExtractError("no_text", "no text");
  }
  return text;
}

/** Extracts the text of a picked .docx file. */
export async function extractDocxFile(file: File): Promise<string> {
  if (!isDocx(file)) throw new DocxExtractError("not_docx", "not a .docx");
  return extractDocxText(await file.arrayBuffer());
}
