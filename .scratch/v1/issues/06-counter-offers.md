# 06: A drafted counter-offer for every flag

**What to build:** Every flag shows a drafted counter-offer — concrete replacement language the freelancer can send back — written against that clause's actual wording, not a generic suggestion reused across flags. After this ticket, no flag is returned without a counter-offer (closing the development gap accepted in ticket 03). The counter-offer proposes language; it must not assert anything about the document that the text doesn't support.

**Blocked by:** 03 (Cited flags — every flag shows its exact source sentence)

**Status:** done; the live check that counter-offers respond to their clauses waits on a working OPENROUTER_MODEL

- [x] Every flag in `analyzeDocument` output carries a counter-offer
- [x] A flag without a counter-offer is never returned
- [x] The UI shows each flag's counter-offer next to its cited sentence
- [x] Fixture test: every returned flag has a non-empty counter-offer
- [x] Fixture test: on a fixture with multiple flags, counter-offers are not identical to each other, and each responds to its own clause's language

## Comments

Built unattended on 2026-10-03 in two parts, because single-agent runs stalled three
times. A flag that comes back with an empty counter-offer, or one under 20 characters,
gets one follow-up model call for just those clauses. Anything still empty after that is
dropped, and code never writes a counter-offer itself. `respondsToClause` checks that a
counter-offer shares at least one distinctive word or number with its clause. The
fixture tests run through the sidecar stub. `tests/live/counter-offers.test.ts` repeats
the checks against the real model. Copy: "Ask for this instead", "Copy", "Copied.",
"Couldn't copy. Select the text above and copy it yourself."
