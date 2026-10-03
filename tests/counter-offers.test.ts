import { describe, expect, it } from "vitest";
import { analyzeDocument, type FlagDiagnostics } from "@/lib/analysis";
import { needsCounterOffer, respondsToClause } from "@/lib/analysis/counter-offers";
import { COUNTER_OFFERS_SCHEMA_NAME } from "@/lib/analysis/prompts";
import {
  candidatesFromSidecar,
  createStubModel,
  loadFixture,
  sentencesAsked,
  type StubOptions,
} from "./support/stub-model";

const adhesion = loadFixture("adhesion-contract");
const planted = candidatesFromSidecar(adhesion);

async function run(opts: StubOptions = {}) {
  let diagnostics: FlagDiagnostics | undefined;
  const client = createStubModel(adhesion, opts);
  const result = await analyzeDocument(adhesion.text, [], {
    client,
    onDiagnostics: (d) => (diagnostics = d),
  });
  if (!diagnostics) throw new Error("onDiagnostics was not called");
  const followUps = client.calls.filter((c) => c.schemaName === COUNTER_OFFERS_SCHEMA_NAME);
  return { result, diagnostics, followUps };
}

describe("respondsToClause", () => {
  const clause =
    "Contractor shall not provide services to any competitor of Client for two years after termination.";

  it("is true only when the counter-offer reuses a content word from the clause", () => {
    expect(respondsToClause("Limit the restriction to direct competitors named in Exhibit A.", clause)).toBe(false);
    expect(respondsToClause("Contractor will not serve a competitor during the engagement.", clause)).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(respondsToClause("CONTRACTOR KEEPS THE RIGHT TO WORK ELSEWHERE.", clause)).toBe(true);
  });

  it("matches on numbers", () => {
    expect(respondsToClause("Cut it to 6 months, not 12.", "The term is 12 months.")).toBe(true);
    expect(respondsToClause("Cut it to 6 weeks.", "The term is 12 months.")).toBe(false);
  });

  it("ignores stopwords and short words", () => {
    expect(respondsToClause("This shall be for the and with them.", "This shall be for the and with them too.")).toBe(false);
  });

  it("is false for an unrelated counter-offer", () => {
    expect(respondsToClause("Cap liability at the fees paid.", clause)).toBe(false);
  });
});

describe("needsCounterOffer", () => {
  it("flags empty and short text", () => {
    expect(needsCounterOffer("")).toBe(true);
    expect(needsCounterOffer("   Cap it.   ")).toBe(true);
    expect(needsCounterOffer("Cap liability at the fees paid under this deal.")).toBe(false);
  });
});

describe("counter-offers in the analysis", () => {
  it("every flag on the adhesion fixture has a counter-offer, with no follow-up call", async () => {
    const { result, diagnostics, followUps } = await run();
    expect(result.flags.length).toBe(adhesion.sidecar.flags.length);
    for (const flag of result.flags) {
      expect(needsCounterOffer(flag.counterOffer)).toBe(false);
    }
    expect(followUps).toHaveLength(0);
    expect(diagnostics.counterOfferFollowUp).toBe(0);
    expect(diagnostics.missingCounterOffer).toBe(0);
  });

  it("counter-offers on the adhesion fixture are pairwise distinct", async () => {
    const { result } = await run();
    const texts = result.flags.map((f) => f.counterOffer.trim().toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("each counter-offer responds to its own clause", async () => {
    const { result } = await run();
    for (const flag of result.flags) {
      expect(respondsToClause(flag.counterOffer, flag.sourceSentence)).toBe(true);
    }
  });

  it("an empty or too-short counter-offer triggers exactly one follow-up, and its draft is used", async () => {
    const [first, second, ...rest] = planted;
    const candidates = [{ ...first, counterOffer: "" }, { ...second, counterOffer: "Narrow it." }, ...rest];
    const { result, diagnostics, followUps } = await run({ candidates });

    expect(followUps).toHaveLength(1);
    expect(sentencesAsked(followUps[0].user)).toEqual(
      expect.arrayContaining([first.sourceSentence, second.sourceSentence]),
    );
    expect(sentencesAsked(followUps[0].user)).toHaveLength(2);

    const byFirst = result.flags.find((f) => f.sourceSentence === first.sourceSentence);
    const bySecond = result.flags.find((f) => f.sourceSentence === second.sourceSentence);
    expect(byFirst?.counterOffer).toBe(planted[0].counterOffer.trim());
    expect(bySecond?.counterOffer).toBe(planted[1].counterOffer.trim());
    expect(result.flags).toHaveLength(planted.length);
    expect(diagnostics.counterOfferFollowUp).toBe(2);
    expect(diagnostics.missingCounterOffer).toBe(0);
  });

  it("a flag still without a counter-offer after the follow-up is never returned", async () => {
    const [first, ...rest] = planted;
    const candidates = [{ ...first, counterOffer: "" }, ...rest];
    const { result, diagnostics, followUps } = await run({ candidates, emptyCounterOffers: true });

    expect(followUps).toHaveLength(1);
    expect(result.flags.map((f) => f.sourceSentence)).not.toContain(first.sourceSentence);
    expect(result.flags).toHaveLength(planted.length - 1);
    for (const flag of result.flags) expect(needsCounterOffer(flag.counterOffer)).toBe(false);
    expect(diagnostics.missingCounterOffer).toBe(1);
    expect(diagnostics.kept).toBe(planted.length - 1);
  });

  it("a follow-up that answers a different sentence does not fill the gap", async () => {
    const [first, ...rest] = planted;
    const candidates = [{ ...first, counterOffer: "" }, ...rest];
    const { result, diagnostics } = await run({
      candidates,
      override: {
        [COUNTER_OFFERS_SCHEMA_NAME]: () => ({
          counterOffers: [{ sourceSentence: rest[0].sourceSentence, counterOffer: rest[0].counterOffer }],
        }),
      },
    });
    expect(result.flags.map((f) => f.sourceSentence)).not.toContain(first.sourceSentence);
    expect(diagnostics.missingCounterOffer).toBe(1);
  });
});
