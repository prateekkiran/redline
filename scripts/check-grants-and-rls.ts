/**
 * Checks the table grants and the row-level security that sits on top of
 * them, live, against the real project.
 *
 *   pnpm exec tsx scripts/check-grants-and-rls.ts <emailA> <passwordA> <emailB> <passwordB>
 *
 * Two accounts. Account A writes a document and a red line. Then:
 *   - A can select, insert, update and delete its own rows;
 *   - B cannot read, change or delete A's rows, even though the table grant
 *     now allows UPDATE;
 *   - A cannot update a document at all: saved analyses are immutable, and
 *     there is no UPDATE policy on the table, so RLS denies it even though the
 *     grant allows it;
 *   - A cannot move a red line to another user, because the UPDATE policy
 *     checks the new row too;
 *   - an anonymous client sees nothing.
 *
 * A's rows are removed at the end. Never prints a key or a password.
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
      "Usage: pnpm exec tsx scripts/check-grants-and-rls.ts <emailA> <passwordA> <emailB> <passwordB>",
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
        title: "Grant probe A",
        document_text: "A private contract body.",
        summary: "probe",
        flags: [],
      })
      .select("id")
      .single()
  ).data?.id;
  const redLineId = (
    await a.from("red_lines").insert({ text: "Grant probe A red line" }).select("id").single()
  ).data?.id;
  check(Boolean(documentId), "A inserted a document");
  check(Boolean(redLineId), "A inserted a red line");
  if (!documentId || !redLineId) {
    console.log("\nFAIL");
    process.exit(1);
  }

  // A's own four operations.
  const aSelect = await a.from("documents").select("id").eq("id", documentId);
  check((aSelect.data ?? []).length === 1, "A can select its own document");
  const aSelectLines = await a.from("red_lines").select("id").eq("id", redLineId);
  check((aSelectLines.data ?? []).length === 1, "A can select its own red line");
  const aUpdateLine = await a
    .from("red_lines")
    .update({ text: "Grant probe A red line, edited" })
    .eq("id", redLineId)
    .select("id");
  check((aUpdateLine.data ?? []).length === 1, "A can update its own red line");
  const aUpdateDoc = await a
    .from("documents")
    .update({ title: "Grant probe A, edited" })
    .eq("id", documentId)
    .select("id");
  check(
    (aUpdateDoc.data ?? []).length === 0,
    "A cannot update a document: saved analyses are immutable, so RLS denies it",
  );

  // B cannot reach A's rows.
  const bSelect = await b.from("documents").select("id").eq("id", documentId);
  check((bSelect.data ?? []).length === 0, "B cannot select A's document");
  const bSelectLines = await b.from("red_lines").select("id").eq("id", redLineId);
  check((bSelectLines.data ?? []).length === 0, "B cannot select A's red line");
  const bUpdateDoc = await b
    .from("documents")
    .update({ title: "hijacked" })
    .eq("id", documentId)
    .select("id");
  check((bUpdateDoc.data ?? []).length === 0, "B cannot update A's document");
  const bUpdateLine = await b
    .from("red_lines")
    .update({ text: "hijacked" })
    .eq("id", redLineId)
    .select("id");
  check((bUpdateLine.data ?? []).length === 0, "B cannot update A's red line");
  const bDeleteDoc = await b.from("documents").delete().eq("id", documentId).select("id");
  check((bDeleteDoc.data ?? []).length === 0, "B cannot delete A's document");
  const bDeleteLine = await b.from("red_lines").delete().eq("id", redLineId).select("id");
  check((bDeleteLine.data ?? []).length === 0, "B cannot delete A's red line");

  // A cannot hand a row to another user.
  const bUserId = (await b.auth.getUser()).data.user?.id;
  const aReassign = await a
    .from("red_lines")
    .update({ user_id: bUserId })
    .eq("id", redLineId)
    .select("id");
  check((aReassign.data ?? []).length === 0, "A cannot move a red line to another user");
  const aForge = await a.from("documents").insert({
    user_id: bUserId,
    title: "forged",
    document_text: "forged",
    summary: "forged",
    flags: [],
  });
  check(aForge.error !== null, "A cannot save a document as another user");

  // An anonymous client sees nothing.
  const { url, anonKey } = supabaseEnv();
  const anonymous = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anonDocuments = await anonymous.from("documents").select("id");
  check(
    anonDocuments.error !== null || (anonDocuments.data ?? []).length === 0,
    "an anonymous client cannot read documents",
  );
  const anonLines = await anonymous.from("red_lines").select("id");
  check(
    anonLines.error !== null || (anonLines.data ?? []).length === 0,
    "an anonymous client cannot read red lines",
  );

  // A's rows survived every attempt.
  const aStill = await a.from("red_lines").select("id").eq("id", redLineId);
  check((aStill.data ?? []).length === 1, "A still has their red line");
  const aDocStill = await a.from("documents").select("id,title").eq("id", documentId);
  check((aDocStill.data ?? []).length === 1, "A still has their document");
  check(
    (aDocStill.data?.[0] as { title?: string } | undefined)?.title === "Grant probe A",
    "A's document title was not changed",
  );

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
