/** Reader-facing copy for the document screen (run through the humanizer). */

import { MAX_DOCUMENT_CHARS } from "@/lib/analysis/limits";
import type { PdfExtractErrorReason } from "@/lib/extract/pdf";
import type { RefusalReason } from "./prepare";

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
  outOfScope: {
    lease:
      "This looks like a lease, and Redline doesn’t read leases. It reads freelance agreements and general contracts only. Nothing has left this device.",
    "terms-of-service":
      "This looks like a terms of service, and Redline doesn’t read terms of service. It reads freelance agreements and general contracts only. Nothing has left this device.",
  },
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
  flags: {
    lede: (n: number) =>
      n === 1
        ? "This document has one flag. It quotes the sentence it’s about."
        : `This document has ${n} flags. They’re ranked by how far each clause reaches past the deal, and each one quotes the sentence it’s about.`,
    line: (n: number) => `Line ${n}`,
    lines: (a: number, b: number) => `Lines ${a} to ${b}`,
    label: (rank: number, total: number, where: string) =>
      `Flag ${rank} of ${total}, ${where.toLowerCase()}`,
    marginLabel: "Flags, in ranked order",
  },
  counterOffer: {
    heading: "Ask for this instead",
    copy: "Copy",
    copyLabel: (rank: number) => `Copy counter-offer ${rank}`,
    copied: "Copied.",
    failed: "Couldn’t copy. Select the text above and copy it yourself.",
  },
  questions: {
    heading: "Ask about this document",
    lede: "Redline answers from this document only, and quotes the sentence each answer comes from.",
    asked: "Questions you’ve asked",
    label: "Your question",
    ask: "Ask",
    asking: "Looking for the answer in the document.",
    declined: "The document doesn’t say. Redline only answers from what’s written in it.",
    remaining: (n: number) => (n === 1 ? "1 character left" : `${n} characters left`),
  },
  clean: {
    note: "No flags. Redline found no clause in this document that reaches past the job.",
    footnote: "Redline can miss a clause. No flags doesn’t mean the contract is fair, or that you should sign it.",
  },
};

/** The message for each document refused in the browser, before any request. */
export const refusal: Record<RefusalReason, string> = {
  empty: copy.emptyPaste,
  too_long: copy.tooLong,
  lease: copy.outOfScope.lease,
  "terms-of-service": copy.outOfScope["terms-of-service"],
};
