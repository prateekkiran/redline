import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

// `pnpm test` runs the offline suite: no key, no network, tests/live left out.
// `pnpm test:live` runs with `--mode live`, which loads .env.local so the
// live tests (each guarded by describe.skipIf on OPENROUTER_API_KEY) can call
// the real model.
export default defineConfig(({ mode }) => {
  const live = mode === "live";
  const envFile = path.resolve(import.meta.dirname, ".env.local");
  if (live && existsSync(envFile)) process.loadEnvFile(envFile);

  return {
    resolve: {
      alias: { "@": path.resolve(import.meta.dirname) },
    },
    test: {
      environment: "node",
      include: live ? ["tests/live/**/*.test.ts"] : ["tests/**/*.test.ts"],
      exclude: live ? ["node_modules/**"] : ["node_modules/**", "tests/live/**"],
      passWithNoTests: true,
      testTimeout: live ? 120_000 : 5_000,
    },
  };
});
