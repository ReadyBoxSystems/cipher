# Architecture Patterns — Cipher PWA Rebuild

**Domain:** Vanilla JS encrypted messaging SPA
**Researched:** 2026-04-27
**Confidence:** HIGH — based on direct analysis of v0 source and established JS patterns

---

## 1. Problem Diagnosis: What's Wrong with v0

Reading `app.js` directly reveals four tangled concerns in a single 543-line file:

| Line range | What it does | Problem |
|------------|--------------|---------|
| 1–54 | State object + router | State is module-global; router reads DOM hash and calls render functions directly |
| 60–149 | Auth + setup screens | `sb.auth.*` called inline; DOM built with template literals in the same function |
| 153–229 | Inbox screen | `sb.from('messages').insert(...)` inside a render function; realtime sub created per-render |
| 235–430 | Chat screen | Business logic (encrypt/decrypt/apply-cipher), DOM rendering, and Supabase queries all in one `showChat()` call |
| 466–510 | Accept invite | Multi-step database transaction in a screen function — untestable |
| 514–530 | Utilities | `_ago`, `_strColor`, `_esc` — pure functions buried at the bottom |

The root failure: **there is no layer separation at all**. A function like `_send()` does cipher encoding, AES encryption, a Supabase insert, DOM field reads, and a localStorage write — all five concerns in 20 lines.

---

## 2. Proposed File Structure

```
C:\Cipher Program\
│
├── index.html                  ← App shell only. One <div id="app">. Script imports.
├── style.css                   ← Unchanged from v0
├── manifest.json               ← Unchanged from v0
├── sw.js                       ← Service worker (update cache list only)
├── schema.sql                  ← Unchanged from v0
│
├── ciphers.js                  ← UNCHANGED. Pure functions, already testable.
├── crypto.js                   ← UNCHANGED. Pure async functions, already testable.
│
├── transport/
│   ├── interface.js            ← JSDoc interface definition (the contract)
│   ├── supabase-transport.js   ← Supabase implementation of the interface
│   └── mock-transport.js       ← In-memory mock for Jest tests
│
├── state/
│   └── store.js                ← App state singleton + EventEmitter-style subscriptions
│
├── lib/
│   ├── router.js               ← Hash router — parse, guard, dispatch
│   ├── settings.js             ← localStorage cipher settings (getSettings/putSettings)
│   └── utils.js                ← _ago(), _strColor(), _esc() — pure, testable
│
├── screens/
│   ├── auth.js                 ← Auth screen render + handlers
│   ├── setup.js                ← Username setup screen
│   ├── inbox.js                ← Inbox screen + realtime watcher
│   ├── chat.js                 ← Chat screen + realtime watcher
│   ├── new-chat.js             ← Invite generation screen
│   └── accept-invite.js        ← Invite acceptance flow
│
├── app.js                      ← Boot only: init transport, init store, register SW, start router
│
└── supabase.js                 ← Unchanged. Supabase client init.
```

**File count:** 18 files (up from 8). Each file has one job.

---

## 3. Component Responsibilities

### `transport/interface.js`

Not executable code — JSDoc comments defining the contract every transport must fulfill. Documents the shape. Required reading before implementing any new transport.

