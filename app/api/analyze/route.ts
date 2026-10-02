import {
  AnalysisInputError,
  AnalysisOutputError,
  analyzeDocument,
  MAX_DOCUMENT_CHARS,
  ModelCallError,
} from "@/lib/analysis";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

// Two model calls per document, run in parallel; give a slow provider room to answer.
export const maxDuration = 60;

/**
 * POST { documentText, redLines? } -> AnalysisResult.
 *
 * Takes JSON text only. A file upload (multipart or any other body) is
 * refused: the file is read in the browser and never sent here.
 */
export async function POST(request: Request): Promise<Response> {
  const type = request.headers.get("content-type") ?? "";
  if (!/^application\/json\b/i.test(type)) {
    return fail(415, "Send the document's text as JSON. Files aren't accepted here.");
  }

  // The proxy already turns away signed-out requests; this asks Supabase.
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return fail(401, "Sign in first.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "The request wasn't valid JSON.");
  }

  const parsed = readBody(body);
  if ("error" in parsed) return fail(400, parsed.error);

  try {
    const result = await analyzeDocument(parsed.documentText, parsed.redLines);
    return Response.json(result);
  } catch (err) {
    if (err instanceof AnalysisInputError) {
      return fail(
        422,
        err.reason === "empty"
          ? "There's no text in this document to read."
          : `This document is too long. Redline reads up to ${MAX_DOCUMENT_CHARS.toLocaleString("en-US")} characters.`,
      );
    }
    if (err instanceof AnalysisOutputError || err instanceof ModelCallError) {
      // The detail stays in the server log; it may name the provider.
      console.error(`[analyze] ${err.name}: ${err.message}`);
      return fail(502, "Redline couldn't read this document just now. Try again in a minute.");
    }
    console.error("[analyze] unexpected error", err instanceof Error ? err.name : typeof err);
    return fail(500, "Something went wrong on our side. Try again in a minute.");
  }
}

function readBody(
  body: unknown,
): { documentText: string; redLines: string[] } | { error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Send an object with the document's text." };
  }
  const { documentText, redLines } = body as Record<string, unknown>;
  if (typeof documentText !== "string") {
    return { error: "The document's text is missing." };
  }
  if (redLines !== undefined && !(Array.isArray(redLines) && redLines.every((r) => typeof r === "string"))) {
    return { error: "Red lines must be a list of text." };
  }
  return { documentText, redLines: (redLines as string[] | undefined) ?? [] };
}

function fail(status: number, error: string): Response {
  return Response.json({ error }, { status });
}
