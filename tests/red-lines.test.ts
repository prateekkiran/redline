/**
 * Red lines only add flags (ticket 09, ADR 0006). Every test runs the real
 * pipeline (validation, citation checks, counter-offer rule, merging,
 * ranking); only the model's HTTP call is stubbed.
 */

import { describe, expect, it } from "vitest";
import {
  AnalysisOutputError,
  analyzeDocument,
  MAX_RED_LINE_CHARS,
  MAX_RED_LINES,
  normalizeRedLines,
  RED_LINE_CATEGORY,
  type Flag,
} from "@/lib/analysis";
import { mergeRanked } from "@/lib/analysis/red-lines";
import { NO_REACH } from "@/lib/analysis/severity";
import {
  createStubModel,
  FABRICATED_QUOTE,
  loadFixture,
  type Fixture,
} from "./support/stub-model";

const adhesion = loadFixture("adhesion-contract");
const clean = loadFixture("clean-contract");

/**
 * Per fixture: a red line, and a sentence in the document that meets it but
 * that the baseline doesn't flag (a payment term; payment timing is not one
 * of the six baseline categories).
 */
const PAYMENT: Record<string, { redLine: string; sentence: string }> = {
  "adhesion-contract": {
    redLine: "Payment later than 14 days after invoice",
    sentence:
      "Contractor will send invoices by email, and Client will pay each undisputed invoice within 30 days of receiving it.",
  },
  "clean-contract": {
    redLine: "Payment later than 14 days after invoice",
    sentence:
      "Designer will invoice by email, and Client will pay each invoice within 15 days of receiving it.",
  },
};

function redLineCandidate(redLine: string, sentence: string, overrides: Record<string, unknown> = {}) {
  return {
    redLine,
    sourceSentence: sentence,
    reach: { ...NO_REACH, exposure: "some" },
    description: "You wait up to 30 days for each payment after you send the invoice.",
    counterOffer: "Client will pay each undisputed invoice within 14 days of receiving it.",
    ...overrides,
  };
}

const key = (f: Flag) => `${f.category}\u0000${f.sourceSentence}`;

async function baselineOf(fixture: Fixture) {
  const client = createStubModel(fixture);
  const result = await analyzeDocument(fixture.text, [], { client });
  return { result, client };
}

describe("normalizeRedLines", () => {
  it("trims, collapses spaces, drops empties and case-insensitive duplicates", () => {
    expect(
      normalizeRedLines(["  No  non-competes ", "", "   ", "no non-competes", "Net 60"]),
    ).toEqual(["No non-competes", "Net 60"]);
  });

  it("caps the count and the length of each red line", () => {
    const many = Array.from({ length: MAX_RED_LINES + 5 }, (_, i) => `Red line ${i}`);
    expect(normalizeRedLines(many)).toHaveLength(MAX_RED_LINES);
    const long = "x".repeat(MAX_RED_LINE_CHARS + 50);
    expect(normalizeRedLines([long])[0]).toHaveLength(MAX_RED_LINE_CHARS);
  });

  it("makes no red-line call when every red line is blank", async () => {
    const client = createStubModel(adhesion);
    await analyzeDocument(adhesion.text, ["  ", ""], { client });
    expect(client.calls.map((c) => c.schemaName)).not.toContain("red_line_flags");
  });
});