```javascript
/**
 * @typedef {Object} Transport
 *
 * Auth
 * @property {(email: string, pass: string) => Promise<{user, error}>} signIn
 * @property {(email: string, pass: string) => Promise<{user, error}>} signUp
 * @property {() => Promise<void>} signOut
 * @property {() => Promise<{user}>} getSession
 * @property {(cb: Function) => Function} onAuthChange  — returns unsubscribe fn
 *
 * Profiles
 * @property {(userId: string) => Promise<{profile, error}>} getProfile
 * @property {(userId: string, username: string, displayName: string) => Promise<{error}>} createProfile
 * @property {(userId: string, patch: Object) => Promise<{error}>} updateProfile
 * @property {(userId: string) => Promise<{profile, error}>} getContactProfile
 *
 * Conversations
 * @property {(userId: string) => Promise<{conversations, error}>} getConversations
 * @property {(convId: string, userId: string) => Promise<{profile, error}>} getConversationContact
 * @property {(convId: string) => Promise<{lastAt, error}>} getLastMessageTime
 *
 * Messages
 * @property {(convId: string) => Promise<{messages, error}>} getMessages
 * @property {(convId, senderId, payload, iv, salt) => Promise<{error}>} sendMessage
 * @property {(convId, cb) => Function} subscribeMessages  — returns unsubscribe fn
 *
 * Invites
 * @property {(creatorId: string) => Promise<{invite, error}>} createInvite
 * @property {(code: string) => Promise<{invite, error}>} getInvite
 * @property {(code, acceptedBy, convId) => Promise<{error}>} acceptInvite
 * @property {(convId) => Function} subscribeConversationMembers  — returns unsubscribe fn
 */
```

This is the entire surface area of the transport. If a method doesn't appear here, the app doesn't call it.

### `transport/supabase-transport.js`

Wraps `sb` from `supabase.js`. Implements every method in the interface contract. No business logic — pure data access. Returns plain objects `{ data, error }` normalized to `{ result, error }` shapes.

Key point: the multi-step invite acceptance transaction (`showAcceptInvite` in v0, lines 494–509) moves here as a single `acceptInvite()` method. The screen only calls one method and gets back success/failure.

### `transport/mock-transport.js`

In-memory implementation of the same interface. Used by Jest. Lets you test `accept-invite.js` screen logic without a Supabase connection. Returns canned data from `Map` objects. This is what makes business logic in screens testable.

### `state/store.js`

Module-level singleton. Exposes state reads and a minimal event system.

```javascript
const _state = {
  user:          null,
  profile:       null,
  conversations: [],
  messages:      {},    // { convId: [msg, ...] }
  contacts:      {},    // { convId: profile }
}

const _listeners = {}   // { eventName: [fn, ...] }

export function get(key)           { return _state[key] }
export function set(key, value)    { _state[key] = value; emit(key, value) }
export function on(event, fn)      { (_listeners[event] ??= []).push(fn); return () => off(event, fn) }
export function off(event, fn)     { _listeners[event] = (_listeners[event] || []).filter(f => f !== fn) }
export function emit(event, data)  { (_listeners[event] || []).forEach(fn => fn(data)) }
```

Screens subscribe to state changes they care about. Inbox subscribes to `conversations`. Chat subscribes to `messages`. When the transport delivers a new message, the store updates `messages[convId]` and emits — the chat screen re-renders without the screen knowing where the message came from.

This is not Redux. There is no reducer, no action, no dispatcher. It is a plain event emitter wrapped around a plain object. The simplicity is intentional — this scales to this app's size without ceremony.

### `lib/router.js`

Hash-based routing stays. Reason: hash routing works on GitHub Pages without a `_redirects` file or server config. History API routing on GitHub Pages requires that the 404 page redirect all routes back to `index.html` — an unnecessary complication for a static host.

The router becomes an independent module instead of being inline in `app.js`.

```javascript
const routes = {}

export function register(pattern, handler) {
  routes[pattern] = handler
}

export function navigate(path) {
  location.hash = path
}

export async function route() {
  const hash  = location.hash.slice(1) || '/'
  const parts = hash.split('/').filter(Boolean)
  const view  = parts[0] || ''
  const param = parts[1] || ''
  // auth guard lives here, not in screens
  // dispatches to registered screen handlers
}

window.addEventListener('hashchange', () => route())
```

Auth guard logic (`if (!state.user) return showAuth()`) lives in the router, not scattered across screen functions. Screens register themselves; the router decides whether to call them.

### `lib/settings.js`

The three `loadSettings/saveSettings/getSettings/putSettings` functions from v0. Extracted as-is. Testable in Node (localStorage can be mocked).

### `lib/utils.js`

`_ago()`, `_strColor()`, `_esc()`. Pure functions. Zero dependencies. Move them here, test them.

### `screens/*.js`

