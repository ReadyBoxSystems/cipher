# Phase 2: Auth + Profile + Settings — Research

**Researched:** 2026-04-30
**Domain:** Supabase Auth (JS SDK v2), profile upsert patterns, vanilla JS screen module pattern
**Confidence:** HIGH

---

## Summary

Phase 2 fills the `screens/` directory that Phase 1 created as an empty placeholder. Three screens are needed: Auth (`#/auth`), Setup (`#/setup`), and Settings (`#/settings`). All Supabase calls are already abstracted behind `transport/index.js` — screens call transport methods; they never touch `sb` directly.

The two biggest technical concerns are the 409 conflict on stale sessions (fix: `upsert` instead of `insert` in `createProfile`, with error-code routing to distinguish username collision from duplicate-id) and the elimination of `alert()` calls (fix: inline `.error-msg` divs already styled in `cipher-styles.css`).

The design reference (`cipher-app.jsx` + `cipher-styles.css`) provides complete, pixel-level specifications for both the Auth screen and the Settings screen. The Setup/@handle screen has no JSX reference and must be designed to match the existing aesthetic.

**Primary recommendation:** Each screen is a single ES module in `screens/` that calls `router.register(view, handler)` at import time. The handler renders HTML into `#app`, wires events, and returns a cleanup function. No framework. No build step.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

No CONTEXT.md exists for Phase 2 (no `/gsd:discuss-phase` was run). All decisions below are derived from Phase 1 locked decisions in STATE.md and the requirements themselves.

### Locked Decisions (from STATE.md + Phase 1)

- Transport abstraction: all Supabase calls go through `transport/index.js` — screens never import from `supabase-transport.js` directly
- Hash routing: `lib/router.js` owns auth guard and navigation; screens self-register via `router.register(view, handler)`
- State: `state/store.js` is the singleton — screens read `store.get('user')` and `store.get('profile')`, write via `store.set()`
- No framework: vanilla JS ES modules, no build step, no React/Vue
- No `alert()` anywhere: AUTH-04 and the v0 known-issues list make this explicit
- `pending_invite` sessionStorage: already handled in `lib/router.js` — Phase 2 screens must not duplicate or break this logic
- `location.hash = '#/auth'` (with explicit `#`) for mock-environment compatibility

### Claude's Discretion

- How each screen file is structured internally (class vs. function-per-screen, etc.)
- Whether Auth screen uses a single form that swaps mode vs. two separate forms
- Exact inline error placement within the auth/setup/settings forms
- Whether Setup screen gets a sign-out escape hatch as a `<button>` below the form or a topbar element

### Deferred Ideas (OUT OF SCOPE for Phase 2)

- Inbox screen (Phase 3)
- Chat screen (Phase 3)
- Invite flow (Phase 4)
- Push notifications (v2)
- OAuth / social login (explicitly out of scope per REQUIREMENTS.md)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can create an account with email and password | `transport.signUp(email, pass)` — already implemented in supabase-transport.js. Screen wires form submit → signUp → check error → navigate to `#/setup`. |
| AUTH-02 | User can sign in and remain signed in across sessions (Supabase session persistence) | Supabase JS v2 persists session to localStorage by default. `transport.getSession()` called at boot in `app.js` already handles hydration. No additional work for persistence itself — screen just needs to navigate correctly on success. |
| AUTH-03 | User can sign out (accessible from Settings screen) | `transport.signOut()` — already in interface. Settings screen calls it, then `router.navigate('#/auth')`. Store clears `user` and `profile` via `onAuthChange` listener already wired in `app.js`. |
| AUTH-04 | Auth errors shown inline — never `alert()` | `.error-msg` CSS class already in `cipher-styles.css` (red, uppercase, 10px). Screen renders a `<div class="error-msg">` and sets `textContent` on error. Never calls `alert()`. |
| PROF-01 | First-time user prompted to choose unique @handle after sign-up | `#/setup` screen. Registered as `router.register('setup', handler)`. Router guard allows it only when user exists — needs `setup` added to `PUBLIC_VIEWS` or handled via profile check in the guard. See Pitfall 1 below. |
| PROF-02 | Profile creation uses `upsert(onConflict: 'id')` — stale session does not cause 409 | `transport.createProfile()` in `supabase-transport.js` currently uses `.insert()`. Must be changed to `.upsert({ onConflict: 'id' })`. This is a one-method change in supabase-transport.js. |
| PROF-03 | Handle-taken conflict (23505 on `username`) shows inline error; already-setup conflict redirects to inbox | Error routing: if `error.code === '23505'` AND `error.details` includes `username` → show "handle taken" inline. If `error.code === '23505'` AND conflict is on `id` → user already set up → navigate to `#/`. |
| PROF-04 | User can view @handle and email on Settings screen (read-only) | Settings screen reads `store.get('profile')` for username; reads `store.get('user')` for email. Both are already stored in state by the router/boot flow (profile loaded after auth). |
| PROF-05 | User can edit display name inline on Settings — optimistic update | Settings screen: click display name row → render `<input>` inline → on blur/Enter → call `transport.updateProfile(userId, { display_name: newValue })` → `store.set('profile', {...profile, display_name: newValue})` optimistically before await. |
</phase_requirements>

