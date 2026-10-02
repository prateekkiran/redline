# 10: Reject leases and terms-of-service uploads

**What to build:** When a freelancer uploads a lease or a terms-of-service document, the browser recognizes it before any analysis runs and shows a clear message that v1 supports freelance agreements and general contracts only — so an out-of-scope analysis is never mistaken for a real one (ADR 0002). Detection is a client-side keyword check on the extracted text; nothing is sent to the server for a rejected document. This is a gate in front of `analyzeDocument`, not a flag inside its output.

**Blocked by:** 02 (Tracer bullet — upload a contract, get a plain-English summary)

**Status:** ready-for-agent

- [ ] Lease and terms-of-service fixtures are rejected in the browser with a clear "not supported in v1" message
- [ ] A rejected document triggers no server request and no model call
- [ ] Freelance-agreement and general-contract fixtures pass the gate
- [ ] The message says plainly that leases and terms of service aren't supported, without implying broader support
- [ ] Tests cover both rejection and pass-through cases
