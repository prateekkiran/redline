/** Reader-facing copy for the library screens (run through the humanizer). */

const DATE = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  year: "numeric",
  // Server-rendered, so a fixed zone keeps the date the same on every render.
  timeZone: "UTC",
});

/** "3 October 2026" style: the day a document was saved. */
export function savedOn(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = Object.fromEntries(DATE.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.day} ${parts.month} ${parts.year}`;
}

/** How many flags a saved document has, in words a reader scans. */
export function flagCount(n: number): string {
  if (n === 0) return "No flags";
  if (n === 1) return "1 flag";
  return `${n} flags`;
}

export const libraryCopy = {
  runningHead: "Contracts you’ve read",
  heading: "Library",
  listLabel: "Saved documents, newest first",
  deleted: "Document deleted. It’s gone from your library for good.",
  loadFailed: {
    head: "The library didn’t load",
    body: "Redline couldn’t reach your saved documents just now. Reload the page in a minute.",
  },
  empty: {
    head: "No documents yet",
    body: "Each contract you read is kept here with its flags and counter-offers, so you can reopen it without running it again. You can also delete it for good.",
  },
  notConfigured: {
    head: "The library needs an account",
    body: "Accounts aren’t set up on this copy of Redline yet, so there’s nowhere to keep documents. You can still read a contract. The result just won’t be saved.",
  },
  readContract: "Read a contract",
  saved: {
    source: (date: string) => `Saved to your library on ${date}`,
    back: "Back to the library",
  },
  remove: {
    open: "Delete this document",
    question: "Delete this document for good?",
    detail:
      "This removes its text, summary, flags and counter-offers from your library, and you can’t undo it.",
    confirm: "Delete for good",
    pending: "Deleting…",
    cancel: "Keep it",
    failed: "Redline couldn’t delete this document just now. Try again in a minute.",
  },
};
