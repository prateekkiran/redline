/**
 * A clean document is a real output (ADR 0005, ticket 05). The whole
 * pipeline runs for real here, including the OpenRouter client: only the
 * HTTP call is replaced, by a fetch that answers from the fixture's sidecar.
 *
 * - The clean contract comes back with zero flags and a summary.
 * - When the model proposes only candidates that stay inside the deal, the
 *   result is still zero flags: nothing pads it back up.
 * - Across every fixture, at least one yields zero flags and at least one
 *   yields flags. A pipeline that finds something in every document, the
 *   boring ones included, fails here.
 */

import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeDocument, type AnalysisResult } from "@/lib/analysis";
import { createOpenRouterClient } from "@/lib/analysis/openrouter";
import { NO_REACH } from "@/lib/analysis/severity";
import {
  createStubModel,
  FIXTURES,
  loadFixture,
  type Fixture,
  type StubOptions,
} from "./support/stub-model";

const ENV = { OPENROUTER_API_KEY: "test-key", OPENROUTER_MODEL: "test/model", OPENROUTER_PROVIDER: "test-provider" };

/**
 * A fetch that plays OpenRouter: it reads the request body the real client
 * built, asks the sidecar-backed stub for the reply to that schema, and
 * wraps it in a chat-completions response.
 */
function sidecarFetch(fixture: Fixture, options: StubOptions = {}) {
  const stub = createStubModel(fixture, options);
  return async (_url: string, init: RequestInit): Promise<Response> => {
    const body = JSON.parse(String(init.body)) as {
      messages: { role: string; content: string }[];
      response_format: { json_schema: { name: string; schema: object } };
    };
    const reply = await stub.completeJson<unknown>({
      system: body.messages.find((m) => m.role === "system")?.content ?? "",
      user: body.messages.find((m) => m.role === "user")?.content ?? "",
      schemaName: body.response_format.json_schema.name,
      schema: body.response_format.json_schema.schema,
    });
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(reply) }, finish_reason: "stop" }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
}

function analyze(fixture: Fixture, options: StubOptions = {}): Promise<AnalysisResult> {
  const client = createOpenRouterClient({ fetch: sidecarFetch(fixture, options), env: ENV });
  return analyzeDocument(fixture.text, [], { client });
}

/** Every `<name>.txt` under tests/fixtures that has a sidecar, by relative name. */
function allFixtureNames(dir = FIXTURES, prefix = ""): string[] {
  const names: string[] = [];
  for (const entry of readdirSync(dir).sort()) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      // scope/ holds leases and terms of service: the scope gate rejects them
      // before analysis, so they have no sidecar and never reach the model.
      if (prefix === "" && entry === "scope") continue;
      names.push(...allFixtureNames(full, `${prefix}${entry}/`));
    } else if (entry.endsWith(".txt")) {
      names.push(`${prefix}${entry.slice(0, -".txt".length)}`);
    }
  }
  return names;
}

const clean = loadFixture("clean-contract");

describe("a clean document", () => {
  it("returns zero flags and a non-empty summary for the clean contract", async () => {
    expect(clean.sidecar.flags).toEqual([]);
    const result = await analyze(clean);
    expect(result.flags).toEqual([]);
    expect(result.summary.trim().length).toBeGreaterThan(0);
  });

  it("returns zero flags when every candidate the model proposes stays inside the deal", async () => {
    const withinDeal = [
      {
        category: "termination_for_convenience",
        sentence:
          "Either party may terminate this Agreement for any reason by giving the other party 14 days' written notice.",
      },
      {
        category: "ip_assignment",
        sentence:
          "Once Client has paid the full fee, Designer assigns to Client the copyright in the final Deliverables.",
      },
      {
        category: "liability_indemnity",
        sentence:
          "Each party's total liability to the other under this Agreement is limited to the total fee payable under this Agreement, except for unpaid fees owed to Designer.",
      },
    ].map(({ category, sentence }) => {
      // Real sentences from the document, so the only reason to drop them
      // is that they reach past the deal in no way.
      expect(clean.text).toContain(sentence);
      return {
        category,
        sourceSentence: sentence,
        overreach: "It stays inside the deal.",
        reach: { ...NO_REACH },
        description: "This clause stays inside the job.",
        counterOffer: "",
      };
    });

    const result = await analyze(clean, { candidates: withinDeal });
    expect(result.flags).toEqual([]);
    expect(result.summary.trim().length).toBeGreaterThan(0);
  });

  it("returns zero flags when the model proposes no candidates at all", async () => {
    const result = await analyze(clean, { candidates: [] });
    expect(result.flags).toEqual([]);
  });
});

describe("across every fixture", () => {
  const names = allFixtureNames();

  it("covers the adhesion, clean and pair fixtures", () => {
    expect(names).toEqual(
      expect.arrayContaining([
        "adhesion-contract",
        "clean-contract",
        "pairs/arbitration-narrow",
        "pairs/arbitration-broad",
        "pairs/ip-in-scope",
        "pairs/ip-overreaching",
      ]),
    );
  });

  it("at least one fixture yields zero flags and at least one yields flags", async () => {
    const counts = await Promise.all(
      names.map(async (name) => {
        const fixture = loadFixture(name);
        const result = await analyze(fixture);
        // Each fixture yields exactly its sidecar's flags that reach past
        // the deal: nothing added to fill an empty result, nothing lost.
        const expected = fixture.sidecar.flags.filter((f) => f.severityBand !== "within-deal");
        expect(result.flags.map((f) => f.sourceSentence).sort(), name).toEqual(
          expected.map((f) => f.sentence).sort(),
        );
        return { name, flags: result.flags.length };
      }),
    );

    const zero = counts.filter((c) => c.flags === 0).map((c) => c.name);
    const flagged = counts.filter((c) => c.flags > 0).map((c) => c.name);
    expect(zero, "no fixture came back clean").not.toEqual([]);
    expect(flagged, "no fixture came back with a flag").not.toEqual([]);
    expect(zero).toEqual(
      expect.arrayContaining(["clean-contract", "pairs/arbitration-narrow", "pairs/ip-in-scope"]),
    );
  });
});
