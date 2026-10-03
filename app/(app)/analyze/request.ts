/**
 * The browser side of the analysis call. Only the document text (and the
 * reader's red lines) is sent, as JSON. The file never is: by the time this
 * runs the PDF has been read in the browser and dropped.
 */

import type { AnalysisResult } from "@/lib/analysis";
import { readSaveStatus, type SaveStatus } from "@/lib/library/save-status";

export const ANALYZE_ENDPOINT = "/api/analyze";

export type AnalyzeOutcome =
  | { ok: true; result: AnalysisResult; save: SaveStatus }
  | { ok: false; status: number; message: string };

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export async function requestAnalysis(
  documentText: string,
  redLines: string[] = [],
  doFetch: FetchLike = (i, init) => fetch(i, init),
): Promise<AnalyzeOutcome> {
  let res: Response;
  try {
    res = await doFetch(ANALYZE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentText, redLines }),
    });
  } catch {
    return { ok: false, status: 0, message: OFFLINE };
  }

  const body: unknown = await res.json().catch(() => undefined);
  if (res.ok && isResult(body)) {
    return {
      ok: true,
      result: { summary: body.summary, flags: body.flags },
      save: readSaveStatus(body),
    };
  }

  const message =
    body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string"
      ? (body as { error: string }).error
      : FALLBACK;
  return { ok: false, status: res.status, message };
}

const OFFLINE = "Redline couldn't reach the server. Check your connection and try again.";
const FALLBACK = "Something went wrong reading this document. Try again in a minute.";

function isResult(body: unknown): body is AnalysisResult {
  return (
    !!body &&
    typeof body === "object" &&
    typeof (body as AnalysisResult).summary === "string" &&
    Array.isArray((body as AnalysisResult).flags)
  );
}

/* Questions */

export const ASK_ENDPOINT = "/api/ask";

/**
 * The longest question the server accepts (MAX_QUESTION_CHARS in
 * lib/analysis). Repeated here so this client module doesn't import the
 * analysis module's model client; a test keeps the two equal.
 */
export const QUESTION_LIMIT = 500;

/**
 * What came back for one question. A decline is an answer ("the document
 * doesn't say"), not a failure; `failed` is for the request going wrong.
 */
export type AskOutcome =
  | { kind: "answered"; answer: string; quote: string }
  | { kind: "declined" }
  | { kind: "failed"; status: number; message: string };

export async function askQuestion(
  documentText: string,
  question: string,
  doFetch: FetchLike = (i, init) => fetch(i, init),
): Promise<AskOutcome> {
  let res: Response;
  try {
    res = await doFetch(ASK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentText, question }),
    });
  } catch {
    return { kind: "failed", status: 0, message: OFFLINE };
  }

  const body: unknown = await res.json().catch(() => undefined);
  if (res.ok && body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (b.declined === true) return { kind: "declined" };
    if (typeof b.answer === "string" && typeof b.quote === "string" && b.quote !== "") {
      return { kind: "answered", answer: b.answer, quote: b.quote };
    }
  }

  // The route sends `{ error }`; `message` is accepted too.
  const said =
    !res.ok && body && typeof body === "object"
      ? [(body as Record<string, unknown>).error, (body as Record<string, unknown>).message].find(
          (v): v is string => typeof v === "string" && v !== "",
        )
      : undefined;
  return { kind: "failed", status: res.status, message: said ?? ASK_FALLBACK };
}

const ASK_FALLBACK = "Something went wrong with that question. Try again in a minute.";