describe("red lines only add flags", () => {
  for (const fixture of [adhesion, clean]) {
    const { redLine, sentence } = PAYMENT[fixture.name];

    it(`${fixture.name}: flag count with a red line is at least the count without`, async () => {
      expect(fixture.text).toContain(sentence);
      const { result: base } = await baselineOf(fixture);
      const client = createStubModel(fixture, {
        redLineCandidates: [redLineCandidate(redLine, sentence)],
      });
      const withRedLine = await analyzeDocument(fixture.text, [redLine], { client });
      expect(withRedLine.flags.length).toBeGreaterThanOrEqual(base.flags.length);
      expect(withRedLine.flags.length).toBe(base.flags.length + 1);
    });

    it(`${fixture.name}: a red line that matches nothing leaves the flags exactly as they were`, async () => {
      const { result: base } = await baselineOf(fixture);
      const client = createStubModel(fixture);
      const result = await analyzeDocument(fixture.text, ["No unpaid revisions"], { client });
      expect(result.flags).toEqual(base.flags);
    });

    it(`${fixture.name}: every baseline flag is still present, unchanged, with red lines applied`, async () => {
      const { result: base } = await baselineOf(fixture);
      const client = createStubModel(fixture, {
        redLineCandidates: [redLineCandidate(redLine, sentence)],
      });
      const result = await analyzeDocument(fixture.text, [redLine, "No non-competes"], { client });
      const byKey = new Map(result.flags.map((f) => [key(f), f]));
      for (const b of base.flags) {
        const kept = byKey.get(key(b));
        expect(kept, `baseline flag missing: ${b.sourceSentence}`).toBeDefined();
        expect(kept!.origin).toBe("baseline");
        expect(kept!.severity).toBe(b.severity);
        expect(kept!.description).toBe(b.description);
        expect(kept!.counterOffer).toBe(b.counterOffer);
      }
      // Baseline flags keep their relative order.
      const baselineOrder = result.flags.filter((f) => f.origin === "baseline").map(key);
      expect(baselineOrder).toEqual(base.flags.map(key));
    });

    it(`${fixture.name}: the baseline flags call gets the same input with or without red lines`, async () => {
      const { client: without } = await baselineOf(fixture);
      const withClient = createStubModel(fixture, {
        redLineCandidates: [redLineCandidate(redLine, sentence)],
      });
      await analyzeDocument(fixture.text, [redLine, "No non-competes"], { client: withClient });
      const flagsCall = (calls: typeof without.calls) =>
        calls.filter((c) => c.schemaName === "document_flags");
      expect(flagsCall(withClient.calls)).toHaveLength(1);
      expect(flagsCall(withClient.calls)).toEqual(flagsCall(without.calls));
      expect(flagsCall(withClient.calls)[0].user).not.toContain("No non-competes");
      // And the red lines did reach the model, in their own call.
      const redCall = withClient.calls.find((c) => c.schemaName === "red_line_flags");
      expect(redCall?.user).toContain("No non-competes");
    });
  }

  it("a red-line flag carries a verbatim source sentence and its red line", async () => {
    const { redLine, sentence } = PAYMENT["adhesion-contract"];
    const client = createStubModel(adhesion, {
      // The model's copy differs in spacing and quote style; the flag shows the document's own text.
      redLineCandidates: [redLineCandidate(redLine.toUpperCase(), `  ${sentence.replace(/ /g, "  ")}`)],
    });
    const result = await analyzeDocument(adhesion.text, [redLine], { client });
    const added = result.flags.filter((f) => f.origin === "red-line");
    expect(added).toHaveLength(1);
    expect(added[0].sourceSentence).toBe(sentence);
    expect(adhesion.text).toContain(added[0].sourceSentence);
    expect(added[0].redLine).toBe(redLine);
    expect(added[0].matchedRedLines).toEqual([redLine]);
    expect(added[0].category).toBe(RED_LINE_CATEGORY);
    expect(added[0].counterOffer.length).toBeGreaterThan(0);
  });

  it("drops a red-line flag whose quote isn't in the document", async () => {
    const { redLine } = PAYMENT["adhesion-contract"];
    const { result: base } = await baselineOf(adhesion);
    const client = createStubModel(adhesion, {
      redLineCandidates: [redLineCandidate(redLine, FABRICATED_QUOTE)],
    });
    const result = await analyzeDocument(adhesion.text, [redLine], { client });
    expect(result.flags).toEqual(base.flags);
    for (const f of result.flags) expect(adhesion.text).toContain(f.sourceSentence);
  });

  it("drops a candidate naming a red line the user doesn't have", async () => {
    const { sentence } = PAYMENT["adhesion-contract"];
    const { result: base } = await baselineOf(adhesion);
    const client = createStubModel(adhesion, {
      redLineCandidates: [redLineCandidate("Something the user never wrote", sentence)],
    });
    const result = await analyzeDocument(adhesion.text, ["No unpaid revisions"], { client });
    expect(result.flags).toEqual(base.flags);
  });

  it("a red line on a baseline sentence attaches to that flag, without duplicating or removing it", async () => {
    const { result: base } = await baselineOf(adhesion);
    const target = adhesion.sidecar.flags.find((f) => f.category === "non_compete")!;
    const client = createStubModel(adhesion, {
      redLineCandidates: [
        redLineCandidate("No non-competes", target.sentence, {
          // Even claiming no reach at all can't lower or replace the baseline flag.
          reach: { ...NO_REACH },
          description: "Different words for the same clause.",
        }),
      ],
    });
    const result = await analyzeDocument(adhesion.text, ["No non-competes"], { client });
    expect(result.flags).toHaveLength(base.flags.length);
    const hits = result.flags.filter((f) => f.sourceSentence === target.sentence);
    expect(hits).toHaveLength(1);
    const baseFlag = base.flags.find((f) => f.sourceSentence === target.sentence)!;
    expect(hits[0]).toEqual({ ...baseFlag, matchedRedLines: ["No non-competes"] });
  });

  it("two red lines on the same new sentence make one flag listing both", async () => {
    const { redLine, sentence } = PAYMENT["adhesion-contract"];
    const other = "Invoices paid net 30";
    const client = createStubModel(adhesion, {
      redLineCandidates: [redLineCandidate(redLine, sentence), redLineCandidate(other, sentence)],
    });
    const result = await analyzeDocument(adhesion.text, [redLine, other], { client });
    const added = result.flags.filter((f) => f.origin === "red-line");
    expect(added).toHaveLength(1);
    expect(added[0].matchedRedLines).toEqual([redLine, other]);
  });

  it("a red-line flag with no counter-offer gets one from the follow-up, or is dropped", async () => {
    const { redLine, sentence } = PAYMENT["adhesion-contract"];
    const { result: base } = await baselineOf(adhesion);

    const drafted = createStubModel(adhesion, {
      redLineCandidates: [redLineCandidate(redLine, sentence, { counterOffer: "" })],
      override: {
        counter_offers: () => ({
          counterOffers: [
            { sourceSentence: sentence, counterOffer: "Client will pay each undisputed invoice within 14 days." },
          ],
        }),
      },
    });
    const kept = await analyzeDocument(adhesion.text, [redLine], { client: drafted });
    expect(drafted.calls.map((c) => c.schemaName)).toContain("counter_offers");
    const added = kept.flags.filter((f) => f.origin === "red-line");
    expect(added).toHaveLength(1);
    expect(added[0].counterOffer).toBe("Client will pay each undisputed invoice within 14 days.");

    const undrafted = createStubModel(adhesion, {
      redLineCandidates: [redLineCandidate(redLine, sentence, { counterOffer: "" })],
      emptyCounterOffers: true,
    });
    const dropped = await analyzeDocument(adhesion.text, [redLine], { client: undrafted });
    expect(dropped.flags).toEqual(base.flags);
  });

  it("ranks a red-line flag by severity among the baseline flags", async () => {
    const { redLine, sentence } = PAYMENT["adhesion-contract"];
    const client = createStubModel(adhesion, {
      redLineCandidates: [
        redLineCandidate(redLine, sentence, {
          reach: { ...NO_REACH, exposure: "far", oneSided: "far", exit: "far", time: "far", subject: "far" },
        }),
      ],
    });
    const result = await analyzeDocument(adhesion.text, [redLine], { client });
    const severities = result.flags.map((f) => f.severity);
    expect(severities).toEqual([...severities].sort((a, b) => b - a));
    expect(result.flags[0].origin).toBe("red-line");
  });

  it("fails the analysis when the red-line reply has no list, rather than hiding the red lines", async () => {
    const client = createStubModel(adhesion, { override: { red_line_flags: () => ({}) } });
    const err = await analyzeDocument(adhesion.text, ["No non-competes"], { client }).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(AnalysisOutputError);
  });
});

describe("mergeRanked", () => {
  it("never moves a baseline item relative to another", () => {
    const base = [{ severity: 9, id: "a" }, { severity: 4, id: "b" }, { severity: 4, id: "c" }, { severity: 1, id: "d" }];
    const added = [{ severity: 5, id: "x" }, { severity: 4, id: "y" }, { severity: 0, id: "z" }];
    expect(mergeRanked(base, added).map((i) => i.id)).toEqual(["a", "x", "b", "c", "y", "d", "z"]);
  });
});
