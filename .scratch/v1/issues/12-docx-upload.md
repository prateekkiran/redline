# 12: Accept DOCX uploads

**What to build:** Besides PDF, a freelancer can upload a Word (.docx) contract. Its text is extracted in the browser exactly like a PDF's, and from then on it goes through the same path: only extracted text reaches the server, then the scope gate, analysis, and library.

**Blocked by:** 02 (Tracer bullet — upload a contract, get a plain-English summary)

**Status:** done

- [x] Ask before adding the DOCX text-extraction dependency
- [x] A signed-in user can upload a .docx and get the same analysis a PDF would get
- [x] The original .docx never leaves the browser — only extracted text is sent
- [x] Citation-integrity tests pass on a DOCX-derived fixture, so extraction keeps sentences verbatim

## Comments

Built unattended on 2026-10-03. mammoth was on the dependency list the owner approved up
front. It's loaded only when a .docx is chosen. Old .doc files are refused. The citation
checks pass on `tests/fixtures/docx/adhesion-contract.docx`, which was generated from the
fixture contract with macOS `textutil`. The landing page still mentions only PDF and pasted
text (app/page.tsx). I left it alone: this ticket doesn't cover landing copy, and changing
it means another humanizer pass.
