/**
 * The user's own red lines (ticket 09). ADR 0006: a red line only ever adds
 * flags. The baseline flags are computed without seeing the red lines at
 * all; red lines run as a separate detection pass whose verified results are
 * merged in. Nothing here removes, reorders or rewrites a baseline flag: a
 * red line that hits a sentence the baseline already flagged is attached to
 * that flag (matchedRedLines) and the baseline flag is otherwise untouched.
 *
 * Red-line flags obey the same citation rule (ADR 0001, ./citations) and the
 * same counter-offer rule (./counter-offers) as baseline flags.
 */

import { verifyCitations, type CitationDrops } from "./citations";
import { readAssessment, severityFrom, type OverreachAssessment } from "./severity";

/** Most red lines a user can have, and the longest one, in characters. */
export const MAX_RED_LINES = 20;
export const MAX_RED_LINE_CHARS = 200;

/** The category every red-line flag carries (it is not one of the six). */
export const RED_LINE_CATEGORY = "red_line";

/**
 * Trims and collapses whitespace, drops empties, removes duplicates (case
 * insensitive, first spelling wins), cuts each to MAX_RED_LINE_CHARS and
 * keeps the first MAX_RED_LINES. Callers that take red lines from a person
 * (the API) reject over-long lists and lines before they get here; this is
 * the analysis module's own guard.
 */
export function normalizeRedLines(redLines: readonly unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of redLines) {
    if (typeof raw !== "string") continue;
    const line = raw.replace(/\s+/g, " ").trim().slice(0, MAX_RED_LINE_CHARS).trim();
    if (line === "") continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
    if (out.length === MAX_RED_LINES) break;
  }
  return out;
}

/** A candidate as the model returns it (RED_LINE_FLAGS_SCHEMA), validated. */
type RedLineCandidate = {
  /** The canonical red line (as the user wrote it), not the model's copy. */
  redLine: string;
  /** Position of the red line in the user's list; used for tie-breaks. */
  order: number;
  sourceSentence: string;
  reach: OverreachAssessment;
  description: string;
  counterOffer: string;
  severity: number;
  /** verifyCitations dedupes by category + span; one per red line. */
  category: string;
};

/** A verified red-line hit, one per cited sentence. */
export type RedLineHit = {
  sourceSentence: string;
  severity: number;
  description: string;
  counterOffer: string;
  /** The red line whose candidate supplied the description and severity. */
  redLine: string;
  /** Every red line that hit this sentence, in the user's order. */
  matchedRedLines: string[];
  start: number;
};

export type RedLineDiagnostics = CitationDrops & {
  proposed: number;
  /** Missing a field, no usable assessment, or naming no known red line. */
  malformed: number;
  /** Hits on a sentence the baseline already flagged; attached, not added. */
  matchedBaseline: number;
  counterOfferFollowUp: number;
  missingCounterOffer: number;
  /** Red-line flags added on top of the baseline. */
  added: number;
};

function readCandidate(
  raw: unknown,
  known: Map<string, { redLine: string; order: number }>,
): RedLineCandidate | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.redLine !== "string") return null;
  const match = known.get(c.redLine.replace(/\s+/g, " ").trim().toLowerCase());
  if (!match) return null;
  if (typeof c.sourceSentence !== "string") return null;
  if (typeof c.description !== "string" || c.description.trim() === "") return null;
  const reach = readAssessment(c.reach);
  if (!reach) return null;
  return {
    redLine: match.redLine,
    order: match.order,
    sourceSentence: c.sourceSentence,
    reach,
    description: c.description.trim(),
    counterOffer: typeof c.counterOffer === "string" ? c.counterOffer.trim() : "",
    // Same ordering number as baseline flags, from the same assessment, so
    // red-line flags rank against baseline flags on one scale. A red-line
    // hit is kept even with no reach: the user named it, so it is a flag.
    severity: severityFrom(reach),
    category: `${RED_LINE_CATEGORY}\u0000${match.order}`,
  };
}

/**
 * From the model's raw red-line candidates to verified hits, one per cited
 * sentence. Candidates must name one of the given red lines and quote a
 * sentence that is in the document; anything else is dropped and counted.
 */
export function buildRedLineHits(
  documentText: string,
  redLines: string[],
  rawCandidates: unknown[],
): { hits: RedLineHit[]; diagnostics: Omit<RedLineDiagnostics, "matchedBaseline" | "counterOfferFollowUp" | "missingCounterOffer" | "added"> } {
  const known = new Map(
    redLines.map((redLine, order) => [redLine.toLowerCase(), { redLine, order }] as const),
  );
  let malformed = 0;
  const candidates: RedLineCandidate[] = [];
  for (const raw of rawCandidates) {
    const c = readCandidate(raw, known);
    if (c) candidates.push(c);
    else malformed++;
  }

  const { kept, dropped } = verifyCitations(documentText, candidates);

  // One hit per sentence: the most severe candidate leads (first red line on
  // a tie), and every red line that hit the sentence is listed.
  const bySpan = new Map<string, (typeof kept)[number][]>();
  for (const c of kept) {
    const key = `${c.span.start}\u0000${c.span.end}`;
    const group = bySpan.get(key);
    if (group) group.push(c);
    else bySpan.set(key, [c]);
  }
  const hits: RedLineHit[] = [...bySpan.values()].map((group) => {
    const sorted = [...group].sort((a, b) => b.severity - a.severity || a.order - b.order);
    const lead = sorted[0];
    return {
      sourceSentence: lead.span.text,
      severity: lead.severity,
      description: lead.description,
      counterOffer: lead.counterOffer,
      redLine: lead.redLine,
      matchedRedLines: [...group].sort((a, b) => a.order - b.order).map((c) => c.redLine),
      start: lead.span.start,
    };
  });
  hits.sort((a, b) => b.severity - a.severity || a.start - b.start);

  return {
    hits,
    diagnostics: { proposed: rawCandidates.length, malformed, ...dropped },
  };
}

/** Red lines in `extra` not already in `existing`, appended in order. */
export function unionRedLines(existing: string[] | undefined, extra: string[]): string[] {
  const out = [...(existing ?? [])];
  for (const r of extra) if (!out.includes(r)) out.push(r);
  return out;
}

/**
 * Inserts red-line flags into the ranked baseline list without moving any
 * baseline flag relative to another: each added flag goes after every
 * baseline flag at least as severe. Both inputs are already ranked.
 */
export function mergeRanked<B extends { severity: number }, R extends { severity: number }>(
  baseline: B[],
  added: R[],
): (B | R)[] {
  const out: (B | R)[] = [];
  let i = 0;
  for (const r of added) {
    while (i < baseline.length && baseline[i].severity >= r.severity) out.push(baseline[i++]);
    out.push(r);
  }
  while (i < baseline.length) out.push(baseline[i++]);
  return out;
}
