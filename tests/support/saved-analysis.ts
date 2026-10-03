/**
 * An AnalysisResult built straight from a fixture's sidecar, for library
 * tests and scripts/check-library.ts. The library stores whatever the
 * analysis returned, so these tests need a realistic result, not a model
 * call. Severity numbers only need to keep the sidecar's band order.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import type { AnalysisResult, Flag } from "@/lib/analysis";

const FIXTURES = path.resolve(import.meta.dirname, "../fixtures");
const BAND_SEVERITY: Record<string, number> = { severe: 9, moderate: 4, mild: 1 };

type SidecarFlag = {
  category: string;
  sentence: string;
  severityBand: string;
  description: string;
  counterOffer: string;
};

export type SavedFixture = { documentText: string; result: AnalysisResult };

export function savedFixture(name: string): SavedFixture {
  const documentText = readFileSync(path.join(FIXTURES, `${name}.txt`), "utf8");
  const sidecar = JSON.parse(
    readFileSync(path.join(FIXTURES, `${name}.flags.json`), "utf8"),
  ) as { flags: SidecarFlag[] };
  const flags: Flag[] = sidecar.flags
    .map((f) => {
      const severity = BAND_SEVERITY[f.severityBand];
      if (severity === undefined) throw new Error(`Unknown band ${f.severityBand}`);
      return {
        sourceSentence: f.sentence,
        severity,
        description: f.description,
        counterOffer: f.counterOffer,
        category: f.category,
        origin: "baseline" as const,
      };
    })
    .sort((a, b) => b.severity - a.severity);
  return {
    documentText,
    result: {
      summary: `A ${documentText.split(/\s+/).length}-word agreement with ${flags.length} flagged clauses.`,
      flags,
    },
  };
}
