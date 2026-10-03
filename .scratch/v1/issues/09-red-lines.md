# 09: Editable red lines that only add flags

**What to build:** The freelancer keeps a personal, editable list of red lines — things they don't want to see in a contract. The list persists across sessions and is passed into `analyzeDocument`. A red line can only add flags on top of the baseline overreach analysis; it can never suppress a flag the baseline would raise (ADR 0006). Red lines are applied as additions to detection output, not as a filter after it. Flags raised by a red line follow the same citation rule as every other flag. Each saved library entry records the red lines in effect when it was analyzed.

**Blocked by:** 03 (Cited flags — every flag shows its exact source sentence), 08 (Saved library of past documents)

**Status:** done in code; persistence hasn't run against a real Supabase project yet

- [x] A signed-in user can add, edit, and remove red lines, and the list persists across sessions
- [x] The current red lines are passed into `analyzeDocument`
- [x] Monotonicity test: for the same fixture, flag count with an added red line ≥ flag count without it
- [x] Every baseline flag is still present when red lines are applied
- [x] Flags raised by a red line carry a verbatim source sentence, same as baseline flags
- [x] Each library entry stores the red lines in effect at analysis time
- [x] No UI or code path lets a red line hide a baseline flag

## Comments

Built unattended on 2026-10-03. The baseline call never receives red lines, and a test
pins its input. Red-line hits go through the same citation and counter-offer checks.
A hit on a sentence the baseline already flagged only adds to `matchedRedLines`, and
a new red-line flag is slotted in after every baseline flag at least as severe. If the
red-line call fails, the whole analysis fails with an error. Carrying on would look like
none of the red lines matched. Limits are 20 red lines of up to 200 characters each,
enforced by the API, the database trigger and the module. The red_lines table's RLS is
proven on PGlite. A live monotonicity test exists, but it waits on a working
OPENROUTER_MODEL.
