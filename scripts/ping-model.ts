/**
 * One small structured call through the analysis module's OpenRouter client,
 * to prove the key, model and provider pin work together.
 *
 *   pnpm exec tsx scripts/ping-model.ts
 *
 * Reads .env.local. Prints the parsed JSON or the error; never the key.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { createOpenRouterClient } from "../lib/analysis/openrouter";

const envFile = path.resolve(process.cwd(), ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const schema = {
  type: "object",
  properties: {
    reply: { type: "string", description: "The single word pong." },
    model_followed_schema: { type: "boolean" },
  },
  required: ["reply", "model_followed_schema"],
  additionalProperties: false,
};

async function main() {
  console.log(`Model: ${process.env.OPENROUTER_MODEL || "(OPENROUTER_MODEL not set)"}`);
  const client = createOpenRouterClient();
  const out = await client.completeJson<{ reply: string; model_followed_schema: boolean }>({
    system: "You answer health checks. Reply with JSON only.",
    user: 'Reply with reply set to "pong" and model_followed_schema set to true.',
    schemaName: "ping",
    schema,
  });
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
  process.exit(1);
});
