# Test fixtures

- `adhesion-contract.txt`: a fictional, client-drafted freelance agreement with one overreaching clause planted for each of the six categories, plus ordinary in-scope clauses.
- `adhesion-contract.flags.json`: its sidecar. Expected flags (exact sentence, category, severity band, counter-offer), sentences that must not be flagged, and answerable and unanswerable Q&A questions.
- `clean-contract.txt`: a low-risk freelance agreement where every sensitive clause stays scoped to the deal. Analysis must return zero flags.
- `clean-contract.json`: its sidecar (`flags: []`) with notes on why each category is in scope.

- `pairs/`: same-category, different-severity pairs (ADR 0003). Each pair is one short freelance agreement in two versions that differ only in the planted clause; every other sensitive clause stays scoped to the deal.
  - `arbitration-narrow.txt` (8.1 covers payment or performance disputes under this agreement) and `arbitration-broad.txt` (8.1 covers "any and all claims ... however arising", including against affiliates).
  - `ip-in-scope.txt` (4.1-4.2 assign only the paid App and leave the developer's own tools alone) and `ip-overreaching.txt` (4.1-4.2 reach into future work, other clients' work and pre-existing tools).
  - Each has a `.flags.json` sidecar in the adhesion sidecar's shape. A `severityBand` of `within-deal` marks a clause a recall-leaning model can propose but that stays inside the deal: the stub assesses it as reaching nowhere and the pipeline drops it, so the narrow document comes out clean.

Every `sentence`, `notFlagged` entry and `supportingSentence` in a sidecar must appear verbatim, exactly once, in its document. Edit the `.txt` and the sidecar together.
