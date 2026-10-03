import { describe, expect, it } from "vitest";
import {
  AnalysisInputError,
  AnalysisOutputError,
  analyzeDocument,
  MAX_DOCUMENT_CHARS,
  ModelCallError,
} from "@/lib/analysis";
import { createStubModel, loadFixture } from "./support/stub-model";

const adhesion = loadFixture("adhesion-contract");
const clean = loadFixture("clean-contract");

describe("analyzeDocument summary", () => {
  for (const fixture of [adhesion, clean]) {
    it(`returns a non-empty summary and a flags array for ${fixture.name}`, async () => {
      const client = createStubModel(fixture);
      const result = await analyzeDocument(fixture.text, [], { client });
      expect(typeof result.summary).toBe("string");
      expect(result.summary.trim().length).toBeGreaterThan(0);
      expect(Array.isArray(result.flags)).toBe(true);
    });
  }

  it("makes one model call for the summary and one for the flags", async () => {
    const client = createStubModel(adhesion);
    await analyzeDocument(adhesion.text, [], { client });
    expect(client.calls.map((c) => c.schemaName).sort()).toEqual([
      "document_flags",
      "document_summary",
    ]);
  });

  it("sends the document text to the model", async () => {
    const client = createStubModel(adhesion);
    await analyzeDocument(adhesion.text, [], { client });
    expect(client.calls[0].user).toContain(adhesion.sidecar.flags[0].sentence);
  });

  it("adds exactly one red-line call when there are red lines", async () => {
    const client = createStubModel(clean);
    const result = await analyzeDocument(clean.text, ["No non-competes"], { client });
    expect(result.summary.length).toBeGreaterThan(0);
    expect(client.calls.map((c) => c.schemaName).sort()).toEqual([
      "document_flags",
      "document_summary",
      "red_line_flags",
    ]);
  });

  it("trims whitespace around the model's summary", async () => {
    const client = createStubModel(clean, {
      override: { document_summary: () => ({ summary: "  A design agreement.\n" }) },
    });
    const result = await analyzeDocument(clean.text, [], { client });
    expect(result.summary).toBe("A design agreement.");
  });
});

describe("analyzeDocument input guards", () => {
  for (const text of ["", "   ", "\n\t \n"]) {
    it(`rejects ${JSON.stringify(text)} without calling the model`, async () => {
      const client = createStubModel(clean);
      const err = await analyzeDocument(text, [], { client }).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(AnalysisInputError);
      expect((err as AnalysisInputError).reason).toBe("empty");
      expect(client.calls).toHaveLength(0);
    });
  }

  it("rejects a document over the length limit without calling the model", async () => {
    const client = createStubModel(adhesion);
    const long = adhesion.text.repeat(Math.ceil((MAX_DOCUMENT_CHARS + 1) / adhesion.text.length));
    const err = await analyzeDocument(long, [], { client }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AnalysisInputError);
    expect((err as AnalysisInputError).reason).toBe("too_long");
    expect(client.calls).toHaveLength(0);
  });

  it("accepts a document exactly at the limit", async () => {
    const client = createStubModel(adhesion);
    const atLimit = adhesion.text.repeat(20).slice(0, MAX_DOCUMENT_CHARS);
    expect(atLimit.length).toBe(MAX_DOCUMENT_CHARS);
    await expect(analyzeDocument(atLimit, [], { client })).resolves.toHaveProperty("summary");
  });
});

describe("analyzeDocument malformed model output", () => {
  const bad: [string, unknown][] = [
    ["no summary field", { text: "A contract." }],
    ["an empty summary", { summary: "   " }],
    ["a non-string summary", { summary: 42 }],
    ["null", null],
    ["a bare string", "A contract."],
  ];
  for (const [label, payload] of bad) {
    it(`throws AnalysisOutputError on ${label}`, async () => {
      const client = createStubModel(adhesion, { override: { document_summary: () => payload } });
      await expect(analyzeDocument(adhesion.text, [], { client })).rejects.toBeInstanceOf(
        AnalysisOutputError,
      );
    });
  }

  it("lets a model call failure through as ModelCallError", async () => {
    const client = createStubModel(adhesion, {
      override: {
        document_summary: () => {
          throw new ModelCallError("OpenRouter returned 404: no endpoints", 404);
        },
      },
    });
    await expect(analyzeDocument(adhesion.text, [], { client })).rejects.toBeInstanceOf(
      ModelCallError,
    );
  });
});
