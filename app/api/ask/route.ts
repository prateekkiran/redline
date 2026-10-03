import {
  AnalysisInputError,
  AnalysisOutputError,
  answerQuestion,
  MAX_DOCUMENT_CHARS,
  MAX_QUESTION_CHARS,
  ModelCallError,
} from "@/lib/analysis";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

// One model call per question; give a slow provider room to answer.
export const maxDuration = 60;

/**
 * POST { documentText, question } -> { answer, quote } | { declined: true }.
 *
 * A decline is a normal 200 answer ("your document doesn't say"), not an
 * error. JSON text only, same as /api/analyze.
 */
export async function POST(request: Request): Promise<Response> {
  const type = request.headers.get("content-type") ?? "";
  if (!/^application\/json\b/i.test(type)) {
    return fail(415, "Send the question and the document's text as JSON. Files aren't accepted here.");
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
    const result = await answerQuestion(parsed.documentText, parsed.question);
    return Response.json(result);
  } catch (err) {
    if (err instanceof AnalysisInputError) {
      return fail(422, inputMessage(err));
    }
    if (err instanceof AnalysisOutputError || err instanceof ModelCallError) {
      // The detail stays in the server log; it may name the provider.
      console.error(`[ask] ${err.name}: ${err.message}`);
      return fail(502, "Redline couldn't answer that just now. Try again in a minute.");
    }
    console.error("[ask] unexpected error", err instanceof Error ? err.name : typeof err);
    return fail(500, "Something went wrong on our side. Try again in a minute.");
  }
}

function inputMessage(err: AnalysisInputError): string {
  switch (err.reason) {
    case "empty":
      return "There's no text in this document to read.";
    case "too_long":
      return `This document is too long. Redline reads up to ${MAX_DOCUMENT_CHARS.toLocaleString("en-US")} characters.`;
    case "question_empty":
      return "Type a question first.";
    case "question_too_long":
      return `Keep the question to ${MAX_QUESTION_CHARS} characters or fewer.`;
  }
}

function readBody(body: unknown): { documentText: string; question: string } | { error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Send an object with the document's text and a question." };
  }
  const { documentText, question } = body as Record<string, unknown>;
  if (typeof documentText !== "string") {
    return { error: "The document's text is missing." };
  }
  if (typeof question !== "string") {
    return { error: "The question is missing." };
  }
  return { documentText, question };
}

function fail(status: number, error: string): Response {
  return Response.json({ error }, { status });
}
