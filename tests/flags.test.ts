import { describe, expect, it } from "vitest";
import {
  AnalysisOutputError,
  analyzeDocument,
  type FlagDiagnostics,
} from "@/lib/analysis";
import { MIN_SENTENCE_CHARS } from "@/lib/analysis/citations";
import { NO_REACH } from "@/lib/analysis/severity";
import {
  candidatesFromSidecar,
  createStubModel,
  loadFixture,
  type Fixture,
  type StubCandidate,
} from "./support/stub-model";

const adhesion = loadFixture("adhesion-contract");
const clean = loadFixture("clean-contract");
const planted = candidatesFromSidecar(adhesion);
const byId = (id: string) => {
  const f = adhesion.sidecar.flags.find((x) => x.id === id);
  if (!f) throw new Error(`no planted flag ${id}`);
  return f;
};

async function run(fixture: Fixture, opts: Parameters<typeof createStubModel>[1] = {}, text = fixture.text) {
  let diagnostics: FlagDiagnostics | undefined;
  const client = createStubModel(fixture, opts);
  const result = await analyzeDocument(text, [], {
    client,
    onDiagnostics: (d) => (diagnostics = d),
  });
  if (!diagnostics) throw new Error("onDiagnostics was not called");
  return { result, diagnostics };
}

function candidate(over: Partial<StubCandidate> & { sourceSentence: string }): StubCandidate {
  return {
    category: "ip_assignment",
    overreach: "It reaches past the deal.",
    reach: { ...NO_REACH, subject: "some" },
    description: "This clause takes more than the deal needs.",
    counterOffer: "Limit this clause to the Deliverables.",
    ...over,
  };
}

describe("citation integrity", () => {
  for (const fixture of [adhesion, clean]) {
    it(`every flag for ${fixture.name} quotes an exact substring of the document`, async () => {
      const { result } = await run(fixture);
      expect(result.flags).toHaveLength(fixture.sidecar.flags.length);
      for (const flag of result.flags) {
        expect(fixture.text.includes(flag.sourceSentence)).toBe(true);
        expect(flag.sourceSentence.length).toBeGreaterThanOrEqual(MIN_SENTENCE_CHARS);
      }
    });
  }

  it("returns each planted clause with its description, counter-offer and category", async () => {
    const { result } = await run(adhesion);
    const sentences = result.flags.map((f) => f.sourceSentence).sort();
    expect(sentences).toEqual(adhesion.sidecar.flags.map((f) => f.sentence).sort());
    for (const flag of result.flags) {
      const source = adhesion.sidecar.flags.find((f) => f.sentence === flag.sourceSentence)!;
      expect(flag.description).toBe(source.description);
      expect(flag.counterOffer).toBe(source.counterOffer);
      expect(flag.category).toBe(source.category);
      expect(flag.origin).toBe("baseline");
    }
  });

  it("returns no flags for the clean document when the model proposes none", async () => {
    const { result, diagnostics } = await run(clean);
    expect(result.flags).toEqual([]);
    expect(diagnostics.proposed).toBe(0);
  });
});

describe("dropping candidates that don't cite the document", () => {
  it("drops a paraphrased quote and nothing about it reaches the result", async () => {
    const paraphrase = candidate({
      sourceSentence:
        "Contractor gives Client ownership of everything Contractor makes during the agreement and for a year afterwards.",
      description: "PARAPHRASE-ONLY description that must not appear.",
      counterOffer: "PARAPHRASE-ONLY counter-offer that must not appear.",
    });
    const { result, diagnostics } = await run(adhesion, { extraCandidates: [paraphrase] });
    expect(result.flags).toHaveLength(planted.length);
    const out = JSON.stringify(result);
    expect(out).not.toContain(paraphrase.sourceSentence);
    expect(out).not.toContain("PARAPHRASE-ONLY");
    expect(diagnostics).toMatchObject({ proposed: planted.length + 1, notInDocument: 1, kept: planted.length });
  });

  it("drops a quote with one word changed", async () => {
    const sentence = byId("non-compete").sentence.replace("twelve months", "six months");
    const { result } = await run(adhesion, { candidates: [candidate({ sourceSentence: sentence })] });
    expect(result.flags).toEqual([]);
  });

  it("drops a quote whose capitalisation differs", async () => {
    const sentence = byId("non-compete").sentence.toUpperCase();
    const { result } = await run(adhesion, { candidates: [candidate({ sourceSentence: sentence })] });
    expect(result.flags).toEqual([]);
  });

  it("drops a quote that adds an ellipsis to skip words", async () => {
    const full = byId("indemnity").sentence;
    const sentence = `${full.slice(0, 60)}... ${full.slice(-60)}`;
    const { result } = await run(adhesion, { candidates: [candidate({ sourceSentence: sentence })] });
    expect(result.flags).toEqual([]);
  });

  it("drops empty and too-short quotes, even when they are in the document", async () => {
    const short = "Client may terminate"; // 20 chars, in the document
    const tooShort = short.slice(0, MIN_SENTENCE_CHARS - 1);
    expect(adhesion.text.includes(tooShort)).toBe(true);
    const { result, diagnostics } = await run(adhesion, {
      candidates: [
        candidate({ sourceSentence: "" }),
        candidate({ sourceSentence: "   " }),
        candidate({ sourceSentence: tooShort }),
        candidate({ sourceSentence: short, category: "termination_for_convenience" }),
      ],
    });
    expect(diagnostics.tooShort).toBe(3);
    expect(result.flags.map((f) => f.sourceSentence)).toEqual([short]);
  });

  it("drops a malformed candidate and keeps the rest", async () => {
    const { result, diagnostics } = await run(adhesion, {
      extraCandidates: [
        { ...planted[0], category: "fee_escalator" },
        { ...planted[1], description: "" },
        { sourceSentence: planted[2].sourceSentence },
        "not an object",
      ],
    });
    expect(result.flags).toHaveLength(planted.length);
    expect(diagnostics.malformed).toBe(4);
  });

  it("throws AnalysisOutputError when the reply has no flag list", async () => {
    const client = createStubModel(adhesion, { override: { document_flags: () => ({ flag: [] }) } });
    await expect(analyzeDocument(adhesion.text, [], { client })).rejects.toBeInstanceOf(
      AnalysisOutputError,
    );
  });
});

