/**
 * Counter-offers from the real model (ticket 06). Only a real model shows
 * that each flag gets its own counter-offer written against its own clause,
 * so this runs with `pnpm test:live` and is skipped when OPENROUTER_API_KEY
 * is unset.
 */

import { describe, expect, it } from "vitest";
import { analyzeDocument, type FlagDiagnostics } from "@/lib/analysis";
import { needsCounterOffer, respondsToClause } from "@/lib/analysis/counter-offers";
import { loadFixture } from "../support/stub-model";

const TIMEOUT = 600_000;

describe.skipIf(!process.env.OPENROUTER_API_KEY)("counter-offers (live model)", () => {
  it(
    "every flag on the adhesion contract has its own counter-offer that answers its clause",
    async () => {
      const adhesion = loadFixture("adhesion-contract");
      let diagnostics: FlagDiagnostics | undefined;
      const result = await analyzeDocument(adhesion.text, [], {
        onDiagnostics: (d) => (diagnostics = d),
      });
      if (diagnostics) {
        console.log(
          `counter-offers: ${diagnostics.counterOfferFollowUp} needed a follow-up, ` +
            `${diagnostics.missingCounterOffer} dropped without one`,
        );
      }

      expect(result.flags.length).toBeGreaterThan(0);
      for (const flag of result.flags) {
        expect(needsCounterOffer(flag.counterOffer)).toBe(false);
        expect(
          respondsToClause(flag.counterOffer, flag.sourceSentence),
          `counter-offer does not answer its clause:\n${flag.sourceSentence}\n---\n${flag.counterOffer}`,
        ).toBe(true);
      }
      const texts = result.flags.map((f) => f.counterOffer.trim().toLowerCase());
      expect(new Set(texts).size).toBe(texts.length);
    },
    TIMEOUT,
  );
});
