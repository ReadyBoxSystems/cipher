# Technology Stack — Cipher Rebuild

**Project:** Cipher encrypted messaging PWA
**Researched:** 2026-04-27
**Scope:** Four specific questions for the rebuild milestone. Core stack already decided.

---

## 1. Vanilla JS SPA Module Architecture (Testability)

### The Problem with v0

`app.js` is 543 lines where every function touches the DOM. `_decode()` AES-decrypts, parses the result, then calls `document.getElementById`. You cannot test the decrypt logic without a DOM. You cannot test the cipher logic in isolation from the send flow. The monolith is the problem.

### The Pattern: Logic/Shell Split

Split `app.js` into two categories of file:

**Pure logic modules** — no DOM access, no `document`, no `window`, no Supabase calls. These are the only files Jest ever touches.

**Shell/controller files** — own the DOM, own screen rendering, own routing. These are never tested by Jest directly; they are thin wires that call logic modules.

```
src/
  logic/
    settings.js      ← getSettings, putSettings, loadSettings (localStorage only)
    messages.js      ← buildOutgoingMessage(text, cipher, key) → {encoded, cipher, key}
    conversations.js ← sortConversations, formatTimestamp, etc.
  transport/
    interface.js     ← TransportInterface (abstract contract — JSDoc or comment-only)
    supabase.js      ← SupabaseTransport implements the interface
  screens/
    auth.js          ← showAuth, showSetup — DOM + transport calls
    inbox.js         ← showInbox, renderInbox — DOM + transport calls
    chat.js          ← showChat, renderMessages — DOM + transport calls
    invite.js        ← showNewChat, showAcceptInvite
  router.js          ← route(), hash routing, screen dispatch
  state.js           ← shared mutable state object (user, profile, conversations, messages, contacts)
  app.js             ← boot only: SW registration, auth.getSession(), route()
```

**Rule:** If a function contains `document.`, `window.`, or `app.innerHTML`, it lives in `screens/`. If it contains `sb.from(` or `sb.auth.`, it lives in `transport/`. Everything else can be pure and tested.

### What Gets Tested

The cipher and crypto modules are already clean pure functions — `ciphers.js` and `crypto.js` have zero DOM dependencies. They need no architectural changes, just test files.

The new logic modules (`settings.js`, `messages.js`) should also be pure. `settings.js` needs a localStorage mock (easy — Jest provides `global.localStorage`). `crypto.js` needs `crypto.subtle` — available natively in Node 18+ (no mock needed).

**What NOT to do:**

- Do not try to unit-test screen rendering functions. They are glue code. E2E tests (Playwright, future) cover those.
- Do not create an abstraction for `localStorage` — the Jest environment provides it via `testEnvironment: 'jsdom'` or you can stub it globally. No wrapper needed.
- Do not put `import { sb } from '../supabase.js'` anywhere in logic modules. Logic modules must be completely transport-unaware.

---

## 2. Jest Configuration for Vanilla JS ES Modules

### The Situation

This project has no build step, no Babel, no bundler. Files use native `import/export`. Node 18+ has `crypto.subtle` natively. Jest's ESM support requires `--experimental-vm-modules`.

**Confidence:** HIGH — verified against Jest 30.0 official docs.

### package.json

Create at project root:

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

**Why `"type": "module"`:** Jest follows Node's ESM activation logic. Without this, `.js` files are treated as CommonJS and `import` statements throw.

**Why not `jest-environment-jsdom`:** The cipher and crypto logic modules have zero DOM dependencies. `testEnvironment: 'node'` is lighter and correct. DOM-dependent screen code is not tested by Jest.

**Windows note:** `NODE_OPTIONS="..."` syntax does not work on Windows CMD. The `node --experimental-vm-modules` prefix in the `test` script works cross-platform via npm scripts.

### jest.config.js

```javascript
export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.js'],
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
}
```

**`transform: {}`** — disables all transformation. No Babel, no TypeScript. Vanilla JS passes through as-is.

**`extensionsToTreatAsEsm: ['.js']`** — tells Jest to treat `.js` files as ESM. Required because Jest defaults `.js` to CommonJS even when `"type": "module"` is set in package.json.

### Crypto in Tests

`crypto.subtle` is available natively in Node 18+. No mock needed. The existing `crypto.js` should work in tests without any shimming — it calls `crypto.subtle.importKey`, `crypto.subtle.deriveKey`, `crypto.subtle.encrypt`, `crypto.subtle.decrypt`. All of these exist in the Node 18 Web Crypto API.

One caveat: Node's `crypto.subtle` is on `globalThis.crypto.subtle`, same as browsers. The existing `crypto.js` calls the global `crypto` without import, which works in browsers. In Node 18+, this also works because `globalThis.crypto` is defined. No changes needed to `crypto.js`.

**If you hit a `crypto is not defined` error** in tests, the Node version is below 18. Fix: upgrade Node, do not add a polyfill.

### Test File Structure

```
tests/
  ciphers.test.js    ← applyCipher encode/decode round-trips for all 7 ciphers
  crypto.test.js     ← encrypt then decrypt returns original string; wrong key returns null
  settings.test.js   ← getSettings, putSettings with mocked localStorage
```

