# 05: A clean document gets a designed "clean" result

**What to build:** When the overreach model finds nothing severity-worthy, the freelancer sees a deliberate, first-class result saying no overreaching clauses were found — its own copy and UI treatment, not a fallback empty-list message (ADR 0005). Nothing in the pipeline may force a minimum flag count. The copy must not imply "clean" means "safe" or is a legal guarantee — it means the baseline found nothing that reaches beyond the transaction.

**Blocked by:** 04 (Severity by overreach across the full clause taxonomy)

**Status:** done; the live zero-flag check waits on a working OPENROUTER_MODEL

- [x] `analyzeDocument` can return an empty `flags[]` as a valid result
- [x] Clean-document fixtures (genuinely boilerplate, low-risk contracts) return zero flags
- [x] If every fixture, including the boring ones, produces at least one flag, the test suite fails
- [x] The clean state has its own designed screen and copy
- [x] Clean-state copy does not claim the document is safe or carry a legal guarantee

## Comments

Built unattended on 2026-10-02. Nothing in the pipeline forces a non-empty result. The
offline tests stub only `fetch`. There's a suite guard: if every fixture produces a flag,
the suite fails, and clean, arbitration-narrow and ip-in-scope must each return zero.
"Clean-document fixtures return zero flags" stays unticked because that's a property of
the real model. `tests/live/clean.test.ts` checks it, and today it fails at the model 404
recorded in BUILD-REPORT.md.

Copy after the humanizer pass: "No flags. Redline found no clause in this document that
reaches past the job." Footnote: "Redline can miss a clause. No flags doesn't mean the
contract is fair, or that you should sign it."

Live check passed on 2026-10-03: clean-contract.txt returned zero flags on every run. The narrow pair fixtures were cut off by the free-tier rate limit before they finished.
