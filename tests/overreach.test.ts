/**
 * Severity by overreach through the real pipeline (ticket 04). The stub
 * replaces only the HTTP call; the assessment it returns is built from each
 * fixture's sidecar band. Whether a real model assesses the pairs correctly
 * is proven in tests/live/severity.test.ts.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeDocument, type FlagDiagnostics } from "@/lib/analysis";
import { findHedges } from "@/lib/analysis/hedges";
import { FLAG_CATEGORIES } from "@/lib/analysis/prompts";
import { NO_REACH } from "@/lib/analysis/severity";
import {
  candidatesFromSidecar,
  createStubModel,
  FIXTURES,
  loadFixture,
  type Fixture,
  type StubCandidate,
} from "./support/stub-model";

const adhesion = loadFixture("adhesion-contract");
const clean = loadFixture("clean-contract");
const PAIRS = [
  { category: "arbitration", narrow: "pairs/arbitration-narrow", broad: "pairs/arbitration-broad" },
  { category: "ip_assignment", narrow: "pairs/ip-in-scope", broad: "pairs/ip-overreaching" },
] as const;

async function run(fixture: Fixture, candidates?: unknown[]) {
  let diagnostics: FlagDiagnostics | undefined;
  const client = createStubModel(fixture, candidates ? { candidates } : {});
  const result = await analyzeDocument(fixture.text, [], {
    client,
    onDiagnostics: (d) => (diagnostics = d),
  });
  return { result, diagnostics: diagnostics! };
}

/** Severity of the flag in this category, or 0 if there is none. */
function severityIn(flags: { category: string; severity: number }[], category: string): number {
  return Math.max(0, ...flags.filter((f) => f.category === category).map((f) => f.severity));
}

describe("fixtures", () => {
  const sidecars = [
    ...readdirSync(FIXTURES).filter((f) => f.endsWith(".json")).map((f) => f),
    ...readdirSync(path.join(FIXTURES, "pairs"))
      .filter((f) => f.endsWith(".json"))
      .map((f) => `pairs/${f}`),
  ];

  for (const file of sidecars) {
    it(`${file}: every sentence appears verbatim, exactly once, in its document`, () => {
      const sidecar = JSON.parse(readFileSync(path.join(FIXTURES, file), "utf8"));
      const text = readFileSync(path.join(FIXTURES, path.dirname(file), sidecar.document), "utf8");
      const sentences: string[] = [
        ...sidecar.flags.map((f: { sentence: string }) => f.sentence),
        ...(sidecar.notFlagged ?? []),
      ];
      for (const s of sentences) expect(text.split(s).length - 1, s).toBe(1);
    });
  }

  for (const pair of PAIRS) {
    it(`${pair.narrow} and ${pair.broad} differ only in the planted clause`, () => {
      const a = loadFixture(pair.narrow).text.split("\n");
      const b = loadFixture(pair.broad).text.split("\n");
      expect(a.length).toBe(b.length);
      const differing = a.map((line, i) => [line, b[i]]).filter(([x, y]) => x !== y);
      const narrowSentence = loadFixture(pair.narrow).sidecar.flags[0].sentence;
      const broadSentence = loadFixture(pair.broad).sidecar.flags[0].sentence;
      expect(differing.length).toBeGreaterThan(0);
      expect(differing.length).toBeLessThanOrEqual(2);
      expect(differing.some(([x]) => x.includes(narrowSentence))).toBe(true);
      expect(differing.some(([, y]) => y.includes(broadSentence))).toBe(true);
      // Both planted clauses sit in the pair's category.
      expect(loadFixture(pair.narrow).sidecar.flags[0].category).toBe(pair.category);
      expect(loadFixture(pair.broad).sidecar.flags[0].category).toBe(pair.category);
    });
  }
});

describe("candidates inside the deal", () => {
  it("drops a candidate the model assessed as reaching nowhere, and counts it", async () => {
    const ip = adhesion.sidecar.flags.find((f) => f.id === "ip-assignment")!;
    const inScope =
      "Upon payment in full, Contractor assigns to Client all rights in the final Deliverables that Contractor creates for Client under this Agreement.";
    const candidates: StubCandidate[] = [
      {
        category: "ip_assignment",
        sourceSentence: inScope,
        overreach: "It covers only the paid Deliverables.",
        reach: { ...NO_REACH },
        description: "This clause gives Client the Deliverables it paid for.",
        counterOffer: "No change needed.",
      },
      ...candidatesFromSidecar(adhesion).filter((c) => c.sourceSentence === ip.sentence),
    ];
    const { result, diagnostics } = await run(adhesion, candidates);
    expect(result.flags.map((f) => f.sourceSentence)).toEqual([ip.sentence]);
    expect(diagnostics.withinDeal).toBe(1);
    expect(diagnostics.kept).toBe(1);
  });

  it("keeps a borderline candidate that reaches a bounded distance on one dimension", async () => {
    const solicit = "During the term of this Agreement, Contractor will not solicit any Client employee to leave Client.";
    const { result } = await run(adhesion, [
      {
        category: "non_compete",
        sourceSentence: solicit,
        overreach: "It restricts Contractor's dealings with Client's staff.",
        reach: { ...NO_REACH, others: "some" },
        description: "This clause stops you from recruiting Client's employees while the contract runs.",
        counterOffer: "Make the restriction mutual.",
      },
    ]);
    expect(result.flags.map((f) => f.sourceSentence)).toEqual([solicit]);
    expect(result.flags[0].severity).toBeGreaterThan(0);
  });

  it("returns no flags when every candidate stays inside the deal", async () => {
    for (const pair of PAIRS) {
      const narrow = loadFixture(pair.narrow);
      const { result, diagnostics } = await run(narrow);
      expect(result.flags).toEqual([]);
      expect(diagnostics.withinDeal).toBe(narrow.sidecar.flags.length);
    }
  });
});

