/**
 * Counter-offers: replacement language the freelancer can send back for a
 * flagged clause. The text always comes from the model; code only checks it
 * and never writes one (a counter-offer the document doesn't support is a
 * claim the product can't make).
 */

/** Shorter than this, a counter-offer can't be replacement language. */
export const MIN_COUNTER_OFFER_CHARS = 20;

/** True when the counter-offer is missing or too short to use. */
export function needsCounterOffer(counterOffer: string): boolean {
  return counterOffer.trim().length < MIN_COUNTER_OFFER_CHARS;
}

const STOPWORDS = new Set([
  "about", "above", "after", "again", "against", "also", "been", "before",
  "being", "below", "between", "both", "does", "doing", "down", "during",
  "each", "from", "further", "have", "having", "here", "into", "itself",
  "just", "more", "most", "only", "other", "over", "same", "shall", "should",
  "some", "such", "than", "that", "their", "them", "then", "there", "these",
  "they", "this", "those", "through", "under", "until", "upon", "very",
  "were", "what", "when", "where", "which", "while", "will", "with", "would",
  "your", "yours", "must", "make", "made", "replace", "section", "clause",
  "agreement", "contract",
]);

/** Distinctive content words (length >= 4, not stopwords) and numbers. */
function contentTokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().match(/[a-z0-9]+(?:['’-][a-z0-9]+)*/g) ?? []) {
    const isNumber = /^\d+$/.test(raw);
    if (isNumber || (raw.length >= 4 && !STOPWORDS.has(raw))) out.add(raw);
  }
  return out;
}

/**
 * Does the counter-offer answer this clause? True when it shares at least
 * one distinctive content word or number with the source sentence,
 * case-insensitive. A cheap guard against a counter-offer drafted for a
 * different clause, not a judgement of its quality.
 */
export function respondsToClause(counterOffer: string, sourceSentence: string): boolean {
  const clause = contentTokens(sourceSentence);
  for (const token of contentTokens(counterOffer)) {
    if (clause.has(token)) return true;
  }
  return false;
}

/** What the counter-offer step did, for diagnostics. */
export type CounterOfferOutcome<F> = {
  flags: F[];
  /** Flags that came back from the flags call without a usable counter-offer. */
  followUp: number;
  /** Flags dropped because the follow-up still gave no usable counter-offer. */
  missing: number;
};

type NeedsDraft = { sourceSentence: string; description: string; counterOffer: string };

/** Reads the follow-up reply into sentence -> counter-offer. */
export function readCounterOffers(payload: unknown): Map<string, string> {
  const out = new Map<string, string>();
  if (!payload || typeof payload !== "object") return out;
  const list = (payload as { counterOffers?: unknown }).counterOffers;
  if (!Array.isArray(list)) return out;
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const { sourceSentence, counterOffer } = item as Record<string, unknown>;
    if (typeof sourceSentence !== "string" || typeof counterOffer !== "string") continue;
    const key = normalize(sourceSentence);
    if (!out.has(key)) out.set(key, counterOffer.trim());
  }
  return out;
}

function normalize(sentence: string): string {
  return sentence.replace(/\s+/g, " ").trim();
}

/**
 * Every returned flag carries a counter-offer. Flags without a usable one
 * get exactly one follow-up request (`draft`, which asks the model for just
 * those clauses); anything still missing afterwards is dropped. Code never
 * writes a counter-offer itself.
 */
export async function ensureCounterOffers<F extends NeedsDraft>(
  flags: F[],
  draft: (clauses: { sourceSentence: string; description: string }[]) => Promise<unknown>,
): Promise<CounterOfferOutcome<F>> {
  const lacking = flags.filter((f) => needsCounterOffer(f.counterOffer));
  if (lacking.length === 0) return { flags, followUp: 0, missing: 0 };

  const drafted = readCounterOffers(
    await draft(
      lacking.map((f) => ({ sourceSentence: f.sourceSentence, description: f.description })),
    ),
  );

  const out: F[] = [];
  let missing = 0;
  for (const f of flags) {
    if (!needsCounterOffer(f.counterOffer)) {
      out.push(f);
      continue;
    }
    const text = drafted.get(normalize(f.sourceSentence)) ?? "";
    if (needsCounterOffer(text)) {
      missing++;
      continue;
    }
    out.push({ ...f, counterOffer: text });
  }
  return { flags: out, followUp: lacking.length, missing };
}
