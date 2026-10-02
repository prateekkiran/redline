import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/analyze/route";
import { loadFixture } from "./support/stub-model";

const adhesion = loadFixture("adhesion-contract");
const KEY = "sk-or-route-test-key";

function post(body: BodyInit, contentType?: string) {
  const headers = contentType ? { "content-type": contentType } : undefined;
  return new Request("http://localhost/api/analyze", { method: "POST", body, headers });
}

const json = (value: unknown) => post(JSON.stringify(value), "application/json");

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // No Supabase project: the route analyses without an account.
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  vi.stubEnv("OPENROUTER_API_KEY", KEY);
  vi.stubEnv("OPENROUTER_MODEL", "vendor/model");
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/analyze", () => {
  it("refuses a multipart file upload with 415, before any model call", async () => {
    const form = new FormData();
    form.set("file", new Blob(["%PDF-1.7"], { type: "application/pdf" }), "contract.pdf");
    const res = await POST(post(form));
    expect(res.status).toBe(415);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses a raw PDF body with 415", async () => {
    const res = await POST(post(new Blob(["%PDF-1.7"]), "application/pdf"));
    expect(res.status).toBe(415);
  });

  it("refuses invalid JSON with 400", async () => {
    const res = await POST(post("{nope", "application/json"));
    expect(res.status).toBe(400);
  });

  it("refuses a body without document text with 400", async () => {
    expect((await POST(json({ text: "x" }))).status).toBe(400);
    expect((await POST(json({ documentText: "x", redLines: [1] }))).status).toBe(400);
  });

  it("refuses empty text with 422 and a plain message, without calling the model", async () => {
    const res = await POST(json({ documentText: "   \n " }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/no text/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns a summary when the model answers", async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"summary":"A website build for a home goods seller."}' } }],
        }),
        { status: 200 },
      ),
    );
    const res = await POST(json({ documentText: adhesion.text, redLines: [] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      summary: "A website build for a home goods seller.",
      flags: [],
    });
    // Only the document text crossed to OpenRouter, inside a JSON body.
    const sent = JSON.parse(String(fetchSpy.mock.calls[0][1].body));
    expect(JSON.stringify(sent.messages)).toContain("Brightwater Home Goods LLC");
  });

  it("maps a provider failure to 502 without leaking the provider's message or the key", async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 404, message: `No endpoints found (key ${KEY})`, metadata: { provider_name: "Fireworks" } },
        }),
        { status: 404 },
      ),
    );
    const res = await POST(json({ documentText: adhesion.text }));
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).not.toContain(KEY);
    expect(text).not.toMatch(/fireworks|endpoint|openrouter/i);
  });

  it("maps malformed model output to 502", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: '{"summary":""}' } }] }), { status: 200 }),
    );
    expect((await POST(json({ documentText: adhesion.text }))).status).toBe(502);
  });

  it("maps a missing key to 502 without naming the variable", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const res = await POST(json({ documentText: adhesion.text }));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain("OPENROUTER");
  });
});
