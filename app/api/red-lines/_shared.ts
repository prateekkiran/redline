/**
 * What the red-lines route handlers share: the signed-in check, reading the
 * request body, and turning a refused red line into a plain answer.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_RED_LINE_CHARS, MAX_RED_LINES, RedLineError } from "@/lib/library/red-lines";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export function fail(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

/** The caller's Supabase client, or the response that says why there isn't one. */
export async function signedIn(): Promise<{ supabase: SupabaseClient } | { response: Response }> {
  if (!isSupabaseConfigured()) {
    return {
      response: fail(503, "Red lines need an account, and accounts aren't set up here yet."),
    };
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { response: fail(401, "Sign in first.") };
  return { supabase };
}

/** The `text` field of a JSON body, or the response that says what's wrong. */
export async function readText(request: Request): Promise<{ text: string } | { response: Response }> {
  const type = request.headers.get("content-type") ?? "";
  if (!/^application\/json\b/i.test(type)) {
    return { response: fail(415, "Send the red line as JSON.") };
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { response: fail(400, "The request wasn't valid JSON.") };
  }
  const text =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>).text
      : undefined;
  if (typeof text !== "string") return { response: fail(400, "Send the red line's text.") };
  return { text };
}

export function refused(err: unknown, action: string): Response {
  if (err instanceof RedLineError) {
    switch (err.reason) {
      case "empty":
        return fail(400, "A red line needs some text.");
      case "too_long":
        return fail(400, `Keep each red line to ${MAX_RED_LINE_CHARS} characters or fewer.`);
      case "duplicate":
        return fail(409, "You already have that red line.");
      case "limit":
        return fail(409, `You can have up to ${MAX_RED_LINES} red lines. Remove one to add another.`);
      case "database":
        break;
    }
  }
  console.error(`[red-lines] ${action} failed`, err instanceof Error ? err.message : typeof err);
  return fail(500, "Redline couldn't update your red lines just now. Try again in a minute.");
}
