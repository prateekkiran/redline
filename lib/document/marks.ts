/**
 * Where each flag's cited sentence sits in the document text, and how a
 * line of text splits around those sentences for display. Pure, so the
 * results view and its tests agree on positions.
 */

import { lineNumberAt, type DocumentLine } from "./lines";

export type Mark = {
  /** 1-based rank: the flag's position in the ranked list. */
  rank: number;
  /** Index into the ranked flag list this mark came from. */
  index: number;
  start: number;
  end: number;
  /** Line the sentence starts on, and the line it ends on. */
  line: number;
  endLine: number;
};

/**
 * Locates each flag's sentence in the text. A flag whose sentence isn't in
 * the text is left out rather than shown without its source (ADR 0001);
 * the analysis module already guarantees this never happens.
 */
export function placeFlags(
  documentText: string,
  lines: DocumentLine[],
  flags: { sourceSentence: string }[],
): Mark[] {
  const marks: Mark[] = [];
  flags.forEach((flag, index) => {
    const sentence = flag.sourceSentence;
    const start = sentence ? documentText.indexOf(sentence) : -1;
    if (start === -1) return;
    const end = start + sentence.length;
    const line = lineNumberAt(lines, start);
    const endLine = lineNumberAt(lines, Math.max(start, end - 1));
    if (line === null || endLine === null) return;
    marks.push({ rank: marks.length + 1, index, start, end, line, endLine });
  });
  return marks;
}

export type Segment = { start: number; end: number; text: string; ranks: number[] };

/**
 * Splits one line into runs of text, each tagged with the ranks of the
 * flags whose sentence covers it (empty for plain text). Overlapping
 * sentences produce runs carrying more than one rank.
 */
export function segmentLine(text: string, lineStart: number, marks: Mark[]): Segment[] {
  const lineEnd = lineStart + text.length;
  const inLine = marks.filter((m) => m.start < lineEnd && m.end > lineStart);
  const cuts = new Set<number>([lineStart, lineEnd]);
  for (const m of inLine) {
    cuts.add(Math.max(m.start, lineStart));
    cuts.add(Math.min(m.end, lineEnd));
  }
  const points = [...cuts].sort((a, b) => a - b);
  const out: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    if (end <= start) continue;
    const ranks = inLine
      .filter((m) => m.start <= start && m.end >= end)
      .map((m) => m.rank)
      .sort((a, b) => a - b);
    out.push({ start, end, text: text.slice(start - lineStart, end - lineStart), ranks });
  }
  return out;
}
