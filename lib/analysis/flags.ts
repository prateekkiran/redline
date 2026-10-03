/**
 * Turning the model's candidate flags into the flags Redline returns:
 * validate each candidate's shape, compute its severity from the overreach
 * assessment (ADR 0003, ./severity), drop candidates that don't reach past
 * the deal at all, verify each citation against the document (ADR 0001,
 * ./citations), then rank.
 */

import { verifyCitations, type CitationDrops } from "./citations";
import { findHedges } from "./hedges";
import { FLAG_CATEGORIES, type FlagCategory } from "./prompts";
import {
  isOverreach,
  readAssessment,
  severityFrom,
  type OverreachAssessment,
} from "./severity";

/** A candidate as the model returns it (FLAGS_SCHEMA). */
export type CandidateFlag = {
  category: FlagCategory;
  sourceSentence: string;
  overreach: string;
  reach: OverreachAssessment;
  description: string;
  counterOffer: string;
};

export type FlagDiagnostics = CitationDrops & {
  /** Candidates the model proposed. */
  proposed: number;
  /**
   * Candidates missing a field, with an unknown category, an incomplete
   * overreach assessment, or no description.
   */
  malformed: number;
  /**
   * Candidates the model itself assessed as reaching past the deal in no
   * way. Inside the deal by definition, so not flags (ADR 0003, 0005).
   */
  withinDeal: number;
  /** Returned flags whose description contains a hedge word (kept anyway). */
  hedged: number;
  /**
   * Flags that came back without a usable counter-offer and were sent to
   * the one follow-up call (./counter-offers).
   */
  counterOfferFollowUp: number;
  /** Flags dropped because the follow-up still gave no usable counter-offer. */
  missingCounterOffer: number;
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

const CATEGORY_SET = new Set<string>(FLAG_CATEGORIES);

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
  const reach = readAssessment(c.reach);
  if (!reach) return null;
  return {
    category: c.category as FlagCategory,
    sourceSentence: c.sourceSentence,
    overreach: typeof c.overreach === "string" ? c.overreach.trim() : "",
    reach,
    description: c.description.trim(),
    counterOffer: typeof c.counterOffer === "string" ? c.counterOffer.trim() : "",
  };
}

/**
 * From raw model candidates to ranked, verified flags. Ranked by severity,
 * descending; ties keep document order. A candidate with no reach at all is
 * dropped; anything with even one "some" is kept (borderline clauses are
 * flagged, ADR 0004). Hedged descriptions are counted, never dropped.
 */
export function buildFlags(
  documentText: string,
  rawCandidates: unknown[],
): { flags: RankedFlag[]; diagnostics: FlagDiagnostics } {
  let malformed = 0;
  let withinDeal = 0;
  const candidates = [];
  for (const raw of rawCandidates) {
    const c = readCandidate(raw);
    if (!c) {
      malformed++;
      continue;
    }
    if (!isOverreach(c.reach)) {
      withinDeal++;
      continue;
    }
    candidates.push({ ...c, severity: severityFrom(c.reach) });
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
      withinDeal,
      ...dropped,
      hedged: countHedged(flags),
      counterOfferFollowUp: 0,
      missingCounterOffer: 0,
      kept: flags.length,
    },
  };
}

/** How many flags have a hedge word in their description. */
export function countHedged(flags: { description: string }[]): number {
  return flags.filter((f) => findHedges(f.description).length > 0).length;
}
