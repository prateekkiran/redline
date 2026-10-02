# 04: Severity by overreach across the full clause taxonomy

**What to build:** Flag severity reflects **overreach** — how far a clause's terms reach beyond the specific transaction the contract is about — not which category the clause belongs to (ADR 0003). Category tells the detector where to look; overreach decides how severe the flag is. Applied uniformly to: IP assignment, arbitration, non-compete, auto-renewal / hard-to-cancel terms, unilateral termination-for-convenience, and liability caps / indemnity. Fee/rent escalators are excluded.

Detection leans toward recall: a borderline clause gets flagged rather than missed, and flag descriptions are written in confident, unhedged language — the citation carries the humility (ADR 0004).

Non-compete, auto-renewal, and termination-for-convenience have not been individually worked through for what "overreach" means the way IP assignment and arbitration were. Where a case is genuinely ambiguous, note it in this ticket's Comments rather than guessing silently.

**Blocked by:** 03 (Cited flags — every flag shows its exact source sentence)

**Status:** ready-for-agent

- [ ] Paired fixtures: in-scope IP assignment (covers the paid deliverable) vs. overreaching IP assignment (reaches into future work / other clients / the freelancer's own tools) — the overreaching one scores higher, every run
- [ ] Paired fixtures: narrow arbitration (this contract's disputes) vs. broad ("any and all claims however arising") — the broad one scores higher, every run
- [ ] Each of the six categories has at least one fixture that produces a flag in that category
- [ ] Fixture set built from the clause types in `research/summary.md`; false negatives are what get driven down — extra borderline flags are not on their own a failure
- [ ] Flag descriptions contain no hedging ("may", "possibly", "might")
- [ ] Ambiguous overreach calls for the three un-pressure-tested categories are written up under Comments
