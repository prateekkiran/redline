/**
 * Severity by overreach against the real model (ticket 04). Only a real
 * model can show that it scores reach and not category, so these run with
 * `pnpm test:live` and are skipped when OPENROUTER_API_KEY is unset.
 *
 * - Each same-category pair: the broad clause outranks the narrow one, on
 *   every one of RUNS runs. A narrow document with no flag in the category
 *   counts as severity 0, which is lower.
 * - The adhesion contract yields a flag in each of the six categories,
 *   citing the planted sentence. Misses are printed: false negatives are
 *   what this suite exists to drive down (ADR 0004).
 * - No description contains a hedge.
 */

import { describe, expect, it } from "vitest";
import { analyzeDocument, type AnalysisResult } from "@/lib/analysis";
import { findHedges } from "@/lib/analysis/hedges";
import { FLAG_CATEGORIES } from "@/lib/analysis/prompts";
import { loadFixture } from "../support/stub-model";

const RUNS = 3;
const TIMEOUT = 600_000;

const PAIRS = [
  { category: "arbitration", narrow: "pairs/arbitration-narrow", broad: "pairs/arbitration-broad" },
  { category: "ip_assignment", narrow: "pairs/ip-in-scope", broad: "pairs/ip-overreaching" },
] as const;

function severityIn(result: AnalysisResult, category: string): number {
  return Math.max(0, ...result.flags.filter((f) => f.category === category).map((f) => f.severity));
}

function hedgesIn(result: AnalysisResult): string[] {
  return result.flags.flatMap((f) =>
    findHedges(f.description).map((h) => `${f.category}: "${h}" in "${f.description}"`),
  );
}

describe.skipIf(!process.env.OPENROUTER_API_KEY)("severity by overreach (live model)", () => {
  for (const pair of PAIRS) {
    it(
      `${pair.category}: the broad clause outranks the narrow one on every run`,
      async () => {
        const narrow = loadFixture(pair.narrow);
        const broad = loadFixture(pair.broad);
        const runs = await Promise.all(
          Array.from({ length: RUNS }, async () => {
            const [n, b] = await Promise.all([
              analyzeDocument(narrow.text, []),
              analyzeDocument(broad.text, []),
            ]);
            return { n, b };
          }),
        );
        const hedges: string[] = [];
        runs.forEach(({ n, b }, i) => {
          const sn = severityIn(n, pair.category);
          const sb = severityIn(b, pair.category);
          console.log(`[${pair.category} run ${i + 1}] narrow=${sn} broad=${sb}`);
          hedges.push(...hedgesIn(n), ...hedgesIn(b));
        });
        for (const { n, b } of runs) {
          expect(severityIn(b, pair.category)).toBeGreaterThan(severityIn(n, pair.category));
        }
        expect(hedges).toEqual([]);
      },
      TIMEOUT,
    );
  }

  it(
    "the adhesion contract yields a flag in each of the six categories, citing the planted sentence, on every run",
    async () => {
      const adhesion = loadFixture("adhesion-contract");
      const runs = await Promise.all(
        Array.from({ length: RUNS }, () => analyzeDocument(adhesion.text, [])),
      );
      const misses: string[] = [];
      runs.forEach((result, i) => {
        for (const category of FLAG_CATEGORIES) {
          const planted = adhesion.sidecar.flags.find((f) => f.category === category)!;
          const hit = result.flags.some(
            (f) => f.category === category && f.sourceSentence === planted.sentence,
          );
          if (!hit) misses.push(`run ${i + 1}: missed ${category} (${planted.id})`);
        }
      });
      if (misses.length) console.log(`False negatives:\n${misses.join("\n")}`);
      expect(misses).toEqual([]);
      expect(runs.flatMap(hedgesIn)).toEqual([]);
    },
    TIMEOUT,
  );
});
