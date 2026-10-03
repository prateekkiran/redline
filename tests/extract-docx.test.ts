import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeDocument } from "@/lib/analysis";
import {
  DOCX_MIME,
  DocxExtractError,
  extractDocxText,
  hasEnoughDocxText,
  isDocx,
  normalizeDocxText,
} from "@/lib/extract/docx";
import { createStubModel, FIXTURES, loadFixture } from "./support/stub-model";

const adhesion = loadFixture("adhesion-contract");

function readArrayBuffer(file: string): ArrayBuffer {
  const buf = readFileSync(file);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

const docxBytes = () => readArrayBuffer(path.join(FIXTURES, "docx/adhesion-contract.docx"));

/** Every sentence the sidecar says the document contains, verbatim. */
function sidecarSentences(): string[] {
  const { sidecar } = adhesion;
  return [
    ...sidecar.flags.map((f) => f.sentence),
    ...(sidecar.notFlagged ?? []),
    ...(sidecar.questions?.answerable.map((q) => q.supportingSentence) ?? []),
  ];
}

describe("extractDocxText on a DOCX-derived fixture", () => {
  it("keeps every sidecar sentence verbatim", async () => {
    const text = await extractDocxText(docxBytes());
    const sentences = sidecarSentences();
    expect(sentences.length).toBeGreaterThan(5);
    for (const sentence of sentences) expect(text).toContain(sentence);
  });

  it("gives back the plain-text original line for line", async () => {
    const text = await extractDocxText(docxBytes());
    expect(text).toBe(adhesion.text.replace(/\n{3,}/g, "\n\n").trim());
  });

  it("every flag analysis returns cites a sentence in the extracted text", async () => {
    const text = await extractDocxText(docxBytes());
    const client = createStubModel({ ...adhesion, text });
    const result = await analyzeDocument(text, [], { client });
    expect(result.flags.length).toBe(adhesion.sidecar.flags.length);
    for (const flag of result.flags) expect(text).toContain(flag.sourceSentence);
  });

  it("refuses bytes that are not a .docx", async () => {
    const bytes = new TextEncoder().encode(adhesion.text).buffer as ArrayBuffer;
    await expect(extractDocxText(bytes)).rejects.toMatchObject({ reason: "unreadable" });
    await expect(extractDocxText(bytes)).rejects.toBeInstanceOf(DocxExtractError);
  });
});

describe("normalizeDocxText", () => {
  it("keeps one paragraph per line and at most one blank line between", () => {
    // As mammoth writes it: every paragraph ends "\n\n"; the empty
    // paragraphs after the title are Word spacers.
    expect(normalizeDocxText("Title\n\n\n\n\n\n\n\nFirst.\n\nSecond.\n\n\n\nThird.\n\n")).toBe(
      "Title\n\nFirst.\nSecond.\n\nThird.",
    );
  });

  it("turns no-break spaces into spaces and trims trailing spaces", () => {
    expect(normalizeDocxText("Section\u00A01.1  \t\nPay 30\u202Fdays. \r\nEnd")).toBe(
      "Section 1.1\nPay 30 days.\nEnd",
    );
  });

  it("leaves everything inside a line alone", () => {
    const line = '  "Client"  — pays $1,000.00 (net-30);\tthen stops…';
    expect(normalizeDocxText(`x\n\n${line}\n\ny`)).toBe(`x\n${line}\ny`);
  });
});

describe("isDocx", () => {
  it("accepts by MIME type or by extension", () => {
    expect(isDocx({ name: "contract", type: DOCX_MIME })).toBe(true);
    expect(isDocx({ name: "Contract.DOCX", type: "" })).toBe(true);
    expect(isDocx({ name: "contract.docx", type: "application/octet-stream" })).toBe(true);
  });

  it("rejects PDFs, legacy .doc and text", () => {
    expect(isDocx({ name: "contract.pdf", type: "application/pdf" })).toBe(false);
    expect(isDocx({ name: "contract.doc", type: "application/msword" })).toBe(false);
    expect(isDocx({ name: "contract.docx.txt", type: "text/plain" })).toBe(false);
  });
});

describe("hasEnoughDocxText", () => {
  it("matches the PDF one-page minimum of 100 non-space characters", () => {
    expect(hasEnoughDocxText("a".repeat(99))).toBe(false);
    expect(hasEnoughDocxText(`${"a ".repeat(99)}a`)).toBe(true);
    expect(hasEnoughDocxText(" \n ".repeat(200))).toBe(false);
  });
});
