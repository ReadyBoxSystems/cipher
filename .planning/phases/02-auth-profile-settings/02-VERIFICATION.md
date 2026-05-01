---
phase: 02-auth-profile-settings
verified: 2026-04-30T00:00:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 2: Auth + Profile + Settings Verification Report

**Phase Goal:** Build and wire all three user-management screens — auth (#/auth), setup (#/setup), and settings (#/settings) — so a user can sign up, claim a handle, and manage their profile. Fix the transport-layer 409 bug before any screen code lands.
**Verified:** 2026-04-30
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can sign up with email and password and reach the @handle setup screen | ✓ VERIFIED | `screens/auth.js` calls `transport.signUp`, sets `store.user`, navigates to `#/setup` on success (line 87-88) |
| 2 | User can sign in and remain signed in across sessions (Supabase session persistence) | ✓ VERIFIED | `app.js` calls `transport.getSession()` at boot (line 32), then `transport.onAuthChange` to stay in sync; Supabase handles persistence natively |
| 3 | User can view their @handle and email on the Settings screen | ✓ VERIFIED | `screens/settings.js` reads `store.get('profile').username` and `store.get('user').email`, renders them in `.settings-row.readonly` rows (lines 51-58) |
| 4 | User can edit their display name inline on Settings and see the update immediately (optimistic) | ✓ VERIFIED | `onNameRowClick` in `settings.js` calls `store.set('profile', {...prev, display_name: newName})` before awaiting `transport.updateProfile` (lines 109-116) |
| 5 | User can sign out from the Settings screen and land on the auth screen | ✓ VERIFIED | `onSignOut` in `settings.js` calls `transport.signOut()`, clears both store keys, navigates `#/auth` (lines 126-131) |
| 6 | createProfile uses upsert with onConflict:'id' so a stale auth session does not raise 23505 on id | ✓ VERIFIED | `transport/supabase-transport.js` line 40-43: `.upsert({ id: userId, username, display_name: displayName }, { onConflict: 'id' })` |
| 7 | After getSession() resolves with a user, app.js loads the profile and stores it under 'profile' key | ✓ VERIFIED | `app.js` lines 34-36: `const { result: profile } = await transport.getProfile(user.id); store.set('profile', profile)` |
| 8 | When onAuthChange fires with null (sign-out), both 'user' and 'profile' state keys are cleared | ✓ VERIFIED | `app.js` line 44: `store.set('profile', null)` in the `else` branch of `onAuthChange` |
| 9 | app.js imports screens/auth.js, screens/setup.js, and screens/settings.js as side effects so they self-register before route() runs | ✓ VERIFIED | `app.js` lines 18-20: all three side-effect imports present, before `router.start()` call |
| 10 | Visiting #/auth renders auth screen with two tabs, email + password fields, submit button, and empty inline error div | ✓ VERIFIED | HTML template in `screens/auth.js` lines 11-35: `.tab-row` with `data-mode="in"` and `data-mode="up"`, `#auth-form`, `<div class="error-msg" id="auth-error">` |
| 11 | Auth errors render textContent into .error-msg — no alert() calls anywhere in screens/ | ✓ VERIFIED | `grep -rn "alert(" screens/` returns zero matches; `errEl.textContent` used at 5 points in auth.js |
| 12 | Visiting #/setup renders handle-picker form with client-side validation and sign-out escape hatch | ✓ VERIFIED | `HANDLE_RE = /^[a-z0-9_]{2,30}$/` at line 11, `#setup-signout` button present at line 39, validated before transport call |
| 13 | Visiting #/settings renders full SettingsScreen — avatar, @handle/email, PROFILE/ACCOUNT sections, optimistic display-name edit, sign-out row | ✓ VERIFIED | `settings.js`: `_strColor(username)` for avatar bg (line 26), `_esc` used 8 times, `settings-section-label` PROFILE/ACCOUNT present (lines 46, 60), `field-sm` inline edit (line 92), rollback on error (lines 113-115) |

**Score:** 13/13 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `transport/supabase-transport.js` | createProfile via upsert | ✓ VERIFIED | Line 40: `.upsert(...)` with `{ onConflict: 'id' }`. No remaining `.from('profiles').insert`. 142 lines — substantive. |
| `app.js` | Profile hydration + screen registration | ✓ VERIFIED | 51 lines. Imports all three screen files. Calls `transport.getProfile` twice (initial + onAuthChange). Clears profile on sign-out. |
| `screens/auth.js` | Auth screen — sign in / sign up tabs | ✓ VERIFIED | 103 lines (above 60-line minimum). `router.register('auth'...)` at line 9. Tab swap, inline errors, cleanup function. |
| `screens/setup.js` | Setup screen — @handle picker with sign-out escape | ✓ VERIFIED | 107 lines (above 50-line minimum). `router.register('setup'...)` at line 13. Full implementation — not a stub. |
| `screens/settings.js` | Settings screen — view profile, edit display name, sign out | ✓ VERIFIED | 142 lines (above 80-line minimum). `router.register('settings'...)` at line 12. Full implementation. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `transport/supabase-transport.js` | profiles table | upsert with onConflict | ✓ WIRED | Lines 40-43: upsert call confirmed |
| `app.js` | `transport.getProfile` | post-getSession profile load | ✓ WIRED | Lines 35, 41: called twice |
| `app.js` | `screens/` | side-effect imports | ✓ WIRED | Lines 18-20: all three screen imports present |
| `screens/auth.js` | `transport.signIn / transport.signUp` | form submit handler | ✓ WIRED | Lines 68-71: `const fn = mode === 'in' ? transport.signIn : transport.signUp; const { user, error } = await fn(email, pass)` |
| `screens/auth.js` | `router.navigate` | post-auth redirect | ✓ WIRED | Lines 88, 94: navigates to `#/setup` (sign-up) and `#/` (sign-in) |
| `screens/setup.js` | `transport.createProfile` | form submit handler | ✓ WIRED | Line 68: `await transport.createProfile(user.id, handle, handle)` |
| `screens/setup.js` | `transport.signOut` | escape-hatch button | ✓ WIRED | Line 94: `await transport.signOut()` in `onSignOut` |
| `screens/settings.js` | `transport.updateProfile` | display name commit handler | ✓ WIRED | Line 112: `await transport.updateProfile(user.id, { display_name: newName })` |
| `screens/settings.js` | `transport.signOut` | sign-out row click | ✓ WIRED | Line 127: `await transport.signOut()` |
| `screens/settings.js` | `store.get('profile')` | initial render + read for edit | ✓ WIRED | Lines 15, 90, 108: read at mount, inside edit handler, and inside optimistic update |
| `screens/settings.js` | `_strColor` | avatar background | ✓ WIRED | Line 26: `_strColor(username)` used as inline style |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `screens/settings.js` | `profile` (display_name, username) | `store.get('profile')` → populated by `app.js` `transport.getProfile()` → Supabase `profiles` table | Yes — `getProfile` queries `sb.from('profiles').select('*').eq('id', userId)` | ✓ FLOWING |
| `screens/auth.js` | `user` (result of signIn/signUp) | `transport.signIn` / `transport.signUp` → `sb.auth.signInWithPassword` / `sb.auth.signUp` | Yes — live Supabase auth calls | ✓ FLOWING |
| `screens/setup.js` | `result` (new profile row) | `transport.createProfile` → `sb.from('profiles').upsert(...)` | Yes — upsert returns the created row via `.select().maybeSingle()` | ✓ FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — screens require a browser DOM environment (`document.getElementById`) and cannot be exercised without a running server or jsdom harness. The project's Jest config uses `testEnvironment: 'node'`, not `jsdom`. Module-level parse checks are covered by Jest 10/10 passing (documented in SUMMARYs).

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| PROF-02 | 02-01 | Profile creation uses upsert(onConflict:'id') — stale session does not cause 409 | ✓ SATISFIED | `supabase-transport.js` lines 38-46: confirmed upsert implementation |
| AUTH-01 | 02-02 | User can create an account with email and password | ✓ SATISFIED | `screens/auth.js`: `transport.signUp` called in form submit handler, mode `'up'` navigates to `#/setup` |
| AUTH-02 | 02-02 | User can sign in and remain signed in across sessions | ✓ SATISFIED | `transport.getSession()` at boot restores persisted Supabase session; `onAuthChange` keeps store in sync |
| AUTH-04 | 02-02 | Auth errors shown inline — never alert() | ✓ SATISFIED | Zero `alert(` matches across all of `screens/`; all errors via `errEl.textContent` |
| PROF-01 | 02-02 | First-time user prompted to choose unique @handle after sign-up | ✓ SATISFIED | Sign-up path navigates to `#/setup`; setup screen has handle picker form |
| PROF-03 | 02-02 | Handle-taken conflict (23505 on username) shows inline error; 23505 on id redirects to inbox | ✓ SATISFIED | `setup.js` lines 72-83: `error.code === '23505'` routing on `username` vs `id` discriminated by `detail.includes('username')` |
| AUTH-03 | 02-03 | User can sign out (accessible from Settings screen) | ✓ SATISFIED | `settings.js` `onSignOut` function: `transport.signOut()` + store clear + navigate to `#/auth` |
| PROF-04 | 02-03 | User can view @handle and email on Settings screen (read-only) | ✓ SATISFIED | `settings.js` lines 51-58: two `.settings-row.readonly` rows rendering `username` and `email` |
| PROF-05 | 02-03 | User can edit display name inline on Settings (optimistic update) | ✓ SATISFIED | `settings.js` `commit()` function: store updates before `await transport.updateProfile`, rolled back if error |

**All 9 required IDs confirmed satisfied. No orphaned or missing requirement IDs.**

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `screens/auth.js` | 68-71 | `const fn = transport.signIn` (unbound method reference) | ℹ️ Info | Methods use module-scoped `sb`, not `this` — no binding issue at runtime. Works correctly. |

No blockers or warnings found. The single info item is a style note with no functional impact.

---

### Human Verification Required

#### 1. Sign-up → setup → inbox flow

**Test:** In Chrome, open the live app. Sign up with a fresh email. Verify you land on the #/setup screen. Enter a valid @handle and submit. Verify you land on #/ (inbox shell, empty at this phase).
**Expected:** No 409 errors in console, no alert() dialogs. Handle visible after setup.
**Why human:** Browser DOM + Supabase live auth required; Jest runs in Node without jsdom.

#### 2. Sign-in session persistence

**Test:** Sign in. Close the tab. Reopen the URL. Verify you are still signed in (do not land on #/auth).
**Expected:** `store.get('user')` non-null from `getSession()` restore; routed to #/ immediately.
**Why human:** Requires a real browser session cookie; cannot be exercised programmatically.

#### 3. Display name optimistic edit + rollback

**Test:** On the Settings screen, click the Display name row. Type a new name and press Enter. Verify the new name appears immediately without a visible spinner.  Then simulate a transport failure (throttle network to offline, then edit again) and verify the value reverts.
**Expected:** Optimistic update shows immediately; rollback on network error restores the original value.
**Why human:** Requires DevTools network throttling and visual DOM observation.

#### 4. Handle-taken error

**Test:** Sign up two accounts. With the second account, try to claim a @handle already used by the first.
**Expected:** Inline error "HANDLE TAKEN — TRY ANOTHER" appears in the setup screen. No alert().
**Why human:** Requires two live Supabase user records with a real unique constraint violation.

---

### Gaps Summary

No gaps. All 13 must-have truths are verified, all 5 artifacts pass all three levels (exist, substantive, wired), all key links are confirmed present in the actual code, all 9 requirement IDs are satisfied, and no blocker or warning anti-patterns were found.

The four human verification items are standard browser-plus-live-backend checks that cannot be automated without a running server. They do not indicate gaps — they are confirmations of already-verified logic paths.

---

_Verified: 2026-04-30_
_Verifier: Claude (gsd-verifier)_
