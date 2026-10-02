import { describe, expect, it } from "vitest";
import { documentLines, lineNumberAt } from "@/lib/document/lines";
import { placeFlags, segmentLine } from "@/lib/document/marks";
import { loadFixture } from "./support/stub-model";

const adhesion = loadFixture("adhesion-contract");
const lines = documentLines(adhesion.text);
const sentences = adhesion.sidecar.flags.map((f) => ({ sourceSentence: f.sentence }));

describe("placing flags on document lines", () => {
  it("puts each planted sentence on the line that holds it", () => {
    const marks = placeFlags(adhesion.text, lines, sentences);
    expect(marks).toHaveLength(sentences.length);
    for (const m of marks) {
      const line = lines.find((l) => l.kind === "text" && l.number === m.line);
      expect(line && line.kind === "text" && line.text.includes(sentences[m.index].sourceSentence)).toBe(true);
      expect(m.endLine).toBe(m.line);
    }
    expect(marks.map((m) => m.rank)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("leaves out a flag whose sentence isn't in the text", () => {
    const marks = placeFlags(adhesion.text, lines, [
      { sourceSentence: "A sentence that is nowhere in the contract." },
      sentences[0],
    ]);
    expect(marks.map((m) => [m.rank, m.index])).toEqual([[1, 1]]);
  });

  it("spans two lines when the sentence wraps", () => {
    const exact = sentences[2].sourceSentence;
    const wrapped = exact.replace("design or development", "design or\ndevelopment");
    const text = adhesion.text.replace(exact, wrapped);
    const wrappedLines = documentLines(text);
    const [m] = placeFlags(text, wrappedLines, [{ sourceSentence: wrapped }]);
    expect(m.endLine).toBe(m.line + 1);
    expect(lineNumberAt(wrappedLines, m.start)).toBe(m.line);
  });
});

describe("splitting a line around cited sentences", () => {
  it("rebuilds the line exactly and tags only the cited run", () => {
    const marks = placeFlags(adhesion.text, lines, sentences);
    const m = marks[0];
    const line = lines.find((l) => l.kind === "text" && l.number === m.line)!;
    if (line.kind !== "text") throw new Error("expected a text line");
    const segs = segmentLine(line.text, line.start, marks);
    expect(segs.map((x) => x.text).join("")).toBe(line.text);
    const cited = segs.filter((x) => x.ranks.length);
    expect(cited.map((x) => x.text)).toEqual([sentences[0].sourceSentence]);
    expect(cited[0].ranks).toEqual([m.rank]);
  });

  it("marks overlapping sentences with both ranks", () => {
    const ip = sentences[0].sourceSentence;
    const first = ip.slice(0, 80);
    const second = ip.slice(40, 120);
    const marks = placeFlags(adhesion.text, lines, [{ sourceSentence: first }, { sourceSentence: second }]);
    const line = lines.find((l) => l.kind === "text" && l.number === marks[0].line)!;
    if (line.kind !== "text") throw new Error("expected a text line");
    const segs = segmentLine(line.text, line.start, marks);
    expect(segs.find((x) => x.text === ip.slice(40, 80))?.ranks).toEqual([1, 2]);
    expect(segs.map((x) => x.text).join("")).toBe(line.text);
  });
});