describe("paired fixtures through the pipeline", () => {
  for (const pair of PAIRS) {
    it(`${pair.category}: the broad clause outranks the narrow one`, async () => {
      const narrow = await run(loadFixture(pair.narrow));
      const broad = await run(loadFixture(pair.broad));
      const broadFlags = broad.result.flags.filter((f) => f.category === pair.category);
      expect(broadFlags).toHaveLength(1);
      expect(broadFlags[0].sourceSentence).toBe(loadFixture(pair.broad).sidecar.flags[0].sentence);
      expect(severityIn(broad.result.flags, pair.category)).toBeGreaterThan(
        severityIn(narrow.result.flags, pair.category),
      );
    });
  }

  it("ranks the overreaching IP clause above the in-scope one in the same document", async () => {
    // Adhesion 6.1 (in scope) and 6.2 (overreaching) are the same category.
    const inScope = adhesion.text.match(/6\.1 (.+)/)![1];
    const overreaching = adhesion.sidecar.flags.find((f) => f.id === "ip-assignment")!.sentence;
    const base = {
      category: "ip_assignment",
      overreach: "",
      description: "This clause assigns work to Client.",
      counterOffer: "Limit it to the Deliverables.",
    };
    const { result } = await run(adhesion, [
      { ...base, sourceSentence: inScope, reach: { ...NO_REACH, ownAssets: "some" } },
      {
        ...base,
        sourceSentence: overreaching,
        reach: { ...NO_REACH, time: "some", subject: "far", others: "far", ownAssets: "far" },
      },
    ]);
    expect(result.flags.map((f) => f.sourceSentence)).toEqual([overreaching, inScope]);
  });
});

describe("category never changes severity", () => {
  it("gives the same reach the same severity in all six categories", async () => {
    const sentence = adhesion.sidecar.flags[0].sentence;
    const reach = { ...NO_REACH, time: "some", subject: "far" } as const;
    const { result } = await run(
      adhesion,
      FLAG_CATEGORIES.map((category) => ({
        category,
        sourceSentence: sentence,
        overreach: "",
        reach,
        description: "This clause reaches past the deal.",
        counterOffer: "Limit it to this deal.",
      })),
    );
    expect(result.flags).toHaveLength(6);
    expect(new Set(result.flags.map((f) => f.severity)).size).toBe(1);
  });
});

describe("category coverage", () => {
  it("the adhesion contract yields a flag in each of the six categories, citing the planted sentence", async () => {
    const { result } = await run(adhesion);
    for (const category of FLAG_CATEGORIES) {
      const planted = adhesion.sidecar.flags.find((f) => f.category === category);
      expect(planted, `no planted ${category} clause`).toBeDefined();
      const flag = result.flags.find((f) => f.category === category);
      expect(flag, `no ${category} flag`).toBeDefined();
      expect(flag!.sourceSentence).toBe(planted!.sentence);
    }
  });
});

describe("confident language", () => {
  const fixtures = [
    adhesion,
    clean,
    ...PAIRS.flatMap((p) => [loadFixture(p.narrow), loadFixture(p.broad)]),
  ];
  for (const fixture of fixtures) {
    it(`${fixture.name}: no returned description contains a hedge`, async () => {
      const { result, diagnostics } = await run(fixture);
      for (const flag of result.flags) expect(findHedges(flag.description), flag.description).toEqual([]);
      expect(diagnostics.hedged).toBe(0);
    });
  }

  it("keeps a flag whose description hedges, and counts it", async () => {
    const [first] = candidatesFromSidecar(adhesion);
    const hedged = { ...first, description: "This clause may possibly take your tools." };
    const { result, diagnostics } = await run(adhesion, [hedged]);
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].description).toBe(hedged.description);
    expect(diagnostics.hedged).toBe(1);
  });
});
