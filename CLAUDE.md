# Redline

Web app: upload a contract/lease/freelance agreement/ToS, get back a
plain-English summary, clauses ranked by severity with the exact source
sentence shown, a drafted counter-offer per flagged clause, a Q&A box that
answers only from the uploaded document, an editable list of the user's own
red lines that drives the analysis, and a saved library of past documents.

## Settled decisions (do not reinterpret)

- Stack: Next.js, Supabase (auth + database), deployed on Vercel.
- The uploaded file is parsed client-side, in the browser. Only extracted
  text is ever stored server-side — never the original file.
- Every risk flag must cite the exact source sentence. A flag with no
  traceable source sentence is a bug, not a missing nice-to-have.
- Model calls go through OpenRouter — no direct calls to a model provider's
  own API.

## Scope

Build exactly the six capabilities above and stop. If an addition looks like
an obvious next step but isn't in that list, ask before building it.
Explicitly excluded for this version: payments/billing, OCR for scanned
documents, and sharing a document between users. OCR is excluded on purpose,
not just deferred — a citation is worthless if the underlying text was
misread, so OCR would undermine the thing this version exists to prove.

## Standing rules

- Secrets live only in `.env.local` (gitignored). Never commit a secret —
  once pushed it's public and must be rotated, not just removed.
- The product states only what the document says. Where the text doesn't
  support a claim, don't make the claim — this applies to summaries,
  severity ranking, counter-offers, and Q&A answers alike.
- Ask before adding a dependency.

## Unresolved — ask before deciding

- Package manager (npm/pnpm/yarn) is not chosen yet. Ask before running the
  first install, and don't infer it from what happens to get typed first.
- Credential provisioning is not decided: whether the user supplies the
  Supabase project + OpenRouter key themselves, or the agent provisions them.
  Until this is resolved, stop and ask rather than provisioning anything or
  guessing a key is coming later.

## Before building

- Read `research/summary.md` first — it's the user research behind why
  these six capabilities and not others.
- Read `PRD.md` once it exists — it will hold the actual brief.

## Agent skills

### Issue tracker

Issues and specs live as markdown under `.scratch/<feature-slug>/`. See
`docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (needs-triage, needs-info, ready-for-agent,
ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See
`docs/agents/domain.md`.
