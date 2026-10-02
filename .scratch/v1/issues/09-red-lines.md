# 09: Editable red lines that only add flags

**What to build:** The freelancer keeps a personal, editable list of red lines — things they don't want to see in a contract. The list persists across sessions and is passed into `analyzeDocument`. A red line can only add flags on top of the baseline overreach analysis; it can never suppress a flag the baseline would raise (ADR 0006). Red lines are applied as additions to detection output, not as a filter after it. Flags raised by a red line follow the same citation rule as every other flag. Each saved library entry records the red lines in effect when it was analyzed.

**Blocked by:** 03 (Cited flags — every flag shows its exact source sentence), 08 (Saved library of past documents)

**Status:** ready-for-agent

- [ ] A signed-in user can add, edit, and remove red lines, and the list persists across sessions
- [ ] The current red lines are passed into `analyzeDocument`
- [ ] Monotonicity test: for the same fixture, flag count with an added red line ≥ flag count without it
- [ ] Every baseline flag is still present when red lines are applied
- [ ] Flags raised by a red line carry a verbatim source sentence, same as baseline flags
- [ ] Each library entry stores the red lines in effect at analysis time
- [ ] No UI or code path lets a red line hide a baseline flag
