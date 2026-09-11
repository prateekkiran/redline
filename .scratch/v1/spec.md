Status: ready-for-agent

# Redline v1

## Problem Statement

A freelancer facing a contract has no independent, specific-enough way to
tell which clauses could hurt them. They either sign without pushing back
because raising a concern risks the gig, or pay a lawyer $150–500/hr for a
review that often costs more than the gig itself pays. The clauses that do
the damage — IP overreach, non-competes stretched past their stated scope,
auto-renewal traps, arbitration clauses reaching past this contract's own
disputes — are the kind a freelancer can sense but can't always name or
prove on their own.

## Solution

A freelancer uploads a freelance agreement or general contract and gets
back: a plain-English summary; clauses ranked by severity, each shown with
the exact sentence it's based on so the freelancer can verify it
themselves; a drafted counter-offer for every flagged clause; a Q&A box
that answers questions only from their document; an editable list of their
own red lines that adds to, but never removes from, the baseline analysis;
and a saved library of past documents.

## User Stories

1. As a freelancer, I want to upload a freelance agreement or general
   contract, so that I can get an analysis before I sign it.
2. As a freelancer, I want Redline to reject a lease or terms-of-service
   upload with a clear message, so that I don't mistake an out-of-scope
   analysis for a real one.
3. As a freelancer, I want my file parsed in my own browser, so that only
   the extracted text — never the original file — ever reaches Redline's
   servers.
4. As a freelancer, I want a plain-English summary of the document, so that
   I understand what I'm agreeing to without reading full legal text.
5. As a freelancer, I want each flagged clause to show the exact sentence
   from my document it's based on, so that I can verify the finding myself
   instead of trusting the tool blindly.
6. As a freelancer, I want flags ranked by severity, so that I can
   prioritize which issues to address first.
7. As a freelancer, I want an IP assignment clause flagged as severe only
   when it reaches beyond the specific deliverable I was paid for, so that
   standard "you own what I built for you" language isn't treated as
   dangerous.
8. As a freelancer, I want an arbitration clause flagged as severe only
   when it reaches beyond disputes arising from this contract, so that
   boilerplate arbitration language isn't treated the same as an
   overreaching one.
9. As a freelancer, I want liability and indemnity clauses flagged even
   though there's no public research evidence they're commonly complained
   about, so that Redline doesn't skip a whole category just because it's
   rarely talked about publicly.
10. As a freelancer, I want non-compete, auto-renewal/cancellation, and
    unilateral-termination clauses flagged using the same overreach
    principle as the worked-out categories, so that the whole taxonomy
    behaves consistently even where it hasn't been individually tuned.
11. As a freelancer, I want Redline to never show me a flag it can't cite
    an exact sentence for, so that I never see an unverifiable claim.
12. As a freelancer, I want Redline to tell me plainly when it finds
    nothing severity-worthy, so that I can trust a "clean" result instead
    of wondering if the tool is just being quiet.
13. As a freelancer, I want Redline to lean toward flagging borderline
    clauses rather than staying silent, so that I don't miss something
    that actually hurts me because the tool was being overly cautious.
14. As a freelancer, I want flagged clauses described in confident, plain
    language rather than hedged with "may" or "possibly", so that I can
    act on the finding without guessing how seriously to take it.
15. As a freelancer, I want a drafted counter-offer for every flagged
    clause, so that I have concrete replacement language to send back
    instead of just a description of the problem.
16. As a freelancer, I want each counter-offer to respond to the specific
    language of its clause, so that I'm not given a generic suggestion
    that doesn't match what my contract actually says.
17. As a freelancer, I want to ask a question about my document and get an
    answer grounded only in its text, so that I don't get a generic
    legal-knowledge answer that doesn't reflect what I actually signed.
18. As a freelancer, I want Redline to tell me when my document doesn't
    answer my question, so that I don't mistake a fabricated answer for
    something my contract actually says.
19. As a freelancer, I want to maintain my own editable list of red lines,
    so that the analysis reflects things I personally care about beyond
    the baseline model.
20. As a freelancer, I want my red lines to only add flags, never remove
    ones the baseline analysis already found, so that I can't accidentally
    make a risky document look clean by customizing my own preferences.
21. As a freelancer, I want my past analyzed documents saved to a library,
    so that I can revisit them later without re-uploading and
    re-analyzing.
22. As a freelancer, I want what I see in my library to be the extracted
    text, not the original file, so that storage is consistent with what
    was actually analyzed the first time.
23. As a developer maintaining Redline, I want a fixture-based test suite
    for the analysis function, so that citation accuracy, severity-by-
    overreach, and the clean-result path are verified automatically
    rather than eyeballed.
24. As a developer maintaining Redline, I want paired same-category,
    different-severity fixtures (narrow vs. broad arbitration; in-scope
    vs. overreaching IP assignment), so that severity scoring is proven to
    track overreach, not just clause category.
25. As a developer maintaining Redline, I want an in-document/
    out-of-document question fixture set for the Q&A function, so that
    fabricated answers are caught automatically, not by eyeballing.

