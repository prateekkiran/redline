# Redline

Live: https://redline-seven-chi.vercel.app

Redline reads a freelance agreement or a general contract and quotes back the
sentences that reach past the job you're being hired for. It ranks them, drafts
a counter-offer for each, and answers your questions from the contract alone.
When the contract doesn't say, it says that instead of guessing.

Sometimes there's nothing to flag, and Redline leaves the margin empty rather
than adding a flag to look busy.

Your file is read in your browser and never uploaded. Redline keeps the text so
you can come back to it, until you delete it. To read it, Redline sends the text
to an AI model, using only providers that don't keep it or train on it.

Redline isn't a lawyer, and nothing here is legal advice.

## Production settings

These four settings are set on Vercel (Production) and in `.env.local`. Their
values are secrets and are not committed.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`

`NEXT_PUBLIC_` means the value ships to the browser. The Supabase publishable
key is public by design: it is only as powerful as the row-level security
policies allow, and those policies decide which rows a signed-in user can read.
