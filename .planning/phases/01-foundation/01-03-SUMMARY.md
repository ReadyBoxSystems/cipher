---
phase: 01-foundation
plan: "03"
subsystem: architecture
tags: [module-restructure, state, router, settings, utils, boot]
dependency_graph:
  requires: [01-02]
  provides: [state/store.js, lib/router.js, lib/settings.js, lib/utils.js, app.js, screens/]
  affects: [all-future-screens, phase-2-auth, phase-3-chat]
tech_stack:
  added: []
  patterns: [module-singleton, registration-pattern-router, hash-routing, auth-guard-in-router, cleanup-lifecycle]
key_files:
  created:
    - state/store.js
    - lib/utils.js
    - lib/settings.js
    - lib/router.js
    - screens/.gitkeep
  modified:
    - app.js
decisions:
  - "pending_invite stored outside auth guard block so unauthenticated invite URL visits always preserve the code (INVITE-05 — invite is PUBLIC_VIEWS so guard never fires for it)"
  - "location.hash = '#/auth' used (with #) for mock-environment compatibility — browsers handle both with or without # identically"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-30T22:14:46Z"
  tasks_completed: 4
  tasks_total: 4
  files_created: 6
  files_modified: 1
---

# Phase 01 Plan 03: Module Restructure Summary

Module skeleton complete: 543-line v0 monolith replaced with a 32-line boot file and four focused modules covering state, routing, settings, and utilities.

## What Was Built

Six files created, one replaced:

| File | Lines | Purpose |
|------|-------|---------|
| `state/store.js` | 50 | Module-singleton store: get/set/on/off/emit |
| `lib/utils.js` | 27 | _ago/_strColor/_esc — pure named exports |
| `lib/settings.js` | 33 | loadSettings/saveSettings/getSettings/putSettings — localStorage only |
| `lib/router.js` | 91 | Hash router with auth guard, currentCleanup, registration pattern |
| `app.js` | 32 | Boot file — imports plumbing, registers SW, hydrates user, starts router |
| `screens/.gitkeep` | 0 | Empty placeholder — directory tracked by git for Phase 2 |

## Decision Rationale

**pending_invite placement (deviation from plan spec):** The plan's router code placed `sessionStorage.setItem('pending_invite', param)` inside the `if (!user && !PUBLIC_VIEWS.has(view))` block. Since `invite` is in `PUBLIC_VIEWS`, that code was unreachable for invite URLs — exactly the case it needed to handle (unauthenticated user landing on `#/invite/CODE`). Moved the pending_invite store to fire for all unauthenticated invite URL visits, before the PUBLIC_VIEWS guard. This is Rule 1 (auto-fix bug) — logical dead code that would have broken INVITE-05 acceptance criteria.

**location.hash = '#/auth' (minor adjustment):** Plan spec used `location.hash = '/auth'`. Changed to `'#/auth'` (explicit hash prefix) so the Node.js test environment mock works correctly. Real browsers normalize both forms identically.

## Smoke Test (D-01 Graceful Empty Shell)

The browser smoke test cannot be automated in this environment. However, the following can be verified from the code:

- `app.js` has zero DOM access (`document.` grep returns 0), zero Supabase imports, zero cipher logic
- `transport.getSession()` returns `{ user: null }` in the live Supabase transport when unauthenticated; mock transport returns the same shape
- After hydration, `router.start()` wires `hashchange` and `router.route()` fires once
- With no screens registered (Phase 1 ends with `_routes = {}`), every route is a no-op per D-01
- The `<div id="app">` element in index.html remains empty — no screen writes to it
- Service worker registers at `./sw.js` with scope `./` per D-09 — relative paths resolve correctly on GitHub Pages

**Mock transport swap verification:** To confirm FOUND-02's swap point works, change `transport/index.js` line 11 from `supabase-transport` to `mock-transport`. The boot file imports `{ transport }` from `./transport/index.js` — the swap is one line. The mock transport's `getSession()` returns `{ user: null }`, router redirects to `/auth`, no `/auth` handler registered, graceful no-op. The empty shell still loads.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] pending_invite unreachable in original router spec**
- **Found during:** Task 3 verification
- **Issue:** Plan placed `sessionStorage.setItem('pending_invite', param)` inside `if (!user && !PUBLIC_VIEWS.has(view))` block. Since `invite` is in `PUBLIC_VIEWS`, this code was logically unreachable for invite URLs — the exact case it was meant to handle.
- **Fix:** Moved the pending_invite store to a separate block before the PUBLIC_VIEWS guard, firing whenever an unauthenticated user visits any `invite` URL with a code param.
- **Files modified:** `lib/router.js`
- **Commit:** 963b628

**2. [Rule 1 - Bug] location.hash redirect value**
- **Found during:** Task 3 verification
- **Issue:** `location.hash = '/auth'` in the plan does not include `#`, so in a plain object mock environment (Node.js test) the hash is stored as `/auth` not `#/auth`. The verification check `location.hash !== '#/auth'` would always pass (never redirect) in the mock.
- **Fix:** Changed to `location.hash = '#/auth'`. Both values are browser-equivalent; the explicit `#` makes mock behavior match.
- **Files modified:** `lib/router.js`
- **Commit:** 963b628 (same commit as above)

## Known Stubs

None. This plan creates plumbing only — no data flows to UI. Phase 2 begins filling `screens/`.

## FOUND-01 Completion

This plan completes FOUND-01. The codebase is now decomposed:

```
transport/   — Supabase + mock implementations, one swap point (Plan 02)
state/       — Module-singleton store (this plan)
lib/         — Router, settings, utils (this plan)
screens/     — Empty, ready for Phase 2
app.js       — 32-line boot file (this plan)
```

Every v0 cross-cutting concern lives in its own module. Phase 2 can begin rebuilding screens against a clean architecture.

## Self-Check: PASSED

All files exist. All commits verified.

| File | Status |
|------|--------|
| state/store.js | FOUND |
| lib/utils.js | FOUND |
| lib/settings.js | FOUND |
| lib/router.js | FOUND |
| app.js | FOUND |
| screens/.gitkeep | FOUND |

| Commit | Message |
|--------|---------|
| 52d6413 | feat(01-03): create state/store.js |
| 0247d0c | feat(01-03): create lib/utils.js and lib/settings.js |
| 963b628 | feat(01-03): create lib/router.js |
| e523156 | feat(01-03): replace v0 monolith with boot file |
