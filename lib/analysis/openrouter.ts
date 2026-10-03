/**
 * The one OpenRouter client. Every model call in Redline goes through here;
 * nothing else talks to a model, and nothing talks to a provider's own API.
 *
 * Privacy rests on the `provider` block below: requests are pinned to the
 * providers named in OPENROUTER_PROVIDER with fallbacks off, `data_collection: "deny"` (only
 * providers that don't store or train on user data) and `zdr: true` (only
 * endpoints with a Zero Data Retention policy). The landing page's privacy statement depends on it, so it is set
 * once, here, and not per call site.
 */

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// The provider list comes from OPENROUTER_PROVIDER (comma-separated, in
// order), because which providers serve a model changes with the model.
// These flags don't: they are the privacy guarantee and stay in code.
export const PROVIDER_ROUTING = {
  allow_fallbacks: false,
  require_parameters: true,
  data_collection: "deny",
  // Stricter than data_collection: only endpoints with a Zero Data
  // Retention policy (OpenRouter provider-routing docs, checked 2026-10-02).
  zdr: true,
} as const;

/** "modelrun, deepinfra" → ["modelrun", "deepinfra"]; blanks dropped. */
export function parseProviders(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
}

export const REASONING = { effort: "low" } as const;

export type CompleteJsonArgs = {
  system: string;
  user: string;
  /** Name for the schema, sent as `json_schema.name`. */
  schemaName: string;
  /** JSON Schema the model's output must match (strict mode). */
  schema: object;
};

export interface ModelClient {
  completeJson<T>(args: CompleteJsonArgs): Promise<T>;
}

export class ModelCallError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ModelCallError";
    this.status = status;
  }
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export type OpenRouterOptions = {
  /** The HTTP boundary. Defaults to global fetch; tests inject a fake. */
  fetch?: FetchLike;
  /** Defaults to process.env; read on every call, never cached. */
  env?: Record<string, string | undefined>;
};

export function createOpenRouterClient(
  options: OpenRouterOptions = {},
): ModelClient {
  const doFetch: FetchLike = options.fetch ?? ((i, init) => fetch(i, init));

  return {
    async completeJson<T>(args: CompleteJsonArgs): Promise<T> {
      const env = options.env ?? process.env;
      const apiKey = env.OPENROUTER_API_KEY?.trim();
      const model = env.OPENROUTER_MODEL?.trim();
      const providers = parseProviders(env.OPENROUTER_PROVIDER);
      if (!apiKey) {
        throw new ModelCallError(
          "OPENROUTER_API_KEY is not set. Add it to .env.local (or the deployment's environment).",
        );
      }
      if (!model) {
        throw new ModelCallError(
          "OPENROUTER_MODEL is not set. Add the OpenRouter model id to .env.local (or the deployment's environment).",
        );
      }
      if (providers.length === 0) {
        throw new ModelCallError(
          "OPENROUTER_PROVIDER is not set. Add the provider slug(s) that serve OPENROUTER_MODEL, comma-separated (e.g. modelrun), to .env.local (or the deployment's environment).",
        );
      }

      const body = {
        model,
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
        provider: { order: providers, ...PROVIDER_ROUTING },
        reasoning: REASONING,
        response_format: {
          type: "json_schema",
          json_schema: { name: args.schemaName, strict: true, schema: args.schema },
        },
      };

      let res: Response;
      try {
        res = await doFetch(OPENROUTER_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "X-Title": "Redline",
          },
          body: JSON.stringify(body),
        });
      } catch (err) {
        throw new ModelCallError(
          redact(`Could not reach OpenRouter: ${errorText(err)}`, apiKey),
        );
      }

      const raw = await res.text();
      const payload = tryParse(raw);

      if (!res.ok) {
        const detail = describeError(payload) ?? (raw.trim().slice(0, 300) || res.statusText);
        throw new ModelCallError(
          redact(`OpenRouter returned ${res.status}: ${detail}`, apiKey),
          res.status,
        );
      }

      if (payload === undefined) {
        throw new ModelCallError(
          "OpenRouter returned a response that isn't JSON.",
          res.status,
        );
      }

      // OpenRouter can answer 200 with an error body when the provider fails.
      const inlineError = describeError(payload);
      if (inlineError) {
        throw new ModelCallError(
          redact(`OpenRouter reported an error: ${inlineError}`, apiKey),
          res.status,
        );
      }

      const choice = (payload as ChatResponse).choices?.[0];
      const content = choice?.message?.content;
      if (typeof content !== "string" || content.trim() === "") {
        throw new ModelCallError(
          `The model returned no content for ${args.schemaName}` +
            (choice?.finish_reason ? ` (finish_reason: ${choice.finish_reason}).` : "."),
          res.status,
        );
      }

      const parsed = tryParse(stripFence(content));
      if (parsed === undefined) {
        throw new ModelCallError(
          `The model's output for ${args.schemaName} isn't valid JSON: ${content.slice(0, 200)}`,
          res.status,
        );
      }
      return parsed as T;
    },
  };
}

type ChatResponse = {
  choices?: { message?: { content?: unknown }; finish_reason?: string }[];
};

type ErrorBody = {
  error?: {
    message?: string;
    code?: number | string;
    metadata?: { provider_name?: string; raw?: unknown };
  };
};

function describeError(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const error = (payload as ErrorBody).error;
  if (!error) return undefined;
  let text = error.message ?? "unknown error";
  const provider = error.metadata?.provider_name;
  const raw = error.metadata?.raw;
  if (provider) text += ` (provider: ${provider})`;
  if (raw !== undefined) {
    const rawText = typeof raw === "string" ? raw : JSON.stringify(raw);
    text += ` — ${rawText.slice(0, 300)}`;
  }
  return text;
}

function tryParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Some providers wrap JSON in a ```json fence even in json_schema mode. */
function stripFence(text: string): string {
  const m = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1] : text.trim();
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function redact(text: string, secret: string): string {
  return secret ? text.split(secret).join("[redacted]") : text;
}
