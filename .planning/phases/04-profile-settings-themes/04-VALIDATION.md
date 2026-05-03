---
phase: 4
slug: profile-settings-themes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-03
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual browser testing (no build/test runner — vanilla JS, no-build-step app) |
| **Config file** | none |
| **Quick run command** | Open app in browser, check console for errors |
| **Full suite command** | Two-browser test (Chrome + Edge): sign in, switch themes, verify persistence |
| **Estimated runtime** | ~2 minutes |

---

## Sampling Rate

- **After every task commit:** Open app, check no console errors, visual spot-check
- **After every plan wave:** Full theme-switch + persistence flow in two browsers
- **Before `/gsd:verify-work`:** Full suite must pass all manual verifications
- **Max feedback latency:** ~120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-W0-css | W0 | 0 | THEME-01 | manual | grep for `.settings-list` in style.css | ❌ W0 | ⬜ pending |
| 4-W0-reqs | W0 | 0 | PROF-06 | manual | grep PROF-06 in REQUIREMENTS.md | ❌ W0 | ⬜ pending |
| 4-01-schema | 01 | 1 | THEME-04 | manual | Supabase SQL: `\d profiles` shows theme column | ❌ W0 | ⬜ pending |
| 4-01-token | 01 | 1 | THEME-01 | manual | grep `--font-display` in style.css `:root` block | ❌ W0 | ⬜ pending |
| 4-02-postdesk | 02 | 1 | THEME-02 | manual | grep `[data-theme="postdesk"]` in style.css | ❌ W0 | ⬜ pending |
| 4-02-terminal | 02 | 1 | THEME-03 | manual | Visual: Terminal theme unchanged vs. current app | ❌ W0 | ⬜ pending |
| 4-03-profile | 03 | 2 | PROF-06 | manual | Profile screen shows @handle, display name, avatar initial | ❌ W0 | ⬜ pending |
| 4-03-settings | 03 | 2 | PROF-07 | manual | Settings screen shows theme picker + sign-out | ❌ W0 | ⬜ pending |
| 4-04-switch | 04 | 2 | THEME-01 | manual | Theme switches instantly on picker click, no reload | ❌ W0 | ⬜ pending |
| 4-04-persist | 04 | 2 | THEME-04 | manual | Reload app: theme matches what was saved | ❌ W0 | ⬜ pending |
| 4-05-sw | 05 | 3 | THEME-02 | manual | Offline: Postdesk fonts load (SW caches Fonts URL) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Settings CSS ported from `.planning/design/src/cipher-styles.css` lines 973–1030 into `style.css`
- [ ] `--font-display: var(--font)` added to `:root` in `style.css` as Terminal fallback
- [ ] PROF-06, PROF-07, THEME-01–THEME-04 added to `REQUIREMENTS.md`
- [ ] `theme` column added to Supabase `profiles` table via SQL migration

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Postdesk palette looks warm/parchment | THEME-02 | Visual judgment | Open app in Postdesk theme, compare to spec colors |
| Postdesk typography is serif + typewriter | THEME-02 | Visual judgment | Check Cormorant Garamond headings + JetBrains Mono body render |
| Terminal theme visually unchanged | THEME-03 | Regression check | Compare Terminal theme side-by-side with current app |
| Theme applies instantly, no flicker on load | THEME-01 | Timing/visual | Switch themes, watch for flash of wrong theme on next load |
| Avatar initial renders correctly | PROF-06 | Visual | Profile screen: initials match display name |
| Sign-out button works from settings | PROF-07 | Auth flow | Tap sign-out → lands on auth screen, session cleared |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