## Implementation Decisions

- A server-side analysis module exposes two functions:
  `analyzeDocument(documentText, redLines) → { summary, flags[] }` and
  `answerQuestion(documentText, question) → { answer } | { declined: true }`.
  Every OpenRouter call in the product routes through this module — no
  direct model calls anywhere else (CLAUDE.md's OpenRouter-only rule).
- Each item in `flags[]` carries: the flagged clause's source sentence
  (must be a verbatim substring of `documentText`), a severity value
  (an ordering, not a fixed label — see Out of Scope), a plain-language
  description, and a drafted counter-offer.
- Severity is computed from overreach — how far a clause's terms extend
  beyond the specific transaction the contract is about — applied
  uniformly across the taxonomy: IP assignment, non-compete,
  auto-renewal/cancellation, arbitration, unilateral
  termination-for-convenience, and liability caps/indemnity. Fee/rent
  escalators are excluded from the taxonomy entirely — lease-specific,
  and leases are out of scope for v1's document types.
- Before `analyzeDocument` returns a flag, its source sentence is verified
  as an exact substring of `documentText`. A candidate flag that fails
  this check is dropped silently — never shown with a caveat attached.
- `redLines` can only add flags beyond what the baseline (empty red lines)
  would produce. The implementation must guarantee: flag count with red
  lines applied ≥ flag count without, for the same document. This is a
  testable invariant, not just an intent.
- `analyzeDocument` must be able to return an empty `flags[]` as a valid,
  first-class result. Nothing in the pipeline may force a non-empty
  result.
- Document-type rejection (lease/ToS) happens client-side, before
  `analyzeDocument` is ever called — it is not a flag within its output,
  it's a gate in front of it.
- File parsing happens entirely client-side, in the browser. Only the
  extracted document text is ever transmitted to or stored by the server;
  the original file is never uploaded or persisted.
- The document library persists, per saved analysis: the extracted
  document text, the `analyzeDocument` output (summary + flags), and the
  red lines in effect at the time of that analysis, associated with the
  authenticated user (Supabase auth).

## Testing Decisions

- Tests target `analyzeDocument` and `answerQuestion` directly — not the
  UI, not the upload flow, not the database — since every "what good looks
  like" claim in `PRD.md` is a property of these two functions' output
  given a controlled input.
- A good test here asserts external behavior only: given this document
  text (and, where relevant, these red lines or this question), the
  output has this property. Never assert on prompt structure or
  intermediate model reasoning.
- Fixture documents are the primary test data, built from the clause
  types and examples in `research/summary.md` and `PRD.md`'s "My red
  lines" section:
  - **Citation integrity** — every returned flag's source sentence must
    exact-match a substring of the fixture text.
  - **Severity-by-overreach pairs** — same clause category, an in-scope
    variant and an overreaching variant (e.g. IP assignment scoped to the
    deliverable vs. reaching into future work). The overreaching variant
    must score higher, every time.
  - **Clean-document fixtures** — genuinely boilerplate, low-risk
    contracts that must return zero flags, proving the clean path is
    reachable and not suppressed by a hidden minimum.
  - **Red-lines monotonicity** — the same fixture analyzed with and
    without an added red line; flag count must never decrease.
  - **Q&A grounding** — a fixture document paired with answerable and
    unanswerable questions; unanswerable questions must get an explicit
    decline, never a fabricated answer.
- No prior art exists in this codebase yet — this is a greenfield project,
  and this suite establishes the pattern later features should follow.
- Library/persistence tests are conventional repository-layer tests
  (write, then read back) — not fixture-based behavior tests, and outside
  this fixture suite.

## Out of Scope

- Lease and terms-of-service document support (ADR 0002).
- Payments/billing.
- OCR for scanned documents — would compromise the citation guarantee
  itself, not just add a feature (ADR 0001).
- Sharing a document between users.
- Red-line suppression of baseline flags, even a visible one — additive
  only for v1 (ADR 0006).
- A labeled severity scale (e.g. Low/Medium/High). This spec treats
  severity as an ordering only; the label scheme is undecided.
- Comparing a document to an earlier version of itself after a
  counter-offer negotiation.
- Package manager and credential-provisioning decisions (CLAUDE.md,
  "Unresolved") — prerequisites to implementation, not part of this spec.

## Further Notes

Non-compete, auto-renewal/cancellation, and unilateral
termination-for-convenience are in the taxonomy on research evidence
alone — nobody individually worked out what "overreach" looks like for
each of these the way IP assignment and arbitration were pressure-tested
during the PRD interview. Implementers should expect to make judgment
calls here and should flag ambiguous cases rather than guess silently,
consistent with CLAUDE.md's "ask before deciding" posture on unresolved
items.

Liability caps and indemnity are in the taxonomy with zero supporting
research evidence behind them — a deliberate, documented bet (`PRD.md`,
"The calls I made and what I gave up"), not an oversight.
