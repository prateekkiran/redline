/**
 * Turning the model's candidate flags into the flags Redline returns:
 * validate each candidate's shape, compute its severity from the overreach
 * assessment (ADR 0003), verify its citation against the document
 * (ADR 0001, ./citations), then rank.
 */

import { verifyCitations, type CitationDrops } from "./citations";
import {
  FLAG_CATEGORIES,
  OVERREACH_KINDS,
  type FlagCategory,
  type OverreachKind,
} from "./prompts";

/** A candidate as the model returns it (FLAGS_SCHEMA). */
export type CandidateFlag = {
  category: FlagCategory;
  sourceSentence: string;
  overreach: string;
  reachesBeyondDeal: boolean;
  reaches: OverreachKind[];
  description: string;
  counterOffer: string;
};

export type FlagDiagnostics = CitationDrops & {
  /** Candidates the model proposed. */
  proposed: number;
  /** Candidates missing a field, with an unknown category, or no description. */
  malformed: number;
  /** Flags returned after every check. */
  kept: number;
};

export type RankedFlag = {
  sourceSentence: string;
  severity: number;
  description: string;
  counterOffer: string;
  category: FlagCategory;
  /** Where the sentence starts in the document; used for tie-breaks. */
  start: number;
};

/**
 * Severity as an ordering number, higher = more overreach. A clause that
 * reaches past the deal at all outranks one that doesn't; among those, each
 * distinct way it reaches adds weight. Category plays no part (ADR 0003).
 * Ticket 04 tunes the weights.
 */
export function severityOf(c: Pick<CandidateFlag, "reachesBeyondDeal" | "reaches">): number {
  const kinds = new Set(c.reaches).size;
  return (c.reachesBeyondDeal ? 100 : 0) + 10 * kinds;
}

const CATEGORY_SET = new Set<string>(FLAG_CATEGORIES);
const KIND_SET = new Set<string>(OVERREACH_KINDS);

/** The candidate list from the model's reply, or null if the reply has none. */
export function readCandidateList(payload: unknown): unknown[] | null {
  if (!payload || typeof payload !== "object") return null;
  const flags = (payload as { flags?: unknown }).flags;
  return Array.isArray(flags) ? flags : null;
}

function readCandidate(raw: unknown): CandidateFlag | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.category !== "string" || !CATEGORY_SET.has(c.category)) return null;
  if (typeof c.sourceSentence !== "string") return null;
  if (typeof c.description !== "string" || c.description.trim() === "") return null;
  if (typeof c.reachesBeyondDeal !== "boolean") return null;
  if (!Array.isArray(c.reaches)) return null;
  return {
    category: c.category as FlagCategory,
    sourceSentence: c.sourceSentence,
    overreach: typeof c.overreach === "string" ? c.overreach.trim() : "",
    reachesBeyondDeal: c.reachesBeyondDeal,
    // Unknown kinds are ignored rather than counted.
    reaches: c.reaches.filter((k): k is OverreachKind => typeof k === "string" && KIND_SET.has(k)),
    description: c.description.trim(),
    counterOffer: typeof c.counterOffer === "string" ? c.counterOffer.trim() : "",
  };
}

/**
 * From raw model candidates to ranked, verified flags. Ranked by severity,
 * descending; ties keep document order.
 */
export function buildFlags(
  documentText: string,
  rawCandidates: unknown[],
): { flags: RankedFlag[]; diagnostics: FlagDiagnostics } {
  let malformed = 0;
  const candidates = [];
  for (const raw of rawCandidates) {
    const c = readCandidate(raw);
    if (!c) {
      malformed++;
      continue;
    }
    candidates.push({ ...c, severity: severityOf(c) });
  }

  const { kept, dropped } = verifyCitations(documentText, candidates);

  const flags: RankedFlag[] = kept
    .map((c) => ({
      sourceSentence: c.sourceSentence,
      severity: c.severity,
      description: c.description,
      counterOffer: c.counterOffer,
      category: c.category,
      start: c.span.start,
    }))
    .sort((a, b) => b.severity - a.severity || a.start - b.start);

  return {
    flags,
    diagnostics: {
      proposed: rawCandidates.length,
      malformed,
      ...dropped,
      kept: flags.length,
    },
  };
}
