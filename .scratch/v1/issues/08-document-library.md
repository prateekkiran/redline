# 08: Saved library of past documents

**What to build:** Each analysis the freelancer runs is saved to their personal library: the extracted document text and the `analyzeDocument` output (summary + flags). They can see a list of past documents and reopen one to view its analysis without re-uploading or re-analyzing. Only extracted text is stored — never the original file. Each user sees only their own documents; there is no sharing between users.

The red lines in effect at analysis time are added to each saved entry by ticket 09.

**Blocked by:** 02 (Tracer bullet — upload a contract, get a plain-English summary)

**Status:** ready-for-agent

- [ ] Running an analysis saves it to the signed-in user's library
- [ ] The library lists the user's past documents
- [ ] Reopening a past document shows its saved analysis without calling the model again
- [ ] Stored data is the extracted text and analysis output only — no original file
- [ ] A user cannot read or list another user's documents (enforced at the database, not just the UI)
- [ ] Repository-layer tests: write an analysis, read it back, contents match
