# Build report

Unattended build of Redline v1 from the tickets in `.scratch/v1/issues/`.
This file is written as the build runs; the final sections are filled in at the end.

## Ticket status

| Ticket | Status | What's still open |
|---|---|---|
| 01 App skeleton, sign-in | Done in code | Real sign-up, sign-in and sign-out, and sign-in on the deployed URL, need a Supabase project. |
| 02 Upload, summary | Done | The click-through and network traffic haven't been watched in a real browser. The "only text is sent" check is a unit test on the request body. |
| 03 Cited flags | Done | None. |
| 04 Severity by overreach | Built | The two "every run" pair checks, the false-negative check and the no-hedging check need the real model: `pnpm test:live`. |
| 05 Clean result | Done | "The clean fixture returns zero flags" is a real-model check: `pnpm test:live`. |
| 06 Counter-offers | Done | The real-model check: `pnpm test:live`. |
| 07 Document Q&A | Done | Whether the real model declines unanswerable questions: `pnpm test:live`. |
| 08 Library | Done in code | Row-level security is proven on PGlite. The supabase-js calls and screens haven't run against a live project: `scripts/check-library.ts`. |
| 09 Red lines | Done in code | Same as 08. The live monotonicity test waits on the model. |
| 10 Reject leases and ToS | Done | None. |
| 11 Fix CLAUDE.md | Already resolved before this build | None. |
| 12 DOCX upload | Done | The landing page still mentions only PDF and pasted text (see below). |

No ticket was blocked. Every criterion that depends on the model's own judgement is
unticked in its ticket. Each one has a test in `tests/live/`, and those tests fail today
only because the configured model can't be reached (decision 8).

## Final checks (2026-10-03)

- `npm run build` passes, with no Supabase variables set.
- `npm test`: 31 files, 352 tests, all pass, no key needed.
- `npm run smoke` exists and runs the fixture contract through the real pipeline. Against the
  real model it exits 1 with
  `ModelCallError: OpenRouter returned 404: This model is unavailable for free. The paid version is available now - use this slug instead: qwen/qwen3.8-27b`.
  **OPENROUTER_API_KEY is set, but no flags came back, so none survived verification.**
  The model is never reached. That's not a pipeline failure.
- `pnpm test:live`: 5 files, 11 tests, all failing on that same 404.
- `next start` with no Supabase variables serves `/`, `/analyze`, `/library`, `/red-lines` and
  `/sign-in` (200). A JSON post to `/api/analyze` reaches OpenRouter and comes back as a plain
  502 ("Redline couldn't read this document just now."). A multipart file post is refused
  with 415.

## Decisions made in your absence

1. **The `implement` skill wasn't available.** `/mattpocock-skills:implement` isn't
   installed in this session, so I followed the prompt's steps directly as the
   orchestrator.
2. **Scripts are run with pnpm.** CLAUDE.md settles pnpm. The prompt names
   `npm run build`, `npm test` and `npm run smoke`, so those exist as
   package.json scripts and work under either command. Installs use pnpm.
3. **Dependencies approved up front.** CLAUDE.md says to ask before adding one; you
   said not to ask. The approved list: `vitest` (test runner), `@supabase/supabase-js`
   and `@supabase/ssr` (auth, library, red lines), `pdfjs-dist` (in-browser PDF
   text), `mammoth` (in-browser DOCX text), `tsx` (runs the smoke script).
   OpenRouter is called with plain `fetch`, so no SDK.
4. **The privacy restriction is set in the request body.** Every OpenRouter call
   sends `provider: { order: ["fireworks"], allow_fallbacks: false,
   require_parameters: true, data_collection: "deny" }`. `data_collection: "deny"`
   is OpenRouter's switch for providers that don't keep or train on prompts.
5. **Analysis without an account only when Supabase is missing.** You said the app
   has to analyse a pasted document with no Supabase variables. The PRD rules out
   using Redline without an account. Both hold this way: with no Supabase
   variables the app runs without sign-in and the library and red lines say
   accounts aren't set up. Once the variables exist, the app pages and the
   analysis endpoint need a signed-in user. Vercel has no environment variables
   set today, so the live site can't reach a model without a key and nothing is
   exposed.
6. **Model judgement is tested live, not with the stub.** The stub replaces only the
   HTTP call to OpenRouter. It can prove the pipeline: citations are checked,
   bad quotes are dropped, flags are ranked, red lines only add, a clean result
   gets through. It can't prove the model ranks a broad arbitration clause above
   a narrow one, because the stub would only be returning my own answer. Those
   checks are in `tests/live/` and run with `pnpm test:live` when
   `OPENROUTER_API_KEY` is set.
7. **Committed the pending `.gitignore` and `.vercelignore` changes first.** They were
   uncommitted at the start and only keep env files and working folders out of
   git and Vercel uploads. `.claude/` stays untracked.
