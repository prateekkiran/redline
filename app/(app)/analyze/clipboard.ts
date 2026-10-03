/** Copying a counter-offer to the clipboard, and what to tell the reader. */

export type CopyOutcome = "copied" | "failed";

type ClipboardLike = { writeText(text: string): Promise<void> } | undefined;

/**
 * Write `text` to the clipboard. Resolves to "failed" rather than throwing
 * when there's no clipboard (an insecure page, an old browser) or the
 * browser refuses the write (no permission, page not focused).
 */
export async function copyText(text: string, clipboard: ClipboardLike): Promise<CopyOutcome> {
  if (!clipboard || typeof clipboard.writeText !== "function") return "failed";
  try {
    await clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
