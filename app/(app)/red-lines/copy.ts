/** Reader-facing copy for the red lines screen (run through the humanizer). */

import { MAX_RED_LINE_CHARS, MAX_RED_LINES } from "./client";

export const redLinesCopy = {
  runningHead: "Your own rules",
  heading: "Red lines",
  lede: "A red line is something you won’t agree to. When a clause crosses one, Redline adds a flag for it and marks that flag as yours.",
  additive:
    "Red lines only add flags. Every flag Redline would raise without them still appears.",
  listLabel: "Your red lines",
  empty: {
    head: "You haven’t added any red lines",
    body: "Until you add one, Redline reads contracts with its standard checks only.",
  },
  example: "For example: no non-compete longer than six months.",
  add: {
    label: "Add a red line",
    button: "Add",
    pending: "Adding…",
    limit: `Up to ${MAX_RED_LINES} red lines, each up to ${MAX_RED_LINE_CHARS} characters.`,
    full: `You have ${MAX_RED_LINES} red lines, the most Redline keeps. Remove one to add another.`,
  },
  remaining: (n: number) => (n === 1 ? "1 character left" : `${n} characters left`),
  over: (n: number) => (n === 1 ? "1 character over" : `${n} characters over`),
  edit: {
    open: "Edit",
    label: (text: string) => `Edit red line: ${text}`,
    field: "Red line",
    save: "Save",
    pending: "Saving…",
    cancel: "Cancel",
  },
  remove: {
    button: "Remove",
    label: (text: string) => `Remove red line: ${text}`,
    note: "Changes apply to contracts you read from now on. Documents already in your library keep the red lines they were read with.",
  },
  added: (text: string) => `Added “${text}”.`,
  saved: (text: string) => `Saved “${text}”.`,
  removed: (text: string) => `Removed “${text}”.`,
  loadFailed: {
    head: "Your red lines didn’t load",
    body: "Redline couldn’t reach your red lines just now. Reload the page in a minute.",
  },
  notConfigured: {
    head: "Red lines need an account",
    body: "Your red lines are kept with your account, and accounts aren’t set up on this copy of Redline yet. Redline still reads contracts with its standard checks.",
  },
  readContract: "Read a contract",
  errors: {
    offline: "Redline couldn’t reach the server. Check your connection and try again.",
    notConfigured: "Red lines need an account, and accounts aren’t set up here yet.",
    signedOut: "You’ve been signed out. Sign in again to change your red lines.",
    fallback: "Redline couldn’t update your red lines just now. Try again in a minute.",
  },
};
