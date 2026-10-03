/**
 * The library's privacy rules, proven against real Postgres (PGlite, in
 * process). A minimal stand-in for Supabase's `auth` schema is created,
 * every migration in supabase/migrations is applied in order, and each
 * query then runs as a given user the way PostgREST runs it: inside a
 * transaction, as the `authenticated` (or `anon`) role, with the user's id
 * in request.jwt.claim.sub.
 *
 * Rows go in and come out through the repository's own row mapping
 * (toInsertRow / fromDocumentRow), so the round trip covers what the app
 * stores and what it reads back.
 */

import { randomUUID } from "node:crypto";
import type { PGlite, Transaction } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  deriveTitle,
  fromDocumentRow,
  toInsertRow,
  type DocumentRow,
  type NewSavedAnalysis,
} from "@/lib/library/repository";
import { savedFixture } from "./support/saved-analysis";
import { anon, as, createTestDb, runAs, type Who } from "./support/pglite-db";

const DOC_COLUMNS = "id, title, created_at, document_text, summary, flags, red_lines";

let db: PGlite;
const alice = randomUUID();
const bob = randomUUID();

const run = <T,>(who: Who, fn: (tx: Transaction) => Promise<T>): Promise<T> => runAs(db, who, fn);

function toDomainRow(row: Record<string, unknown>): DocumentRow {
  return { ...row, created_at: (row.created_at as Date).toISOString() } as DocumentRow;
}

async function save(who: Who, input: NewSavedAnalysis, userId?: string): Promise<string> {
  const row = toInsertRow(input);
  return run(who, async (tx) => {
    const cols = ["title", "document_text", "summary", "flags", "red_lines"];
    const vals = [row.title, row.document_text, row.summary, JSON.stringify(row.flags), JSON.stringify(row.red_lines)];
    if (userId) {
      cols.push("user_id");
      vals.push(userId);
    }
    const params = cols.map((c, i) => (c === "flags" || c === "red_lines" ? `$${i + 1}::jsonb` : `$${i + 1}`));
    const res = await tx.query<{ id: string }>(
      `insert into public.documents (${cols.join(", ")}) values (${params.join(", ")}) returning id`,
      vals,
    );
    return res.rows[0].id;
  });
}

async function read(who: Who, id: string) {
  return run(who, async (tx) => {
    const res = await tx.query<Record<string, unknown>>(
      `select ${DOC_COLUMNS} from public.documents where id = $1`,
      [id],
    );
    return res.rows[0] ? fromDocumentRow(toDomainRow(res.rows[0])) : null;
  });
}

async function list(who: Who) {
  return run(who, async (tx) => {
    const res = await tx.query<{ id: string; title: string; flag_count: number }>(
      "select id, title, created_at, flag_count from public.documents order by created_at desc, id desc",
    );
    return res.rows;
  });
}

async function remove(who: Who, id: string): Promise<number> {
  return run(who, async (tx) => {
    const res = await tx.query("delete from public.documents where id = $1", [id]);
    return res.affectedRows ?? 0;
  });
}

const adhesion = savedFixture("adhesion-contract");
const adhesionInput: NewSavedAnalysis = {
  title: deriveTitle(adhesion.documentText),
  documentText: adhesion.documentText,
  result: adhesion.result,
  redLines: ["No unpaid revisions", "Payment within 30 days"],
};

beforeAll(async () => {
  db = await createTestDb([
    { id: alice, email: "alice@example.test" },
    { id: bob, email: "bob@example.test" },
  ]);
}, 30_000);

afterAll(async () => {
  await db?.close();
});