Each screen module exports one function: `mount(container, params)`. It receives the DOM container and any route params (e.g. `convId`). It returns a cleanup function that the router calls before mounting the next screen.

```javascript
// screens/chat.js
export async function mount(container, { convId }) {
  // render HTML
  // load messages via transport
  // subscribe to store
  // subscribe to realtime via transport
  
  return function cleanup() {
    // unsubscribe from realtime
    // unsubscribe from store listeners
  }
}
```

This is the answer to the subscription lifecycle problem (see section 5). The router calls `cleanup()` before calling the next `mount()`. Each screen owns its subscriptions and tears them down reliably.

### `app.js` (boot only)

```javascript
import { createSupabaseTransport } from './transport/supabase-transport.js'
import { setTransport } from './state/store.js'
import { route } from './lib/router.js'
import './screens/auth.js'
import './screens/inbox.js'
import './screens/chat.js'
// ... register all screens with router

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}

const transport = createSupabaseTransport()
setTransport(transport)

transport.getSession().then(({ user }) => {
  store.set('user', user)
  transport.onAuthChange((user) => store.set('user', user))
  route()
})
```

app.js goes from 543 lines to ~30 lines.

---

## 4. Transport Abstraction Design

This is the most important architectural decision in the rebuild.

### The Core Problem

v0 calls `sb.from('messages').insert(...)` directly inside `_send()`. That Supabase-specific API call is woven into DOM event handling. Swapping to Meshtastic would require rewriting every screen.

### The Solution: Dependency Injection via Store

The transport is created once at boot and stored in the module-level store. Screens never import `supabase.js` directly — they call `store.getTransport()` (or receive it as a parameter on mount). This makes screens transport-agnostic.

### Interface Design Rationale

The interface was designed by reading every Supabase call in v0 and abstracting it:

| v0 call | Transport method |
|---------|-----------------|
| `sb.auth.signInWithPassword(...)` | `transport.signIn(email, pass)` |
| `sb.auth.signUp(...)` | `transport.signUp(email, pass)` |
| `sb.from('profiles').select('*').eq('id', uid)` | `transport.getProfile(userId)` |
| `sb.from('profiles').insert(...)` | `transport.createProfile(userId, username, displayName)` |
| `sb.from('conversation_members').select(...).eq('user_id', uid)` | `transport.getConversations(userId)` |
| `sb.from('messages').select('*').eq('conversation_id', id)` | `transport.getMessages(convId)` |
| `sb.from('messages').insert({ payload, iv, salt })` | `transport.sendMessage(convId, senderId, payload, iv, salt)` |
| `sb.channel(...).on('postgres_changes', ...).subscribe()` | `transport.subscribeMessages(convId, cb)` → returns unsubscribe fn |
| `sb.from('invites').insert({ creator_id })` | `transport.createInvite(creatorId)` |
| `sb.from('invites').select('*').eq('code', code)` | `transport.getInvite(code)` |
| Multi-step accept flow (lines 494–509) | `transport.acceptInvite(code, acceptedBy)` |

### How Mesh Transport Would Implement This

A future `mesh-transport.js` would export the same interface. `sendMessage()` would serialize the AES blob into a Meshtastic packet. `subscribeMessages()` would listen on the mesh radio channel. `getMessages()` might fetch from a local SQLite store (IndexedDB) instead of Postgres.

The screens don't change. Only the transport implementation changes.

### Returning Normalized Results

Both Supabase and mesh transport return `{ result, error }`. Supabase uses `{ data, error }` natively — the transport adapter normalizes it:

```javascript
// supabase-transport.js
async getMessages(convId) {
  const { data, error } = await sb.from('messages')
    .select('*')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })
  return { result: data, error }
}
```

Screens call `const { result, error } = await transport.getMessages(convId)`. They never touch Supabase response shapes.

---

## 5. Supabase Subscription Lifecycle

### v0 Problem

v0 uses two module-level variables `_inboxSub` and `_chatSub`. When a new screen renders, it checks `if (_inboxSub) _inboxSub.unsubscribe()`. This is fragile:

