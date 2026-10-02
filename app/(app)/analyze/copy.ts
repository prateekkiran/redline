/** Reader-facing copy for the document screen (run through the humanizer). */

import { MAX_DOCUMENT_CHARS } from "@/lib/analysis/limits";
import type { PdfExtractErrorReason } from "@/lib/extract/pdf";

const limit = MAX_DOCUMENT_CHARS.toLocaleString("en-US");

export const copy = {
  heading: "Read a contract before you sign it",
  lede:
    "Paste the text of a freelance agreement or general contract, or upload a PDF you can select text in. Redline quotes back each sentence that reaches past the job you’re being hired for, ranks them, and drafts a counter-offer for each.",
  pasteLabel: "Paste the contract’s text",
  pasteButton: "Read this contract",
  uploadLabel: "Or upload a PDF",
  uploadButton: "Choose a PDF",
  uploadNote: "Use a PDF you can select text in. Redline can’t read scans or photos of pages.",
  extracting: (name: string) => `Pulling the text out of ${name}. The PDF stays on this device.`,
  analyzingHead: "Reading the contract",
  analyzingBody: "Keep this page open.",
  analyzingBodyPdf: "Keep this page open. The PDF stayed on this device; only its text was sent.",
  emptyPaste: "Paste the contract’s text first.",
  tooLong: `This is longer than Redline can read at once. The limit is ${limit} characters, about 40 pages. Paste a shorter document.`,
  pdf: {
    not_pdf: "That isn’t a PDF. Upload a PDF, or paste the text instead.",
    password:
      "This PDF is password-protected. Remove the password and upload it again, or paste the text.",
    unreadable: "This PDF couldn’t be opened. It may be damaged. Export it again, or paste the text.",
    no_text:
      "This PDF has no text Redline can read. It looks like a scan or a photo of pages. Redline doesn’t read scans, because a quote taken from a misread page can’t be trusted. Upload a PDF saved from the original, or paste the text.",
  } satisfies Record<PdfExtractErrorReason, string>,
  summaryHeading: "Summary",
  documentHeading: "The document",
  fromPdf: (name: string, pages: number) => `From ${name}, ${pages} ${pages === 1 ? "page" : "pages"}`,
  pasted: "Pasted text",
  reset: "Read another document",
  footer: "Redline isn’t a lawyer, and nothing here is legal advice.",
};
