import { describe, expect, it } from "vitest";
import {
  deriveTitle,
  fromDocumentRow,
  fromLibraryRow,
  LibraryError,
  readSavedFlags,
  readSavedRedLines,
  toInsertRow,
  type DocumentRow,
} from "@/lib/library/repository";
import { savedFixture } from "./support/saved-analysis";

const adhesion = savedFixture("adhesion-contract");

function rowFor(overrides: Partial<DocumentRow> = {}): DocumentRow {
  const insert = toInsertRow({
    title: deriveTitle(adhesion.documentText),
    documentText: adhesion.documentText,
    result: adhesion.result,
    redLines: ["No unpaid revisions"],
  });
  // What Postgres hands back: jsonb comes back as parsed JSON.
  return {
    id: "6f1c1d0e-1a2b-4c3d-8e9f-0a1b2c3d4e5f",
    created_at: "2026-10-03T10:00:00+00:00",
    ...JSON.parse(JSON.stringify(insert)),
    ...overrides,
  };
}

describe("deriveTitle", () => {
  it("uses the first non-empty line, trimmed", () => {
    expect(deriveTitle("\n\n   FREELANCE SERVICES AGREEMENT  \nSecond line")).toBe(
      "FREELANCE SERVICES AGREEMENT",
    );
  });

  it("collapses runs of whitespace inside the line", () => {
    expect(deriveTitle("Design\t\tagreement   2026")).toBe("Design agreement 2026");
  });

  it("caps long lines at 80 characters", () => {
    const title = deriveTitle("x".repeat(200));
    expect(title).toHaveLength(80);
    expect(title.endsWith("…")).toBe(true);
  });

  it("keeps an 80-character line whole", () => {
    expect(deriveTitle("y".repeat(80))).toBe("y".repeat(80));
  });

  it("falls back when the text has no words", () => {
    expect(deriveTitle(" \n\t\n")).toBe("Untitled document");
  });

  it("titles the adhesion fixture from its heading", () => {
    const first = adhesion.documentText.split("\n").find((l) => l.trim())!.trim();
    expect(deriveTitle(adhesion.documentText)).toBe(first.slice(0, 80));
  });
});

describe("toInsertRow", () => {
  it("maps an analysis to the row's columns and stores no file", () => {
    const row = toInsertRow({
      title: "  Contract  ",
      documentText: adhesion.documentText,
      result: adhesion.result,
      redLines: ["a"],
    });
    expect(Object.keys(row).sort()).toEqual(
      ["document_text", "flags", "red_lines", "summary", "title"].sort(),
    );
    expect(row.title).toBe("Contract");
    expect(row.flags).toEqual(adhesion.result.flags);
  });

  it("rejects an empty title or empty text", () => {
    const base = { documentText: "text", result: adhesion.result, redLines: [] };
    expect(() => toInsertRow({ ...base, title: "  " })).toThrow(LibraryError);
    expect(() => toInsertRow({ ...base, title: "t", documentText: " " })).toThrow(LibraryError);
  });
});

describe("fromDocumentRow", () => {
  it("round-trips an analysis through the row shape", () => {
    const saved = fromDocumentRow(rowFor());
    expect(saved.documentText).toBe(adhesion.documentText);
    expect(saved.result).toEqual(adhesion.result);
    expect(saved.redLines).toEqual(["No unpaid revisions"]);
    expect(saved.createdAt).toBe("2026-10-03T10:00:00+00:00");
  });

  it("keeps a red-line flag's red line", () => {
    const flag = { ...adhesion.result.flags[0], origin: "red-line", redLine: "No IP grabs" };
    const saved = fromDocumentRow(rowFor({ flags: [flag] }));
    expect(saved.result.flags[0]).toEqual(flag);
  });

  it("drops unknown keys from stored flags", () => {
    const saved = fromDocumentRow(rowFor({ flags: [{ ...adhesion.result.flags[0], extra: 1 }] }));
    expect(saved.result.flags[0]).toEqual(adhesion.result.flags[0]);
  });
});

describe("readSavedFlags", () => {
  const text = adhesion.documentText;
  const good = adhesion.result.flags[0];

  it("rejects a stored value that isn't a list", () => {
    expect(() => readSavedFlags({}, text)).toThrow(/not a list/);
  });

  it.each([
    ["no source sentence", { ...good, sourceSentence: "" }],
    ["non-numeric severity", { ...good, severity: "high" }],
    ["unknown origin", { ...good, origin: "model" }],
    ["missing counter-offer", { ...good, counterOffer: undefined }],
    ["non-text red line", { ...good, redLine: 3 }],
  ])("rejects a flag with %s", (_, bad) => {
    expect(() => readSavedFlags([good, bad], text)).toThrow(/Stored flag 1 is malformed/);
  });

  it("rejects a flag whose sentence isn't in the stored text", () => {
    expect(() =>
      readSavedFlags([{ ...good, sourceSentence: "Client owns the moon." }], text),
    ).toThrow(/not in the document/);
  });

  it("accepts an empty list (a clean document)", () => {
    expect(readSavedFlags([], text)).toEqual([]);
  });
});

describe("readSavedRedLines", () => {
  it("accepts a list of text and rejects anything else", () => {
    expect(readSavedRedLines(["a", "b"])).toEqual(["a", "b"]);
    expect(() => readSavedRedLines([1])).toThrow(LibraryError);
    expect(() => readSavedRedLines(null)).toThrow(LibraryError);
  });
});

describe("fromLibraryRow", () => {
  it("maps a list row", () => {
    expect(
      fromLibraryRow({ id: "i", title: "t", created_at: "c", flag_count: 6 }),
    ).toEqual({ id: "i", title: "t", createdAt: "c", flagCount: 6 });
  });
});
