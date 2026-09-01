# 4. Bias toward recall, and write flags with confident language

## Decision

Redline biases its detection toward fewer missed clauses over fewer wrong
flags, and phrases every flag confidently rather than hedging the wording.
Both choices rest on the same mechanism: ADR 0001's citation requirement
already lets the user verify any flag against the exact sentence in
seconds, so it functions as the safety net that would otherwise have to
come from conservative detection or hedged prose.

## Alternatives

- Bias toward precision (only flag when confident), to minimize the chance
  of crying wolf on a normal clause. Rejected because a false positive is
  cheap here — the user reads the cited sentence and shrugs — while a
  missed clause is a silent, unrecoverable failure with Redline's implicit
  endorsement attached to it.
- Hedge flag language ("this clause may possibly allow...") independent of
  the citation, as an extra layer of caution. Rejected because it's
  redundant with the citation as a safety mechanism, and it kills the
  "useful" half of the confident/hedged trade-off for no real safety gain.

## Why

Both the false-positive/false-negative trade-off and the
confident/hedged-language trade-off are normally genuine dilemmas with no
free lunch. ADR 0001 changes the math for both at once: because every flag
carries its own verifiable citation, the user has a fast, built-in way to
dismiss a wrong flag, but no equivalent way to discover a flag that was
never raised. The citation is what makes leaning toward recall and
confidence affordable, rather than reckless.

## Consequences

- Detection thresholds should be tuned to minimize missed overreach, even
  at the cost of more borderline flags — this is a deliberate choice, not
  an oversight to fix later.
- Flag copy states findings plainly ("this clause lets the client claim
  ownership of your future work"), not softened with hedging words. The
  citation carries the epistemic humility; the prose doesn't need to.
- If the citation requirement (ADR 0001) is ever relaxed, this decision
  needs to be revisited — the whole justification for leaning into recall
  and confidence depends on the citation being there to catch mistakes.
