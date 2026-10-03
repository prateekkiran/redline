import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { copy } from "@/app/(app)/analyze/copy";
import { submitDocument } from "@/app/(app)/analyze/prepare";
import { DOCX_MIME, extractDocxText } from "@/lib/extract/docx";
import { fileKind, UPLOAD_ACCEPT } from "@/lib/extract/kind";

const FIXTURES = path.resolve(import.meta.dirname, "fixtures");

describe("fileKind", () => {
  it("sends a .pdf to the PDF reader, whatever its case", () => {
    expect(fileKind({ name: "deal.pdf", type: "application/pdf" })).toBe("pdf");
    expect(fileKind({ name: "DEAL.PDF", type: "" })).toBe("pdf");
  });

  it("sends a .docx to the Word reader, by extension or MIME type", () => {
    expect(fileKind({ name: "deal.docx", type: DOCX_MIME })).toBe("docx");
    expect(fileKind({ name: "Deal.DOCX", type: "" })).toBe("docx");
    expect(fileKind({ name: "deal", type: DOCX_MIME })).toBe("docx");
    expect(fileKind({ name: "deal", type: "application/pdf" })).toBe("pdf");
  });

  it("goes by the extension when name and MIME type disagree", () => {
    expect(fileKind({ name: "deal.pdf", type: DOCX_MIME })).toBe("pdf");
    expect(fileKind({ name: "deal.docx", type: "application/pdf" })).toBe("docx");
  });

  it("refuses everything else, including an old Word .doc and images", () => {
    for (const file of [
      { name: "deal.doc", type: "application/msword" },
      { name: "scan.jpg", type: "image/jpeg" },
      { name: "deal.txt", type: "text/plain" },
      { name: "deal.docx.zip", type: "application/zip" },
      { name: "deal", type: "" },
    ]) {
      expect(fileKind(file)).toBe("unsupported");
    }
  });

  it("lets the file picker offer both kinds", () => {
    expect(UPLOAD_ACCEPT.split(",")).toEqual([".pdf", "application/pdf", ".docx", DOCX_MIME]);
  });

  it("has a refusal for an unsupported file that names both kinds", () => {
    expect(copy.unsupported).toMatch(/PDF/);
    expect(copy.unsupported).toMatch(/\.docx/);
  });
});

describe("submitting a .docx", () => {
  it("posts only the extracted text and red lines, never the file", async () => {
    const buf = readFileSync(path.join(FIXTURES, "docx/adhesion-contract.docx"));
    const bytes = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    const text = await extractDocxText(bytes);

    const bodies: unknown[] = [];
    const outcome = await submitDocument(text, {
      redLines: ["No unpaid revisions"],
      doFetch: async (_url, init) => {
        expect(typeof init?.body).toBe("string");
        bodies.push(JSON.parse(init!.body as string));
        return new Response(JSON.stringify({ summary: "A deal.", flags: [] }), { status: 200 });
      },
    });

    expect(outcome).toMatchObject({ ok: true });
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toEqual({ documentText: text, redLines: ["No unpaid revisions"] });
    // The zip container (a .docx starts "PK") is not in what was sent.
    expect(JSON.stringify(bodies[0])).not.toMatch(/PK\u0003\u0004|word\/document\.xml/);
  });
});
