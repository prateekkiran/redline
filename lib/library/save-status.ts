/**
 * Whether an analysis reached the reader's library. Sent by /api/analyze
 * beside the result, and read back by the document screen. Pure, so the
 * browser can import it.
 */

export type SaveStatus =
  | { saved: true; documentId: string }
  | { saved: false; reason: "accounts not set up" | "save failed" };

/** Reads the save fields off an /api/analyze response body. */
export function readSaveStatus(body: unknown): SaveStatus {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (b.saved === true && typeof b.documentId === "string" && b.documentId !== "") {
      return { saved: true, documentId: b.documentId };
    }
    if (b.saved === false && b.reason === "accounts not set up") {
      return { saved: false, reason: "accounts not set up" };
    }
  }
  // Anything else, including a missing field, is treated as not saved, so
  // the screen never claims a save that didn't happen.
  return { saved: false, reason: "save failed" };
}