- Navigating quickly can leave a stale subscription running
- The subscription is created mid-render alongside DOM setup
- No systematic cleanup — if a screen function throws, the old subscription leaks

### Fix: Cleanup Function Pattern

The `mount(container, params) → cleanup` pattern described in section 3 solves this cleanly. The router holds a `currentCleanup` reference:

```javascript
// router.js
let currentCleanup = null

async function route() {
  // ... parse hash, auth guard ...
  
  if (currentCleanup) {
    currentCleanup()
    currentCleanup = null
  }
  
  const screen = resolveScreen(view)
  if (screen) {
    currentCleanup = await screen.mount(app, { convId: param })
  }
}
```

Each screen's cleanup function unsubscribes from realtime and from store listeners. Cleanup is guaranteed to run before the next screen mounts. No leaked subscriptions possible as long as every `mount` returns a cleanup function.

### Subscription Ownership

Realtime subscriptions belong to the screen that creates them. The inbox subscription for new message previews is owned by `inbox.js`. The chat subscription for incoming messages is owned by `chat.js`. Neither knows about the other.

The inbox's "new conversation" problem from v0 (invite accepted, inbox doesn't update) is fixed by subscribing to `conversation_members` inserts in the inbox's realtime subscription, not just `messages`.

---

## 6. State Management Pattern

### Recommendation: Module Singleton + Event Emitter

For this app's scale (one user, ~10 conversations, ~100 messages in memory), a full store framework is unnecessary. The pattern is:

1. Single `store.js` module holds all state in a plain object
2. `store.set(key, value)` updates state and emits a named event
3. Screens subscribe with `store.on('messages', fn)` and unsubscribe in their cleanup
4. No derived state computed in the store — screens compute what they need from raw state

### What Not To Do

Do not use global `window._state` as in v0. Module scope in `store.js` is equivalent but properly encapsulated — nothing outside `store.js` can write to state except through `store.set()`.

Do not reach for a library like Zustand or Redux. They require a build step or a CDN import, and this project has neither as a constraint.

### State Shape

```javascript
{
  user:          null,          // Supabase User object | null
  profile:       null,          // { id, username, display_name } | null
  conversations: [],            // [{ id, updated_at, _lastAt, ... }]
  contacts:      {},            // { [convId]: { id, username, display_name } }
  messages:      {},            // { [convId]: [{ id, payload, iv, salt, _decoded?, ... }] }
  transport:     null,          // active Transport instance
}
```

`_decoded` is a transient, on-device only property stamped onto message objects after AES+cipher decode. It never goes to the transport. It is display state only — lost on refresh, which is correct behavior (the message should lock again until the key is re-entered, unless `keep` is true, in which case `_loadMsgs` re-derives it on mount).

---

## 7. Routing Pattern Assessment

### Hash Routing: Keep It

Hash routing (`location.hash`, `hashchange` event) is the correct choice for this app for a specific reason: GitHub Pages serves a single `index.html`. There is no server to handle `/chat/convId` as a request — the browser would get a 404 from GitHub's CDN.

History API (`pushState`) would require a 404 page that redirects all paths to `index.html` — a GitHub Pages trick using a custom 404.html. This works but adds deployment fragility.

The existing hash approach is correct. The rebuild just extracts it from `app.js` into its own `router.js` module.

### One Improvement: Route Registration

v0 has inline `if/else` dispatch in `route()`. The rebuild uses a registration pattern — each screen registers its own route pattern. This makes adding new screens a one-liner in the screen file rather than an edit to the router.

---

## 8. Jest Testability Assessment

After this decomposition, the testable surface becomes clear:

| Module | Testable without DOM? | How |
|--------|----------------------|-----|
| `ciphers.js` | Yes | Node — pure functions, no imports |
| `crypto.js` | Yes | Node 18+ has `crypto.subtle` natively |
| `lib/utils.js` | Yes | Pure functions |
| `lib/settings.js` | Yes | Mock localStorage with `jest.fn()` or jsdom |
| `transport/supabase-transport.js` | Partially | Mock `supabase.js` module |
| `transport/mock-transport.js` | Yes | This IS the mock |
| `screens/*.js` | Yes (with mock transport) | jsdom + mock-transport, no network |
| `lib/router.js` | Yes (with jsdom) | Simulate `hashchange` events |

