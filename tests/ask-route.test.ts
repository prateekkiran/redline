import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/ask/route";
import { ANSWER_SCHEMA_NAME } from "@/lib/analysis/prompts";
import { FABRICATED_QUOTE, loadFixture } from "./support/stub-model";

const adhesion = loadFixture("adhesion-contract");
const questions = adhesion.sidecar.questions!;
const KEY = "sk-or-route-test-key";

function post(body: BodyInit, contentType?: string) {
  const headers = contentType ? { "content-type": contentType } : undefined;
  return new Request("http://localhost/api/ask", { method: "POST", body, headers });
}

const json = (value: unknown) => post(JSON.stringify(value), "application/json");

/** OpenRouter's reply envelope around the model's structured JSON. */
const reply = (content: unknown) =>
  new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), {
    status: 200,
  });

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // No Supabase project: the route answers without an account.
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  vi.stubEnv("OPENROUTER_API_KEY", KEY);
  vi.stubEnv("OPENROUTER_MODEL", "vendor/model");
  vi.stubEnv("OPENROUTER_PROVIDER", "vendor-provider");
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/ask", () => {
  it("refuses a multipart upload with 415, before any model call", async () => {
    const form = new FormData();
    form.set("file", new Blob(["%PDF-1.7"], { type: "application/pdf" }), "contract.pdf");
    expect((await POST(post(form))).status).toBe(415);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses invalid JSON and missing fields with 400", async () => {
    expect((await POST(post("{nope", "application/json"))).status).toBe(400);
    expect((await POST(json({ documentText: adhesion.text }))).status).toBe(400);
    expect((await POST(json({ question: "When am I paid?" }))).status).toBe(400);
    expect((await POST(json([1, 2]))).status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses an empty or overlong question, or an empty document, with 422", async () => {
    const empty = await POST(json({ documentText: adhesion.text, question: "  " }));
    expect(empty.status).toBe(422);
    expect((await empty.json()).error).toMatch(/question/i);
    const long = await POST(json({ documentText: adhesion.text, question: "a".repeat(501) }));
    expect(long.status).toBe(422);
    expect((await POST(json({ documentText: " ", question: "When am I paid?" }))).status).toBe(422);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns the answer and its quote from the document", async () => {
    const q = questions.answerable[0];
    fetchSpy.mockImplementation(async () =>
      reply({ answerable: true, answer: q.answer, supportingQuote: q.supportingSentence }),
    );
    const res = await POST(json({ documentText: adhesion.text, question: q.question }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ answer: q.answer, quote: q.supportingSentence });
    const sent = JSON.parse(String(fetchSpy.mock.calls[0][1].body));
    expect(sent.response_format.json_schema.name).toBe(ANSWER_SCHEMA_NAME);
    expect(JSON.stringify(sent.messages)).toContain(q.question);
  });

  it("returns a decline as a normal 200 answer", async () => {
    fetchSpy.mockImplementation(async () => reply({ answerable: false, answer: "", supportingQuote: "" }));
    const res = await POST(json({ documentText: adhesion.text, question: questions.unanswerable[0] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ declined: true });
  });

  it("declines an answer whose quote isn't in the document", async () => {
    fetchSpy.mockImplementation(async () =>
      reply({ answerable: true, answer: "Yes, 1.5 percent a month.", supportingQuote: FABRICATED_QUOTE }),
    );
    const res = await POST(json({ documentText: adhesion.text, question: questions.unanswerable[0] }));
    expect(await res.json()).toEqual({ declined: true });
  });

  it("maps a provider failure to 502 without leaking the provider's message or the key", async () => {
    fetchSpy.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            error: { code: 404, message: `No endpoints found (key ${KEY})`, metadata: { provider_name: "Fireworks" } },
          }),
          { status: 404 },
        ),
    );
    const res = await POST(json({ documentText: adhesion.text, question: "When am I paid?" }));
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).not.toContain(KEY);
    expect(text).not.toMatch(/fireworks|endpoint|openrouter/i);
  });

  it("maps malformed model output to 502", async () => {
    fetchSpy.mockImplementation(async () => reply({ answer: "yes" }));
    expect((await POST(json({ documentText: adhesion.text, question: "When am I paid?" }))).status).toBe(502);
  });

  it("maps a missing key to 502 without naming the variable", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const res = await POST(json({ documentText: adhesion.text, question: "When am I paid?" }));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain("OPENROUTER");
  });
});
