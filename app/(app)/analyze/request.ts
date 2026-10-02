/**
 * The browser side of the analysis call. Only the document text (and the
 * reader's red lines) is sent, as JSON. The file never is: by the time this
 * runs the PDF has been read in the browser and dropped.
 */

import type { AnalysisResult } from "@/lib/analysis";

export const ANALYZE_ENDPOINT = "/api/analyze";

export type AnalyzeOutcome =
  | { ok: true; result: AnalysisResult }
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
  if (res.ok && isResult(body)) return { ok: true, result: body };

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
