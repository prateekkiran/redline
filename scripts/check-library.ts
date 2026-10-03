/**
 * Checks the saved library against a real Supabase project, through the
 * same repository functions the app uses. Run it after applying the
 * migrations in supabase/migrations:
 *
 *   pnpm exec tsx scripts/check-library.ts <email> <password>
 *
 * Signs in as that (existing) user, saves the adhesion fixture with a result
 * built from its sidecar, lists, reads it back, compares, deletes it and
 * confirms it's gone. Prints PASS or FAIL. No model call is made.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from
 * .env.local when present. Never prints the key or the password.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { createClient } from "@supabase/supabase-js";
import {
  deleteDocument,
  deriveTitle,
  getDocument,
  listDocuments,
  saveAnalysis,
} from "../lib/library/repository";
import { supabaseEnv } from "../lib/supabase/config";
import { savedFixture } from "../tests/support/saved-analysis";

const envFile = path.resolve(process.cwd(), ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const failures: string[] = [];
function check(ok: boolean, what: string) {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
}

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: pnpm exec tsx scripts/check-library.ts <email> <password>");
    process.exit(2);
  }

  const { url, anonKey } = supabaseEnv();
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`Sign-in failed: ${signInError.message}`);
  console.log(`Signed in as ${email}`);

  const fixture = savedFixture("adhesion-contract");
  const input = {
    title: deriveTitle(fixture.documentText),
    documentText: fixture.documentText,
    result: fixture.result,
    redLines: ["No unpaid revisions"],
  };

  let id: string | null = null;
  try {
    id = await saveAnalysis(client, input);
    check(typeof id === "string" && id.length > 0, `saved document ${id}`);

    const entries = await listDocuments(client);
    const entry = entries.find((e) => e.id === id);
    check(Boolean(entry), "it appears in the library list");
    check(entries[0]?.id === id, "it is the newest entry");
    check(entry?.flagCount === input.result.flags.length, `list shows ${input.result.flags.length} flags`);
    check(entry?.title === input.title, "list shows the derived title");

    const saved = await getDocument(client, id);
    check(saved !== null, "it reads back");
    check(saved?.documentText === input.documentText, "document text matches");
    check(saved?.result.summary === input.result.summary, "summary matches");
    check(isDeepStrictEqual(saved?.result.flags, input.result.flags), "flags match");
    check(isDeepStrictEqual(saved?.redLines, input.redLines), "red lines match");

    const deleted = await deleteDocument(client, id);
    check(deleted, "delete reports a removed row");
    check((await getDocument(client, id)) === null, "it no longer reads back");
    check(!(await listDocuments(client)).some((e) => e.id === id), "it is gone from the list");
    check(!(await deleteDocument(client, id)), "a second delete removes nothing");
    id = null;
  } finally {
    if (id) await deleteDocument(client, id).catch(() => undefined);
    await client.auth.signOut();
  }
}

main()
  .then(() => {
    console.log(failures.length === 0 ? "\nPASS" : `\nFAIL (${failures.length} checks)`);
    process.exit(failures.length === 0 ? 0 : 1);
  })
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    console.log("\nFAIL");
    process.exit(1);
  });
