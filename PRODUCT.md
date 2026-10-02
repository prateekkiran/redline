# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Desktop-first. Most review happens on a laptop, with the contract text, its
cited sentences and the counter-offers read side by side. Mobile web must
work fully but is not the primary layout target.

## Stack

Decided (see CLAUDE.md "Settled decisions"): Next.js, Supabase for auth and
database, deployed on Vercel. All model calls go through OpenRouter. The
uploaded file is parsed in the browser; only extracted text reaches the
server.

Undecided: package manager, and whether the user or the agent provisions the
Supabase project and OpenRouter key.

## Users

Freelancers evaluating a contract before they sign it. They usually sense
something is off in a clause but lack the leverage to push back, or an
independent and specific enough reading to act on. Today they sign anyway,
pay a lawyer ($150–500/hr, often more than the gig pays), or use an existing
tool such as ClearSign.

Not served in v1: renters, small-business owners, and consumers reading
terms of service (ADR 0002).

## Product Purpose

Give a freelancer an independent reading of their own contract: a
plain-English summary, flags ranked by severity, a drafted counter-offer per
flag, Q&A that answers only from the document, their own red lines, and a
library of past documents.

Success means the reading can be trusted without taking it on faith: every
flag points to a sentence the freelancer can find in their own document, and
a document with nothing overreaching is reported as clean.

## Positioning

Every flag quotes the exact sentence it is based on, checked verbatim
against the document text before it is shown (ADR 0001). Severity comes from
overreach, meaning how far a clause reaches beyond this specific deal, not
from which category the clause belongs to (ADR 0003). Each flag comes with a
counter-offer drafted against that clause's wording, and the Q&A declines to
answer when the document doesn't say.

This enters a category with a live, cheap incumbent (ClearSign, $9/review or
$19/mo). The bet that cited severity, counter-offers and document-only Q&A
differentiate enough is unvalidated.

## Operating Context

- Input is a text-based PDF of a freelance agreement or general contract
  (DOCX planned). Scanned documents are refused; there is no OCR, because a
  misread sentence would make its citation worthless.
- Leases and terms-of-service documents are rejected in the browser before
  any analysis, with a plain "not supported in v1" message.
- The freelancer checks a flag by finding its quoted sentence in their own
  contract, then decides whether to send the counter-offer back to the
  client.
- Past analyses are saved per user and reopened without re-running.

## Capabilities and Constraints

v1 is exactly six capabilities: summary, severity-ranked cited flags,
counter-offer per flag, document-only Q&A, editable red lines, saved library.

- A flag with no verbatim source sentence is a bug and is never displayed.
- Severity is an ordering. A labeled scale (Low/Medium/High) is undecided.
- Clause taxonomy: IP assignment, arbitration, non-compete, auto-renewal /
  hard-to-cancel terms, unilateral termination-for-convenience, liability
  caps / indemnity. Fee/rent escalators are excluded.
- Red lines only add flags; they never hide a baseline flag (ADR 0006).
- Model calls go only to providers that don't keep or train on prompts.
- Users can permanently delete any document in their library.
- One plain line says Redline isn't a lawyer, on the landing page and in
  the results footer; never inside a flag.
- Free during v1, with no promise about later pricing. No payments.
- A public landing page for signed-out visitors describes the six
  capabilities and is not a seventh. It shows a labeled sample of real
  output on a fictional contract, names no competitor, and has no
  analytics.
- "Clean" is a real result, never padded with a minimum flag count
  (ADR 0005). It does not mean "safe" and is not a legal guarantee.
- Out of scope: payments, OCR, sharing between users, leases and ToS,
  comparing a document to its earlier version.

Terminology (CONTEXT.md): **document** (the extracted text, never "file"),
**flag** (not "risk", "issue" or "warning"), **overreach**, **clean**,
**red line**.

## Brand Commitments

- Name: Redline. No logo or visual assets exist yet.
- Voice: a plain, direct peer, like an experienced freelancer who has read
  the contract. Short sentences, no legal jargon, no cheerleading.
- Flags are stated confidently, without "may" or "possibly". The citation
  carries the humility, not the wording (ADR 0004).
- The product states only what the document says, in summaries, flags,
  counter-offers and Q&A alike.
- All user-facing copy (landing page, UI labels, errors, empty states) goes
  through the humanizer skill before it is committed. Copy that reads as
  model-written is a defect.

## Evidence on Hand

- Freelancer quotes on signing under pressure, in `research/` and `PRD.md`:
  Holly Robertson (CJR) on a copyright-transfer contract; Heidi Turner (Happy
  Freelancing) on a stretched non-compete.
- Competitor and pricing research in `research/agent3-what-exists.md` and
  `research/agent4-who-would-pay.md`; lawyer rates cited in `PRD.md`.
- Absent, and must not be invented: users, testimonials, customer logos,
  usage numbers, accuracy benchmarks, future pricing, and press. There is no
  evidence yet that anyone wants counter-offers or document-only Q&A.

## Product Principles

1. **Every claim is checkable.** If the freelancer can't find it in their
   own document, Redline doesn't say it.
2. **Missing a clause is worse than an extra flag.** Lean toward flagging;
   a wrong flag is dismissed in seconds by reading its citation.
3. **Clean means the same for everyone.** No padding to look busy and no
   per-user hiding of flags.
4. **Hand the freelancer something to act on.** A flag without a drafted
   counter-offer is unfinished.

## Accessibility & Inclusion

WCAG 2.2 AA.
