/**
 * Citation verification (ADR 0001). A flag may only quote a sentence that is
 * an exact substring of the document text. This file is the code that
 * enforces it; the prompt asking for verbatim quotes is not trusted.
 *
 * The rule, precisely:
 * - The sentence a flag carries is always `documentText.slice(start, end)`
 *   for a span found here. Model text is never returned as a citation.
 * - First, the model's quote (trimmed) is looked up as-is.
 * - If that fails, the quote and the document are compared under one narrow
 *   normalisation: curly/straight quote marks and apostrophes are treated as
 *   equal, dash variants are treated as equal, and any run of whitespace
 *   (spaces, tabs, newlines, non-breaking spaces) is treated as one space.
 *   Letters, digits, punctuation and case must match exactly. When that
 *   finds a match, the document's own span is returned, with its own quote
 *   marks and line breaks. This recovers a model that collapsed a PDF line
 *   break or straightened a curly quote; it never accepts a paraphrase.
 * - A quote shorter than MIN_SENTENCE_CHARS (after trimming) is dropped: a
 *   few words can't identify a clause.
 */

/** Shortest quote, in characters, that counts as a citation. */
export const MIN_SENTENCE_CHARS = 20;

export type Span = { start: number; end: number; text: string };

const QUOTES: Record<string, string> = {
  "‘": "'",
  "’": "'",
  "‚": "'",
  "‛": "'",
  "′": "'",
  "“": '"',
  "”": '"',
  "„": '"',
  "‟": '"',
  "″": '"',
};
const DASHES = /[‐‑‒–—―−]/;

function foldChar(ch: string): string {
  if (QUOTES[ch]) return QUOTES[ch];
  if (DASHES.test(ch)) return "-";
  return ch;
}

/**
 * The normalised form of `text`, plus, for every character of it, where it
 * starts and ends in the original.
 */
function normalise(text: string): { folded: string; from: number[]; to: number[] } {
  let folded = "";
  const from: number[] = [];
  const to: number[] = [];
  let i = 0;
  while (i < text.length) {
    if (/\s/.test(text[i])) {
      let j = i;
      while (j < text.length && /\s/.test(text[j])) j++;
      folded += " ";
      from.push(i);
      to.push(j);
      i = j;
    } else {
      folded += foldChar(text[i]);
      from.push(i);
      to.push(i + 1);
      i++;
    }
  }
  return { folded, from, to };
}

/**
 * Where `quote` sits in `documentText`, or null when it isn't there. The
 * returned `text` is always a slice of `documentText`.
 */
export function locateSentence(documentText: string, quote: string): Span | null {
  const wanted = quote.trim();
  if (wanted.length < MIN_SENTENCE_CHARS) return null;

  const exact = documentText.indexOf(wanted);
  if (exact !== -1) {
    return { start: exact, end: exact + wanted.length, text: wanted };
  }

  const doc = normalise(documentText);
  const q = normalise(wanted).folded;
  const at = doc.folded.indexOf(q);
  if (at === -1) return null;
  const start = doc.from[at];
  const end = doc.to[at + q.length - 1];
  const text = documentText.slice(start, end);
  if (text.trim().length < MIN_SENTENCE_CHARS) return null;
  return { start, end, text };
}

export type CitationDrops = {
  /** The quote isn't in the document, even allowing for quote marks and spacing. */
  notInDocument: number;
  /** Empty, or shorter than MIN_SENTENCE_CHARS. */
  tooShort: number;
  /** Same category and same span as a flag already kept. */
  duplicate: number;
};

type Citable = { category: string; sourceSentence: string; severity: number };

/**
 * Keeps only candidates whose quote is found in the document, replacing each
 * quote with the document's own span. Candidates citing the same span in the
 * same category collapse into one: the more severe, or the first on a tie.
 * Drops are silent here (counted, never shown to the reader).
 */
export function verifyCitations<T extends Citable>(
  documentText: string,
  candidates: T[],
): { kept: (T & { span: Span })[]; dropped: CitationDrops } {
  const dropped: CitationDrops = { notInDocument: 0, tooShort: 0, duplicate: 0 };
  const byKey = new Map<string, T & { span: Span }>();

  for (const candidate of candidates) {
    if (candidate.sourceSentence.trim().length < MIN_SENTENCE_CHARS) {
      dropped.tooShort++;
      continue;
    }
    const span = locateSentence(documentText, candidate.sourceSentence);
    if (!span) {
      dropped.notInDocument++;
      continue;
    }
    // Belt and braces: whatever leaves here is a slice of the document.
    if (documentText.slice(span.start, span.end) !== span.text) {
      dropped.notInDocument++;
      continue;
    }
    const key = `${candidate.category}\u0000${span.start}\u0000${span.end}`;
    const verified = { ...candidate, sourceSentence: span.text, span };
    const existing = byKey.get(key);
    if (existing) {
      dropped.duplicate++;
      if (verified.severity > existing.severity) byKey.set(key, verified);
      continue;
    }
    byKey.set(key, verified);
  }

  return { kept: [...byKey.values()], dropped };
}