8. **The configured model can't be reached, and I didn't work around it.** `OPENROUTER_MODEL`
   is `qwen/qwen3.8-27b:free`. OpenRouter answers
   `404: This model is unavailable for free. The paid version is available now - use this slug instead: qwen/qwen3.8-27b`.
   With the paid slug, the provider pin removes every endpoint
   (`404: No endpoints found for qwen/qwen3.8-27b. Every candidate endpoint was removed during routing ...`),
   because Fireworks doesn't host that model. Both choices belong to you: change the model to one
   Fireworks serves, or change the pinned provider. The code and tests don't depend on
   either.
9. **Sign-up confirms by email.** When Supabase has email confirmation turned on, sign-up shows
   "check your email" and `/auth/callback` finishes the sign-in. Passwords need at least
   8 characters. I picked that minimum myself; the spec doesn't set one.
10. **Large tickets are split in two.** Three single-agent attempts at ticket 06 stalled before
    writing a file (the stream watchdog fired). Since then each ticket goes as a pipeline
    half and a screen half, and all of them have finished. The stalls were an infrastructure
    problem, not a failed verification, so they don't count toward the "blocked twice" rule.
11. **PGlite tests the database.** There's no Supabase project and Docker isn't running, so I
    added `@electric-sql/pglite` as a dev dependency. It's real Postgres running in-process. The
    migrations and row-level security policies run against it in `pnpm test`, under a small
    shim for `auth.uid()`. The supabase-js repository calls themselves can't run without a
    project. `scripts/check-library.ts` runs them end to end once one exists.
12. **Q&A answers carry a quote.** `answerQuestion` returns `{ answer, quote }`, where the quote is
    an exact span of the document. If the model's supporting quote can't be found word for word,
    the result is a decline. The spec's `{ answer }` shape gains one field, so every answer can
    be checked the way a flag can.
13. **Flags the model rates as fully within the deal are dropped.** Anything with even one
    borderline dimension is kept. This keeps the clean result reachable (ADR 0005) without
    giving up recall (ADR 0004).
14. **Analysis needs only the document text from the screen.** The analyze request sends
    `{ documentText }`, and the server loads the signed-in user's saved red lines. Each saved
    library entry records the red lines that were actually used.
15. **A failed save never loses an analysis.** The response says `saved: false` and the screen
    says plainly that it wasn't saved. With no Supabase it says accounts aren't set up.
16. **If a red-line check fails, the whole analysis fails.** Carrying on would look like none of
    your red lines matched.
17. **PRODUCT.md now says DOCX is supported.** That line said "DOCX planned". I didn't touch
    the landing page (`app/page.tsx` lines 72 and 188 still say PDF or pasted text). Changing
    its copy needs a humanizer pass and your eye.
18. **I suppressed one design-hook warning.** The impeccable hook calls the app shell's 6px
    binding edge a "side-tab" accent. DESIGN.md asks for that edge, so I scoped an ignore to
    `app/(app)/app.module.css` in `.impeccable/config.json`. That file stays uncommitted.
19. **Code review was skipped, as you asked.** Nobody has looked at the screens in a browser.
    Agents built them to DESIGN.md and the app-shell brief, then checked them with the
    typecheck, the build and HTTP probes only.

## What I couldn't verify

Without a Supabase project:
- sign-up (including the email-confirmation path), sign-in and sign-out;
- gating with a real session (only checked against placeholder values: app routes redirect
  to /sign-in, the API returns 401);
- the supabase-js calls that save, list, reopen and delete documents, and that manage red
  lines;
- sign-in on the deployed Vercel URL.

Without a working model:
- any real analysis: summary quality, whether the model finds all six planted clauses,
  severity pairs, the clean result, counter-offer quality, Q&A declines, red-line
  monotonicity;
- whether Fireworks with `zdr: true` and `data_collection: "deny"` accepts the model you pick.
  If it removes every endpoint, either the pin or the model has to change, and that's your call.

Other gaps:
- The landing page sample is still hand-written. The PRD needs real `analyzeDocument` output
  in it before launch, and that needs the model.
- CLAUDE.md's "Unresolved: credential provisioning" section is unchanged. Your answer for this
  build is in ticket 01's Comments. Update CLAUDE.md if it's now settled.

## What to run first

```sh
# 1. Point the model at one Fireworks serves (or change the provider pin in lib/analysis/openrouter.ts)
#    Edit OPENROUTER_MODEL in .env.local, then:
pnpm exec tsx scripts/ping-model.ts      # one structured call; prints JSON or the exact error
pnpm smoke                               # fixture contract end to end; flags + "N verified"
pnpm test:live                           # severity pairs, clean, counter-offers, Q&A, red lines

# 2. Create the Supabase project, then add to .env.local:
#    NEXT_PUBLIC_SUPABASE_URL=...  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
#    and run, in order, in the SQL editor (or `supabase db push`):
#    supabase/migrations/20261003000100_documents.sql
#    supabase/migrations/20261003000200_red_lines.sql
pnpm dev                                 # sign up, analyse, check /library and /red-lines
pnpm exec tsx scripts/check-library.ts <email> <password>   # repository round trip, prints PASS/FAIL

# 3. Everyday checks
pnpm test && pnpm build
```

For the deployed site, add the same four variables in Vercel (`vercel env add`). The site
deploys from main on every push, so this push deploys the build. Until the variables are
set, the live analysis endpoint returns a plain error.
