/**
 * Real Postgres in process (PGlite) with a minimal stand-in for Supabase's
 * `auth` schema and every migration in supabase/migrations applied in
 * order. Queries run the way PostgREST runs them: inside a transaction, as
 * the `authenticated` (or `anon`) role, with the user's id in
 * request.jwt.claim.sub.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";

const MIGRATIONS = path.resolve(import.meta.dirname, "../../supabase/migrations");

export const AUTH_SHIM = `
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  -- Supabase's default privileges, which the migrations must revoke themselves.
  alter default privileges in schema public
    grant all on tables to anon, authenticated;
`;

export type Who = { role: "authenticated"; uid: string } | { role: "anon" };
export const as = (uid: string): Who => ({ role: "authenticated", uid });
export const anon: Who = { role: "anon" };

/** A fresh database with the auth shim, the given users and every migration. */
export async function createTestDb(users: { id: string; email: string }[]): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(AUTH_SHIM);
  for (const u of users) {
    await db.query("insert into auth.users (id, email) values ($1, $2)", [u.id, u.email]);
  }
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
  if (files.length === 0) throw new Error("No migrations found");
  for (const file of files) await db.exec(readFileSync(path.join(MIGRATIONS, file), "utf8"));
  return db;
}

export function runAs<T>(db: PGlite, who: Who, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${who.role}`);
    if (who.role === "authenticated") {
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [who.uid]);
    }
    return fn(tx);
  });
}
