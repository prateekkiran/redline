# 07: Q&A answered only from the document

**What to build:** Next to an analyzed document, the freelancer can type a question and get an answer grounded only in that document's text. If the document doesn't answer the question, the box says so plainly instead of filling the gap from general legal knowledge. Backed by `answerQuestion(documentText, question)`, which returns either an answer or an explicit decline. All model calls route through the analysis module.

**Blocked by:** 02 (Tracer bullet — upload a contract, get a plain-English summary)

**Status:** ready-for-agent

- [ ] `answerQuestion` returns `{ answer }` or `{ declined: true }`
- [ ] A signed-in user can ask a question about the current document and see the answer or the decline
- [ ] The decline is shown as a clear "your document doesn't say" message, not an error
- [ ] Fixture set: one document paired with answerable and unanswerable questions
- [ ] Answerable questions get an answer; unanswerable questions get an explicit decline — a confident answer to an unanswerable question fails the test