### Example Test Skeleton

```javascript
// tests/ciphers.test.js
import { applyCipher } from '../ciphers.js'

describe('Caesar cipher', () => {
  test('round-trips basic text', () => {
    const encoded = applyCipher('HELLO', 'caesar', '3', true)
    const decoded = applyCipher(encoded, 'caesar', '3', false)
    expect(decoded).toBe('HELLO')
  })

  test('shift 0 is identity', () => {
    expect(applyCipher('HELLO', 'caesar', '0', true)).toBe('HELLO')
  })
})
```

```javascript
// tests/crypto.test.js
import { encrypt, decrypt } from '../crypto.js'

test('encrypt then decrypt returns original', async () => {
  const { payload, iv, salt } = await encrypt('hello world', 'mypassphrase')
  const result = await decrypt(payload, iv, salt, 'mypassphrase')
  expect(result).toBe('hello world')
})

test('wrong key returns null', async () => {
  const { payload, iv, salt } = await encrypt('hello world', 'mypassphrase')
  const result = await decrypt(payload, iv, salt, 'wrongpassphrase')
  expect(result).toBeNull()
})
```

### What NOT to do

- Do not add `@babel/preset-env` or `babel-jest`. You do not need Babel. Adding it creates CommonJS/ESM conflicts that are harder to debug than the problem they solve.
- Do not use `jest.mock()` on `crypto`. It is not a module — it is a global. Mock globals with `global.crypto = ...` in a setup file if needed (you probably won't need it).
- Do not set `testEnvironment: 'jsdom'` for logic tests. It adds a DOM environment you don't need and slows down test startup.

---

## 3. Transport Abstraction Pattern

### The Goal

`sendMessage`, `loadMessages`, `subscribeToMessages`, `acceptInvite` etc. must call a transport interface, not Supabase directly. When mesh support is added, a `MeshTransport` drops in without touching app logic.

### The Pattern: Interface Object + Registered Implementation

No classes, no `extends`. A plain JS object with a documented contract. One module holds the active transport. Screens import from that module, not from Supabase directly.

```javascript
// transport/interface.js
// This file documents the contract. It is not imported at runtime.
// Any transport implementation must export these functions.

/**
 * @typedef {Object} Transport
 * @property {(convId: string) => Promise<Message[]>} loadMessages
 * @property {(msg: OutgoingMessage) => Promise<void>} sendMessage
 * @property {(convId: string, callback: Function) => Subscription} subscribeToMessages
 * @property {(userId: string) => Promise<Conversation[]>} loadConversations
 * @property {(callback: Function) => Subscription} subscribeToInviteAccepted
 * @property {(creatorId: string) => Promise<Invite>} createInvite
 * @property {(code: string) => Promise<AcceptResult>} acceptInvite
 */
```

```javascript
// transport/index.js
// The active transport. Swap this import to switch backends.
import { SupabaseTransport } from './supabase.js'

export const transport = SupabaseTransport
```

```javascript
// transport/supabase.js
import { sb } from '../supabase.js'

export const SupabaseTransport = {
  async loadMessages(convId) {
    const { data } = await sb.from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    return data || []
  },

  async sendMessage({ convId, senderId, payload, iv, salt }) {
    const { error } = await sb.from('messages')
      .insert({ conversation_id: convId, sender_id: senderId, payload, iv, salt })
    if (error) throw new Error(error.message)
  },

  subscribeToMessages(convId, callback) {
    return sb.channel(`chat-${convId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${convId}`
      }, payload => callback(payload.new))
      .subscribe()
  },

  async loadConversations(userId) { /* ... */ },
  subscribeToInboxChanges(callback) { /* ... */ },
  async createInvite(creatorId) { /* ... */ },
  async acceptInvite(code, acceptorId) { /* ... */ },
}
```

Screens import only from `transport/index.js`:

```javascript
// screens/chat.js
import { transport } from '../transport/index.js'

const msgs = await transport.loadMessages(convId)
const sub = transport.subscribeToMessages(convId, (newMsg) => { ... })
```

### Future Mesh Swap

```javascript
// transport/index.js — when mesh milestone arrives
import { MeshTransport } from './mesh.js'
export const transport = MeshTransport
```

One line change. App logic untouched.

### What NOT to do

- Do not create a base class with `extends`. Vanilla JS, no build step — plain objects are simpler, faster to understand, and sufficient for two implementations.
- Do not inject the transport as a constructor argument into screen modules. That complexity only pays off in framework-heavy code with DI containers. A module-level singleton is fine here.
- Do not try to make the transport interface enforce its contract at runtime (no Proxy traps, no duck-type validators). Document the contract in JSDoc and trust the implementation. The test suite catches mistakes.

---

## 4. Supabase Realtime for Invite Acceptance Detection

### The Root Cause of the v0 Bug

The inbox subscribed to `messages` INSERT only. When someone accepted an invite, it wrote to `conversation_members` and `invites` — neither of which was watched. The invite creator's inbox never knew a conversation was created.

### The Fix: Subscribe to `conversation_members` INSERT

When the inbox loads, subscribe to inserts on `conversation_members` filtered to the current user's ID. When the acceptor writes the creator's member row, this fires on the creator's client.

```javascript
subscribeToInboxChanges(userId, callback) {
  return sb.channel(`inbox-${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'conversation_members',
      filter: `user_id=eq.${userId}`
    }, async () => {
      callback()  // caller reloads conversations
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages'
    }, async () => {
      callback()  // new message also refreshes inbox preview
    })
    .subscribe()
}
```

**Why this works:** `showAcceptInvite` inserts `{ conversation_id: convId, user_id: invite.creator_id }` as one of its steps. That INSERT on `conversation_members` where `user_id = creator_id` fires the creator's subscription immediately.

**RLS note:** Supabase Realtime respects RLS. The `conversation_members` table must have a policy that allows users to receive realtime events for their own rows. The existing schema should already handle this since users can select their own member rows, but verify the `SELECT` policy covers realtime delivery.

### Channel Management Pattern for Multi-Screen SPAs

The v0 approach of module-level `let _inboxSub = null` with manual `if (_inboxSub) _inboxSub.unsubscribe()` before re-subscribing is correct. Keep this pattern but make it systematic.

Each screen owns its subscriptions. When a screen mounts, it subscribes. When it unmounts (i.e., another screen takes over `app.innerHTML`), the previous screen's subscription must be cleaned up.

```javascript
// screens/inbox.js
let _sub = null

