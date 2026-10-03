/**
 * Scope gate (ADR 0002): v1 reads freelance agreements and general contracts
 * only. Leases and terms of service are turned away in the browser, before
 * any analysis request is made.
 *
 * Pure and dependency-free so it can run client-side on the extracted text.
 * It is a weighted keyword check, not a classifier: each out-of-scope kind
 * scores its signal phrases, the contract side scores its own, and a document
 * is rejected only when one out-of-scope kind is strong on its own AND clearly
 * outweighs the contract signal. A passing mention ("on the Client's
 * premises", "a tool's terms of service") must never reject a contract.
 */

export type ScopeKind = "lease" | "terms-of-service";

export type ScopeResult = { ok: true } | { ok: false; kind: ScopeKind };

type Signal = { phrase: string; weight: number };

/**
 * Weights: 3 for phrases that almost only appear in that kind of document
 * (a "security deposit" or "user account" is rare in a freelance agreement),
 * 1 for words that also turn up in ordinary contracts ("premises", "rent",
 * "these terms").
 */
const LEASE_SIGNALS: readonly Signal[] = [
  { phrase: "residential lease", weight: 3 },
  { phrase: "commercial lease", weight: 3 },
  { phrase: "lease agreement", weight: 3 },
  { phrase: "landlord", weight: 3 },
  { phrase: "tenant", weight: 3 },
  { phrase: "tenancy", weight: 3 },
  { phrase: "lessor", weight: 3 },
  { phrase: "lessee", weight: 3 },
  { phrase: "security deposit", weight: 3 },
  { phrase: "sublet", weight: 2 },
  { phrase: "premises", weight: 1 },
  { phrase: "rent", weight: 1 },
  { phrase: "lease", weight: 1 },
];

const TOS_SIGNALS: readonly Signal[] = [
  { phrase: "terms of service", weight: 3 },
  { phrase: "terms of use", weight: 3 },
  { phrase: "by using the service", weight: 3 },
  { phrase: "by accessing", weight: 3 },
  { phrase: "user account", weight: 3 },
  { phrase: "privacy policy", weight: 3 },
  { phrase: "acceptable use", weight: 2 },
  { phrase: "these terms", weight: 1 },
  { phrase: "the service", weight: 1 },
];

const CONTRACT_SIGNALS: readonly Signal[] = [
  { phrase: "statement of work", weight: 3 },
  { phrase: "scope of work", weight: 3 },
  { phrase: "independent contractor", weight: 3 },
  { phrase: "freelancer", weight: 2 },
  { phrase: "contractor", weight: 2 },
  { phrase: "consultant", weight: 2 },
  { phrase: "deliverable", weight: 2 },
  { phrase: "deliverables", weight: 2 },
  { phrase: "invoice", weight: 2 },
  { phrase: "invoices", weight: 2 },
  { phrase: "work product", weight: 2 },
  { phrase: "client", weight: 1 },
  { phrase: "services", weight: 1 },
];

/**
 * Minimum out-of-scope score before rejection is even considered. A real
 * lease or ToS repeats its vocabulary (landlord/tenant or user account/privacy
 * policy) many times; the fixtures score well above 20. A contract that only
 * mentions a landlord client or another tool's terms of service in passing
 * stays far below it.
 */
export const MIN_OUT_OF_SCOPE_SCORE = 15;

/**
 * The out-of-scope score must also be at least this multiple of the contract
 * score. This protects a freelance agreement whose subject is a landlord or
 * an app (e.g. "build a tenant portal for the Client"): its contractor,
 * client and deliverables language keeps the ratio low even when the
 * out-of-scope words pile up.
 */
export const MIN_OUT_OF_SCOPE_RATIO = 2;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Case-insensitive, whole-word count. Whitespace inside a phrase may vary. */
function countPhrase(text: string, phrase: string): number {
  const pattern = phrase
    .split(/\s+/)
    .map(escapeRegExp)
    .join("\\s+");
  const matches = text.match(new RegExp(`\\b${pattern}\\b`, "gi"));
  return matches ? matches.length : 0;
}

export function scoreSignals(text: string, signals: readonly Signal[]): number {
  let score = 0;
  for (const { phrase, weight } of signals) {
    score += countPhrase(text, phrase) * weight;
  }
  return score;
}

export function scopeScores(documentText: string): {
  lease: number;
  termsOfService: number;
  contract: number;
} {
  return {
    lease: scoreSignals(documentText, LEASE_SIGNALS),
    termsOfService: scoreSignals(documentText, TOS_SIGNALS),
    contract: scoreSignals(documentText, CONTRACT_SIGNALS),
  };
}

export function checkScope(documentText: string): ScopeResult {
  const { lease, termsOfService, contract } = scopeScores(documentText);
  const kind: ScopeKind = lease >= termsOfService ? "lease" : "terms-of-service";
  const outOfScope = Math.max(lease, termsOfService);

  if (
    outOfScope >= MIN_OUT_OF_SCOPE_SCORE &&
    outOfScope >= MIN_OUT_OF_SCOPE_RATIO * contract
  ) {
    return { ok: false, kind };
  }
  return { ok: true };
}
