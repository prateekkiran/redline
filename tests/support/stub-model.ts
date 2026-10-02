/**
 * A ModelClient for tests. It replaces only the HTTP call to OpenRouter:
 * the analysis module still builds its request, validates the reply and
 * does everything else for real. Replies are built from a fixture's sidecar
 * JSON, shaped like the model's structured output, so the suite runs
 * without a key.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import type { CompleteJsonArgs, ModelClient } from "@/lib/analysis/openrouter";
import {
  FLAGS_SCHEMA_NAME,
  SUMMARY_SCHEMA_NAME,
  type OverreachKind,
} from "@/lib/analysis/prompts";

export const FIXTURES = path.resolve(import.meta.dirname, "../fixtures");

export type SidecarFlag = {
  id: string;
  category: string;
  sentence: string;
  severityBand: string;
  overreach: string;
  description: string;
  counterOffer: string;
};

export type Sidecar = {
  document: string;
  flags: SidecarFlag[];
  notes?: string;
  notFlagged?: string[];
};

export type Fixture = { name: string; text: string; sidecar: Sidecar };

/** Loads `<name>.txt` and its sidecar (`<name>.flags.json` or `<name>.json`). */
export function loadFixture(name: string): Fixture {
  const text = readFileSync(path.join(FIXTURES, `${name}.txt`), "utf8");
  const candidates = [`${name}.flags.json`, `${name}.json`];
  const file = candidates.find((f) => {
    try {
      readFileSync(path.join(FIXTURES, f));
      return true;
    } catch {
      return false;
    }
  });
  if (!file) throw new Error(`No sidecar for fixture ${name}`);
  const sidecar = JSON.parse(readFileSync(path.join(FIXTURES, file), "utf8")) as Sidecar;
  return { name, text, sidecar };
}

export type StubCall = { schemaName: string; system: string; user: string };

export type StubModel = ModelClient & { calls: StubCall[] };

export type StubOptions = {
  /** Replace the reply for a schema, e.g. to return a malformed payload. */
  override?: Partial<Record<string, (args: CompleteJsonArgs) => unknown>>;
  /**
   * Extra candidate flags appended after the sidecar's, in the model's
   * structured shape (or deliberately not, to test malformed candidates).
   */
  extraCandidates?: unknown[];
  /** Use these candidates instead of the sidecar's. */
  candidates?: unknown[];
};

export function createStubModel(fixture: Fixture, options: StubOptions = {}): StubModel {
  const calls: StubCall[] = [];
  return {
    calls,
    async completeJson<T>(args: CompleteJsonArgs): Promise<T> {
      calls.push({ schemaName: args.schemaName, system: args.system, user: args.user });
      const override = options.override?.[args.schemaName];
      if (override) return override(args) as T;
      switch (args.schemaName) {
        case SUMMARY_SCHEMA_NAME:
          return { summary: summaryFromSidecar(fixture) } as T;
        case FLAGS_SCHEMA_NAME:
          return {
            flags: [
              ...(options.candidates ?? candidatesFromSidecar(fixture)),
              ...(options.extraCandidates ?? []),
            ],
          } as T;
        default:
          throw new Error(`Stub model has no reply for schema "${args.schemaName}"`);
      }
    },
  };
}

/**
 * A summary composed from what the fixture's author wrote about it: the
 * document's title, then the first sentence of each planted flag's
 * description (or the sidecar's notes for a clean document).
 */
function summaryFromSidecar({ text, sidecar }: Fixture): string {
  const title = text.split("\n").find((l) => l.trim() !== "")?.trim() ?? sidecar.document;
  const parts = sidecar.flags.length
    ? sidecar.flags.map((f) => firstSentence(f.description))
    : [firstSentence(sidecar.notes ?? "")];
  return [`This is a ${title.toLowerCase()}.`, ...parts.filter(Boolean)].join(" ");
}

function firstSentence(text: string): string {
  const m = text.match(/^.*?[.!?](?=\s|$)/);
  return (m ? m[0] : text).trim();
}

/**
 * The overreach assessment the stub reports for each sidecar band. The
 * sidecar records a band, not the model's per-kind assessment, so each band
 * maps to one fixed assessment: "severe" reaches past the deal in several
 * ways, "moderate" in one, anything else not at all.
 */
const BAND_ASSESSMENT: Record<string, { reachesBeyondDeal: boolean; reaches: OverreachKind[] }> = {
  severe: {
    reachesBeyondDeal: true,
    reaches: ["work_outside_this_deal", "before_or_after_the_term", "one_sided"],
  },
  moderate: { reachesBeyondDeal: true, reaches: ["before_or_after_the_term"] },
};

/** A candidate flag in the model's structured shape (FLAGS_SCHEMA). */
export type StubCandidate = {
  category: string;
  sourceSentence: string;
  overreach: string;
  reachesBeyondDeal: boolean;
  reaches: OverreachKind[];
  description: string;
  counterOffer: string;
};

export function candidatesFromSidecar({ sidecar }: Fixture): StubCandidate[] {
  return sidecar.flags.map((f) => ({
    category: f.category,
    sourceSentence: f.sentence,
    overreach: f.overreach,
    ...(BAND_ASSESSMENT[f.severityBand] ?? { reachesBeyondDeal: false, reaches: [] }),
    description: f.description,
    counterOffer: f.counterOffer,
  }));
}
