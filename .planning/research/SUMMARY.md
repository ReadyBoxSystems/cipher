# Research Summary — Cipher PWA Rebuild

**Status:** Complete — HIGH confidence across all areas
**Ready for roadmap:** Yes

---

## Executive Summary

Cipher is a rebuild of a working v0, not greenfield. The concept is proven. The problem is architecture: a 543-line `app.js` monolith where business logic, DOM manipulation, and Supabase calls are inseparable in every function. The rebuild decomposes into 18 files across `transport/`, `state/`, `lib/`, and `screens/` with one overriding rule: DOM code lives in `screens/`, Supabase calls live in `transport/`, everything else is pure and testable.

The single most important decision is the **transport abstraction**: a 12-method plain JS object interface that `SupabaseTransport` implements today and `MeshTransport` will implement later without touching any screen code.

Three confirmed v0 bugs must be fixed before new feature code is written on top of them.

---

## Recommended Stack

**Jest ESM setup — exact config:**

`package.json`:
```json
{
  "name": "cipher",
  "type": "module",
  "scripts": {
    "test": "node --experimental-vm-modules node_modules/.bin/jest"
  },
  "devDependencies": {
    "jest": "^30.0.0",
    "jest-environment-node": "^30.0.0"
  }
}
```

`jest.config.js`:
```javascript
export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.js'],
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
}
```

- `transform: {}` — disables Babel entirely. Do not add `@babel/preset-env`.
- `testEnvironment: 'node'` not `jsdom` — cipher/crypto tests don't need DOM, and `jsdom` omits `crypto.subtle`
- Node 18+ has `globalThis.crypto.subtle` natively — no mock needed
- Windows: `node --experimental-vm-modules` prefix works cross-platform

**Proposed file structure (18 files):**
```
transport/
  interface.js          ← JSDoc contract only, not executed
  supabase-transport.js ← wraps all sb.* calls
  mock-transport.js     ← in-memory stub for Jest

state/
  store.js              ← plain event emitter singleton

lib/
  router.js             ← hash router, auth guard, cleanup pattern
  settings.js           ← localStorage cipher prefs
  utils.js              ← _ago, _strColor, _esc

screens/
  auth.js
  setup.js
  inbox.js
  chat.js
  new-chat.js
  accept-invite.js

app.js                  ← boot only (~30 lines)
ciphers.js              ← unchanged (already pure)
crypto.js               ← patch toB64 + remove empty-key fallback
```

---

## Transport Abstraction — 12-Method Interface

```javascript
// transport/interface.js — JSDoc contract

/**
 * @typedef {Object} Transport
 *
 * Auth
 * @property {(email, pass) => Promise<{user, error}>} signIn
 * @property {(email, pass) => Promise<{user, error}>} signUp
 * @property {() => Promise<void>} signOut
 * @property {() => Promise<{user}>} getSession
 * @property {(cb) => Function} onAuthChange       ← returns unsubscribe fn
 *
 * Profiles
 * @property {(userId) => Promise<{profile, error}>} getProfile
 * @property {(userId, username, displayName) => Promise<{error}>} createProfile
 * @property {(userId, patch) => Promise<{error}>} updateProfile
 *
 * Conversations
 * @property {(userId) => Promise<{conversations, error}>} getConversations
 * @property {(convId, userId) => Promise<{profile, error}>} getConversationContact
 *
 * Messages
 * @property {(convId) => Promise<{messages, error}>} getMessages
 * @property {(convId, senderId, payload, iv, salt) => Promise<{error}>} sendMessage
 * @property {(convId, cb) => Function} subscribeMessages      ← returns unsubscribe fn
 *
 * Invites
 * @property {(creatorId) => Promise<{invite, error}>} createInvite
 * @property {(code) => Promise<{invite, error}>} getInvite
 * @property {(code, acceptedBy, convId) => Promise<{error}>} acceptInvite
 * @property {(userId, cb) => Function} subscribeConversationMembers  ← returns unsubscribe fn
 */
```