describe("documents table under row-level security", () => {
  it("saves an analysis and reads it back with matching contents", async () => {
    const id = await save(as(alice), adhesionInput);
    const saved = await read(as(alice), id);
    expect(saved).not.toBeNull();
    expect(saved!.title).toBe(adhesionInput.title);
    expect(saved!.documentText).toBe(adhesion.documentText);
    expect(saved!.result.summary).toBe(adhesion.result.summary);
    expect(saved!.result.flags).toEqual(adhesion.result.flags);
    expect(saved!.redLines).toEqual(adhesionInput.redLines);
  });

  it("stamps the row with the signed-in user's id by default", async () => {
    const id = await save(as(alice), adhesionInput);
    const owner = await db.query<{ user_id: string }>("select user_id from public.documents where id = $1", [id]);
    expect(owner.rows[0].user_id).toBe(alice);
  });

  it("lists only the user's own documents, newest first, with flag counts", async () => {
    await save(as(bob), { ...adhesionInput, title: "Bob's contract" });
    const aliceRows = await list(as(alice));
    expect(aliceRows.length).toBeGreaterThan(0);
    expect(aliceRows.every((r) => r.title !== "Bob's contract")).toBe(true);
    expect(aliceRows[0].flag_count).toBe(adhesion.result.flags.length);
    const bobRows = await list(as(bob));
    expect(bobRows.map((r) => r.title)).toEqual(["Bob's contract"]);
  });

  it("orders the list newest first", async () => {
    const carol = randomUUID();
    await db.query("insert into auth.users (id) values ($1)", [carol]);
    const first = await save(as(carol), { ...adhesionInput, title: "First" });
    const second = await save(as(carol), { ...adhesionInput, title: "Second" });
    await db.query("update public.documents set created_at = now() - interval '1 day' where id = $1", [first]);
    expect((await list(as(carol))).map((r) => r.id)).toEqual([second, first]);
  });

  it("does not let another user read or delete a document", async () => {
    const id = await save(as(alice), adhesionInput);
    expect(await read(as(bob), id)).toBeNull();
    expect(await remove(as(bob), id)).toBe(0);
    expect(await read(as(alice), id)).not.toBeNull();
  });

  it("shows signed-out visitors nothing and lets them do nothing", async () => {
    const id = await save(as(alice), adhesionInput);
    await expect(read(anon, id)).rejects.toThrow(/permission denied/);
    await expect(list(anon)).rejects.toThrow(/permission denied/);
    await expect(remove(anon, id)).rejects.toThrow(/permission denied/);
    await expect(save(anon, adhesionInput, alice)).rejects.toThrow(/permission denied/);
  });

  it("rejects saving a document under someone else's user id", async () => {
    await expect(save(as(bob), adhesionInput, alice)).rejects.toThrow(/row-level security/);
  });

  it("rejects saving with no signed-in user id", async () => {
    await expect(
      run({ role: "authenticated", uid: "" } as Who, (tx) =>
        tx.query(
          "insert into public.documents (title, document_text, summary, flags) values ('t', 'x', 's', '[]')",
        ),
      ),
    ).rejects.toThrow();
  });

  it("does not let the owner change a saved analysis", async () => {
    const id = await save(as(alice), adhesionInput);
    await expect(
      run(as(alice), (tx) => tx.query("update public.documents set summary = 'edited' where id = $1", [id])),
    ).rejects.toThrow(/permission denied/);
  });

  it("deletes a document, its analysis and its red lines for good", async () => {
    const id = await save(as(alice), adhesionInput);
    expect(await remove(as(alice), id)).toBe(1);
    expect(await read(as(alice), id)).toBeNull();
    const left = await db.query("select 1 from public.documents where id = $1", [id]);
    expect(left.rows).toHaveLength(0);
  });

  it("removes a user's documents when the account is deleted", async () => {
    const dave = randomUUID();
    await db.query("insert into auth.users (id) values ($1)", [dave]);
    await save(as(dave), adhesionInput);
    await db.query("delete from auth.users where id = $1", [dave]);
    const left = await db.query("select 1 from public.documents where user_id = $1", [dave]);
    expect(left.rows).toHaveLength(0);
  });

  it("has no column that could hold a file", async () => {
    const cols = await db.query<{ column_name: string; data_type: string }>(
      "select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = 'documents'",
    );
    expect(cols.rows.map((c) => c.data_type)).not.toContain("bytea");
    expect(cols.rows.map((c) => c.column_name).sort()).toEqual(
      ["created_at", "document_text", "flag_count", "flags", "id", "red_lines", "summary", "title", "user_id"],
    );
  });
});
