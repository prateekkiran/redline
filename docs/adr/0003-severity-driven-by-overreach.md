# 3. Severity is driven by overreach, not clause category

## Decision

A flagged clause's severity is determined by whether its terms reach beyond
the specific transaction the contract is actually about — not by which
named category it falls into (IP assignment, arbitration, non-compete,
etc.). Clause category tells the detector where to look; overreach is what
determines how severe the finding is.

## Alternatives

- Score severity by clause category alone (e.g. "IP assignment clauses are
  always high severity"). Simpler to implement — a category lookup table —
  but it's wrong on the majority of contracts, since standard, expected
  practice (the client owns the deliverable they paid for) and predatory
  practice (the client owns everything the freelancer ever produces) use
  the same clause category.
- Score severity by category, then let the model apply "judgment" within
  that category with no stated rule. Avoids committing to a specific
  signal, but produces inconsistent severity calls with no way to test or
  explain them.

## Why

Two independent clause types — IP assignment and arbitration — turned out
to share the exact same dangerousness signal once pushed on: a clause
scoped to the transaction at hand (this deliverable, this contract's
disputes) is unremarkable, while the same clause type reaching past that
scope (future work, other clients, "any and all claims however arising")
is the dangerous version. Category-based flagging would treat both as
identical; overreach-based flagging tells them apart, which is the entire
point of a severity ranking instead of a flat list.

## Consequences

- Flag detection has to reason about scope — what the contract is actually
  for, and whether a given clause's reach matches that scope — not just
  pattern-match for named clause types. This is a harder detection problem
  than category matching, and prompt/detection logic should be designed
  and tested against that, not against a simpler category checklist.
- New clause categories added later (see the liability/indemnity decision
  from this same session) should be evaluated against the same overreach
  question before they get a severity rule of their own, rather than each
  category inventing its own severity logic.
- Test fixtures need same-category, different-severity pairs (a narrow
  arbitration clause next to a broad one; an in-scope IP assignment next to
  an overreaching one) to verify the model is actually scoring reach, not
  just detecting category.
