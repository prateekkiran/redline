/**
 * The signed-in user's red lines (ticket 09): a persistent, editable list of
 * things they don't want to see in a contract. Red lines only add flags
 * (ADR 0006); see lib/analysis/red-lines.ts for how they are applied.
 *
 * Every function takes the caller's Supabase client, so queries run as the
 * signed-in user and row-level security (supabase/migrations) decides what
 * they can see or change. Nothing here filters by user id; the database does.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_RED_LINE_CHARS, MAX_RED_LINES } from "@/lib/analysis/red-lines";

export { MAX_RED_LINE_CHARS, MAX_RED_LINES };

const TABLE = "red_lines";
const COLUMNS = "id, text, created_at, updated_at";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RedLine = {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};

export type RedLineRow = {
  id: string;
  text: string;
  created_at: string;
  updated_at: string;
};

export type RedLineErrorReason = "empty" | "too_long" | "limit" | "duplicate" | "database";

/** A red line was refused, or a database call failed. */
export class RedLineError extends Error {
  readonly reason: RedLineErrorReason;
  constructor(reason: RedLineErrorReason, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RedLineError";
    this.reason = reason;
  }
}

/**
 * A red line as it is stored: whitespace collapsed and trimmed. Throws for
 * an empty one or one over MAX_RED_LINE_CHARS; nothing is cut silently.
 */
export function cleanRedLineText(raw: string): string {
  const text = raw.replace(/\s+/g, " ").trim();
  if (text === "") throw new RedLineError("empty", "A red line needs some text.");
  if (text.length > MAX_RED_LINE_CHARS) {
    throw new RedLineError(
      "too_long",
      `A red line can be up to ${MAX_RED_LINE_CHARS} characters; this one is ${text.length}.`,
    );
  }
  return text;
}

export function fromRedLineRow(row: RedLineRow): RedLine {
  return {
    id: row.id,
    text: row.text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fail(action: string, error: { message: string; code?: string }): never {
  // 23514 check_violation: the per-user limit trigger or the length check.
  if (error.code === "23514" && /limit/i.test(error.message)) {
    throw new RedLineError("limit", `You can have up to ${MAX_RED_LINES} red lines.`, {
      cause: error,
    });
  }
  throw new RedLineError("database", `Could not ${action}: ${error.message}`, { cause: error });
}

/** The signed-in user's red lines, oldest first (the order they were added). */
export async function listRedLines(client: SupabaseClient): Promise<RedLine[]> {
  const { data, error } = await client
    .from(TABLE)
    .select(COLUMNS)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) fail("list red lines", error);
  return ((data ?? []) as RedLineRow[]).map(fromRedLineRow);
}

function sameText(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Adds a red line for the signed-in user. Refuses an empty or over-long one,
 * a duplicate of one they already have (ignoring case), or one past the
 * limit of MAX_RED_LINES.
 */
export async function addRedLine(client: SupabaseClient, raw: string): Promise<RedLine> {
  const text = cleanRedLineText(raw);
  const existing = await listRedLines(client);
  if (existing.some((r) => sameText(r.text, text))) {
    throw new RedLineError("duplicate", "You already have that red line.");
  }
  if (existing.length >= MAX_RED_LINES) {
    throw new RedLineError("limit", `You can have up to ${MAX_RED_LINES} red lines.`);
  }
  const { data, error } = await client.from(TABLE).insert({ text }).select(COLUMNS).single();
  if (error) fail("add the red line", error);
  return fromRedLineRow(data as RedLineRow);
}

/**
 * Changes a red line's text. Returns null if there is no such red line the
 * user can edit. Saved analyses keep the red lines they were run with.
 */
export async function updateRedLine(
  client: SupabaseClient,
  id: string,
  raw: string,
): Promise<RedLine | null> {
  const text = cleanRedLineText(raw);
  if (!UUID_RE.test(id)) return null;
  const existing = await listRedLines(client);
  if (existing.some((r) => r.id !== id && sameText(r.text, text))) {
    throw new RedLineError("duplicate", "You already have that red line.");
  }
  const { data, error } = await client
    .from(TABLE)
    .update({ text })
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) fail("edit the red line", error);
  return data ? fromRedLineRow(data as RedLineRow) : null;
}

/** Removes a red line. Returns false if there was nothing the user could remove. */
export async function removeRedLine(client: SupabaseClient, id: string): Promise<boolean> {
  if (!UUID_RE.test(id)) return false;
  const { data, error } = await client.from(TABLE).delete().eq("id", id).select("id");
  if (error) fail("remove the red line", error);
  return (data ?? []).length > 0;
}
