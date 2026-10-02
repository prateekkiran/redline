# 01: App skeleton with sign-in, deployed

**What to build:** A Next.js app, deployed on Vercel, where a user can sign up, sign in, and sign out using Supabase auth, and where the server can make one successful call to a model through OpenRouter. This is the empty shell every later ticket builds on — no document features yet.

**Blocked by:** Two unresolved decisions in CLAUDE.md, which only the human can make:
- Package manager (npm / pnpm / yarn) — do not infer it.
- Credential provisioning — whether the user supplies the Supabase project and OpenRouter key, or the agent provisions them.

**Status:** done, except the two checks that need a live Supabase project (see Comments)

- [x] Package manager decision recorded (CLAUDE.md "Unresolved" section updated)
- [x] Credential provisioning decision recorded
- [ ] A visitor can sign up, sign in, and sign out
- [x] Signed-out visitors cannot reach any signed-in page
- [x] Signed-out visitors land on a public root page, which links to sign-up and sign-in. It is a bare placeholder here; the landing page ticket fills it in
- [x] The server makes a model call through OpenRouter only — no direct provider API call anywhere
- [x] All secrets live in `.env.local` (gitignored); nothing secret is committed
- [ ] The app is deployed to Vercel and sign-in works on the deployed URL
- [x] Every new dependency was approved before being added

## Comments

Built unattended on 2026-10-02 (see BUILD-REPORT.md).

- Package manager: pnpm, already settled in CLAUDE.md.
- Credentials: the owner supplies both. OpenRouter is called with `OPENROUTER_API_KEY` and
  `OPENROUTER_MODEL`. Supabase reads `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and its tables live as SQL in `supabase/migrations/`
  for the owner to run by hand.
- Dependencies were approved by the owner as a list up front.
- Gating has been checked against placeholder Supabase values: app routes redirect to
  /sign-in and /api returns 401. A real sign-up, sign-in and sign-out has not happened
  because no Supabase project exists yet.
- The model call goes through OpenRouter only, but no call has succeeded yet. The
  configured model isn't served by the pinned provider (Fireworks). BUILD-REPORT.md
  has the exact error.
- Not deployed with Supabase yet, so sign-in on the deployed URL is unverified.
