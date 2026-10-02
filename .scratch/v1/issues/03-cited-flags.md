# 03: Cited flags — every flag shows its exact source sentence

**What to build:** After uploading, the freelancer sees a list of flags ranked by severity alongside the summary. Every flag shows the exact sentence from their document it's based on, plus a plain-language description, so they can find that sentence in their own contract and judge it themselves. Before any flag is returned, its source sentence is checked as a verbatim substring of the extracted document text; a candidate that fails is dropped silently — never shown with a caveat (ADR 0001).

Severity here is an ordering, not a label scheme (Low/Medium/High is undecided). Tuning severity to overreach across the full clause taxonomy is ticket 04; this ticket proves the citation pipeline end to end.

Counter-offers arrive in ticket 06. Until then, flags exist in development without one — accepted, since nothing ships mid-build. The PRD rule "no flag ships without a counter-offer" applies at release.

**Blocked by:** 02 (Tracer bullet — upload a contract, get a plain-English summary)

**Status:** done

- [x] `analyzeDocument` returns `flags[]`, each with a source sentence, a severity value (an ordering), and a plain-language description
- [x] Every returned flag's source sentence is an exact substring of the document text — enforced in code, not just in the prompt
- [x] A candidate flag whose quote does not match is dropped, never displayed with a caveat
- [x] The UI shows flags ranked by severity, each with its quoted source sentence
- [x] Citation-integrity fixture tests: for every fixture, every returned flag's source sentence exact-matches the fixture text
- [x] A test proves a non-matching candidate quote is dropped

## Comments

Built unattended on 2026-10-02. The summary and the flags now come from two parallel
model calls. Severity is computed in code from the model's overreach assessment, not
read from the category. When a quote doesn't match exactly, it's looked up again
treating quote marks, dashes and runs of whitespace as equal. The returned sentence
is always the document's own span, never the model's text. Quotes under 20 characters
are dropped. The UI ranks the glosses in the margin, and at narrow widths they fold in
below the line they quote.

`pnpm smoke` exists, but its real-model run fails on the known OPENROUTER_MODEL 404
(see BUILD-REPORT.md).
