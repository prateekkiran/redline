# 6. Red lines are additive only in v1

## Decision

A user's own red lines can only add flags on top of the baseline overreach
model (ADR 0003). They can never suppress a flag the baseline model would
otherwise raise. If suppression is added in a later version, the
suppression itself must be shown in the output, never hidden.

## Alternatives

- Let red lines also suppress flags (e.g. "don't flag non-competes for
  me"), silently. This is the more intuitive reading of "an editable list
  that drives the analysis," but it means two people uploading the
  identical contract can get different severity results, and a "clean"
  result (ADR 0005) stops meaning one consistent thing — it means "clean
  according to what this user chose to care about," which is invisible to
  anyone but that user.

## Why

ADR 0001's entire credibility story rests on every flag being independently
checkable by anyone who reads the cited sentence. A silent suppression
breaks that symmetry: the *absence* of a flag would depend on a per-user
setting nobody else can see, unlike the presence of a flag, which anyone
can verify. Keeping red lines additive-only means "this document is clean"
means the same thing regardless of who uploaded it.

## Consequences

- v1's red-lines feature only ever makes a document's result more
  cautious, never less — it can't be used to make a risky document look
  clean.
- If suppression ships later, it needs its own visible affordance (e.g. "we
  didn't flag this because you told us not to") rather than just omitting
  the flag, so a clean-looking result is never silently curated by the
  user's own settings.
- This constrains the data model: a red line is stored and applied as an
  addition to detection output, not as a filter applied after detection.
