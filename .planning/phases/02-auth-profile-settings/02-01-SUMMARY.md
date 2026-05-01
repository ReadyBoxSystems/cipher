---
phase: 02-auth-profile-settings
plan: "01"
subsystem: auth
tags: [supabase, profile, upsert, vanilla-js, pwa]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: transport abstraction layer, state/store.js, lib/router.js, screens/ skeleton
provides:
  - createProfile uses upsert with onConflict:id (PROF-02 bug fix)
  - store.get('profile') is non-null whenever store.get('user') is non-null (post-boot)
  - profile cleared to null on sign-out via onAuthChange
  - screens/auth.js, screens/setup.js, screens/settings.js self-register before router.route() runs
affects: [02-02, 02-03, screens, auth, profile, settings]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Upsert with onConflict:id pattern for idempotent profile creation"
    - "Profile hydration at boot: getProfile() called after getSession(), stored in state.profile"
    - "Screen self-registration: router.register() called at module load as side effect of import"

key-files:
  created:
    - screens/auth.js
    - screens/setup.js
    - screens/settings.js
  modified:
    - transport/supabase-transport.js
    - transport/interface.js
    - app.js

key-decisions:
  - "Profile hydration lives in app.js boot sequence (not per-screen) so any screen can read store.get('profile') without a fetch"
  - "Screen stubs created in this plan so imports in app.js resolve; full implementations in Plans 02 and 03"

patterns-established:
  - "Profile clear on sign-out: onAuthChange null branch calls store.set('profile', null)"
  - "Screen imports in app.js are side-effect-only; each screen calls router.register() at load time"

requirements-completed:
  - PROF-02

# Metrics
duration: 2min
completed: 2026-05-01
---

# Phase 2 Plan 01: Foundation Fixes Summary

**createProfile switched to upsert with onConflict:id, profile hydrated at boot and cleared on sign-out, three screen stubs created and imported in app.js**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-01T03:52:05Z
- **Completed:** 2026-05-01T03:53:56Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Fixed PROF-02 (stale session 409 conflict): `createProfile` now uses `.upsert({ onConflict: 'id' })` — same user.id on re-sign-in silently overwrites instead of raising 23505 on primary key
- Profile row loaded into `store.set('profile', ...)` immediately after `getSession()` resolves, and on every `onAuthChange` sign-in event — `store.get('profile')` is always in sync with `store.get('user')`
- Sign-out path clears profile: `onAuthChange` null branch now calls `store.set('profile', null)` preventing stale profile leaking to next session on the same device
- Three screen stub files created (`screens/auth.js`, `screens/setup.js`, `screens/settings.js`) — each self-registers via `router.register()` so imports in `app.js` resolve and the router has handlers before `router.route()` runs

## Task Commits

1. **Task 1: Switch createProfile from insert to upsert (PROF-02)** - `e8c6f95` (fix)
2. **Task 2: Hydrate profile at boot, clear on sign-out, import screens** - `32aaab6` (feat)

## Files Created/Modified
- `transport/supabase-transport.js` - createProfile: .insert() → .upsert({ onConflict: 'id' })
- `transport/interface.js` - JSDoc for createProfile updated to reflect upsert (PROF-02)
- `app.js` - profile hydration in getSession() block and onAuthChange; screen side-effect imports added
- `screens/auth.js` - minimal self-registering stub for #/auth route
- `screens/setup.js` - minimal self-registering stub for #/setup route
- `screens/settings.js` - minimal self-registering stub for #/settings route

## Decisions Made
- Profile hydration goes in `app.js` boot sequence (not per-screen). This ensures any screen mounted after boot can call `store.get('profile')` without its own fetch — consistent with Pitfall 1 from RESEARCH.md.
- Screen stub files created now (Rule 2 deviation) because the ES module imports in `app.js` would throw a 404/module-not-found at runtime without them. Stubs are intentional placeholders — Plans 02 and 03 replace them.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Created screen stub files**
- **Found during:** Task 2 (adding screen imports to app.js)
- **Issue:** Plan adds `import './screens/auth.js'` etc. to app.js but the screen files did not exist. ES module imports for missing files throw at runtime, breaking the entire app boot.
- **Fix:** Created minimal self-registering stubs for `screens/auth.js`, `screens/setup.js`, `screens/settings.js`. Each calls `router.register()` with a no-op handler and renders an empty screen div. Plans 02 and 03 will replace these with full implementations.
- **Files modified:** screens/auth.js (created), screens/setup.js (created), screens/settings.js (created)
- **Verification:** Jest 10/10 passes; grep confirms all three imports present in app.js; no alert() in screens/
- **Committed in:** 32aaab6 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Necessary for app to boot without errors. Stubs are designed to be replaced — they contain only router registration with empty handlers. No scope creep.

## Known Stubs

| File | Description | Resolving Plan |
|------|-------------|----------------|
| `screens/auth.js` | Stub handler renders empty div; no sign-in/sign-up form | Plan 02-02 |
| `screens/setup.js` | Stub handler renders empty div; no @handle form | Plan 02-02 |
| `screens/settings.js` | Stub handler renders empty div; no profile view or sign-out | Plan 02-03 |

These stubs are intentional and expected. The screens directory was empty at plan start. Full implementations are the deliverable of the next two plans.

## Issues Encountered
None — plan executed cleanly within 2 minutes.

## Next Phase Readiness
- Plan 02-02 (Auth + Setup screens) can now proceed: transport is fixed, profile hydration is wired, screen import slots are registered
- Plan 02-03 (Settings screen) can also proceed: same foundation in place
- `store.get('profile')` will be non-null for any authenticated user with a profile row, making Settings screen implementation straightforward
- The 409 stale-session bug (v0 known issue #1) is fixed at the transport layer

---
*Phase: 02-auth-profile-settings*
*Completed: 2026-05-01*
