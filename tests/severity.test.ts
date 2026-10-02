import { describe, expect, it } from "vitest";
import { findHedges } from "@/lib/analysis/hedges";
import {
  isOverreach,
  NO_REACH,
  readAssessment,
  REACH_DIMENSIONS,
  REACH_LEVELS,
  severityFrom,
  type OverreachAssessment,
  type ReachLevel,
} from "@/lib/analysis/severity";

/** Every possible assessment: 3 levels on each of 7 dimensions. */
function allAssessments(): OverreachAssessment[] {
  let out: Partial<OverreachAssessment>[] = [{}];
  for (const d of REACH_DIMENSIONS) {
    out = out.flatMap((a) => REACH_LEVELS.map((l) => ({ ...a, [d]: l })));
  }
  return out as OverreachAssessment[];
}

const next: Record<ReachLevel, ReachLevel | null> = { none: "some", some: "far", far: null };

/** a reaches at least as far as b everywhere, and further somewhere. */
function dominates(a: OverreachAssessment, b: OverreachAssessment): boolean {
  const rank = (l: ReachLevel) => REACH_LEVELS.indexOf(l);
  let further = false;
  for (const d of REACH_DIMENSIONS) {
    if (rank(a[d]) < rank(b[d])) return false;
    if (rank(a[d]) > rank(b[d])) further = true;
  }
  return further;
}

describe("severityFrom", () => {
  const every = allAssessments();

  it("scores zero for a clause with no reach", () => {
    expect(severityFrom(NO_REACH)).toBe(0);
  });

  it("raising any one dimension by one level always raises the score", () => {
    for (const a of every) {
      for (const d of REACH_DIMENSIONS) {
        const up = next[a[d]];
        if (!up) continue;
        expect(severityFrom({ ...a, [d]: up })).toBeGreaterThan(severityFrom(a));
      }
    }
  });

  it("an assessment that reaches further everywhere it differs always scores higher", () => {
    // A sample of pairs keeps this fast; the single-step test above already
    // covers every assessment.
    const sample = every.filter((_, i) => i % 7 === 0);
    for (const a of sample) {
      for (const b of sample) {
        if (dominates(a, b)) expect(severityFrom(a)).toBeGreaterThan(severityFrom(b));
      }
    }
  });

  it("treats every dimension the same: the same level on a different dimension scores the same", () => {
    for (const level of ["some", "far"] as const) {
      const scores = REACH_DIMENSIONS.map((d) => severityFrom({ ...NO_REACH, [d]: level }));
      expect(new Set(scores).size).toBe(1);
    }
  });

  it("scores one unlimited reach above two bounded ones", () => {
    const oneFar = { ...NO_REACH, subject: "far" as const };
    const twoSome = { ...NO_REACH, time: "some" as const, others: "some" as const };
    expect(severityFrom(oneFar)).toBeGreaterThan(severityFrom(twoSome));
  });

  it("takes no category: the IP pair and the arbitration pair score by reach alone", () => {
    // The function's only input is the assessment. These two clauses are in
    // different categories but reach the same way, so they score the same.
    const broadIp = { ...NO_REACH, time: "some", subject: "far", others: "far", ownAssets: "far" } as const;
    const broadArbitration = { ...NO_REACH, time: "some", subject: "far", others: "far", oneSided: "far" } as const;
    expect(severityFrom(broadIp)).toBe(severityFrom(broadArbitration));
    expect(severityFrom.length).toBe(1);
  });
});

describe("isOverreach", () => {
  it("is false only when no dimension reaches at all", () => {
    expect(isOverreach(NO_REACH)).toBe(false);
    for (const d of REACH_DIMENSIONS) {
      expect(isOverreach({ ...NO_REACH, [d]: "some" })).toBe(true);
    }
  });
});

describe("readAssessment", () => {
  it("reads a complete assessment", () => {
    const a = { ...NO_REACH, exit: "far" };
    expect(readAssessment(a)).toEqual(a);
  });

  it("rejects a missing dimension, an unknown level, or a non-object", () => {
    const { exit: _omit, ...missing } = NO_REACH;
    void _omit;
    expect(readAssessment(missing)).toBeNull();
    expect(readAssessment({ ...NO_REACH, exit: "huge" })).toBeNull();
    expect(readAssessment({ ...NO_REACH, exit: 2 })).toBeNull();
    expect(readAssessment(null)).toBeNull();
    expect(readAssessment(["none"])).toBeNull();
  });
});

describe("findHedges", () => {
  it("finds hedging words, case-insensitively, in order", () => {
    expect(
      findHedges("This clause May let Client keep your work, and it could possibly cost you."),
    ).toEqual(["may", "possibly"]);
    expect(findHedges("It might apply. Perhaps it is likely. It could potentially apply.")).toEqual([
      "might",
      "perhaps",
      "likely",
      "potentially",
    ]);
    expect(findHedges("The clause seems to cover affiliates and appears to survive.")).toEqual([
      "seems to",
      "appears to",
    ]);
  });

  it("counts permission 'may' as a hedge, since flags say 'can' instead", () => {
    expect(findHedges("Client may end the contract at any time.")).toEqual(["may"]);
  });

  it("does not count 'could' or 'possible' where they state scope rather than doubt", () => {
    expect(findHedges("It covers every possible claim you could ever have against Client.")).toEqual([]);
    expect(findHedges("It is possible that Client keeps your tools.")).toEqual(["it is possible"]);
  });

  it("ignores the month of May and words that only contain a hedge", () => {
    expect(findHedges("The final files are due by May 1, 2026.")).toEqual([]);
    expect(findHedges("Mayfield, unlikely, mightiness, impossibility.")).toEqual([]);
  });

  it("finds nothing in plain statements", () => {
    expect(
      findHedges("This clause lets Client end the contract whenever it likes and pay nothing."),
    ).toEqual([]);
  });
});
