# 11: Fix CLAUDE.md's description of supported document types

**What to build:** The opening paragraph of CLAUDE.md still describes uploads as "a contract/lease/freelance agreement/ToS", which contradicts ADR 0002 (v1 accepts freelance agreements and general contracts only). An agent reading CLAUDE.md first could build lease or terms-of-service support. Update that paragraph to match ADR 0002 and point to it.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] CLAUDE.md's opening description lists only freelance agreements and general contracts
- [x] It references ADR 0002 for why leases and terms of service are excluded
- [x] No other part of CLAUDE.md changes as part of this fix

## Comments

Resolved directly while settling the landing-page inconsistencies. The same
session also added a separate line to CLAUDE.md's Scope section allowing
the landing page; that was its own decision, not part of this ticket.
