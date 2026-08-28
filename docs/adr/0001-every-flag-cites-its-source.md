# 1. Every flag cites its source

## Decision

Every risk flag Redline produces must include the exact sentence, quoted
verbatim from the uploaded document, that the flag is based on. A flag that
cannot point to a specific source sentence is a bug, not a formatting
preference — it does not ship, regardless of how useful the underlying
observation might be.

## Alternatives

- Let the model describe each risk in its own words, with no quoted source.
  Reads more fluently but gives the user nothing to check it against.
- Cite a paragraph or clause number instead of a sentence. Easier to
  generate, but forces re-reading surrounding text to find what triggered it.
- Show sources only on request, defaulting to unsupported summaries. Less
  visual noise, but makes unverified output the default experience.

## Why

A reader can take any flag, find that exact sentence in their own document,
and judge for themselves whether it says what Redline claims it says. The
product's credibility rests on this being checkable in seconds, not on the
user trusting the model's judgment. This is also what makes the counter-offer
useful: it's a response to a sentence the user can point to, not to a
paraphrase they have to take on faith.

## Consequences

- Every flag-generation step must extract and return a source sentence, and
  that sentence must be verified against the document text before display —
  a prompt instruction alone isn't enough to trust.
- A flag with no matching source sentence is dropped or blocked, never shown
  with a caveat instead.
- Rules out risk-detection approaches that reason over a summary or an
  embedding instead of sentence-level text, since those can't reliably
  produce an exact quote.
- Testing needs fixture documents with known sentences, so citation accuracy
  is checked directly rather than inferred from how plausible output reads.
