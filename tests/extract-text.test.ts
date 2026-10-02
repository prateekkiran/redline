import { describe, expect, it } from "vitest";
import { documentLines } from "@/lib/document/lines";
import { hasTextLayer, joinPages, type PdfTextItem } from "@/lib/extract/text";
import { loadFixture } from "./support/stub-model";

const adhesion = loadFixture("adhesion-contract");
const clean = loadFixture("clean-contract");

const LINE = 14; // baseline-to-baseline distance
const H = 12; // font size
const CHAR = 6; // glyph advance

/** Wraps text to `width` characters at spaces. */
function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line !== "" && line.length + 1 + word.length > width) {
      out.push(line);
      line = word;
    } else {
      line = line === "" ? word : `${line} ${word}`;
    }
  }
  if (line !== "") out.push(line);
  return out;
}

/**
 * Lays a plain-text document out the way pdf.js reports a typeset page:
 * each paragraph wrapped into lines, a blank line as extra vertical space.
 * `perWord` emits one item per word with no space items between them, as
 * some PDF producers do.
 */
function typeset(text: string, { width = 80, perWord = false } = {}): PdfTextItem[] {
  const items: PdfTextItem[] = [];
  let y = 800;
  for (const para of text.split("\n")) {
    if (para.trim() === "") {
      y -= LINE * 1.5;
      continue;
    }
    for (const line of wrap(para, width)) {
      if (perWord) {
        let x = 72;
        const words = line.split(" ");
        words.forEach((w, i) => {
          items.push({
            str: w,
            transform: [H, 0, 0, H, x, y],
            width: w.length * CHAR,
            height: H,
            hasEOL: i === words.length - 1,
          });
          x += (w.length + 1) * CHAR;
        });
      } else {
        items.push({ str: line, transform: [H, 0, 0, H, 72, y], width: line.length * CHAR, height: H, hasEOL: true });
      }
      y -= LINE;
    }
  }
  return items;
}

describe("joinPages", () => {
  for (const fixture of [adhesion, clean]) {
    it(`rebuilds ${fixture.name} exactly from wrapped lines`, () => {
      expect(joinPages([typeset(fixture.text)])).toBe(fixture.text.trim());
    });

    it(`rebuilds ${fixture.name} exactly from word-by-word items`, () => {
      expect(joinPages([typeset(fixture.text, { width: 64, perWord: true })])).toBe(
        fixture.text.trim(),
      );
    });
  }

  it("keeps every planted sentence intact as a substring", () => {
    const text = joinPages([typeset(adhesion.text, { width: 55 })]);
    for (const flag of adhesion.sidecar.flags) expect(text).toContain(flag.sentence);
  });

  it("is deterministic", () => {
    const items = typeset(adhesion.text, { perWord: true });
    expect(joinPages([items])).toBe(joinPages([items]));
  });

  it("separates pages with a blank line, in order", () => {
    const text = joinPages([
      typeset("1.1 The first page ends here."),
      [],
      typeset("1.2 The second page starts here."),
    ]);
    expect(text).toBe("1.1 The first page ends here.\n\n1.2 The second page starts here.");
  });

  it("joins a sentence cut by a page break", () => {
    const text = joinPages([
      typeset("2.4 Client will pay the undisputed"),
      typeset("amount on time.\n2.5 Late fees apply."),
    ]);
    expect(text).toBe("2.4 Client will pay the undisputed amount on time.\n2.5 Late fees apply.");
  });

  it("collapses runs of spaces within a line but keeps the words", () => {
    const text = joinPages([
      [{ str: "Client  will pay   the fee.", hasEOL: true }],
    ]);
    expect(text).toBe("Client will pay the fee.");
  });

  it("joins a word hyphenated across a line without adding a space", () => {
    const items: PdfTextItem[] = [
      { str: "The work is self-", transform: [H, 0, 0, H, 72, 700], width: 100, height: H, hasEOL: true },
      { str: "directed by Contractor.", transform: [H, 0, 0, H, 72, 686], width: 130, height: H, hasEOL: true },
    ];
    expect(joinPages([items])).toBe("The work is self-directed by Contractor.");
  });

  it("starts a new line at a clause number even without a gap", () => {
    const items: PdfTextItem[] = [
      { str: "Section 2 - Fees", transform: [H, 0, 0, H, 72, 700], width: 90, height: H, hasEOL: true },
      { str: "2.1 Client pays the fee.", transform: [H, 0, 0, H, 72, 686], width: 140, height: H, hasEOL: true },
    ];
    expect(joinPages([items])).toBe("Section 2 - Fees\n2.1 Client pays the fee.");
  });

  it("does not treat a wrapped line starting with an amount as a new clause", () => {
    const items: PdfTextItem[] = [
      { str: "Client will pay each invoice within", transform: [H, 0, 0, H, 72, 700], width: 200, height: H, hasEOL: true },
      { str: "30 days of receiving it.", transform: [H, 0, 0, H, 72, 686], width: 130, height: H, hasEOL: true },
    ];
    expect(joinPages([items])).toBe("Client will pay each invoice within 30 days of receiving it.");
  });

  it("returns an empty string for pages with no text", () => {
    expect(joinPages([[], [{ str: "", hasEOL: true }], [{ str: "   " }]])).toBe("");
  });
});

describe("hasTextLayer", () => {
  it("accepts a real contract", () => {
    expect(hasTextLayer(adhesion.text, 3)).toBe(true);
  });

  it("refuses a scan with no text", () => {
    expect(hasTextLayer("", 4)).toBe(false);
  });

  it("refuses a scan whose only text is page numbers", () => {
    expect(hasTextLayer("1\n\n2\n\n3\n\n4\n\n5\n\n6", 6)).toBe(false);
  });

  it("refuses a long PDF with only a few stray characters per page", () => {
    expect(hasTextLayer("Page footer text ".repeat(10), 20)).toBe(false);
  });
});

describe("documentLines", () => {
  it("numbers text lines from 1, skips blanks, and records offsets", () => {
    const text = "TITLE\n\n1.1 First.\n1.2 Second.";
    const lines = documentLines(text);
    const numbered = lines.filter((l) => l.kind === "text");
    expect(numbered.map((l) => l.number)).toEqual([1, 2, 3]);
    for (const l of numbered) expect(text.slice(l.start, l.start + l.text.length)).toBe(l.text);
    expect(lines[1].kind).toBe("blank");
  });
});