---

## Standard Stack

### Core (all already present — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase JS | 2.x (CDN ESM) | Auth, profile CRUD | Already wired in `supabase.js` and `transport/` |
| Browser Web Crypto | Built-in | — (not used by this phase) | Already in crypto.js |
| Vanilla JS ES modules | Native | Screen implementation | Project constraint: no framework, no build step |

### No New Dependencies

Phase 2 introduces no new npm packages. All behavior is achievable with:
- `transport/` methods (already implemented)
- `state/store.js` (already implemented)
- `lib/router.js` (already implemented)
- DOM APIs and `innerHTML` / `textContent` patterns

**Installation:** None required.

---

## Architecture Patterns

### Recommended Project Structure After Phase 2

```
screens/
  auth.js          # #/auth — sign in / sign up tabs, inline errors
  setup.js         # #/setup — @handle picker, upsert profile
  settings.js      # #/settings — view profile, edit display name, sign out
```

Each file is self-contained: imports from `transport/index.js`, `state/store.js`, and `lib/router.js`. Registers itself at import time. Returns cleanup from the handler.

### Pattern 1: Screen Self-Registration

Every screen calls `router.register()` at module load. `app.js` imports the screen modules, which triggers registration as a side effect of the import.

```javascript
// screens/auth.js
import { transport } from '../transport/index.js'
import * as store   from '../state/store.js'
import * as router  from '../lib/router.js'

router.register('auth', async (_param) => {
  // render HTML into document.getElementById('app')
  const app = document.getElementById('app')
  app.innerHTML = `...`

  // wire events
  const form = app.querySelector('.form')
  form.addEventListener('submit', handleSubmit)

  // return cleanup
  return () => {
    form.removeEventListener('submit', handleSubmit)
  }
})
```

```javascript
// app.js additions (import the screens to trigger registration)
import './screens/auth.js'
import './screens/setup.js'
import './screens/settings.js'
```

**Why this pattern:** Matches the router's registration contract exactly. No circular imports. Each screen can be added or removed by adding/removing one import line in `app.js`.

### Pattern 2: Inline Error Display (AUTH-04)

```javascript
// Inside a screen handler
const errEl = app.querySelector('.error-msg')

async function handleSubmit(e) {
  e.preventDefault()
  errEl.textContent = ''                     // clear previous error
  const email = emailInput.value.trim()
  const pass  = passInput.value

  const { user, error } = await transport.signIn(email, pass)
  if (error) {
    errEl.textContent = error.message        // never alert()
    return
  }
  store.set('user', user)
  router.navigate('#/')
}
```

The `.error-msg` class is already in `cipher-styles.css`: `color: var(--danger)`, `font-size: 10px`, `letter-spacing: 0.04em`, `text-transform: uppercase`. The element exists in the rendered HTML and stays empty until there is an error.

### Pattern 3: Upsert Profile (PROF-02)

The fix is in `transport/supabase-transport.js`, not in the screen. Change `createProfile` from `.insert()` to `.upsert()`:

```javascript
// transport/supabase-transport.js — createProfile (PROF-02 fix)
async createProfile(userId, username, displayName) {
  const { data, error } = await sb.from('profiles')
    .upsert(
      { id: userId, username, display_name: displayName },
      { onConflict: 'id' }          // stale session = same id = upsert, not conflict
    )
    .select()
    .maybeSingle()
  return { result: data ?? null, error: error ?? null }
}
```

A duplicate `username` (different `id`) still raises Postgres error code `23505` on the `username` unique constraint. A duplicate `id` (same user, stale session) is now silently handled by upsert. The screen distinguishes the two by inspecting `error.code` and `error.details` (or `error.message`).

