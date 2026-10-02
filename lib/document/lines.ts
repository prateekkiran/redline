/**
 * Splits document text into numbered lines for display. Pure, so the
 * results view and later citation code agree on what "line 12" means.
 * Blank lines take no number; they are kept as spacing.
 */

export type DocumentLine =
  | { kind: "text"; number: number; text: string; start: number }
  | { kind: "blank"; start: number };

export function documentLines(text: string): DocumentLine[] {
  const out: DocumentLine[] = [];
  let number = 0;
  let start = 0;
  for (const raw of text.split("\n")) {
    if (raw.trim() === "") out.push({ kind: "blank", start });
    else out.push({ kind: "text", number: ++number, text: raw, start });
    start += raw.length + 1;
  }
  return out;
}
