# Redline

Redline analyzes a contract before someone signs it: it flags the clauses
that could hurt them and drafts a counter-offer for each one.

## Language

**Document**:
A freelance agreement or general contract the user uploads for analysis.
In v1 this excludes leases and terms-of-service text, even though the
original product description named both — see
[ADR 0002](./docs/adr/0002-v1-scope-freelancers-only.md).
_Avoid_: "file" — the file itself is parsed client-side and never stored;
only the extracted document text persists server-side. "File" and
"document" are not interchangeable in this codebase.

**Overreach**:
The signal that separates a dangerous clause from a merely unusual one: a
clause is dangerous when its terms extend beyond the specific transaction
the contract is actually about (future work, unrelated disputes, other
clients, portfolio rights) rather than staying scoped to it. Severity is
driven by overreach, not by clause category — see
[ADR 0003](./docs/adr/0003-severity-driven-by-overreach.md).
_Avoid_: treating clause category (IP assignment, arbitration, non-compete)
as itself the severity signal. Category says where to look; overreach says
how severe it is.

**Flag**:
A single finding tied to exactly one clause and one cited source sentence
(see [ADR 0001](./docs/adr/0001-every-flag-cites-its-source.md)). Its
severity comes from overreach, not clause category (ADR 0003). Flags are
written in confident, unhedged language, because the citation — not the
wording — is what lets the user verify the finding (see
[ADR 0004](./docs/adr/0004-bias-toward-recall-confident-language.md)).
_Avoid_: "risk," "issue," "warning" — "flag" is the one term used
throughout, since it ties specifically to the citation-and-severity model,
not a generic warning.

**Clean** (of a document):
The state where the overreach model finds no severity-worthy flags. A real,
designed output — never manufactured by forcing a minimum flag count. See
[ADR 0005](./docs/adr/0005-clean-documents-are-a-real-output.md).
_Avoid_: implying "clean" means "safe" or "no risk at all" — it means the
baseline model found nothing that reaches beyond the transaction, not a
legal guarantee.

**Red line**:
A rule the user adds themselves, naming something they personally don't
want to see in a contract. In v1 a red line only adds flags on top of the
baseline overreach model — it can never suppress a flag the baseline model
would otherwise raise. See
[ADR 0006](./docs/adr/0006-red-lines-are-additive-only.md).
_Avoid_: treating a red line as a filter or preference setting that hides
findings — in v1 it can only add to the baseline, never subtract from it.