### Pattern 4: Error Code Routing (PROF-03)

```javascript
// screens/setup.js — inside submit handler
const { result, error } = await transport.createProfile(userId, handle, handle)
if (error) {
  if (error.code === '23505') {
    // Check which constraint was violated
    if (error.message?.includes('username') || error.details?.includes('username')) {
      errEl.textContent = 'HANDLE TAKEN — TRY ANOTHER'
    } else {
      // id conflict — user already has a profile (stale session edge case not caught by upsert)
      // This should not happen after PROF-02 fix, but guard defensively
      router.navigate('#/')
    }
  } else {
    errEl.textContent = error.message || 'SOMETHING WENT WRONG'
  }
  return
}
store.set('profile', result)
router.navigate('#/')
```

**Supabase error shape** (HIGH confidence — official Supabase JS v2 docs):
- `error.code` — Postgres error code string, e.g. `'23505'` for unique_violation
- `error.message` — human-readable string, includes constraint name
- `error.details` — additional detail string, often includes the conflicting key

### Pattern 5: Optimistic Display Name Edit (PROF-05)

```javascript
// settings.js — display name row click handler
nameValueEl.addEventListener('click', () => {
  const current = store.get('profile')?.display_name || ''
  nameValueEl.innerHTML = `<input class="field-sm" style="max-width:140px;font-size:12px" value="${_esc(current)}" />`
  const input = nameValueEl.querySelector('input')
  input.focus()

  async function commit() {
    const newName = input.value.trim()
    if (!newName || newName === current) { renderNameValue(current); return }
    // Optimistic: update store immediately
    const profile = store.get('profile')
    store.set('profile', { ...profile, display_name: newName })
    renderNameValue(newName)
    // Persist async — silent failure acceptable (store already updated)
    const { error } = await transport.updateProfile(profile.id, { display_name: newName })
    if (error) {
      // Rollback
      store.set('profile', { ...profile, display_name: current })
      renderNameValue(current)
      // Show brief error
    }
  }

  input.addEventListener('blur', commit)
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); input.blur() } })
})
```

### Pattern 6: Router Guard and the `setup` Route

Current `lib/router.js` `PUBLIC_VIEWS = new Set(['auth', 'invite'])`. The `setup` route requires the user to be signed in (to know their user id), so it is NOT a public view — correct behavior. However, the router's auth guard redirects unauthenticated users to `#/auth`, and authenticated users with no profile get stuck in a loop if not handled.

The correct flow after sign-up:
1. `transport.signUp()` returns `{ user }` — user now exists
2. Screen sets `store.set('user', user)` and navigates to `#/setup`
3. Router sees `user` is set → `setup` is not in `PUBLIC_VIEWS` → allows through → setup handler mounts

The router already handles this correctly. No changes to `lib/router.js` needed.

**Boot flow for returning user with profile:**
1. `app.js` calls `transport.getSession()` → `store.set('user', user)`
2. `router.route()` fires → auth guard passes (user exists) → handler for current hash called
3. Setup screen should NOT appear for returning users — screens must check `store.get('profile')` on mount and navigate away if profile already exists.

**Boot flow for returning user without profile (partially completed sign-up):**
1. User exists, profile does not
2. App should land on `#/setup`
3. This detection belongs in the settings screen and/or a post-auth redirect in the auth screen

### Anti-Patterns to Avoid

- **Importing `sb` directly in screen files:** All Supabase access goes through `transport/index.js`. Direct `sb` import in screens breaks the transport abstraction.
- **Using `alert()` for any user-facing message:** AUTH-04 is explicit. Use `.error-msg` divs.
- **Calling `createProfile` with `insert` (old behavior):** Must be `upsert` per PROF-02.
- **Storing the auth key in state store as a permanent field:** The `profile` state key already exists in `state/store.js` — use it, do not create a parallel store.
- **Registering `setup` as a PUBLIC_VIEW:** setup requires auth. It should remain protected.
- **Not returning a cleanup function from screen handlers:** The router calls `_currentCleanup()` before mounting the next screen. Event listeners not removed will pile up across navigations.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session persistence | Custom localStorage token management | Supabase JS v2 built-in | Supabase persists and refreshes tokens automatically |
| Auth state change detection | Polling getSession() | `transport.onAuthChange()` wraps `sb.auth.onAuthStateChange` | Already wired in `app.js` at boot |
| Unique constraint error detection | Custom HTTP status checks | Supabase error `.code === '23505'` | Postgres error codes are stable and documented |
| Profile existence check on setup | Manual DB query on every route | Check `store.get('profile')` (already hydrated) | Profile is loaded into state after sign-in |
| CSS for inline errors | Custom error styling | `.error-msg` class in `cipher-styles.css` | Already defined, correct color (`--danger`), size, uppercase |
| Avatar color | Custom hashing | `_strColor(username)` in `lib/utils.js` | Already implemented, used by design reference |

