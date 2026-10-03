# 10: Reject leases and terms-of-service uploads

**What to build:** When a freelancer uploads a lease or a terms-of-service document, the browser recognizes it before any analysis runs and shows a clear message that v1 supports freelance agreements and general contracts only — so an out-of-scope analysis is never mistaken for a real one (ADR 0002). Detection is a client-side keyword check on the extracted text; nothing is sent to the server for a rejected document. This is a gate in front of `analyzeDocument`, not a flag inside its output.

**Blocked by:** 02 (Tracer bullet — upload a contract, get a plain-English summary)

**Status:** done

- [x] Lease and terms-of-service fixtures are rejected in the browser with a clear "not supported in v1" message
- [x] A rejected document triggers no server request and no model call
- [x] Freelance-agreement and general-contract fixtures pass the gate
- [x] The message says plainly that leases and terms of service aren't supported, without implying broader support
- [x] Tests cover both rejection and pass-through cases

## Comments

Built unattended on 2026-10-03. `lib/scope/gate.ts` uses weighted phrase counts. It
rejects only when the lease or ToS score is at least 15 and at least twice the contract
score, so a freelance job for a landlord still passes. The order is: empty check, then the
scope gate, then the length check. A test with a fetch spy shows that refused documents
make zero requests.
