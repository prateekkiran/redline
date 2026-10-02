---
version: 1
slug: "app-app-layout-tsx"
primary_target: "app/(app)/layout.tsx"
related_targets: []
---

# Surface: App shell (behind sign-in)

Brief only. No screen is built yet.

## Scope and mode

The signed-in frame that holds every v1 capability. Mode: Operate.

## Audience and task

A freelancer with a specific contract open, often with a deadline to sign. They read the result closely, check flags against their own document, copy counter-offers into a reply to the client, and come back later to past documents.

## What the frame holds

1. **Add a document:** paste text or upload a text-based PDF (DOCX later). Refusal states, each plain and specific: a scanned or photographed PDF (no text layer; no OCR by design), a lease or terms of service (not supported in v1), an empty paste.
2. **The result:**
   - a plain-English summary;
   - flags ranked by overreach, each showing its exact source sentence and line, a plain description, and a drafted counter-offer;
   - the clean state when there are no flags, a designed result rather than an empty list, never phrased as "safe";
   - a footer line saying Redline isn't a lawyer.
3. **Questions:** a box that answers only from this document, and says plainly when the document doesn't say.
4. **Red lines:** the reader's own list, editable and kept across sessions. Flags added by a red line are marked as theirs. Red lines can add flags but never hide one.
5. **Library:** past documents, reopened without re-running, each deletable for good.

## Important states

Analyzing (no fake progress), result with flags, clean, refusal, question answered, question declined, empty library, delete confirmation.

## Direction

Inherits the Annotated Edition world chosen for the landing page, at a restrained setting for daily use. The bright page dominates, carrying the document text with line numbers. Flags sit as glosses in the outer margin, and counter-offers as variant readings beneath each gloss. Questions work like margin queries. The oxblood cloth narrows to a binding edge holding navigation (document, red lines, library). Rubric red marks only the gloss being read. On narrow screens, glosses fold in beneath the paragraph they cite.

## Constraints

Desktop-first, fully working on mobile. WCAG 2.2 AA. All copy goes through the humanizer skill. Severity is shown as order only until a label scale is decided.

## Unresolved

- Severity label scale.
- DOCX upload (ticket 12).
- Credential provisioning (blocks building this surface).
