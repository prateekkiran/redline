/**
 * Red lines against the real model (ticket 09, ADR 0006). Runs with
 * `pnpm test:live`; skipped when OPENROUTER_API_KEY is unset.
 *
 * Two real-model runs of the baseline can differ, so comparing two
 * independent runs would test the model's variance, not the red lines. The
 * first run records the model's real baseline replies; the second run
 * replays those for the baseline calls and asks the real model only for the
 * red-line call. Monotonicity is then a property of the pipeline applied to
 * real model output.
 */

import { describe, expect, it } from "vitest";
import { analyzeDocument, type Flag } from "@/lib/analysis";
import { createOpenRouterClient, type ModelClient } from "@/lib/analysis/openrouter";
import { loadFixture } from "../support/stub-model";

const TIMEOUT = 600_000;
const RED_LINES = [
  "Payment later than 14 days after invoice",
  "No non-competes",
  "Unpaid revision work",
];

const key = (f: Flag) => `${f.category}\u0000${f.sourceSentence}`;

describe.skipIf(!process.env.OPENROUTER_API_KEY)("red lines (live model)", () => {
  for (const name of ["adhesion-contract", "clean-contract"]) {
    it(
      `${name}: red lines only add flags, each citing a sentence in the document`,
      async () => {
        const fixture = loadFixture(name);
        const real = createOpenRouterClient();
        const recorded = new Map<string, unknown>();
        const recording: ModelClient = {
          async completeJson<T>(args: Parameters<ModelClient["completeJson"]>[0]): Promise<T> {
            const out = await real.completeJson<T>(args);
            recorded.set(`${args.schemaName}\u0000${args.user}`, out);
            return out;
          },
        };
        const base = await analyzeDocument(fixture.text, [], { client: recording });

        const replaying: ModelClient = {
          async completeJson<T>(args: Parameters<ModelClient["completeJson"]>[0]): Promise<T> {
            const k = `${args.schemaName}\u0000${args.user}`;
            if (recorded.has(k)) return recorded.get(k) as T;
            return real.completeJson<T>(args);
          },
        };
        const withRedLines = await analyzeDocument(fixture.text, RED_LINES, { client: replaying });

        const added = withRedLines.flags.filter((f) => f.origin === "red-line");
        console.log(
          `${name}: ${base.flags.length} baseline flags, ${added.length} added by red lines`,
        );

        expect(withRedLines.flags.length).toBeGreaterThanOrEqual(base.flags.length);
        const keys = new Set(withRedLines.flags.map(key));
        for (const b of base.flags) expect(keys.has(key(b)), b.sourceSentence).toBe(true);
        for (const f of withRedLines.flags) {
          expect(fixture.text).toContain(f.sourceSentence);
          if (f.origin === "red-line") expect(RED_LINES).toContain(f.redLine);
        }
      },
      TIMEOUT,
    );
  }
});
