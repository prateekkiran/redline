# 04: Severity by overreach across the full clause taxonomy

**What to build:** Flag severity reflects **overreach** — how far a clause's terms reach beyond the specific transaction the contract is about — not which category the clause belongs to (ADR 0003). Category tells the detector where to look; overreach decides how severe the flag is. Applied uniformly to: IP assignment, arbitration, non-compete, auto-renewal / hard-to-cancel terms, unilateral termination-for-convenience, and liability caps / indemnity. Fee/rent escalators are excluded.

Detection leans toward recall: a borderline clause gets flagged rather than missed, and flag descriptions are written in confident, unhedged language — the citation carries the humility (ADR 0004).

Non-compete, auto-renewal, and termination-for-convenience have not been individually worked through for what "overreach" means the way IP assignment and arbitration were. Where a case is genuinely ambiguous, note it in this ticket's Comments rather than guessing silently.

**Blocked by:** 03 (Cited flags — every flag shows its exact source sentence)

**Status:** built; the three model-judgement checks wait on a working OPENROUTER_MODEL (`pnpm test:live`)

- [ ] Paired fixtures: in-scope IP assignment (covers the paid deliverable) vs. overreaching IP assignment (reaches into future work / other clients / the freelancer's own tools) — the overreaching one scores higher, every run
- [x] Paired fixtures: narrow arbitration (this contract's disputes) vs. broad ("any and all claims however arising") — the broad one scores higher, every run
- [x] Each of the six categories has at least one fixture that produces a flag in that category
- [ ] Fixture set built from the clause types in `research/summary.md`; false negatives are what get driven down — extra borderline flags are not on their own a failure
- [ ] Flag descriptions contain no hedging ("may", "possibly", "might")
- [x] Ambiguous overreach calls for the three un-pressure-tested categories are written up under Comments

## Comments

Built unattended on 2026-10-02.

**The rule as built.** The model fills in a reach assessment for each candidate: one level (`none`, `some`, `far`) on each of seven category-neutral dimensions: time beyond the engagement, subject beyond this deal's work or disputes, other parties (affiliates, customers, other clients), the freelancer's own assets (pre-existing tools, pay already earned), one-sidedness, how hard it is to exit, and money exposure beyond the deal. Severity is computed in code (`lib/analysis/severity.ts`, `severityFrom`): 0/1/3 points per level, summed. Category is not an input. Raising any dimension always raises the score, and one unlimited reach outweighs two bounded ones.

**Within-the-deal candidates are dropped.** A candidate the model itself assesses as `none` on every dimension is, by definition, not overreach. Keeping it would make the clean result (ADR 0005) unreachable whenever a recall-leaning model proposes an in-scope clause. One `some` on any dimension is enough to keep it, so borderline clauses still show (ADR 0004). Drops are counted as `withinDeal` in diagnostics.

**Hedging is checked, never filtered.** `findHedges` treats "may" as a hedge even when it means permission (the prompt asks for "can"). It does not count bare "could" or "possible", because sidecar prose like "every possible claim you could ever have" states scope, not doubt. Hedged descriptions are counted (`hedged`) but still returned.

**Ambiguous overreach calls in the three categories nobody pressure-tested.** These are the cases where I had to make a call. The prompt and the dimension descriptions encode the calls below; each one is worth an owner's look.

Non-compete:
- A non-solicit of the client's employees *during the term only* (adhesion 7.2). I treated it as inside the deal: it protects the client's interest in this engagement and doesn't limit who the freelancer can work for. A recall-leaning model can still propose it with `others: some`, and it would then show as a low-ranked flag. I did not plant it as expected.
- A 6-month non-solicit of the client's employees *after* the term. This reaches past the term (`time: some`) and covers people outside the deal (`others: some`), so it scores 2 and shows as a borderline flag. Arguably it's ordinary. I chose to flag it, on recall.
- A non-solicit of the client's *customers* after the term. This reaches the freelancer's future market (`others: some`, `time: some`, often `oneSided: far`), so it is flagged and ranks above the employee one.
- A non-compete limited to the client's direct competitors and the term (no post-term tail). It covers other clients, so it is flagged (`others: some`). It's only a bounded reach, so it ranks low. The adhesion 7.1 version (a whole market for 12 months after the deal) ranks well above it.
- A confidentiality clause that bars using the client's confidential information for others. Inside the deal, not a non-compete, not flagged.

Auto-renewal:
- Auto-renewal that either party can cancel by email on 30 days' notice. The renewal itself carries the freelancer into terms they didn't buy (`time: some`), but the exit is easy (`exit: none`). Scored 1 and shown as a low flag. The alternative was to treat easy cancellation as fully inside the deal. I didn't, because a freelancer who forgets still ends up bound for another term.
- Month-to-month renewal of a retainer that the freelancer (not the client) benefits from. Same assessment as above. The rule doesn't know who benefits from renewal. That's a known blind spot: the dimensions measure reach, not whose interest it serves.
- Renewal stoppable only by certified mail inside a 30-day window (adhesion 4.3). `exit: far`, `time: some` or more, and one-sided when only the freelancer is bound. Ranked severe.
- "Evergreen" agreements with no end date and termination on long notice (90+ days). I treated that as `time: far` + `exit: some`, i.e. flagged.

Termination for convenience:
- Client-only termination for convenience that pays for work done to date, on 14 days' notice. One-sided (`oneSided: some`, since there's a counterweight) and nothing else, so it scores 1 and shows as a borderline flag. It could be called inside the deal, since the freelancer is paid. I flagged it because the freelancer has no matching right.
- Mutual termination for convenience that pays for work done. Inside the deal, not flagged (the pair fixtures and the clean contract rely on this).
- Termination for convenience with payment only for *accepted* deliverables, not work in progress. Loses some earned pay (`ownAssets: some`, `exposure: some`). Flagged, ranks above the paid-for-work-done version.
- Termination that pays nothing for work done or delivered (adhesion 4.4). `ownAssets: far`, `exposure: far`, `oneSided: far`. Ranked severe.
- Termination that also cancels a kill fee or deposit the freelancer already received (claw-back). Treated as `ownAssets: far`, same as unpaid work.

**Live suite.** `tests/live/severity.test.ts` runs each pair 3 times and the adhesion contract 3 times. Today it fails at the model call: `OpenRouter returned 404: This model is unavailable for free. The paid version is available now - use this slug instead: qwen/qwen3.8-27b`. That's the known `OPENROUTER_MODEL` problem. The model and provider were left unchanged, so none of the "every run" boxes are proven against a real model yet.

### Verification note (orchestrator, 2026-10-02)

Ticked: category coverage, which the pipeline test checks with the stub, and the
ambiguous calls written up above. Not ticked: the two "every run" pair checks, the
false-negative check and the no-hedging check. Only a real model can show those, and
they live in `tests/live/severity.test.ts`. Today they fail at the model 404 recorded in
BUILD-REPORT.md.

Live, 2026-10-03: broad arbitration outranked narrow on every run. The IP pair, the six-category coverage and the no-hedging check were cut off by the free-tier rate limit. One smoke run found all six categories, but 2 of its 7 descriptions were hedged.
