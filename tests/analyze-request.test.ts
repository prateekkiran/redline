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
  it("sends only the document text and red lines, as a JSON string", async () => {
    const { fn, calls } = fakeFetch(200, { summary: "A website deal.", flags: [] });
    await requestAnalysis(adhesion.text, ["No non-competes"], fn);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(ANALYZE_ENDPOINT);
    expect(calls[0].init.method).toBe("POST");
    expect(new Headers(calls[0].init.headers).get("content-type")).toBe("application/json");
    // A string body: never FormData, a Blob or a File.
    expect(typeof calls[0].init.body).toBe("string");
    const body = JSON.parse(calls[0].init.body as string);
    expect(Object.keys(body).sort()).toEqual(["documentText", "redLines"]);
    expect(body.documentText).toBe(adhesion.text);
    expect(body.redLines).toEqual(["No non-competes"]);
  });

  it("returns the result on success", async () => {
    const { fn } = fakeFetch(200, { summary: "A website deal.", flags: [] });
    await expect(requestAnalysis("Some text.", [], fn)).resolves.toEqual({
      ok: true,
      result: { summary: "A website deal.", flags: [] },
    });
  });

  it("passes the server's plain message through on failure", async () => {
    const { fn } = fakeFetch(422, { error: "There's no text to read." });
    await expect(requestAnalysis("x", [], fn)).resolves.toEqual({
      ok: false,
      status: 422,
      message: "There's no text to read.",
    });
  });

  it("explains a network failure plainly", async () => {
    const fn = async () => {
      throw new TypeError("Failed to fetch");
    };
    const out = await requestAnalysis("x", [], fn);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.status).toBe(0);
  });
});
