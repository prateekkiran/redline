/**
 * Creates a test account on the linked Supabase project, for the live
 * checks that need two signed-in users.
 *
 *   pnpm exec tsx scripts/make-test-account.ts <email> <password>
 *
 * Prints the address it created. Never prints the password.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "../lib/supabase/config";

async function main() {
  const envFile = path.resolve(process.cwd(), ".env.local");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: pnpm exec tsx scripts/make-test-account.ts <email> <password>");
    process.exit(2);
  }
  const { url, anonKey } = supabaseEnv();
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) {
    console.log(`sign-up failed: ${error.message}`);
    process.exit(1);
  }
  console.log(
    `created ${data.user?.email} (session: ${Boolean(data.session)}, identities: ${data.user?.identities?.length ?? 0})`,
  );
}

main();
