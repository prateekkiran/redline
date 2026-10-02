# 01: App skeleton with sign-in, deployed

**What to build:** A Next.js app, deployed on Vercel, where a user can sign up, sign in, and sign out using Supabase auth, and where the server can make one successful call to a model through OpenRouter. This is the empty shell every later ticket builds on — no document features yet.

**Blocked by:** Two unresolved decisions in CLAUDE.md, which only the human can make:
- Package manager (npm / pnpm / yarn) — do not infer it.
- Credential provisioning — whether the user supplies the Supabase project and OpenRouter key, or the agent provisions them.

**Status:** ready-for-human

Becomes `ready-for-agent` once both decisions above are recorded.

- [ ] Package manager decision recorded (CLAUDE.md "Unresolved" section updated)
- [ ] Credential provisioning decision recorded
- [ ] A visitor can sign up, sign in, and sign out
- [ ] Signed-out visitors cannot reach any signed-in page
- [ ] Signed-out visitors land on a public root page, which links to sign-up and sign-in. It is a bare placeholder here; the landing page ticket fills it in
- [ ] The server makes a model call through OpenRouter only — no direct provider API call anywhere
- [ ] All secrets live in `.env.local` (gitignored); nothing secret is committed
- [ ] The app is deployed to Vercel and sign-in works on the deployed URL
- [ ] Every new dependency was approved before being added
