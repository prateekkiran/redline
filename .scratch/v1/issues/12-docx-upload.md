# 12: Accept DOCX uploads

**What to build:** Besides PDF, a freelancer can upload a Word (.docx) contract. Its text is extracted in the browser exactly like a PDF's, and from then on it goes through the same path: only extracted text reaches the server, then the scope gate, analysis, and library.

**Blocked by:** 02 (Tracer bullet — upload a contract, get a plain-English summary)

**Status:** ready-for-agent

- [ ] Ask before adding the DOCX text-extraction dependency
- [ ] A signed-in user can upload a .docx and get the same analysis a PDF would get
- [ ] The original .docx never leaves the browser — only extracted text is sent
- [ ] Citation-integrity tests pass on a DOCX-derived fixture, so extraction keeps sentences verbatim