Screens import only from `transport/index.js`. Swap to mesh = one line change. Subscription methods return a cleanup function, hiding `sb.removeChannel()` internals from screens.

---

## Top 5 Pitfalls (by impact)

**1. Inbox realtime misses invite acceptance** — CRITICAL, confirmed v0 bug
Subscribe to `conversation_members` INSERT filtered to `user_id=eq.<userId>`. Also enable `conversation_members` replication in Supabase dashboard (Database → Replication) — without this, subscription receives nothing silently. Phase 3.

**2. Profile insert conflict on stale session** — CRITICAL, confirmed v0 bug
Replace blind `insert()` with `upsert({ onConflict: 'id' })`. Distinguish: 23505 on `id` = profile exists (redirect to inbox); 23505 on `username` = handle taken (show error). Phase 2.

**3. Service worker path on GitHub Pages** — CRITICAL, confirmed v0 bug
Change `register('/sw.js')` to `register('./sw.js', { scope: './' })`. Bump cache to `cipher-v2`. Phase 1.

**4. `toB64` spread crashes on large buffers** — HIGH, confirmed latent bug
`String.fromCharCode(...new Uint8Array(buf))` hits V8 stack limit. Replace with `for` loop. Fix before crypto tests are written. Phase 1.

**5. Empty-key fallback weakens encryption** — HIGH, confirmed v0 security issue
`key || 'cipher'` encrypts blank-key sends with the well-known string `'cipher'`. Remove fallback. For keyless ciphers (Atbash, Morse), generate a random local key silently. Phase 1.

---

## Feature Implementation Notes

**Card-flip CSS:**
- `perspective` + `overflow: hidden` + `border-radius` all on `.msg-card-container`
- `.msg-card` gets `transform-style: preserve-3d` — must NOT have `overflow: hidden` ancestor
- Both faces: `backface-visibility: hidden`; back starts `rotateY(180deg)`
- Timing: `0.45s cubic-bezier(0.4, 0, 0.2, 1)`
- Scroll lock: capture `list.scrollTop` before flip, restore in `transitionend` `{ once: true }`
- iOS risk: prototype early, have fixed-overlay fallback ready
- One flip at a time: track `activeFlip` reference

**Invite landing screen:**
- Unauthenticated `#/invite/:code` → purpose-built screen, not generic auth
- Show: sender @handle, one-sentence description, expiry, single CTA
- Code stays in `sessionStorage` through auth flow

**Settings layout:**
```
[ avatar initial · @handle · email ]
[ PROFILE ]  → display name (inline edit, optimistic)
[ APP ]      → Install (conditional)
[ ACCOUNT ]  → Sign out (red, own section)
```
- Sign out moves OUT of topbar — tap-target problem in v0

**Decoded message rendering:**
- Auto-decoded messages → plain bubbles (no flip element)
- Wrong key → inline error on card back, never `alert()`
- Incoming locked message → one pulse on lock glyph, not continuous
- Decoded text: color transitions `--text-dim` → `--text`

---

## Suggested Phase Order

| Phase | Name | Why |
|-------|------|-----|
| 1 | Foundation | Module skeleton, transport interface, v0 bug fixes, Jest config. All else depends on this. |
| 2 | Auth + Profile + Settings | Simple screens, no realtime. Validates router→transport→store pipeline. |
| 3 | Core Messaging | Inbox + chat, realtime, card-flip UX. Highest risk phase. |
| 4 | Invite Flow | Multi-step transaction, invite landing screen. Needs inbox + chat to exist. |
| 5 | Tests | Jest tests for ciphers, crypto, settings, key flows via mock-transport. Stable surface. |

---

## Research Flags

- **Phase 3 start:** Prototype card-flip CSS on iOS before full implementation. Have overlay fallback ready.
- **Phase 3 start:** Verify `conversation_members` replication is enabled in Supabase dashboard.
- **Phase 4 start:** Decide — Postgres `security definer` function for atomic invite acceptance, or test client-side sequential inserts first.
