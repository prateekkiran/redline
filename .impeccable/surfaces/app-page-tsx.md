---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: []
---

# Surface: Landing page

## Scope and mode

Public root route for signed-out visitors. Mode: Persuade.

## Audience, job, action

- Reader: the freelancer named in PRD.md, about to accept a contract they have little leverage to change, who senses something is off and can't yet point to it.
- What the page demonstrates (one thing): a contract turning into ranked flags, each showing the exact sentence it came from.
- One action: try it on your own document. Account first, so the action leads to sign-up. "Sign in" stays a quiet nav link for returning users.

## Proof and content

- A fictional freelance design agreement with hand-written flags, labeled on the page as a hand-written example. Every quoted sentence is checked in code as an exact substring of the sample contract. Before launch it is replaced with real output (PRD).
- No invented prices, customers, quotes, counts or press. Price line: free during v1, nothing promised after.

## Constraints

- Never claims: a verdict on whether to sign, legal advice, support for scanned or photographed documents, or any document type beyond freelance agreements and general contracts.
- Severity is shown as rank order only, with no Low/Medium/High labels.
- "Clean" never means safe.
- Privacy wording matches the data flow: file parsed in the browser and never uploaded; text stored until deleted; sent only to model providers that don't keep or train on it.
- One "Redline isn't a lawyer" line. Copy goes through the humanizer skill before commit.
- No analytics. Fonts self-hosted.

## Direction contract

THESIS: The contract is set as a critical edition, and each flag is a margin gloss keyed to the exact words it quotes. It refuses the category's split hero with a dashboard screenshot and traffic-light risk badges.

OWN-WORLD: Oxblood book cloth owns the field; a cool, bright page carries the contract; near-black ink; rubric red only on the gloss being read. A scholarly book face sets the document and glosses, a grotesk sets the controls. Line numbers, rank numerals, lemma brackets and rules; no pills, icons, drop shadows or gradients.

STORY: A freelancer sees a contract like theirs read the way an editor reads a text, notices that every flag quotes its sentence and line, sees that a clean page is a real outcome, and clicks to try their own.

FIRST VIEWPORT: The oxblood cloth is the full-bleed ground, with the wordmark and sign-in stamped in page-white on its top band. On it lies one bright edition page, about three-quarters of the width. Its running head labels it a hand-written example. Below that come the one-line promise; a few contract lines with line numbers, the top-ranked sentence set at display size inside a rubric bracket; ranked glosses one to three in the outer margin; and at the page foot, where an edition keeps its apparatus, the "try it" button and the price and input line. No split hero: the demonstration is the page.

FORM: Annotated edition, position 3 of 7 on the grounded list, seed key a3558fc7. Signature interaction: as the full sample scrolls into view, each cited sentence lifts out of the text and travels into its ranked place in the margin; hovering or focusing a gloss rubricates its sentence and draws a leader rule to it. Motion grammar: ruled and linear, like a pen drawing a line; no bounce; reduced motion shows the final state.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Severity label scale (PRD open item).
- Real sample output replaces the hand-written one before launch.
