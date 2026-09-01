# 5. A clean document is a real, designed output — never manufactured

## Decision

When the overreach model (ADR 0003) finds nothing severity-worthy in a
document, Redline says so plainly — "no overreaching clauses found" — as a
first-class result. It never forces a minimum flag count to avoid showing
an empty result.

## Alternatives

- Always surface at least one finding, even a minor one, so the output
  never looks empty. Rejected: this manufactures value that isn't there,
  and once a user notices Redline always finds *something*, every flag
  becomes suspect — including the real ones.

## Why

Most uploaded documents are probably fine, and ADR 0004 just biased
detection toward finding more borderline flags, not fewer — pushing even
further against a clean result ever appearing on its own. A tool incapable
of ever saying "this is fine" isn't measuring risk, it's performing
busyness, and it stops being believed exactly when a real flag shows up and
needs to be taken seriously.

## Consequences

- The empty/clean state is a designed part of the product, not an edge
  case handled as an afterthought — it needs its own copy and UI treatment,
  not a fallback message.
- Detection logic must be allowed to honestly return zero flags; nothing in
  the pipeline should coerce a non-empty result.
- This makes false negatives (ADR 0004's accepted risk) more costly to get
  wrong specifically on documents that get called "clean" — a missed
  overreaching clause on a document Redline actively vouched for as fine is
  the worst version of the failure ADR 0004 already accepted the risk of.
