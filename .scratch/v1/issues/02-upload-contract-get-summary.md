# 02: Tracer bullet — upload a contract, get a plain-English summary

**What to build:** A signed-in freelancer picks a PDF of their contract. The browser extracts the text; only that extracted text is sent to the server — never the file. The server's analysis module (`analyzeDocument`) calls a model through OpenRouter and returns a plain-English summary, which is shown on screen. This is the first end-to-end path through every layer, and it establishes the analysis module and the fixture-based test suite that later tickets extend.

PDF only for now (text-based PDFs). DOCX is a separate ticket (12).

**Blocked by:** 01 (App skeleton with sign-in, deployed)

**Status:** ready-for-agent

- [ ] Ask before adding the PDF text-extraction dependency
- [ ] A signed-in user can choose a PDF and see a plain-English summary of it
- [ ] The original file never leaves the browser — only extracted text is sent to the server (verifiable from network traffic)
- [ ] A PDF with no extractable text layer (e.g. a scan) is refused with a clear message — no OCR, by design (ADR 0001)
- [ ] `analyzeDocument(documentText, redLines)` exists as the single server-side entry point for analysis; every OpenRouter call routes through the analysis module
- [ ] The summary states only what the document says — no claims the text doesn't support
- [ ] OpenRouter calls are restricted to providers that don't keep or train on prompts, set once in the analysis module (check the setting against OpenRouter's current docs)
- [ ] The results view has a footer line saying Redline isn't a lawyer (copy goes through the humanizer skill)
- [ ] A fixture-based test suite exists that calls `analyzeDocument` directly with fixture document text and asserts on output properties only (never on prompt structure)
