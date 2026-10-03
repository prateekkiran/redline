import {
  AnalysisInputError,
  AnalysisOutputError,
  analyzeDocument,
  MAX_DOCUMENT_CHARS,
  ModelCallError,
} from "@/lib/analysis";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { deriveTitle, saveAnalysis } from "@/lib/library/repository";
import type { SaveStatus } from "@/lib/library/save-status";

// Two model calls per document, run in parallel; give a slow provider room to answer.
export const maxDuration = 60;

/**
 * POST { documentText, redLines? } -> AnalysisResult & SaveStatus.
 *
 * With accounts set up, a successful analysis is saved to the caller's
 * library (the extracted text, never a file) and the new id comes back as
 * `documentId`. A failed save doesn't cost the reader the analysis: it is
 * still returned, with `saved: false`.
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
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  if (isSupabaseConfigured()) {
    supabase = await createClient();
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
    const save: SaveStatus = supabase
      ? await saveToLibrary(supabase, parsed.documentText, parsed.redLines, result)
      : { saved: false, reason: "accounts not set up" };
    return Response.json({ ...result, ...save });
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

async function saveToLibrary(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  documentText: string,
  redLines: string[],
  result: Awaited<ReturnType<typeof analyzeDocument>>,
): Promise<SaveStatus> {
  try {
    const documentId = await saveAnalysis(supabase, {
      title: deriveTitle(documentText),
      documentText,
      result,
      redLines,
    });
    return { saved: true, documentId };
  } catch (err) {
    console.error("[analyze] save failed", err instanceof Error ? err.message : typeof err);
    return { saved: false, reason: "save failed" };
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
