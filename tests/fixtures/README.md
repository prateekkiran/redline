# Test fixtures

- `adhesion-contract.txt`: a fictional, client-drafted freelance agreement with one overreaching clause planted for each of the six categories, plus ordinary in-scope clauses.
- `adhesion-contract.flags.json`: its sidecar. Expected flags (exact sentence, category, severity band, counter-offer), sentences that must not be flagged, and answerable and unanswerable Q&A questions.
- `clean-contract.txt`: a low-risk freelance agreement where every sensitive clause stays scoped to the deal. Analysis must return zero flags.
- `clean-contract.json`: its sidecar (`flags: []`) with notes on why each category is in scope.

Every `sentence`, `notFlagged` entry and `supportingSentence` in a sidecar must appear verbatim, exactly once, in its document. Edit the `.txt` and the sidecar together.
