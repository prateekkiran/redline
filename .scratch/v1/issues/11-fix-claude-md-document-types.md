# 11: Fix CLAUDE.md's description of supported document types

**What to build:** The opening paragraph of CLAUDE.md still describes uploads as "a contract/lease/freelance agreement/ToS", which contradicts ADR 0002 (v1 accepts freelance agreements and general contracts only). An agent reading CLAUDE.md first could build lease or terms-of-service support. Update that paragraph to match ADR 0002 and point to it.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] CLAUDE.md's opening description lists only freelance agreements and general contracts
- [ ] It references ADR 0002 for why leases and terms of service are excluded
- [ ] No other part of CLAUDE.md changes
