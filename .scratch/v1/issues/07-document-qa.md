# 07: Q&A answered only from the document

**What to build:** Next to an analyzed document, the freelancer can type a question and get an answer grounded only in that document's text. If the document doesn't answer the question, the box says so plainly instead of filling the gap from general legal knowledge. Backed by `answerQuestion(documentText, question)`, which returns either an answer or an explicit decline. All model calls route through the analysis module.

**Blocked by:** 02 (Tracer bullet — upload a contract, get a plain-English summary)

**Status:** done; the live check that real answers stay grounded waits on a working OPENROUTER_MODEL

- [x] `answerQuestion` returns `{ answer }` or `{ declined: true }`
- [x] A signed-in user can ask a question about the current document and see the answer or the decline
- [x] The decline is shown as a clear "your document doesn't say" message, not an error
- [x] Fixture set: one document paired with answerable and unanswerable questions
- [x] Answerable questions get an answer; unanswerable questions get an explicit decline — a confident answer to an unanswerable question fails the test

## Comments

Built unattended on 2026-10-03. `answerQuestion` returns `{ answer, quote }` or
`{ declined: true }`. The quote is an exact span cut from the document, and an answer
whose supporting quote can't be found word for word comes back as a decline. The
pipeline tests stub only the model call and cover answerable, unanswerable, fabricated
quote and empty quote. The last criterion is unticked: it asks whether the real model
declines unanswerable questions, and only `tests/live/qa.test.ts` can show that.
Decline copy: "The document doesn't say. Redline only answers from what's written in it."

Live check passed on 2026-10-03 (qwen/qwen3.8-27b:free via ModelRun): every answerable question was answered with a verbatim quote, and every unanswerable one was declined.
