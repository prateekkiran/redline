import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createOpenRouterClient,
  ModelCallError,
  OPENROUTER_URL,
} from "@/lib/analysis/openrouter";

const KEY = "sk-or-test-key-123";

const schema = {
  type: "object",
  properties: { ok: { type: "boolean" } },
  required: ["ok"],
  additionalProperties: false,
};

const args = { system: "sys", user: "hello", schemaName: "ping", schema };

type Call = { url: string; init: RequestInit };

function fakeFetch(status: number, body: unknown) {
  const calls: Call[] = [];
  const fn = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const text = typeof body === "string" ? body : JSON.stringify(body);
    return new Response(text, { status });
  };
  return { fn, calls };
}

function chat(content: string) {
  return { choices: [{ message: { role: "assistant", content }, finish_reason: "stop" }] };
}

beforeEach(() => {
  vi.stubEnv("OPENROUTER_API_KEY", KEY);
  vi.stubEnv("OPENROUTER_MODEL", "vendor/model-from-env");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createOpenRouterClient request", () => {
  it("posts to OpenRouter with the provider pin, reasoning, json_schema and the env model", async () => {
    const { fn, calls } = fakeFetch(200, chat('{"ok":true}'));
    const client = createOpenRouterClient({ fetch: fn });

    const out = await client.completeJson<{ ok: boolean }>(args);

    expect(out).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(OPENROUTER_URL);
    expect(calls[0].init.method).toBe("POST");
    const headers = new Headers(calls[0].init.headers);
    expect(headers.get("authorization")).toBe(`Bearer ${KEY}`);

    const body = JSON.parse(String(calls[0].init.body));
    expect(body.model).toBe("vendor/model-from-env");
    expect(body.provider).toEqual({
      order: ["fireworks"],
      allow_fallbacks: false,
      require_parameters: true,
      data_collection: "deny",
    });
    expect(body.reasoning).toEqual({ effort: "low" });
    expect(body.response_format).toEqual({
      type: "json_schema",
      json_schema: { name: "ping", strict: true, schema },
    });
    expect(body.messages).toEqual([
      { role: "system", content: "sys" },
      { role: "user", content: "hello" },
    ]);
  });

  it("reads the model from the environment on each call", async () => {
    const { fn, calls } = fakeFetch(200, chat('{"ok":true}'));
    const client = createOpenRouterClient({ fetch: fn });
    await client.completeJson(args);
    vi.stubEnv("OPENROUTER_MODEL", "other/model");
    await client.completeJson(args);
    expect(JSON.parse(String(calls[1].init.body)).model).toBe("other/model");
  });

  it("accepts JSON wrapped in a code fence", async () => {
    const { fn } = fakeFetch(200, chat('```json\n{"ok":false}\n```'));
    const out = await createOpenRouterClient({ fetch: fn }).completeJson(args);
    expect(out).toEqual({ ok: false });
  });
});

describe("createOpenRouterClient errors", () => {
  it("fails clearly without a key, before any request", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const { fn, calls } = fakeFetch(200, chat("{}"));
    await expect(createOpenRouterClient({ fetch: fn }).completeJson(args)).rejects.toThrow(
      /OPENROUTER_API_KEY is not set/,
    );
    expect(calls).toHaveLength(0);
  });

  it("fails clearly without a model, before any request", async () => {
    vi.stubEnv("OPENROUTER_MODEL", "");
    const { fn, calls } = fakeFetch(200, chat("{}"));
    await expect(createOpenRouterClient({ fetch: fn }).completeJson(args)).rejects.toThrow(
      /OPENROUTER_MODEL is not set/,
    );
    expect(calls).toHaveLength(0);
  });

  it("surfaces status and provider message on non-2xx, without the key", async () => {
    const { fn } = fakeFetch(404, {
      error: {
        code: 404,
        message: `No endpoints found matching your data policy (key ${KEY})`,
        metadata: { provider_name: "Fireworks" },
      },
    });
    const err = await createOpenRouterClient({ fetch: fn })
      .completeJson(args)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ModelCallError);
    const e = err as ModelCallError;
    expect(e.status).toBe(404);
    expect(e.message).toContain("OpenRouter returned 404");
    expect(e.message).toContain("No endpoints found matching your data policy");
    expect(e.message).toContain("Fireworks");
    expect(e.message).not.toContain(KEY);
  });

  it("surfaces a non-JSON error body", async () => {
    const { fn } = fakeFetch(502, "Bad gateway");
    await expect(createOpenRouterClient({ fetch: fn }).completeJson(args)).rejects.toThrow(
      "OpenRouter returned 502: Bad gateway",
    );
  });

  it("treats an error object in a 200 response as a failure", async () => {
    const { fn } = fakeFetch(200, { error: { code: 502, message: "Provider returned error" } });
    await expect(createOpenRouterClient({ fetch: fn }).completeJson(args)).rejects.toThrow(
      /Provider returned error/,
    );
  });

  it("rejects model output that isn't JSON", async () => {
    const { fn } = fakeFetch(200, chat("Sure! Here is your answer: ok"));
    await expect(createOpenRouterClient({ fetch: fn }).completeJson(args)).rejects.toThrow(
      /output for ping isn't valid JSON/,
    );
  });

  it("rejects an empty completion and names the finish reason", async () => {
    const { fn } = fakeFetch(200, {
      choices: [{ message: { content: "" }, finish_reason: "length" }],
    });
    await expect(createOpenRouterClient({ fetch: fn }).completeJson(args)).rejects.toThrow(
      /no content for ping \(finish_reason: length\)/,
    );
  });

  it("reports a network failure without the key", async () => {
    const fn = async () => {
      throw new Error("getaddrinfo ENOTFOUND openrouter.ai");
    };
    await expect(createOpenRouterClient({ fetch: fn }).completeJson(args)).rejects.toThrow(
      /Could not reach OpenRouter: getaddrinfo ENOTFOUND/,
    );
  });
});