**Key insight:** The transport abstraction means all the hard Supabase work is done. Phase 2 screens are primarily DOM + state wiring, not Supabase integration work.

---

## Common Pitfalls

### Pitfall 1: Auth/Setup Navigation Loop

**What goes wrong:** After sign-up, the screen calls `transport.signUp()` and gets back a `{ user }`. It sets `store.set('user', user)` and navigates to `#/setup`. On page reload, `app.js` calls `transport.getSession()` and gets the user back. But if the profile load hasn't been added to the boot sequence, `store.get('profile')` is `null`. The setup screen should detect this state. If the router sends authenticated-but-no-profile users to `#/` (inbox), that screen will have no profile and break.

**Why it happens:** Phase 1's `app.js` hydrates `user` but not `profile`. The profile load after auth is Phase 2's responsibility to add.

**How to avoid:** After hydrating `user` in the boot sequence (or in `onAuthChange`), call `transport.getProfile(user.id)` and set `store.set('profile', result)`. If `profile` is null after this, redirect to `#/setup`. This logic can live in `app.js` or in a shared auth-guard enhancement.

**Warning signs:** Inbox/chat screens receiving `store.get('profile') === null` after sign-in.

### Pitfall 2: 409 Conflict on Stale Auth Session (PROF-02)

**What goes wrong:** User signs up, closes tab without completing setup. Returns. Supabase session is still alive. App navigates to `#/setup`. User submits handle. `createProfile` calls `.insert()` — Postgres raises 23505 on `id` because the profile row was partially created (or the user exists with a profile from a previous session). The screen shows a cryptic "already exists" error and the user is stuck.

**Why it happens:** `.insert()` on a row with a matching primary key always fails. Stale sessions are real — the `user.id` persists across sessions.

**How to avoid:** Change `createProfile` in `supabase-transport.js` to `.upsert({ onConflict: 'id' })`. If the row already exists with the same `id` but a different `username`, the upsert will overwrite it (acceptable for setup). A `username` conflict (code 23505 on the `username` unique constraint) still surfaces as an error and should show "handle taken."

**Warning signs:** Test users who signed up previously seeing a conflict error on setup. The v0 CLAUDE.md bug #1 is exactly this.

### Pitfall 3: Supabase Email Confirmation Blocking Sign-In

**What goes wrong:** `transport.signUp()` succeeds, but Supabase has email confirmation enabled. The returned `user` object exists but the session is null (unconfirmed). Navigation to `#/setup` proceeds, but `transport.getProfile()` and subsequent operations require a live session — they fail silently or return auth errors.

**Why it happens:** Supabase projects have email confirmation on by default. Many test environments turn it off, but production may have it on.

**How to avoid:** In the Supabase dashboard for the `cipher` project, check Authentication → Settings → Email Confirmation. For v1, confirm whether email confirmation is enabled. If it is, `signUp` returns `{ user, session: null }` and the screen must show a "check your email" message instead of navigating to `#/setup`. The screen should check `data.session` (not just `data.user`) to determine which branch to take.

**Warning signs:** Sign-up appears to succeed but setup screen immediately fails with auth errors or "not authenticated."

### Pitfall 4: Sign-Out Does Not Clear Profile State

**What goes wrong:** User signs out. `transport.signOut()` is called. Supabase clears the auth token. `onAuthChange` fires with `null` → `store.set('user', null)`. Router redirects to `#/auth`. But `store.get('profile')` still has the old profile. Next user who signs in on the same device sees stale profile data momentarily.

**Why it happens:** `app.js` sets `profile` during auth, but sign-out only clears `user` via `onAuthChange`. `profile` is never explicitly cleared.

**How to avoid:** In `onAuthChange`, when `user` is null, also call `store.set('profile', null)`. This can be done in `app.js`'s existing `onAuthChange` callback.

**Warning signs:** Settings screen showing previous user's handle after sign-out and re-sign-in.

