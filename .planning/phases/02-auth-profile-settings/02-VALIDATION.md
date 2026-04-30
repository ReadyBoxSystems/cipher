---
phase: 2
slug: auth-profile-settings
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-30
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30 (installed in Phase 1) |
| **Config file** | `jest.config.js` (project root) |
| **Quick run command** | `node --experimental-vm-modules node_modules/jest/bin/jest.js --passWithNoTests` |
| **Full suite command** | `node --experimental-vm-modules node_modules/jest/bin/jest.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run structural grep checks (see Per-Task Verification Map)
- **After every plan wave:** Run `node --experimental-vm-modules node_modules/jest/bin/jest.js --passWithNoTests`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds (grep checks are instant)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| AUTH-04 | screens | 1 | AUTH-04 | static grep | `grep -r "alert(" screens/` returns 0 | ⬜ pending |
| PROF-02 | transport fix | 1 | PROF-02 | static grep | `grep "upsert" transport/supabase-transport.js` returns 1 | ⬜ pending |
| AUTH-screen | screens | 1 | AUTH-01 | structural | `grep "router.register" screens/auth.js` returns 1 | ⬜ pending |
| SETUP-screen | screens | 1 | PROF-01 | structural | `grep "router.register" screens/setup.js` returns 1 | ⬜ pending |
| SETTINGS-screen | screens | 1 | PROF-03 | structural | `grep "router.register" screens/settings.js` returns 1 | ⬜ pending |
| No-direct-sb | screens | 1 | ARCH | structural | `grep -r "from.*supabase.js" screens/` returns 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None — Jest 30 is already installed and configured from Phase 1. No new test infrastructure needed.

*Existing infrastructure covers all phase requirements.*

---

## Automated Structural Checks (Wave Gate)

Run after each task commit without a browser:

```bash
# AUTH-04: No alert() calls in screens
grep -r "alert(" "C:/Cipher Program/screens/" && echo "FAIL - alert() found" || echo "PASS"

# PROF-02: upsert present (not insert) in supabase-transport
grep "upsert" "C:/Cipher Program/transport/supabase-transport.js" && echo "PASS" || echo "FAIL"

# Screen files register with router
grep "router.register" "C:/Cipher Program/screens/auth.js" && echo "PASS" || echo "FAIL"
grep "router.register" "C:/Cipher Program/screens/setup.js" && echo "PASS" || echo "FAIL"
grep "router.register" "C:/Cipher Program/screens/settings.js" && echo "PASS" || echo "FAIL"

# No direct supabase.js imports in screens (must go through transport)
grep -r "from.*supabase.js" "C:/Cipher Program/screens/" && echo "FAIL - direct supabase import" || echo "PASS"
```

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Session persists across browser close/reopen | AUTH-02 | Requires real browser localStorage | Sign in → close tab → reopen → confirm still signed in |
| Setup screen reachable after sign-up | PROF-01 | Requires Supabase auth flow | Sign up → confirm redirect to `#/setup` |
| @handle + email visible on Settings | PROF-04 | Requires live profile data | Sign in → Settings → verify @handle and email show |
| Display name optimistic update | PROF-05 | Visual confirmation required | Click display name → edit → blur → confirm immediate UI update |
| Email confirmation flow (if enabled) | AUTH-01 | Supabase dashboard setting | Sign up → check if "check your email" shown vs direct to setup |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or manual instructions
- [ ] Sampling continuity: no 3 consecutive tasks without a check
- [ ] No Wave 0 gaps (Jest already installed)
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s for structural checks
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
