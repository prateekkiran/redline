# 08: Saved library of past documents

**What to build:** Each analysis the freelancer runs is saved to their personal library: the extracted document text and the `analyzeDocument` output (summary + flags). They can see a list of past documents and reopen one to view its analysis without re-uploading or re-analyzing. Only extracted text is stored — never the original file. Each user sees only their own documents; there is no sharing between users.

The red lines in effect at analysis time are added to each saved entry by ticket 09.

**Blocked by:** 02 (Tracer bullet — upload a contract, get a plain-English summary)

**Status:** done in code; nothing has run against a real Supabase project yet

- [x] Running an analysis saves it to the signed-in user's library
- [x] The library lists the user's past documents
- [x] Reopening a past document shows its saved analysis without calling the model again
- [x] Stored data is the extracted text and analysis output only — no original file
- [x] A user cannot read or list another user's documents (enforced at the database, not just the UI)
- [x] A user can permanently delete a document from their library, removing its text and analysis output (and, once ticket 09 lands, its recorded red lines)
- [x] Repository-layer tests: write an analysis, read it back, contents match
- [x] Repository-layer test: after delete, the document can't be read back

## Comments

Built unattended on 2026-10-03. The migration is `supabase/migrations/20261003000100_documents.sql`.
Row-level security limits select, insert and delete to the owner. There's no update,
signed-out visitors get no access, and deleting an account deletes its documents. The
policies are checked against real Postgres (PGlite) in `pnpm test`, under a small shim for
`auth.uid()`. The repository-layer write, read-back and delete tests run there too.
The supabase-js calls and the screens haven't touched a live project. Once the migration
is applied, run `pnpm exec tsx scripts/check-library.ts <email> <password>`.
A failed save never loses the analysis: the screen says it wasn't saved.
