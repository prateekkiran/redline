/**
 * The decision made in the browser before a document is sent: refuse it here
 * (nothing typed, too long, or out of scope per ADR 0002), or send its text.
 * Kept free of React so it can be tested without rendering the screen.
 */

import { checkDocumentText } from "@/lib/analysis/limits";
import { checkScope } from "@/lib/scope/gate";
import { requestAnalysis, type AnalyzeOutcome } from "./request";

export type RefusalReason = "empty" | "too_long" | "lease" | "terms-of-service";

export type Submission =
  | { kind: "refused"; reason: RefusalReason }
  | { kind: "send"; documentText: string };

export function prepareSubmission(text: string): Submission {
  const problem = checkDocumentText(text);
  if (problem === "empty") return { kind: "refused", reason: "empty" };
  // A lease or terms of service is named as such even when it is also too
  // long: "Redline doesn't read leases" is the more useful thing to hear.
  const scope = checkScope(text);
  if (!scope.ok) return { kind: "refused", reason: scope.kind };
  if (problem) return { kind: "refused", reason: problem };
  return { kind: "send", documentText: text };
}

type FetchLike = Parameters<typeof requestAnalysis>[1];

export type SubmitOutcome = { kind: "refused"; reason: RefusalReason } | AnalyzeOutcome;

/**
 * Prepare, then send only if the document passed. A refused document never
 * reaches `doFetch`, so no server request and no model call is made for it.
 * `onSend` runs just before the request goes out (the screen uses it to show
 * its "reading" state only for documents that are actually sent).
 */
export async function submitDocument(
  text: string,
  options: { doFetch?: FetchLike; onSend?: () => void } = {},
): Promise<SubmitOutcome> {
  const prepared = prepareSubmission(text);
  if (prepared.kind === "refused") return prepared;
  options.onSend?.();
  return requestAnalysis(prepared.documentText, options.doFetch);
}