The key enabler: screens receive the transport from the store, not by importing Supabase directly. This means Jest can swap in `mock-transport.js` and test screen logic (invite acceptance, message send, decode flow) without any network calls.

---

## 9. Anti-Patterns to Avoid

### Anti-Pattern 1: `window._fn` Global Handler Attachment

v0 attaches every event handler to `window` (`window._send`, `window._decode`, `window._tapMsg`, etc.) so that `onclick="..."` strings in template literals can call them. This pollutes the global namespace and makes it impossible to have two instances of a screen or clean up handlers.

**Instead:** Use `addEventListener` after inserting HTML. Screens use `container.querySelector('#send-btn').addEventListener('click', handler)`. Handlers are closed over the screen's local state (`convId`, settings, etc.) and cleaned up properly.

### Anti-Pattern 2: Template Literals with Inline `onclick`

v0 builds entire screens as one big template literal string with `onclick="..."` attributes referencing global functions. Unescaped data in these strings is an XSS risk (note `onclick="_send('${convId}')"` — if `convId` contained a quote this would break).

**Instead:** Render HTML without inline handlers, then wire events with `addEventListener` in JavaScript. `_esc()` handles display text. IDs/params passed via data attributes (`data-conv-id`) read back via `el.dataset.convId`.

### Anti-Pattern 3: Screen Functions Importing Supabase Directly

Any `import { sb } from './supabase.js'` in a screen file re-entangles the transport.

**Instead:** Screens import from `store.js` and call `store.getTransport()`. Zero direct Supabase references outside `supabase-transport.js`.

### Anti-Pattern 4: Floating Subscriptions

v0's `_inboxSub` and `_chatSub` as module-level variables are already a sign of the problem. Adding more subscriptions to this pattern makes it worse.

**Instead:** The cleanup function pattern described in section 5 — every subscription is created inside `mount()` and torn down by the returned `cleanup()`.

---

## 10. Phase Implications

This architecture decomposes cleanly into phases:

**Phase 1 — Foundation**
Stand up the module skeleton: `store.js`, `router.js`, `transport/interface.js`, `transport/supabase-transport.js`, `lib/settings.js`, `lib/utils.js`. Wire `app.js` boot. No screens yet — just the plumbing working end-to-end with a test harness.

**Phase 2 — Auth + Profile**
`screens/auth.js` and `screens/setup.js`. These are the simplest screens (no realtime, minimal state). Validates that the router → screen → transport → store flow works before tackling realtime.

**Phase 3 — Core Messaging**
`screens/inbox.js`, `screens/chat.js`. Realtime subscriptions. The cleanup pattern proven here. This is the highest-risk phase — realtime subscription lifecycle and the card-flip decode UX both live here.

**Phase 4 — Invite Flow**
`screens/new-chat.js`, `screens/accept-invite.js`, `transport.acceptInvite()` transaction. Isolated phase because the multi-step invite transaction is the most Supabase-specific logic in the entire app.

**Phase 5 — Tests**
Jest for `ciphers.js`, `crypto.js`, `utils.js`, settings, and key screen flows via `mock-transport.js`. These are the tests called out in PROJECT.md requirements.

---

## Sources

- Direct analysis of `C:\Cipher Program\app.js` (v0 monolith, 543 lines)
- `C:\Cipher Program\.planning\PROJECT.md` — constraints and goals
- Adapter pattern (Gang of Four) — HIGH confidence, canonical pattern
- ES module singleton pattern — HIGH confidence, standard JS
- Hash routing for static hosts — HIGH confidence, well-established GitHub Pages constraint
- Cleanup function pattern — HIGH confidence, mirrors React's `useEffect` return and is the idiomatic vanilla JS equivalent
