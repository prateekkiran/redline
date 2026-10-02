/**
 * The severity rule (ADR 0003): a flag's severity is how far its clause
 * reaches beyond the deal the contract is for. Nothing else feeds it. The
 * clause's category tells the model where to look; it is not an input here,
 * so it cannot change the score.
 *
 * The model fills in an overreach assessment: for each of seven ways a
 * clause can reach past the deal, how far it goes ("none", "some", "far").
 * The dimensions are written so they apply to every category alike:
 *
 *   time        Binds or covers a period outside the engagement.
 *               some = a fixed period before the start or after the end;
 *               far  = no end date, or longer than the deal itself.
 *   subject     Covers matters outside this deal's work or this contract's
 *               disputes. some = adjacent matters (other agreements between
 *               the same parties, related services); far = anything at all
 *               ("any and all claims however arising", "whether or not
 *               created for Client", the client's whole business).
 *   others      Reaches people beyond the two parties: the client's
 *               affiliates or customers, the freelancer's other clients.
 *               some = a named or bounded group; far = anyone.
 *   ownAssets   Takes what the freelancer already has or has earned:
 *               pre-existing tools, methods, templates, pay for work done.
 *               some = part of it, or a wide license; far = all of it.
 *   oneSided    Binds only the freelancer, with no matching right or
 *               obligation on the client. some = lopsided but with a
 *               counterweight (notice, partial pay); far = one way only.
 *   exit        How hard it is for the freelancer to get out or stop it.
 *               some = long notice, narrow windows or fees; far = no
 *               practical exit (only for cause, certified mail inside a
 *               window, renewal the freelancer can't stop).
 *   exposure    Money the freelancer can lose beyond the deal's value.
 *               some = beyond the fee, or regardless of fault; far =
 *               uncapped, or losing all pay already earned.
 *
 * The rule:
 *   severity = sum over the seven dimensions of POINTS[level],
 *   with POINTS = { none: 0, some: 1, far: 3 }.
 *
 * Properties this gives (and tests/severity.test.ts checks):
 * - Every dimension counts the same, whatever the category.
 * - More reach always scores higher: raising any one dimension, or adding
 *   one, strictly raises the score. One clause that reaches at least as far
 *   as another on every dimension, and further on one, outranks it.
 * - Going "far" on one dimension (3) outweighs going "some" on two (2):
 *   an unlimited reach in one direction is worse than two bounded ones.
 * - A clause with no reach at all scores 0. That clause is inside the deal
 *   and is not a flag (see `isOverreach`).
 */

export const REACH_DIMENSIONS = [
  "time",
  "subject",
  "others",
  "ownAssets",
  "oneSided",
  "exit",
  "exposure",
] as const;

export type ReachDimension = (typeof REACH_DIMENSIONS)[number];

export const REACH_LEVELS = ["none", "some", "far"] as const;

export type ReachLevel = (typeof REACH_LEVELS)[number];

/** How far a clause reaches past the deal, per dimension. */
export type OverreachAssessment = Record<ReachDimension, ReachLevel>;

export const POINTS: Record<ReachLevel, number> = { none: 0, some: 1, far: 3 };

/** An assessment with no reach on any dimension. */
export const NO_REACH: OverreachAssessment = Object.freeze({
  time: "none",
  subject: "none",
  others: "none",
  ownAssets: "none",
  oneSided: "none",
  exit: "none",
  exposure: "none",
}) as OverreachAssessment;

/** Severity as an ordering number: higher means more overreach. */
export function severityFrom(assessment: OverreachAssessment): number {
  let score = 0;
  for (const dimension of REACH_DIMENSIONS) score += POINTS[assessment[dimension]];
  return score;
}

/**
 * Whether a clause reaches past the deal at all. A candidate the model
 * itself assessed as reaching nowhere is inside the deal by definition and
 * is dropped; a single "some" on any dimension is enough to keep it, since
 * borderline clauses are flagged (ADR 0004).
 */
export function isOverreach(assessment: OverreachAssessment): boolean {
  return severityFrom(assessment) > 0;
}

const LEVEL_SET = new Set<string>(REACH_LEVELS);

/**
 * Reads an assessment from the model's reply. Returns null if any dimension
 * is missing or has an unknown level: a half-read assessment would give a
 * wrong order, so the candidate is treated as malformed instead.
 */
export function readAssessment(raw: unknown): OverreachAssessment | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out = {} as OverreachAssessment;
  for (const dimension of REACH_DIMENSIONS) {
    const level = r[dimension];
    if (typeof level !== "string" || !LEVEL_SET.has(level)) return null;
    out[dimension] = level as ReachLevel;
  }
  return out;
}