### Pitfall 5: Setup Screen Has No Sign-Out Escape Hatch

**What goes wrong:** User gets stuck on `#/setup` (e.g., invalid handle repeated failures). There is no way out except closing the browser. The v0 CLAUDE.md lists this as known bug #5.

**Why it happens:** The design reference (`cipher-app.jsx`) does not include a Setup screen — it only has Auth and Settings. The escape hatch was never designed.

**How to avoid:** Add a "Cancel / Sign out" link or small button below the submit button on the Setup screen. On click: call `transport.signOut()` → `store.set('user', null)` → `store.set('profile', null)` → `router.navigate('#/auth')`. The router's `onAuthChange` callback will also fire and handle cleanup.

**Warning signs:** Inability to exit setup during testing without clearing Supabase users manually.

### Pitfall 6: `app.js` Import Order Matters

**What goes wrong:** `screens/auth.js` is imported before `lib/router.js` is imported in `app.js`, or screens import `router.js` and call `register()` before the router is initialized.

**Why it happens:** ES module imports are resolved before any top-level code runs, but the order of `import` statements in `app.js` determines which module's side effects run first.

**How to avoid:** Screen files call `router.register()` at module load as a side effect. The router module (`lib/router.js`) exports `register` synchronously — it is safe to call immediately. The `router.start()` and `router.route()` calls in `app.js` happen after all imports resolve (they are in the `.then()` callback of `getSession()`), so screens will always be registered before the first `route()` call. The import order in `app.js` is correct as long as screen imports come before `router.start()` is called — which they will, since imports are hoisted.

---

## Design Reference Translation

The design file (`cipher-app.jsx`) provides full specifications for two of the three Phase 2 screens.

### AuthScreen → `screens/auth.js`

**HTML structure (translated from JSX):**
```html
<div class="screen auth-screen">
  <div class="cipher-logo">
    <div class="logo-mark"><span>⌘</span></div>
    <div class="logo-name">CIPHER</div>
    <div class="logo-by">BY READYBOX SYSTEMS</div>
  </div>
  <div class="auth-block">
    <div class="tab-row">
      <button class="tab active" data-mode="in">Sign In</button>
      <button class="tab" data-mode="up">Sign Up</button>
    </div>
    <form class="form">
      <input class="field" type="email" placeholder="email" autocomplete="email" />
      <input class="field" type="password" placeholder="password" autocomplete="current-password" />
      <button class="btn" type="submit">SIGN IN</button>
    </form>
    <div class="error-msg"></div>
  </div>
  <div class="legal-line">
    AES-256-GCM · Web Crypto<br />
    Server stores ciphertext only
  </div>
</div>
```

**Tab behavior:** Clicking "Sign Up" tab toggles `active` class, updates button text to "CREATE ACCOUNT", and sets `autocomplete="new-password"` on the password field.

### SettingsScreen → `screens/settings.js`

**HTML structure (translated from JSX):**
```html
<div class="screen">
  <div class="topbar">
    <button class="icon-btn" id="settings-back">←</button>
    <div class="topbar-center">
      <div class="topbar-title">SETTINGS</div>
    </div>
    <div style="width:44px"></div>
  </div>
  <div class="settings-list">
    <div class="settings-header">
      <div class="avatar" id="settings-avatar"></div>
      <div class="settings-header-info">
        <div class="name" id="settings-handle"></div>
        <div class="email" id="settings-email"></div>
      </div>
    </div>
    <div class="settings-section-label">PROFILE</div>
    <div class="settings-row" id="settings-displayname-row">
      <span class="label">Display name</span>
      <span class="value editable" id="settings-displayname-value"></span>
    </div>
    <div class="settings-row readonly">
      <span class="label">Handle</span>
      <span class="value" id="settings-handle-value"></span>
    </div>
    <div class="settings-row readonly">
      <span class="label">Email</span>
      <span class="value" id="settings-email-value"></span>
    </div>
    <div class="settings-section-label">ACCOUNT</div>
    <div class="settings-row danger" id="settings-signout">
      <span class="label">Sign out</span>
      <span class="value"><span class="chev" style="color:var(--danger)">›</span></span>
    </div>
  </div>
</div>
```

Avatar: `_strColor(username)` as background, first character of display_name as content.

### SetupScreen → `screens/setup.js` (NO DESIGN REFERENCE)

