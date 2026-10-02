/**
 * Reads the text out of a PDF in the browser. The file never leaves the
 * device: pdf.js parses it here, in a worker, and only the joined text is
 * returned. Browser-only; import it from client components and call it from
 * event handlers.
 */

import { hasTextLayer, joinPages, type PdfTextItem } from "./text";

export type PdfExtractErrorReason = "not_pdf" | "password" | "unreadable" | "no_text";

export class PdfExtractError extends Error {
  readonly reason: PdfExtractErrorReason;
  constructor(reason: PdfExtractErrorReason, message: string) {
    super(message);
    this.name = "PdfExtractError";
    this.reason = reason;
  }
}

export type ExtractedPdf = { text: string; pageCount: number };

type PdfJs = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfJs> | undefined;

function loadPdfJs(): Promise<PdfJs> {
  pdfjsPromise ??= import("pdfjs-dist").then((pdfjs) => {
    if (!pdfjs.GlobalWorkerOptions.workerPort) {
      // `new Worker(new URL(..., import.meta.url))` is the form Turbopack
      // and webpack both bundle as a separate worker chunk.
      pdfjs.GlobalWorkerOptions.workerPort = new Worker(
        new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
        { type: "module" },
      );
    }
    return pdfjs;
  });
  return pdfjsPromise;
}

export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export async function extractPdfText(file: File): Promise<ExtractedPdf> {
  if (!isPdfFile(file)) {
    throw new PdfExtractError("not_pdf", "not a PDF");
  }
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());

  const task = pdfjs.getDocument({ data });
  let doc: Awaited<typeof task.promise>;
  try {
    doc = await task.promise;
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "PasswordException") {
      throw new PdfExtractError("password", "password protected");
    }
    throw new PdfExtractError("unreadable", "could not be parsed");
  }

  try {
    const pages: PdfTextItem[][] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const items: PdfTextItem[] = [];
      for (const item of content.items) if ("str" in item) items.push(item);
      pages.push(items);
      page.cleanup();
    }
    const text = joinPages(pages);
    if (!hasTextLayer(text, doc.numPages)) {
      throw new PdfExtractError("no_text", "no text layer");
    }
    return { text, pageCount: doc.numPages };
  } finally {
    void task.destroy();
  }
}
