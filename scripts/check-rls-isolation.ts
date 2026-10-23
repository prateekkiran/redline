/**
 * Checks that row-level security really isolates one user from another on
 * the live Supabase project. Run it with two existing accounts:
 *
 *   pnpm exec tsx scripts/check-rls-isolation.ts <emailA> <passwordA> <emailB> <passwordB>
 *
 * Account A writes a document and a red line. Account B must not be able to
 * read, change or remove them, an anonymous client must see nothing, and A
 * must not be able to save a row as somebody else. A's rows are removed at
 * the end. Never prints a key or a password.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "../lib/supabase/config";

const envFile = path.resolve(process.cwd(), ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const failures: string[] = [];
function check(ok: boolean, what: string) {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
}

async function signIn(email: string, password: string): Promise<SupabaseClient> {
  const { url, anonKey } = supabaseEnv();
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  return client;
}

async function main() {
  const [emailA, passwordA, emailB, passwordB] = process.argv.slice(2);
  if (!emailA || !passwordA || !emailB || !passwordB) {
    console.error(
      "Usage: pnpm exec tsx scripts/check-rls-isolation.ts <emailA> <passwordA> <emailB> <passwordB>",
    );
    process.exit(2);
  }

  const a = await signIn(emailA, passwordA);
  const b = await signIn(emailB, passwordB);
  console.log(`A = ${emailA}`);
  console.log(`B = ${emailB}`);

  const documentId = (
    await a
      .from("documents")
      .insert({
        title: "Isolation probe A",
        document_text: "A private contract body.",
        summary: "probe",
        flags: [],
      })
      .select("id")
      .single()
  ).data?.id;
  const redLineId = (
    await a.from("red_lines").insert({ text: "Isolation probe A red line" }).select("id").single()
  ).data?.id;
  check(Boolean(documentId), "A saved a document");
  check(Boolean(redLineId), "A saved a red line");
  if (!documentId || !redLineId) {
    console.log("\nFAIL");
    process.exit(1);
  }

  const bDocuments = await b.from("documents").select("id").eq("id", documentId);
  check((bDocuments.data ?? []).length === 0, "B cannot read A's document");
  const bRedLines = await b.from("red_lines").select("id").eq("id", redLineId);
  check((bRedLines.data ?? []).length === 0, "B cannot read A's red line");

  const bDelete = await b.from("documents").delete().eq("id", documentId).select("id");
  check((bDelete.data ?? []).length === 0, "B cannot delete A's document");
  const bDeleteRedLine = await b.from("red_lines").delete().eq("id", redLineId).select("id");
  check((bDeleteRedLine.data ?? []).length === 0, "B cannot delete A's red line");
  const bUpdate = await b
    .from("red_lines")
    .update({ text: "hijacked" })
    .eq("id", redLineId)
    .select("id");
  check((bUpdate.data ?? []).length === 0, "B cannot edit A's red line");

  const forged = await a.from("documents").insert({
    user_id: "00000000-0000-0000-0000-000000000000",
    title: "forged",
    document_text: "forged",
    summary: "forged",
    flags: [],
  });
  check(forged.error !== null, "A cannot save a document as another user");

  const { url, anonKey } = supabaseEnv();
  const anonymous = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anonDocuments = await anonymous.from("documents").select("id");
  check(
    anonDocuments.error !== null || (anonDocuments.data ?? []).length === 0,
    "an anonymous client cannot read documents",
  );
  const anonRedLines = await anonymous.from("red_lines").select("id");
  check(
    anonRedLines.error !== null || (anonRedLines.data ?? []).length === 0,
    "an anonymous client cannot read red lines",
  );

  const aDocuments = await a.from("documents").select("id").eq("id", documentId);
  check((aDocuments.data ?? []).length === 1, "A still has their document");
  const aRedLines = await a.from("red_lines").select("id").eq("id", redLineId);
  check((aRedLines.data ?? []).length === 1, "A still has their red line");

  await a.from("documents").delete().eq("id", documentId);
  await a.from("red_lines").delete().eq("id", redLineId);

  console.log(failures.length === 0 ? "\nPASS" : `\nFAIL (${failures.length} checks)`);
  await a.auth.signOut();
  await b.auth.signOut();
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  console.log("\nFAIL");
  process.exit(1);
});