describe("near-miss quotes", () => {
  it("recovers a quote with curly quotes and doubled spaces to the document's own span", async () => {
    const exact = byId("auto-renewal").sentence;
    expect(exact).toContain("Client's");
    const modelText = exact.replace("Client's", "Client’s").replace(/ /g, "  ");
    const { result } = await run(adhesion, {
      candidates: [candidate({ sourceSentence: modelText, category: "auto_renewal" })],
    });
    // Either recovered to the exact span or dropped; never the model's text.
    for (const flag of result.flags) {
      expect(flag.sourceSentence).not.toBe(modelText);
      expect(adhesion.text.includes(flag.sourceSentence)).toBe(true);
    }
    // This implementation recovers it.
    expect(result.flags.map((f) => f.sourceSentence)).toEqual([exact]);
  });

  it("recovers a quote across a line break as the document's span, line break included", async () => {
    // The fixture as a PDF might extract it: the sentence wraps mid-line.
    const exact = byId("non-compete").sentence;
    const wrapped = exact.replace("design or development", "design or\ndevelopment");
    const text = adhesion.text.replace(exact, wrapped);
    expect(text).not.toBe(adhesion.text);
    const { result } = await run(
      adhesion,
      { candidates: [candidate({ sourceSentence: exact, category: "non_compete" })] },
      text,
    );
    expect(result.flags.map((f) => f.sourceSentence)).toEqual([wrapped]);
    expect(text.includes(result.flags[0].sourceSentence)).toBe(true);
  });

  it("trims whitespace the model added around a quote", async () => {
    const exact = byId("arbitration").sentence;
    const { result } = await run(adhesion, {
      candidates: [candidate({ sourceSentence: `\n  ${exact}  `, category: "arbitration" })],
    });
    expect(result.flags.map((f) => f.sourceSentence)).toEqual([exact]);
  });
});

describe("ranking", () => {
  it("orders flags by severity, descending, with document order breaking ties", async () => {
    const { result } = await run(adhesion);
    const severities = result.flags.map((f) => f.severity);
    expect([...severities].sort((a, b) => b - a)).toEqual(severities);

    const position = (s: string) => adhesion.text.indexOf(s);
    for (let i = 1; i < result.flags.length; i++) {
      const a = result.flags[i - 1];
      const b = result.flags[i];
      if (a.severity === b.severity) {
        expect(position(a.sourceSentence)).toBeLessThan(position(b.sourceSentence));
      }
    }
  });

  it("ranks the moderate planted clause below every severe one", async () => {
    const { result } = await run(adhesion);
    expect(result.flags.at(-1)?.sourceSentence).toBe(byId("non-compete").sentence);
    const moderate = result.flags.at(-1)!.severity;
    for (const flag of result.flags.slice(0, -1)) expect(flag.severity).toBeGreaterThan(moderate);
  });

  it("ranks by the overreach assessment, not by category or the model's order", async () => {
    const arbitration = byId("arbitration").sentence;
    const indemnity = byId("indemnity").sentence;
    const ip = byId("ip-assignment").sentence;
    const { result } = await run(adhesion, {
      candidates: [
        candidate({ sourceSentence: ip, reach: { ...NO_REACH, ownAssets: "some" } }),
        candidate({
          sourceSentence: arbitration,
          category: "arbitration",
          reach: { ...NO_REACH, subject: "far" },
        }),
        candidate({
          sourceSentence: indemnity,
          category: "liability_indemnity",
          reach: { ...NO_REACH, exposure: "far", others: "some", oneSided: "far" },
        }),
      ],
    });
    expect(result.flags.map((f) => f.sourceSentence)).toEqual([indemnity, arbitration, ip]);
  });

  it("gives severity as a number with no label", async () => {
    const { result } = await run(adhesion);
    for (const flag of result.flags) expect(typeof flag.severity).toBe("number");
  });
});

describe("de-duplication", () => {
  it("collapses two candidates citing the same sentence in the same category, keeping the more severe", async () => {
    const ip = planted.find((c) => c.category === "ip_assignment")!;
    const weaker = {
      ...ip,
      reach: { ...NO_REACH, time: "some" as const },
      description: "A weaker reading of the same clause.",
    };
    const { result, diagnostics } = await run(adhesion, {
      candidates: [weaker, ip],
    });
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].description).toBe(ip.description);
    expect(diagnostics.duplicate).toBe(1);
  });

  it("treats a near-miss of an exact quote as the same sentence", async () => {
    const ip = planted.find((c) => c.category === "ip_assignment")!;
    const spaced = { ...ip, sourceSentence: ip.sourceSentence.replace(/ /g, "  ") };
    const { result } = await run(adhesion, { candidates: [ip, spaced] });
    expect(result.flags).toHaveLength(1);
  });

  it("keeps the same sentence flagged under two different categories", async () => {
    const ip = planted.find((c) => c.category === "ip_assignment")!;
    const { result } = await run(adhesion, {
      candidates: [ip, { ...ip, category: "non_compete" }],
    });
    expect(result.flags.map((f) => f.category).sort()).toEqual(["ip_assignment", "non_compete"]);
  });
});
