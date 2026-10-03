/**
 * The saved library (ticket 08): each analysis a user runs, stored as the
 * extracted document text plus the analysis output. Never the original file.
 *
 * Every function takes the caller's Supabase client, so the queries run as
 * the signed-in user and row-level security (supabase/migrations) decides
 * what they can see. Nothing here filters by user id; the database does.
 *
 * The row <-> domain mapping is pure and exported so it can be tested
 * without a database.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalysisResult, Flag } from "@/lib/analysis";

const TABLE = "documents";
export const MAX_TITLE_CHARS = 80;
const UNTITLED = "Untitled document";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What saveAnalysis needs. */
export type NewSavedAnalysis = {
  title: string;
  documentText: string;
  result: AnalysisResult;
  /** The red lines in effect when the document was analysed (ticket 09). */
  redLines: string[];
};

/** One row of the library list. */
export type LibraryEntry = {
  id: string;
  title: string;
  createdAt: string;
  flagCount: number;
};

/** A saved document, reopened without calling the model again. */
export type SavedDocument = {
  id: string;
  title: string;
  createdAt: string;
  documentText: string;
  result: AnalysisResult;
  redLines: string[];
};

export type DocumentInsertRow = {
  title: string;
  document_text: string;
  summary: string;
  flags: Flag[];
  red_lines: string[];
};

export type DocumentRow = {
  id: string;
  title: string;
  created_at: string;
  document_text: string;
  summary: string;
  flags: unknown;
  red_lines: unknown;
};

export type LibraryRow = {
  id: string;
  title: string;
  created_at: string;
  flag_count: number;
};

/** A database call failed, or a stored row doesn't hold what it should. */
export class LibraryError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "LibraryError";
  }
}

/** First non-empty line of the document, trimmed, at most 80 characters. */
export function deriveTitle(documentText: string): string {
  for (const line of documentText.split(/\r?\n/)) {
    const title = line.replace(/\s+/g, " ").trim();
    if (title === "") continue;
    if (title.length <= MAX_TITLE_CHARS) return title;
    return `${title.slice(0, MAX_TITLE_CHARS - 1).trimEnd()}…`;
  }
  return UNTITLED;
}

export function toInsertRow(input: NewSavedAnalysis): DocumentInsertRow {
  const title = input.title.trim();
  if (title === "") throw new LibraryError("A saved document needs a title.");
  if (input.documentText.trim() === "") {
    throw new LibraryError("A saved document needs its text.");
  }
  return {
    title,
    document_text: input.documentText,
    summary: input.result.summary,
    flags: input.result.flags,
    red_lines: input.redLines,
  };
}

function readFlag(raw: unknown): Flag | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const f = raw as Record<string, unknown>;
  if (typeof f.sourceSentence !== "string" || f.sourceSentence === "") return null;
  if (typeof f.severity !== "number" || !Number.isFinite(f.severity)) return null;
  if (typeof f.description !== "string") return null;
  if (typeof f.counterOffer !== "string") return null;
  if (typeof f.category !== "string") return null;
  if (f.origin !== "baseline" && f.origin !== "red-line") return null;
  if (f.redLine !== undefined && typeof f.redLine !== "string") return null;
  if (
    f.matchedRedLines !== undefined &&
    !(Array.isArray(f.matchedRedLines) && f.matchedRedLines.every((r) => typeof r === "string"))
  ) {
    return null;
  }
  const flag: Flag = {
    sourceSentence: f.sourceSentence,
    severity: f.severity,
    description: f.description,
    counterOffer: f.counterOffer,
    category: f.category,
    origin: f.origin,
  };
  if (typeof f.redLine === "string") flag.redLine = f.redLine;
  if (Array.isArray(f.matchedRedLines)) flag.matchedRedLines = f.matchedRedLines as string[];
  return flag;
}

/**
 * The stored flags jsonb, read back into Flag[]. Throws if any entry is
 * malformed or cites a sentence that isn't in the stored text: a flag with
 * no traceable source sentence is a bug (ADR 0001), so it is never shown.
 */
export function readSavedFlags(raw: unknown, documentText: string): Flag[] {
  if (!Array.isArray(raw)) throw new LibraryError("Stored flags are not a list.");
  return raw.map((entry, i) => {
    const flag = readFlag(entry);
    if (!flag) throw new LibraryError(`Stored flag ${i} is malformed.`);
    if (!documentText.includes(flag.sourceSentence)) {
      throw new LibraryError(`Stored flag ${i} cites a sentence not in the document.`);
    }
    return flag;
  });
}

export function readSavedRedLines(raw: unknown): string[] {
  if (!Array.isArray(raw) || !raw.every((r) => typeof r === "string")) {
    throw new LibraryError("Stored red lines are not a list of text.");
  }
  return raw;
}

export function fromDocumentRow(row: DocumentRow): SavedDocument {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    documentText: row.document_text,
    result: {
      summary: row.summary,
      flags: readSavedFlags(row.flags, row.document_text),
    },
    redLines: readSavedRedLines(row.red_lines),
  };
}

export function fromLibraryRow(row: LibraryRow): LibraryEntry {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    flagCount: row.flag_count,
  };
}

function fail(action: string, error: { message: string }): never {
  throw new LibraryError(`Could not ${action}: ${error.message}`, { cause: error });
}

/** Saves an analysis to the signed-in user's library. Returns the new id. */
export async function saveAnalysis(
  client: SupabaseClient,
  input: NewSavedAnalysis,
): Promise<string> {
  const { data, error } = await client
    .from(TABLE)
    .insert(toInsertRow(input))
    .select("id")
    .single();
  if (error) fail("save the document", error);
  return (data as { id: string }).id;
}

/** The signed-in user's documents, newest first. Reads no document text. */
export async function listDocuments(client: SupabaseClient): Promise<LibraryEntry[]> {
  const { data, error } = await client
    .from(TABLE)
    .select("id, title, created_at, flag_count")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (error) fail("list documents", error);
  return ((data ?? []) as LibraryRow[]).map(fromLibraryRow);
}

/** One saved document, or null if it doesn't exist or isn't the user's. */
export async function getDocument(
  client: SupabaseClient,
  id: string,
): Promise<SavedDocument | null> {
  if (!UUID_RE.test(id)) return null;
  const { data, error } = await client
    .from(TABLE)
    .select("id, title, created_at, document_text, summary, flags, red_lines")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("read the document", error);
  return data ? fromDocumentRow(data as DocumentRow) : null;
}

/**
 * Permanently deletes a document with its text, analysis and red lines.
 * Returns false if there was nothing the user could delete.
 */
export async function deleteDocument(
  client: SupabaseClient,
  id: string,
): Promise<boolean> {
  if (!UUID_RE.test(id)) return false;
  const { data, error } = await client.from(TABLE).delete().eq("id", id).select("id");
  if (error) fail("delete the document", error);
  return (data ?? []).length > 0;
}