The setup screen has no JSX equivalent in `cipher-app.jsx`. It must be designed from scratch matching the existing aesthetic. Recommended structure:

```html
<div class="screen auth-screen">        <!-- reuse auth-screen centering layout -->
  <div class="cipher-logo">...</div>    <!-- same Logo component as Auth -->
  <div class="auth-block">
    <div class="tab-row" style="pointer-events:none">
      <button class="tab active" style="flex:1">Choose Your Handle</button>
    </div>
    <form class="form">
      <input class="field" type="text" placeholder="@handle" autocomplete="off"
             maxlength="30" pattern="[a-z0-9_]+" />
      <button class="btn" type="submit">CONFIRM HANDLE</button>
    </form>
    <div class="error-msg"></div>
    <button class="btn" style="background:transparent;border-color:var(--border2);color:var(--text-dim);margin-top:8px">
      Sign out
    </button>
  </div>
</div>
```

Handle validation (client-side before submit): lowercase letters, digits, underscores only; minimum 2 characters; maximum 30 characters. Show inline error for invalid format before hitting the server.

---

## Environment Availability

Step 2.6: All dependencies for Phase 2 are in-browser or already installed. No new external tools required.

| Dependency | Required By | Available | Notes |
|------------|-------------|-----------|-------|
| Supabase JS v2 | Auth, profile CRUD | Yes (CDN) | Already loaded via `supabase.js` |
| Browser DOM APIs | Screen rendering | Yes (always) | Vanilla JS pattern |
| `transport/` methods | All screens | Yes | Phase 1 complete |
| `state/store.js` | All screens | Yes | Phase 1 complete |
| `lib/router.js` | All screens | Yes | Phase 1 complete |
| `lib/utils.js` (`_strColor`, `_esc`) | Settings avatar, escaping | Yes | Phase 1 complete |

---

## Validation Architecture

`nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30 (installed) |
| Config file | `jest.config.js` (project root) |
| Quick run command | `node --experimental-vm-modules node_modules/jest/bin/jest.js --passWithNoTests` |
| Full suite command | `node --experimental-vm-modules node_modules/jest/bin/jest.js` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| AUTH-01 | signUp transport method returns user | unit (transport) | Phase 5 scope | Transport tested in Phase 5 |
| AUTH-02 | Session persists via Supabase localStorage | manual | Open tab, close, reopen — user still signed in | Cannot automate without browser |
| AUTH-03 | signOut clears user + profile in store | unit (store) | Phase 5 scope | |
| AUTH-04 | No `alert()` in screen files | static grep | `grep -r "alert(" screens/` returns 0 | Verifiable immediately |
| PROF-01 | Setup screen registered at `#/setup` | smoke | Manual: navigate to `#/setup` after sign-up | |
| PROF-02 | upsert vs insert in supabase-transport | code review | `grep "upsert" transport/supabase-transport.js` returns 1 | Structural check |
| PROF-03 | Error code 23505 routed correctly | unit (logic) | Phase 5 scope with mock-transport | |
| PROF-04 | Profile fields visible on Settings | smoke | Manual: sign in → Settings → verify @handle + email visible | |
| PROF-05 | Optimistic display name update | manual | Click display name → edit → blur → confirm immediate UI update | |

### Automated Structural Checks (Wave Gate)

These can be run immediately after each task without a browser:

```bash
# AUTH-04: No alert() calls
grep -r "alert(" "C:/Cipher Program/screens/" && echo "FAIL - alert() found" || echo "PASS"

# PROF-02: upsert present in supabase-transport.js
grep "upsert" "C:/Cipher Program/transport/supabase-transport.js" && echo "PASS" || echo "FAIL - still using insert"

# Screen files registered correctly
grep "router.register" "C:/Cipher Program/screens/auth.js" && echo "PASS" || echo "FAIL"
grep "router.register" "C:/Cipher Program/screens/setup.js" && echo "PASS" || echo "FAIL"
grep "router.register" "C:/Cipher Program/screens/settings.js" && echo "PASS" || echo "FAIL"

# No direct supabase.js imports in screens
grep -r "from.*supabase.js" "C:/Cipher Program/screens/" && echo "FAIL - direct supabase import" || echo "PASS"
```

### Wave 0 Gaps

None for test infrastructure — Jest is installed and configured. No new test files are needed for Phase 2 (Phase 5 covers transport/logic unit tests). The structural checks above are grep-based, not Jest tests.

---

## State of the Art

