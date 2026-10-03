/**
 * Which extractor a picked file goes to. Pure, so it is tested without a
 * browser, and free of pdf.js and mammoth, so the analyze screen can call it
 * before either library is loaded.
 *
 * The extension decides first, because that is what the reader sees and
 * picked; the MIME type is the fallback for a file whose name has neither
 * extension. An old Word .doc, a scan saved as an image, or anything else is
 * "unsupported" and refused before any extraction.
 */

import { DOCX_MIME } from "./docx-text";

export type FileKind = "pdf" | "docx" | "unsupported";

export const PDF_MIME = "application/pdf";

/** The file input's `accept` value: both extensions and both MIME types. */
export const UPLOAD_ACCEPT = `.pdf,${PDF_MIME},.docx,${DOCX_MIME}`;

export function fileKind(file: { name: string; type: string }): FileKind {
  if (/\.pdf$/i.test(file.name)) return "pdf";
  if (/\.docx$/i.test(file.name)) return "docx";
  if (file.type === PDF_MIME) return "pdf";
  if (file.type === DOCX_MIME) return "docx";
  return "unsupported";
}
