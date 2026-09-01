# 2. v1 targets freelancers, and only freelance agreements or contracts

## Decision

Redline v1 is built for freelancers evaluating a contract before they sign
it. It accepts only freelance agreements and general contracts as input.
Leases and terms-of-service documents are explicitly out of scope for v1,
despite both being named in the original product description.

## Alternatives

- Build for renters (leases) or small business owners/founders instead.
  Both were named as possible segments, but the research found no
  independently-sourced pain or willingness-to-pay evidence for either —
  only for freelancers.
- Accept all four originally-described document types (contract, lease,
  freelance agreement, ToS) in v1. Broadens the pitch, but forces the
  severity and flag vocabulary to cover lease-specific risk (rent
  escalators, deposit terms) and generic ToS risk (auto-renewal,
  arbitration) alongside freelance-specific risk (IP assignment,
  non-compete scope) — diluting depth in the one area with actual evidence.

## Why

Freelancers are the only segment the research surfaced with both
documented pain (independently-sourced IP-rights-grab and non-compete
complaints) and willingness-to-pay evidence (ClearSign, QwickContractReview,
Justee.ai pricing). Narrowing input to freelance agreements and contracts
keeps every flag, counter-offer, and severity call tuned to clause types
with real evidence behind them, instead of spreading effort across document
types nobody validated the pain for.

## Consequences

- Uploading a lease or a general terms-of-service document is explicitly
  rejected in v1, not silently analyzed with lower-quality flags.
- The product description's mention of "lease" and "terms of service"
  describes a possible future direction, not v1 — PRD and UI copy should
  say so plainly rather than imply broader support.
- Revisiting this means re-running the same evidence check for renters or
  general consumers before expanding document types, not just relaxing a
  file-type filter.
- Redline enters a segment with a live competitor (ClearSign, AI contract
  review for freelancers, $9/review) rather than unclaimed territory. The
  bet is that a cited severity ranking plus drafted counter-offers plus
  closed-document Q&A differentiates enough to matter — that bet is
  unvalidated by any evidence found in the research pass.