export async function mount() {
  if (_sub) { await sb.removeChannel(_sub); _sub = null }

  await renderInbox()

  _sub = transport.subscribeToInboxChanges(state.user.id, async () => {
    await loadConversations()
    renderInbox()
  })
}

export function unmount() {
  if (_sub) { sb.removeChannel(_sub); _sub = null }
}
```

The router calls `unmount()` on the current screen before mounting the next one.

**`sb.removeChannel(channel)` vs `channel.unsubscribe()`:** Use `sb.removeChannel()`. This fully cleans up the channel from the Supabase client's internal channel list. `channel.unsubscribe()` stops the subscription but leaves the channel registered, which causes duplicate channels if the same channel name is reused (e.g., navigating inbox → chat → inbox creates two `inbox-{userId}` channels without `removeChannel`).

### Channel Naming

Use deterministic names that include scope:

| Channel | Name pattern | Scope |
|---------|-------------|-------|
| Inbox changes | `inbox-{userId}` | Per user, global to session |
| Chat messages | `chat-{convId}` | Per conversation |

Never use generic names like `'inbox'` (the v0 bug) — if two tabs are open, they create the same channel name and Supabase may coalesce or drop events.

### Realtime Must Be Enabled Per Table

In the Supabase dashboard: Database → Replication → choose which tables publish changes. `messages` is already enabled in v0. For the inbox fix, **also enable `conversation_members`**. Without this, the filter subscription silently receives nothing.

### What NOT to do

- Do not subscribe to `invites` UPDATE to detect acceptance. The `accepted_by` column update fires, but the creator's RLS may block them from reading that row's new state since the invite is now "used." The `conversation_members` INSERT is cleaner and already scoped to the user.
- Do not use Supabase Presence for this. Presence is for ephemeral online state (typing indicators, who's viewing). Persistent conversation creation belongs in Postgres Changes.
- Do not create one giant channel with all events. Separate channels by screen. It makes cleanup deterministic and avoids a screen receiving events it's no longer displaying.

---

## Installation

No package.json exists yet. Create it at project root before the first Jest run:

```bash
npm init -y
# Sets "type": "module" manually — npm init doesn't set it
npm install --save-dev jest@^30
```

Then manually edit `package.json` to add `"type": "module"` and the test script with `--experimental-vm-modules`.

**The project files (`index.html`, `app.js`, etc.) are not npm packages and don't change.** `package.json` is only for dev tooling (Jest). GitHub Pages deploys from the root — the presence of `package.json` and `node_modules/` does not affect the deployed app. Add `node_modules/` to `.gitignore`.

---

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| Jest ESM config | HIGH | Verified against Jest 30.0 official docs |
| `crypto.subtle` in Node 18+ | HIGH | Node.js official docs, no mock needed |
| Transport abstraction pattern | HIGH | Direct derivation from existing code structure |
| `sb.removeChannel` vs `unsubscribe` | MEDIUM | Supabase JS client source + community docs (WebFetch blocked for official confirmation) |
| `conversation_members` realtime trigger | MEDIUM | Logical derivation from v0 bug + Supabase realtime architecture; verify replication is enabled in dashboard |
| RLS + realtime interaction | MEDIUM | Known behavior; must be verified in dashboard that `conversation_members` SELECT policy covers realtime delivery |

---

## Sources

- Jest 30.0 ECMAScript Modules documentation: https://jestjs.io/docs/ecmascript-modules
- Jest 30.0 Configuration reference: https://jestjs.io/docs/configuration
- Node.js Web Crypto API (available since Node 15, stable in 18): https://nodejs.org/api/webcrypto.html
- Existing v0 codebase: `C:\Cipher Program\app.js` (lines 153-176 for inbox realtime, 298-309 for chat realtime)
