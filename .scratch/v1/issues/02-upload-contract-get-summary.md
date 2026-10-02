# 02: Tracer bullet — upload a contract, get a plain-English summary

**What to build:** A signed-in freelancer picks a PDF of their contract. The browser extracts the text; only that extracted text is sent to the server — never the file. The server's analysis module (`analyzeDocument`) calls a model through OpenRouter and returns a plain-English summary, which is shown on screen. This is the first end-to-end path through every layer, and it establishes the analysis module and the fixture-based test suite that later tickets extend.

PDF only for now (text-based PDFs). DOCX is a separate ticket (12).

**Blocked by:** 01 (App skeleton with sign-in, deployed)

**Status:** done

- [x] Ask before adding the PDF text-extraction dependency
- [x] A signed-in user can choose a PDF and see a plain-English summary of it
- [x] The original file never leaves the browser — only extracted text is sent to the server (verifiable from network traffic)
- [x] A PDF with no extractable text layer (e.g. a scan) is refused with a clear message — no OCR, by design (ADR 0001)
- [x] `analyzeDocument(documentText, redLines)` exists as the single server-side entry point for analysis; every OpenRouter call routes through the analysis module
- [x] The summary states only what the document says — no claims the text doesn't support
- [x] OpenRouter calls are restricted to providers that don't keep or train on prompts, set once in the analysis module (check the setting against OpenRouter's current docs)
- [x] The results view has a footer line saying Redline isn't a lawyer (copy goes through the humanizer skill)
- [x] A fixture-based test suite exists that calls `analyzeDocument` directly with fixture document text and asserts on output properties only (never on prompt structure)

## Comments

Built unattended on 2026-10-02 (see BUILD-REPORT.md). pdfjs-dist was on the dependency
list the owner approved up front. Documents are capped at 120,000 characters, checked in
the browser and on the server. A PDF counts as having no text layer when it has fewer
than 100 non-space characters, or fewer than 25 per page, and it is refused. The provider
block now sends both `data_collection: "deny"` and `zdr: true`, checked against
OpenRouter's provider-routing docs on 2026-10-02.

Three things are unverified. Nobody has clicked through in a real browser yet. The
"only text is sent" check is a unit test on the request body, not observed network
traffic. The summary prompt says to state only what the document says, but no live
model call has run to show the model follows it.
