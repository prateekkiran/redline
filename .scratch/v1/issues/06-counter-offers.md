# 06: A drafted counter-offer for every flag

**What to build:** Every flag shows a drafted counter-offer — concrete replacement language the freelancer can send back — written against that clause's actual wording, not a generic suggestion reused across flags. After this ticket, no flag is returned without a counter-offer (closing the development gap accepted in ticket 03). The counter-offer proposes language; it must not assert anything about the document that the text doesn't support.

**Blocked by:** 03 (Cited flags — every flag shows its exact source sentence)

**Status:** ready-for-agent

- [ ] Every flag in `analyzeDocument` output carries a counter-offer
- [ ] A flag without a counter-offer is never returned
- [ ] The UI shows each flag's counter-offer next to its cited sentence
- [ ] Fixture test: every returned flag has a non-empty counter-offer
- [ ] Fixture test: on a fixture with multiple flags, counter-offers are not identical to each other, and each responds to its own clause's language
