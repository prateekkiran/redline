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
  ANSWER_SCHEMA_NAME,
  COUNTER_OFFERS_SCHEMA_NAME,
  FLAGS_SCHEMA_NAME,
  SUMMARY_SCHEMA_NAME,
} from "@/lib/analysis/prompts";
import { NO_REACH, type OverreachAssessment } from "@/lib/analysis/severity";

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
  questions?: {
    answerable: { question: string; answer: string; supportingSentence: string }[];
    unanswerable: string[];
  };
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
  /**
   * The follow-up counter-offer call answers every clause with "" (the
   * model failing to draft one), instead of the sidecar's counter-offer.
   */
  emptyCounterOffers?: boolean;
  /**
   * The answer call answers every question confidently, quoting a sentence
   * that is NOT in the document (the model inventing support).
   */
  fabricateAnswers?: boolean;
};

/** A plausible-sounding sentence that appears in no fixture. */
export const FABRICATED_QUOTE =
  "Client will pay interest of 1.5 percent per month on any invoice not paid within 30 days.";

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
        case COUNTER_OFFERS_SCHEMA_NAME:
          return {
            counterOffers: sentencesAsked(args.user).map((sentence) => ({
              sourceSentence: sentence,
              counterOffer: options.emptyCounterOffers
                ? ""
                : (fixture.sidecar.flags.find((f) => f.sentence === sentence)?.counterOffer ?? ""),
            })),
          } as T;
        case ANSWER_SCHEMA_NAME:
          return answerFromSidecar(fixture, args.user, options) as T;
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
 * sidecar records a band, not the model's per-dimension assessment, so each
 * band maps to one fixed assessment: "severe" reaches far on several
 * dimensions, "moderate" a bounded distance on two, and "within-deal" not at
 * all (a clause a recall-leaning model proposes but that stays inside the
 * deal; the pipeline drops it).
 */
export const BAND_ASSESSMENT: Record<string, OverreachAssessment> = {
  severe: { ...NO_REACH, time: "far", subject: "far", others: "some", oneSided: "far" },
  moderate: { ...NO_REACH, time: "some", others: "some" },
  "within-deal": { ...NO_REACH },
};

/** A candidate flag in the model's structured shape (FLAGS_SCHEMA). */
export type StubCandidate = {
  category: string;
  sourceSentence: string;
  overreach: string;
  reach: OverreachAssessment;
  description: string;
  counterOffer: string;
};

export function candidatesFromSidecar({ name, sidecar }: Fixture): StubCandidate[] {
  return sidecar.flags.map((f) => {
    const reach = BAND_ASSESSMENT[f.severityBand];
    if (!reach) throw new Error(`Fixture ${name}: unknown severityBand "${f.severityBand}"`);
    return {
      category: f.category,
      sourceSentence: f.sentence,
      overreach: f.overreach,
      reach: { ...reach },
      description: f.description,
      counterOffer: f.counterOffer,
    };
  });
}

/** The clause sentences a counter-offer follow-up request asks about. */
export function sentencesAsked(user: string): string[] {
  return [...user.matchAll(/<sentence>([\s\S]*?)<\/sentence>/g)].map((m) => m[1]);
}

/** The question an answer request asks. */
export function questionAsked(user: string): string {
  return user.match(/<question>\n?([\s\S]*?)\n?<\/question>/)?.[1].trim() ?? "";
}

/**
 * The model's structured answer for a sidecar question: the sidecar's answer
 * and supporting sentence for an answerable one, answerable false for
 * anything else (including the sidecar's unanswerable questions).
 */
function answerFromSidecar({ sidecar }: Fixture, user: string, options: StubOptions) {
  const question = questionAsked(user);
  if (options.fabricateAnswers) {
    return {
      answerable: true,
      answer: "Yes, Client pays 1.5 percent interest a month on late invoices.",
      supportingQuote: FABRICATED_QUOTE,
    };
  }
  const known = sidecar.questions?.answerable.find((q) => q.question === question);
  if (!known) return { answerable: false, answer: "", supportingQuote: "" };
  return { answerable: true, answer: known.answer, supportingQuote: known.supportingSentence };
}
