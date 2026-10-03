import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { prepareSubmission, submitDocument } from "@/app/(app)/analyze/prepare";
import { refusal } from "@/app/(app)/analyze/copy";
import { MAX_DOCUMENT_CHARS } from "@/lib/analysis/limits";

const FIXTURES = path.resolve(import.meta.dirname, "fixtures");
const read = (f: string) => readFileSync(path.join(FIXTURES, f), "utf8");

function spyFetch() {
  const calls: string[] = [];
  const fn = async (url: string, _init?: RequestInit) => {
    calls.push(url);
    return new Response(JSON.stringify({ summary: "A deal.", flags: [] }), { status: 200 });
  };
  return { fn, calls };
}

const refused: Array<[string, "lease" | "terms-of-service"]> = [
  ["scope/residential-lease.txt", "lease"],
  ["scope/commercial-lease.txt", "lease"],
  ["scope/terms-of-service.txt", "terms-of-service"],
];
const sent = ["adhesion-contract.txt", "clean-contract.txt", "scope/statement-of-work.txt"];

describe("prepareSubmission", () => {
  for (const [file, reason] of refused) {
    it(`refuses ${file} as ${reason}`, () => {
      expect(prepareSubmission(read(file))).toEqual({ kind: "refused", reason });
    });
  }

  for (const file of sent) {
    it(`sends ${file} unchanged`, () => {
      const text = read(file);
      expect(prepareSubmission(text)).toEqual({ kind: "send", documentText: text });
    });
  }

  it("refuses an empty paste and an over-long document", () => {
    expect(prepareSubmission("  \n ")).toEqual({ kind: "refused", reason: "empty" });
    const long = read("adhesion-contract.txt").repeat(
      Math.ceil((MAX_DOCUMENT_CHARS + 1) / read("adhesion-contract.txt").length),
    );
    expect(prepareSubmission(long)).toEqual({ kind: "refused", reason: "too_long" });
  });

  it("names a long lease as a lease rather than as too long", () => {
    const lease = read("scope/residential-lease.txt");
    const long = lease.repeat(Math.ceil((MAX_DOCUMENT_CHARS + 1) / lease.length));
    expect(prepareSubmission(long)).toEqual({ kind: "refused", reason: "lease" });
  });

  it("has a message for every refusal that names what isn't supported", () => {
    expect(refusal.lease).toMatch(/doesn’t read leases/);
    expect(refusal["terms-of-service"]).toMatch(/doesn’t read terms of service/);
    for (const msg of [refusal.lease, refusal["terms-of-service"]]) {
      expect(msg).toMatch(/freelance agreements and general contracts only/);
      expect(msg).not.toMatch(/yet|soon|later|coming/i);
    }
  });
});

describe("submitDocument", () => {
  for (const [file, reason] of refused) {
    it(`makes no request for ${file}`, async () => {
      const { fn, calls } = spyFetch();
      let sending = false;
      const outcome = await submitDocument(read(file), {
        doFetch: fn,
        onSend: () => (sending = true),
      });
      expect(outcome).toEqual({ kind: "refused", reason });
      expect(calls).toHaveLength(0);
      expect(sending).toBe(false);
    });
  }

  it("sends an in-scope contract once, after onSend", async () => {
    const { fn, calls } = spyFetch();
    const order: string[] = [];
    const outcome = await submitDocument(read("adhesion-contract.txt"), {
      doFetch: async (url, init) => {
        order.push("fetch");
        return fn(url, init);
      },
      onSend: () => order.push("send"),
    });
    expect(calls).toHaveLength(1);
    expect(order).toEqual(["send", "fetch"]);
    expect(outcome).toEqual({
      ok: true,
      result: { summary: "A deal.", flags: [] },
      // The fake server says nothing about saving, so the screen mustn't claim a save.
      save: { saved: false, reason: "save failed" },
    });
  });

  it("leaves redLines out of the body, so the server applies the saved list", async () => {
    const bodies: Record<string, unknown>[] = [];
    await submitDocument(read("adhesion-contract.txt"), {
      doFetch: async (_url, init) => {
        bodies.push(JSON.parse(init.body as string));
        return new Response(JSON.stringify({ summary: "A deal.", flags: [] }), { status: 200 });
      },
    });
    expect(bodies).toHaveLength(1);
    expect(Object.keys(bodies[0])).toEqual(["documentText"]);
    expect(bodies[0]).not.toHaveProperty("redLines");
  });
});