| Old Approach (v0) | Current Approach (Phase 2) | Impact |
|-------------------|---------------------------|--------|
| `alert()` for errors | `.error-msg` div with `textContent` | AUTH-04 compliance |
| `sb.from('profiles').insert()` | `.upsert({ onConflict: 'id' })` | PROF-02: no 409 on stale sessions |
| Monolith app.js with all screens | Modular `screens/` files self-registering | Clean architecture, router-compatible |
| No profile state in boot | `getProfile()` called after auth, stored in `store` | Settings/Setup screen can read profile immediately |
| No sign-out on setup screen | Escape hatch button on Setup screen | Fixes v0 known bug #5 |

---

## Open Questions

1. **Email confirmation enabled on the `cipher` Supabase project?**
   - What we know: Supabase enables email confirmation by default; the v0 app used email+password without apparent issues in the CLAUDE.md test instructions
   - What's unclear: Whether the cipher Supabase project has confirmation disabled (likely yes, given testing worked), or if there's a code path that handles unconfirmed users
   - Recommendation: The executor should check Supabase dashboard → Authentication → Settings → "Enable email confirmations" toggle before implementing the sign-up success branch. If enabled, the sign-up handler must detect `session === null` and show a "Check your email" message.

2. **Profile hydration location — `app.js` or per-screen?**
   - What we know: `app.js` currently hydrates `user` but not `profile`. The boot sequence calls `transport.getSession()` → `store.set('user', user)`.
   - What's unclear: Whether profile hydration belongs in `app.js` (global, runs once) or in each screen that needs it (local, more explicit)
   - Recommendation: Add profile hydration to `app.js`'s boot sequence: after `store.set('user', user)`, if `user` is not null, call `transport.getProfile(user.id)` and `store.set('profile', result)`. This ensures profile is available to any screen at mount time without each screen having to fetch it. If profile is null after this, the auth guard (or the `#/` handler) should redirect to `#/setup`.

3. **`app.js` needs to import the new screen files — is that a modification to a Phase 1 file?**
   - What we know: `app.js` was created in Phase 1 Plan 03 as a 32-line boot file. Phase 2 must add `import './screens/auth.js'` etc.
   - What's unclear: Whether this counts as a Phase 1 file modification or a normal Phase 2 change
   - Recommendation: It is a normal Phase 2 modification. The boot file is intentionally minimal and designed to grow with screen imports. The Phase 1 SUMMARY explicitly states "Phase 2 begins filling `screens/`". Modifying `app.js` to import screens is the designed extension point.

---

## Sources

### Primary (HIGH confidence)
- Phase 1 SUMMARY and PLAN files — confirmed Phase 1 deliverables and architecture decisions
- `lib/router.js` (read directly) — auth guard, registration pattern, `PUBLIC_VIEWS` set
- `state/store.js` (read directly) — store keys, `set`/`get`/`on`/`off` API
- `transport/interface.js` + `transport/supabase-transport.js` (read directly) — 17-method contract, createProfile uses `.insert()` (needs upsert fix)
- `.planning/design/src/cipher-app.jsx` (read directly) — AuthScreen and SettingsScreen pixel-level specs
- `.planning/design/src/cipher-styles.css` (read directly) — all CSS classes available, including `.error-msg`, `.settings-row`, `.auth-screen`, etc.
- `REQUIREMENTS.md` (read directly) — AUTH-01 through PROF-05 exact requirements

### Secondary (MEDIUM confidence)
- Supabase JS v2 error shape (`error.code`, `error.details`, `error.message`) — consistent with training knowledge through August 2025; Postgres 23505 unique_violation code is stable
- Supabase upsert API (`{ onConflict: 'id' }` parameter) — consistent with v2 SDK patterns in training data; planner should verify against live SDK if behavior is unexpected

### Tertiary (LOW confidence)
- Email confirmation default behavior — assuming disabled based on CLAUDE.md test instructions working without it; executor must verify in Supabase dashboard

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all libraries already present and confirmed working
- Architecture: HIGH — screen module pattern directly derived from Phase 1 router contract; patterns are code, not conjecture
- Pitfalls: HIGH for pitfalls 1-4 (derived from v0 known bugs and Phase 1 decisions); MEDIUM for pitfall 5 (email confirmation is environment-dependent)

**Research date:** 2026-04-30
**Valid until:** 2026-05-30 (stable — Supabase JS v2 API and vanilla JS patterns are not fast-moving)
