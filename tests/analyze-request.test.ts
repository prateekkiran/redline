import { describe, expect, it } from "vitest";
import { ANALYZE_ENDPOINT, requestAnalysis } from "@/app/(app)/analyze/request";
import { loadFixture } from "./support/stub-model";

const adhesion = loadFixture("adhesion-contract");

type Call = { url: string; init: RequestInit };

function fakeFetch(status: number, body: unknown) {
  const calls: Call[] = [];
  const fn = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  };
  return { fn, calls };
}

describe("requestAnalysis", () => {
  it("sends only the document text, as a JSON string, with no redLines key", async () => {
    const { fn, calls } = fakeFetch(200, { summary: "A website deal.", flags: [] });
    await requestAnalysis(adhesion.text, fn);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(ANALYZE_ENDPOINT);
    expect(calls[0].init.method).toBe("POST");
    expect(new Headers(calls[0].init.headers).get("content-type")).toBe("application/json");
    // A string body: never FormData, a Blob or a File.
    expect(typeof calls[0].init.body).toBe("string");
    const body = JSON.parse(calls[0].init.body as string);
    // No `redLines` key: leaving it out is what tells the server to apply
    // the reader's saved red lines.
    expect(Object.keys(body)).toEqual(["documentText"]);
    expect("redLines" in body).toBe(false);
    expect(body.documentText).toBe(adhesion.text);
  });

  it("returns the result on success, with whether it was saved", async () => {
    const { fn } = fakeFetch(200, {
      summary: "A website deal.",
      flags: [],
      saved: true,
      documentId: "6f1c1d0e-1a2b-4c3d-8e9f-0a1b2c3d4e5f",
    });
    await expect(requestAnalysis("Some text.", fn)).resolves.toEqual({
      ok: true,
      result: { summary: "A website deal.", flags: [] },
      save: { saved: true, documentId: "6f1c1d0e-1a2b-4c3d-8e9f-0a1b2c3d4e5f" },
    });
  });

  it("reports a failed save without losing the result", async () => {
    const { fn } = fakeFetch(200, { summary: "A website deal.", flags: [], saved: false, reason: "save failed" });
    const outcome = await requestAnalysis("Some text.", fn);
    expect(outcome).toEqual({
      ok: true,
      result: { summary: "A website deal.", flags: [] },
      save: { saved: false, reason: "save failed" },
    });
  });

  it("passes the server's plain message through on failure", async () => {
    const { fn } = fakeFetch(422, { error: "There's no text to read." });
    await expect(requestAnalysis("x", fn)).resolves.toEqual({
      ok: false,
      status: 422,
      message: "There's no text to read.",
    });
  });

  it("explains a network failure plainly", async () => {
    const fn = async () => {
      throw new TypeError("Failed to fetch");
    };
    const out = await requestAnalysis("x", fn);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.status).toBe(0);
  });
});
