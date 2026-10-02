/**
 * Hedging words in flag prose (ADR 0004). Flags state findings plainly; the
 * citation carries the humility. This is a check, not a filter: a flag is
 * never dropped or rewritten for hedging, because recall wins. The pipeline
 * counts hedged descriptions in its diagnostics, and the tests use this to
 * assert descriptions come out clean.
 *
 * "may" is always treated as a hedge, even in its permission sense ("Client
 * may terminate"): the prompt asks for "can" there, so a flag never reads as
 * doubtful. "May" followed by a day number is the month and is ignored.
 * Bare "could" is not a hedge ("every claim you could ever have"); "could
 * potentially" is caught by "potentially". Likewise "possible" counts only
 * as "it is possible", not in "every possible claim".
 */

const HEDGE_PATTERNS: RegExp[] = [
  /\bmay\b(?!\s+\d)/gi,
  /\bmight\b/gi,
  /\bpossibly\b/gi,
  /\b(?:it is|it's|is) possible\b/gi,
  /\bpotentially\b/gi,
  /\bperhaps\b/gi,
  /\blikely\b/gi,
  /\bprobably\b/gi,
  /\barguably\b/gi,
  /\b(?:seems|appears) to\b/gi,
];

/** Every hedge in `text`, lower-cased, in order of appearance. */
export function findHedges(text: string): string[] {
  const hits: { at: number; word: string }[] = [];
  for (const pattern of HEDGE_PATTERNS) {
    for (const m of text.matchAll(pattern)) {
      hits.push({ at: m.index ?? 0, word: m[0].toLowerCase() });
    }
  }
  return hits.sort((a, b) => a.at - b.at).map((h) => h.word);
}
