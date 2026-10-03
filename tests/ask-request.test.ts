import { describe, expect, it } from "vitest";
import { ASK_ENDPOINT, askQuestion, QUESTION_LIMIT } from "@/app/(app)/analyze/request";
import { MAX_QUESTION_CHARS } from "@/lib/analysis";
import { loadFixture } from "./support/stub-model";

const adhesion = loadFixture("adhesion-contract");
const quote = adhesion.sidecar.flags[0].sentence;

type Call = { url: string; init: RequestInit };

function fakeFetch(status: number, body: unknown) {
  const calls: Call[] = [];
  const fn = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  };
  return { fn, calls };
}

describe("askQuestion", () => {
  it("posts only the document text and the question, as a JSON string", async () => {
    const { fn, calls } = fakeFetch(200, { declined: true });
    await askQuestion(adhesion.text, "When am I paid?", fn);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(ASK_ENDPOINT);
    expect(calls[0].init.method).toBe("POST");
    expect(new Headers(calls[0].init.headers).get("content-type")).toBe("application/json");
    expect(typeof calls[0].init.body).toBe("string");
    const body = JSON.parse(calls[0].init.body as string);
    expect(body).toEqual({ documentText: adhesion.text, question: "When am I paid?" });
  });

  it("returns an answer with its quoted sentence", async () => {
    const { fn } = fakeFetch(200, { answer: "Within 30 days.", quote });
    expect(await askQuestion(adhesion.text, "When am I paid?", fn)).toEqual({
      kind: "answered",
      answer: "Within 30 days.",
      quote,
    });
  });

  it("treats a decline as an answer, not a failure", async () => {
    const { fn } = fakeFetch(200, { declined: true });
    expect(await askQuestion(adhesion.text, "Who owns the moon?", fn)).toEqual({ kind: "declined" });
  });

  it("passes the server's 422 message through", async () => {
    const { fn } = fakeFetch(422, { error: "Type a question first." });
    expect(await askQuestion(adhesion.text, " ", fn)).toEqual({
      kind: "failed",
      status: 422,
      message: "Type a question first.",
    });
  });

  it("reports a 502 as a failure with the server's message", async () => {
    const { fn } = fakeFetch(502, { error: "Redline couldn't answer that." });
    const out = await askQuestion(adhesion.text, "When am I paid?", fn);
    expect(out).toEqual({ kind: "failed", status: 502, message: "Redline couldn't answer that." });
  });

  it("falls back to its own message when the error body isn't JSON", async () => {
    const { fn } = fakeFetch(502, "<html>Bad gateway</html>");
    const out = await askQuestion(adhesion.text, "When am I paid?", fn);
    expect(out.kind).toBe("failed");
    if (out.kind === "failed") {
      expect(out.status).toBe(502);
      expect(out.message).not.toMatch(/html/i);
      expect(out.message.length).toBeGreaterThan(0);
    }
  });

  it("reports a network failure with status 0", async () => {
    const fn = async () => {
      throw new TypeError("Failed to fetch");
    };
    const out = await askQuestion(adhesion.text, "When am I paid?", fn);
    expect(out.kind).toBe("failed");
    if (out.kind === "failed") {
      expect(out.status).toBe(0);
      expect(out.message).toMatch(/connection/i);
    }
  });

  it("doesn't accept a 200 answer with no quote", async () => {
    const { fn } = fakeFetch(200, { answer: "Within 30 days." });
    expect((await askQuestion(adhesion.text, "When am I paid?", fn)).kind).toBe("failed");
  });

  it("uses the same question limit as the server", () => {
    expect(QUESTION_LIMIT).toBe(MAX_QUESTION_CHARS);
  });
});
