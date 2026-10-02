# Redline — Product Brief

## Who this is for, and what they do today instead

Redline v1 is for freelancers evaluating a contract before they sign it —
full stop. Not renters, not small business owners, not consumers reading a
terms-of-service page, even though all three read as plausible audiences in
the original product description. Freelancers are the only segment the
research surfaced with both documented pain and willingness-to-pay
evidence; the other segments get nothing in this version, not a lighter
version of the same tool (see [ADR 0002](docs/adr/0002-v1-scope-freelancers-only.md)).

Today, without Redline, a freelancer facing a contract does one of three
things:

- **Signs without pushing back**, under exactly the pressure described in
  the quote below.
- **Pays a lawyer** — $150–500/hr generally, a cited national average of
  $249–257/hr, with freelance/service-agreement flat fees typically
  $200–500 (My Legal Pal; Statista via LawPay). Often more than the gig
  itself pays.
- **Uses a tool that already exists.** ClearSign — AI contract review built
  specifically for freelancers — is live today at $9/review or $19/mo, with
  freelancers on Indie Hackers calling it a "no-brainer" price. Redline is
  not creating this category; it's entering one with a live, cheap,
  apparently-liked incumbent already in it.

## The problem

> "I didn't want to do it, obviously, but it was one of my first freelance
> assignments and at the time I was unwilling to push back in case it
> jeopardized the commission."
> — Holly Robertson, freelance journalist, on a Mashable contract
> transferring all copyright.
> [CJR](https://www.cjr.org/watchdog/contract-rights-grab.php)

> "[they] twist the terms to mean anything that furthers their cause, even
> if it hurts me."
> — Heidi Turner, freelance writer, on a marketing-agency client stretching
> a non-compete's scope.
> [Happy Freelancing](https://happyfreelancing.substack.com/p/insider-tips-how-to-deal-with-non)

Both freelancers saw the clause, sensed something was off, and signed
anyway — not from ignorance, but because they had no leverage to push back
and no independent, specific-enough read of the clause to act on even if
they'd wanted to. Redline's job is to be that independent read: not a
judgment call the freelancer has to take on faith, but a specific sentence
in their own document they can point to and decide about themselves.

## What the first version does

In-scope documents are freelance agreements and general contracts only — a
lease or terms-of-service upload is explicitly rejected, not degraded
([ADR 0002](docs/adr/0002-v1-scope-freelancers-only.md)). Within that
scope, v1 does exactly this, and nothing beyond it:

1. **Plain-English summary** of the uploaded document.
2. **Clauses ranked by severity**, each shown with the exact source
   sentence it's based on. A flag with no matching sentence in the
   document does not ship
   ([ADR 0001](docs/adr/0001-every-flag-cites-its-source.md)). Severity is
   driven by how far a clause reaches beyond the specific transaction, not
   by which category it belongs to — see "My red lines" below
   ([ADR 0003](docs/adr/0003-severity-driven-by-overreach.md)).
3. **A drafted counter-offer for every flagged clause.** No flag ships
   without one.
4. **A Q&A box that answers only from the uploaded document.** If the
   document doesn't answer the question, the box says so instead of
   filling the gap from general knowledge.
5. **An editable list of the user's own red lines**, which can only add
   flags on top of the baseline model above — never suppress a flag the
   baseline already raised
   ([ADR 0006](docs/adr/0006-red-lines-are-additive-only.md)).
6. **A saved library of past documents**, persisting across sessions. The
   user can permanently delete any document, which removes its text and
   analysis.

Two rules sit across all six:

- **Model calls go only to providers that don't keep or train on
  prompts.** OpenRouter routing is restricted to those providers, so the
  privacy statement below can be made plainly.
- **One plain line says Redline isn't a lawyer**, on the landing page and
  in the results view's footer. It sits outside the flags. Flags stay
  confident ([ADR 0004](docs/adr/0004-bias-toward-recall-confident-language.md)).

The six capabilities above are the whole product. Around them sits one
public page:

**A landing page** for signed-out visitors. It explains what Redline does
and leads to sign-up and sign-in. It is not a seventh capability, and it
only describes the six above. It is held to the same rule as the rest of
the product: it says only what is true.

- It names who v1 is for (freelancers) and what it accepts (freelance
  agreements and general contracts). It says plainly that leases and
  terms of service aren't supported yet, instead of implying broader
  support ([ADR 0002](docs/adr/0002-v1-scope-freelancers-only.md)).
- It doesn't invent proof it doesn't have: no testimonials, user
  counts, customer logos, accuracy figures or press. None of these exist
  yet (see "What the research could not tell us").
- Its privacy statement matches what actually happens. The file is
  parsed in the browser and never uploaded. The extracted text is
  stored on Redline's servers until the user deletes it, and is sent
  through OpenRouter only to model providers that don't keep or train on
  it.
- It shows a sample analysis of a made-up freelance contract. Until the
  analysis works, the sample is written by hand and labeled as a
  hand-written example. Every quoted sentence in it is checked in code as
  an exact substring of the sample contract. Before launch it must be
  replaced with Redline's real output, still labeled as a sample, and
  regenerated whenever the analysis changes.
- It says Redline is free during v1 and promises nothing about later
  pricing.
- It doesn't name or compare itself to ClearSign or any other tool. It
  describes Redline's own mechanisms and leaves the comparison to the
  visitor.
- It includes the one-line "not a lawyer" disclaimer.
- It ships on the default Vercel URL with a page title and description
  and no analytics.
- One design direction covers both the landing page and the app shell,
  so the marketing page can't set a look the product doesn't share. The
  landing page is built first; the app shell follows that direction.
- "Clean" is never presented as "safe" or as a legal guarantee
  ([ADR 0005](docs/adr/0005-clean-documents-are-a-real-output.md)).
- Severity is described as an order only: flags ranked by how far a
  clause reaches beyond the deal. No Low/Medium/High wording or badges,
  because that scale is undecided.
- All of its copy goes through the humanizer skill before it is
  committed, like every other piece of user-facing copy (CLAUDE.md).

## What good looks like

- **Every flag's citation is real.** In any test run, 100% of displayed
  flags carry a source sentence that is an exact, verbatim substring of the
  document's extracted text. A flag that fails this check does not
  display — checked automatically, not spot-checked.
- **Severity tracks overreach, not category.** On paired fixtures — a
  narrow arbitration clause next to a broad "any and all claims" one; an
  in-scope IP assignment next to one reaching into future work — the
  reaching clause scores higher, every time. Same category, different
  severity, consistently.
- **Misses are the number to drive toward zero, not false positives.** On a
  fixture set built from the clause types in `research/summary.md`, the
  false-negative rate is what gets optimized down. Extra borderline flags
  are expected and are not, on their own, a failure — a flag the user can
  dismiss in seconds by reading its citation costs little; a miss costs
  everything the product exists to prevent.
- **Clean is a real, reachable result.** Across a fixture set that includes
  genuinely boilerplate, low-risk contracts, at least some return zero
  flags. If every fixture — including the deliberately boring ones —
  produces at least one flag, that's a failure of this section, regardless
  of how well-formed the individual flags look
  ([ADR 0005](docs/adr/0005-clean-documents-are-a-real-output.md)).
- **The Q&A box never fabricates.** On a test set of questions with and
  without an answer in the document, it answers what it can support and
  explicitly declines what it can't. A confident answer to a question the
  document doesn't address is a failure, not a style issue.
- **Counter-offers respond to their specific clause.** Every flagged clause
  gets a counter-offer drafted against that clause's actual language — not
  a boilerplate suggestion reused across flags.
- **Red lines only add.** For any given document, adding a red line never
  reduces the flag count the baseline model already produced on that
  document — it can only add to it.
- **The landing page checks out.** Every claim on it maps to one of the six
  capabilities or to a stated v1 limit. A reviewer finds no invented
  social proof, no claim of lease or ToS support, and no copy that reads
  as model-written.

## My red lines

Every clause category below is governed by the same rule
([ADR 0003](docs/adr/0003-severity-driven-by-overreach.md)): severity comes
from how far the clause reaches beyond the transaction this contract is
actually about, not from which category it falls into. A clause scoped to
this deliverable, this contract's disputes, or this engagement's exposure
is unremarkable; the same clause type reaching past that scope is the
dangerous version. There is no fixed Low/Medium/High label scheme yet —
that's an open item, not a decision (see "What we are not building").

- **IP assignment / rights-grab** — *worked example.* Unremarkable when it
  covers the paid deliverable; dangerous when it reaches into future work,
  other clients' projects, or the freelancer's own tools and methods.
- **Arbitration** — *worked example.* Unremarkable when scoped to this
  contract's payment or performance disputes; dangerous when it reaches
  toward "any and all claims however arising," the way a clause meant for
  a $10 subscription got stretched toward a wrongful-death claim in the
  Disney case cited in the research.
- **Liability caps and indemnity** — *included on judgment, not evidence.*
  The research found zero real complaint evidence for this category
  despite it being named as an expected high-value target going in.
  Included anyway: silence in public complaints is at least as consistent
  with these clauses being dense and easy to gloss over as with them being
  harmless.
- **Non-compete, auto-renewal / hard-to-cancel terms, unilateral
  termination-for-convenience** — *included on research evidence, not
  individually pressure-tested this session.* All three have real
  supporting evidence in `research/summary.md` (independently-sourced
  freelancer complaints, an active FTC suit, and illustrative examples,
  respectively). They're in the v1 taxonomy under the same overreach rule
  as the two worked examples above, but — unlike IP assignment and
  arbitration — nobody has separately worked through what "overreach" looks
  like for each of these specifically. That's a real gap, not an oversight
  being hidden.
- **Fee/rent escalators — excluded.** The only evidence found was
  lease-specific (rent escalators), and leases are out of scope for v1.
  No freelance-contract-specific version of this pattern was surfaced or
  decided on, so it's left out rather than assumed to transfer.

## The calls I made and what I gave up

- **Freelancers only, not renters or small business owners.** Chose
  against: serving all three segments the product description implied.
  Worse off: renters and small-business owners with a lease or vendor
  contract they'd want checked get nothing from v1, despite "lease"
  appearing in the original pitch.
- **Freelance agreements and contracts only, no leases or ToS.** Chose
  against: broader document support. Worse off: the same renters and
  consumers as above, twice over — the input format itself now refuses
  them, not just the positioning.
- **Compete head-on with ClearSign rather than find an unclaimed angle.**
  Chose against: a narrower niche ClearSign isn't serving, which the
  research didn't surface one for. Worse off: nobody directly yet, but the
  product carries real, unvalidated differentiation risk — if the
  counter-offer and closed-document Q&A combination doesn't land, there's
  no fallback niche already staked out.
- **Severity by overreach, not by clause category.** Chose against: a
  simpler category-based severity lookup. Worse off: nobody using the
  product, but the build itself — this is a harder detection problem to
  get right and test than pattern-matching a clause type.
- **Liability/indemnity included with zero evidence behind it.** Chose
  against: cutting it until real evidence exists. Worse off: nobody
  obviously, but this category ships without an evidence trail to point to
  if it turns out to be noisy or wrong — credibility risk with no research
  backing to fall back on.
- **Recall over precision; confident language over hedged.** Chose against:
  fewer flags, more cautious wording. Worse off: every user, a little —
  more borderline flags to read through, even on documents that are mostly
  fine.
- **Clean documents shown as clean, not padded.** Chose against: always
  surfacing at least one finding. Worse off: the product's own demo appeal
  — "we checked and found nothing" is a less impressive first impression
  than a list of flags, and that impressiveness was deliberately given up
  for honesty.
- **Red lines can only add flags, never suppress one.** Chose against: full
  personalization, including the ability to silence a category. Worse off:
  freelancers who've made peace with, say, non-competes and don't want to
  see them flagged — they see every baseline flag regardless of their own
  stated preference, in exchange for "clean" meaning the same thing for
  every user.

## What we are not building

Excluded on purpose, with a stated reason:

- **Payments/billing.** Not part of proving the analysis can be trusted —
  the thing this version exists to prove.
- **OCR for scanned documents.** A citation is worthless if the underlying
  text was misread, so OCR would actively undermine the citation guarantee
  this whole product is built on, not just add a feature
  ([ADR 0001](docs/adr/0001-every-flag-cites-its-source.md)).
- **Sharing a document between users.** Same reasoning as the two above:
  it doesn't make the analysis more trustworthy, which is the only bar v1
  has to clear.
- **Lease and general terms-of-service document support.** No renter or
  general-consumer pain/willingness-to-pay evidence exists yet to build
  against ([ADR 0002](docs/adr/0002-v1-scope-freelancers-only.md)).
- **Red-line suppression.** Could ship later, but only with the
  suppression itself made visible in the output — never silently
  ([ADR 0006](docs/adr/0006-red-lines-are-additive-only.md)).
- **Trying Redline without an account.** Every analysis belongs to a
  signed-in user. The labeled sample on the landing page shows what the
  product does instead. An unauthenticated path to the model would need
  its own abuse and cost limits.
- **Comparing Redline to competitors on the landing page.** The research
  doesn't show Redline is better yet, so the page makes no comparison.
- **Analytics and a custom domain.** v1 ships on the Vercel URL with
  nothing tracking visitors. Both can come later. Analytics would need to
  be disclosed, and it is a new dependency.

Not decided yet, so not in v1 — different from the above, these aren't
ruled out, just unresolved:

- **A labeled severity scale** (e.g. Low/Medium/High). Severity is ordered
  by overreach; what tiers or labels represent that ordering to the user
  hasn't been decided.
- **Comparing a document to its own earlier version** after a freelancer
  sends a counter-offer back and gets a revised contract. Not surfaced
  during this brief's interview at all — noted, not designed.

## What the research could not tell us

- **Whether liability caps and indemnity actually cause the harm they're
  assumed to.** "The clause types most associated with 'big scary legal
  risk' — liability caps and indemnity — produced no real complaint
  evidence anywhere in this pass, despite being named as expected targets."
  This brief includes them anyway (see "My red lines"), on judgment, not
  evidence.
- **Whether anyone actually wants the two features meant to differentiate
  Redline from ClearSign.** "Redline's most distinctive features — a
  drafted counter-offer for every flagged clause, and a Q&A box that
  answers only from the document — have no direct evidence anyone is
  asking for them. The white-space finding... is an absence of
  competition, not a presence of demand."
- **How strong the willingness-to-pay signal really is.** It rests on
  "essentially one Indie Hackers thread and a couple of vendor pricing
  pages, all for the freelancer segment" — real, but narrow.
- **Anything about renters or general consumers.** Zero sourced pain or
  pricing evidence for either, despite both being implied by the original
  product description's mention of "lease" and "terms of service."
- **Whether the pain is actually smaller than it looks, or the evidence base
  is just thin.** Reddit — "plausibly the single richest source for 'I got
  burned by a clause I didn't read' narratives" — was inaccessible to every
  research agent this session, along with several other likely-rich
  sources (Avvo, JustAnswer, FTC.gov, CFPB complaint narratives). The
  research explicitly recommends closing this gap with direct interviews
  or manual forum reading before treating "no evidence found" as "no pain
  exists" — that hasn't happened yet.
