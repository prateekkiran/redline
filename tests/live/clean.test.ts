/**
 * A clean document gets zero flags from the real model (ticket 05, ADR 0005).
 * Only a real model can show that it leaves a boring contract alone, so this
 * runs with `pnpm test:live` and is skipped when OPENROUTER_API_KEY is unset.
 *
 * - The clean contract yields zero flags on every one of RUNS runs.
 * - The narrow pair fixtures (arbitration-narrow, ip-in-scope) yield no flag
 *   in the category they were written to keep inside the deal. Anything else
 *   the model raises on them is printed, so false positives are visible.
 */

import { describe, expect, it } from "vitest";
import { analyzeDocument } from "@/lib/analysis";
import { loadFixture } from "../support/stub-model";

const RUNS = 3;
const TIMEOUT = 600_000;

const NARROW = [
  { fixture: "pairs/arbitration-narrow", category: "arbitration" },
  { fixture: "pairs/ip-in-scope", category: "ip_assignment" },
] as const;

describe.skipIf(!process.env.OPENROUTER_API_KEY)("clean documents (live model)", () => {
  it(
    "the clean contract yields zero flags on every run",
    async () => {
      const clean = loadFixture("clean-contract");
      const runs = await Promise.all(
        Array.from({ length: RUNS }, () => analyzeDocument(clean.text, [])),
      );
      runs.forEach((result, i) => {
        for (const f of result.flags) {
          console.log(`[clean run ${i + 1}] ${f.category} (${f.severity}): "${f.sourceSentence}"`);
        }
      });
      for (const result of runs) {
        expect(result.summary.trim().length).toBeGreaterThan(0);
        expect(result.flags).toEqual([]);
      }
    },
    TIMEOUT,
  );

  for (const { fixture, category } of NARROW) {
    it(
      `${fixture}: no ${category} flag on any run`,
      async () => {
        const doc = loadFixture(fixture);
        const runs = await Promise.all(
          Array.from({ length: RUNS }, () => analyzeDocument(doc.text, [])),
        );
        runs.forEach((result, i) => {
          for (const f of result.flags) {
            console.log(`[${fixture} run ${i + 1}] ${f.category} (${f.severity}): "${f.sourceSentence}"`);
          }
        });
        for (const result of runs) {
          expect(result.flags.filter((f) => f.category === category)).toEqual([]);
        }
      },
      TIMEOUT,
    );
  }
});
