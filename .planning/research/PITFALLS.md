# Domain Pitfalls

**Domain:** Vanilla JS encrypted messaging PWA (Supabase + Web Crypto + GitHub Pages)
**Researched:** 2026-04-27
**Source note:** All pitfalls below are grounded in direct code analysis of the v0 source (`app.js`, `crypto.js`, `sw.js`, `schema.sql`). Web research tools were unavailable; confidence levels reflect training knowledge + code evidence only.

---

## Critical Pitfalls

### Pitfall 1: Realtime subscription scope mismatch (v0 confirmed bug)

**What goes wrong:** The inbox subscribes only to `messages` INSERT events. When person B accepts an invite, `conversation_members` gets a new row and `conversations` gets a new row — but the inbox listener never fires. Person A (the invite creator) sits in a stale inbox until they manually refresh.

**Root cause (visible in app.js lines 173-177):**
```js
_inboxSub = sb.channel('inbox')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, ...)
  .subscribe()
```
The subscription is scoped to `messages` only. The invite acceptance writes to `conversations` and `conversation_members` — neither table is watched.

**Prevention:** In the rebuild, the inbox realtime subscription must watch `conversation_members` INSERT events filtered to `user_id=eq.<currentUserId>`. This is the correct signal: "a conversation I'm now part of was created." The filter requires the column to exist on the changed row — `conversation_members.user_id` is a direct column, so Supabase Realtime can filter it without a join.

**RLS caveat (MEDIUM confidence):** Supabase Realtime postgres_changes delivers events only if the user's RLS policy would allow them to SELECT that row. The current `members_select` policy uses a self-referential subquery (`exists (select 1 from conversation_members cm where cm.user_id = auth.uid())`). A newly-inserted row for the current user should satisfy this — but if the RLS evaluation happens before the row is committed, the event may be silently dropped. Verify in testing that the creator receives the INSERT event on their own `conversation_members` row when person B accepts.

**Warning signs:** Creator's inbox doesn't update after invite accepted. Only appears when app is reopened or refreshed.

**Phase:** Transport layer + Inbox implementation (Phase 2 or wherever realtime subscriptions are rebuilt).

---

### Pitfall 2: Profile insert on stale/reused session (v0 confirmed bug)

**What goes wrong:** If a user has an existing auth session in the browser (cookie or localStorage from a previous run), `state.user` is populated from `getSession()` on boot. The app then checks for a profile. If the profile insert was previously partial or the test database was wiped but the session wasn't, `_doSetup` calls `insert()` and gets a 409 conflict because the profile row already exists.

**Root cause (visible in app.js lines 135, 147):**
```js
// Setup — blind insert
await sb.from('profiles').insert({ id: state.user.id, username, display_name: username })

// Load profile — correct: maybeSingle handles missing gracefully
const { data } = await sb.from('profiles').select('*').eq('id', state.user.id).maybeSingle()
```

The insert has no conflict handling. If the profile exists, it hard-errors.

**Prevention:** Replace with upsert using `onConflict: 'id'`. This is safe here because `id` is the primary key (FK to `auth.users`), so a conflict means "this user already has a profile" — which is exactly the case we want to handle gracefully:
```js
await sb.from('profiles')
  .upsert({ id: state.user.id, username, display_name: username }, { onConflict: 'id' })
```
However, upsert will silently overwrite display_name and username on re-entry. A better pattern: attempt insert, and if error code is `23505` (unique violation on `id`), redirect to inbox instead of surfacing an error. The current v0 actually handles the username uniqueness case (23505 on `username` column) with a user-facing error — the missing case is the `id` conflict which means "already set up."

**Distinguish the two conflict types:** `23505` on `username` = taken handle (user error, show message). `23505` on `id` = already set up (session state mismatch, redirect to inbox).

**Warning signs:** "Error" on setup screen when re-entering with an existing account. Only happens on reused sessions after database wipes or mid-flow navigation.

**Phase:** Auth / Profile setup (Phase 1).

---

### Pitfall 3: Service worker scope and cache path mismatch on GitHub Pages (v0 confirmed bug)

**What goes wrong:** GitHub Pages serves the app at `/cipher/` (subdirectory), not `/`. The service worker is registered with `navigator.serviceWorker.register('/sw.js')` (line 535 of app.js) — an absolute path from the origin root. On GitHub Pages, `/sw.js` does not exist; the file lives at `/cipher/sw.js`. Registration fails silently (`.catch(() => {})` swallows the error).

Even if registration succeeds via an updated path, the scope of a service worker registered at `/cipher/sw.js` defaults to `/cipher/`. A service worker at `/sw.js` would claim scope `/` — too broad — and would fail to match cached assets prefixed with `/cipher/`.

**Root cause (visible in app.js line 535 and sw.js line 1):**
```js
// app.js — wrong absolute path
navigator.serviceWorker.register('/sw.js')

// sw.js — assets correctly prefixed, but only reachable if registration succeeds
const ASSETS = ['/cipher/', '/cipher/index.html', ...]
```

**Prevention:** Register using a relative path or an explicit scope:
```js
navigator.serviceWorker.register('./sw.js', { scope: './' })
```
Using `./sw.js` resolves relative to the page URL (`/cipher/sw.js` when served from GitHub Pages). The `scope: './'` explicitly constrains the worker to `/cipher/` and avoids claiming the root.

**Cache version management:** `sw.js` uses `const CACHE = 'cipher-v1'`. When files change after a deploy, the old cache is never busted unless the cache name is updated. The current `activate` handler does purge old caches (any key !== `CACHE`), but only if the cache name changes. The rebuild must increment the cache version (e.g., `cipher-v2`) whenever the asset list changes — otherwise users get stale JS served from cache after a deploy.

**skipWaiting trap:** `self.skipWaiting()` in the install handler forces immediate activation. Combined with `clients.claim()`, this means the new service worker activates and starts serving new cached assets while old app code is still running in open tabs. This can cause a version mismatch mid-session. Safer pattern: only activate on next tab open, or force a full reload on activation.

**Warning signs:** App fails to install as PWA. Network tab shows `/sw.js` 404. Cached files never update after deploy.

**Phase:** PWA / Service Worker setup (Phase 1 or infrastructure phase).

---

## Moderate Pitfalls

### Pitfall 4: AES-GCM fallback passphrase leaks semantic meaning

**What goes wrong:** In `app.js`, both `_send` and `_decode` fall back to the string `'cipher'` when the key field is empty:
```js
// _send (line 413)
const { payload, iv, salt } = await encrypt(encoded, key || 'cipher')

// _decode (line 374)
const cipherText = await decrypt(msg.payload, msg.iv, msg.salt, key || 'cipher')
```

This means a message sent with a blank key is encrypted with the password `'cipher'`. Any attacker who knows the app exists can try `'cipher'` as the key. The intent is probably "allow keyless ciphers like Morse or Atbash to work without requiring a key entry," but the fallback silently produces weak encryption.

**Prevention:** Remove the `|| 'cipher'` fallback. Instead, enforce that a key is always provided before sending. For ciphers that don't use a key (`CIPHER_USES_KEY[c] === false`), the compose bar already hides the key field — but a key should still be required for AES. The UX fix: if `CIPHER_USES_KEY` is false, auto-generate and store a random key locally, invisible to the user. The AES layer always uses a real key; the cipher layer just doesn't use it for its own transformation.

**Warning signs:** Messages sent with empty key field are weaker than expected. Difficult to detect from outside.

**Confidence:** HIGH — visible directly in the v0 code.

**Phase:** Crypto / send flow (Phase 2 or wherever `_send` is rebuilt).

---

### Pitfall 5: IV and salt entropy are correct — but the base64 serialization has a large-input risk

**What goes wrong:** `crypto.js` generates IV and salt correctly: `crypto.getRandomValues(new Uint8Array(12))` for IV, `new Uint8Array(16)` for salt. Both are random per message. This is correct.

The risk is in `toB64`:
```js
function toB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}
```

The spread operator `...new Uint8Array(buf)` passes every byte as a separate argument to `String.fromCharCode`. For small values (IV, salt, short messages) this is fine. For large plaintext messages, the ciphertext buffer is large — and spreading thousands of bytes as function arguments can hit the JavaScript engine's argument stack limit (typically 65,535 arguments in V8). The result is a `RangeError: Maximum call stack size exceeded` when encrypting large messages.

**Prevention:** Replace the spread-based `toB64` with a loop or `Buffer`-based approach:
```js
function toB64(buf) {
  let binary = ''
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}
```
This is the standard pattern for reliable `ArrayBuffer` → base64 in browser JS.

**Warning signs:** Encrypt silently fails or throws on long messages. Short messages work fine. Hard to catch in testing if tests only use short strings.

**Confidence:** HIGH — this is a known V8 limitation with spread on large TypedArrays. The cipher + AES output for typical chat messages is small enough that it may not trigger in practice, but it is a real latent bug.

**Phase:** Crypto module (Phase 1 — crypto.js is carried forward from v0, this is a fix to make before tests are written).

---

### Pitfall 6: ES modules + Jest — `--experimental-vm-modules` and browser globals

**What goes wrong:** `crypto.js` uses `crypto.subtle` (browser Web Crypto API global). `ciphers.js` and `crypto.js` are native ES modules with `export` statements. Jest's default environment (`jsdom`) does not include `crypto.subtle` — `jsdom` provides a partial `window.crypto` but omits `subtle`. Running tests without explicit setup will throw `TypeError: crypto.subtle is undefined` or `Cannot read properties of undefined (reading 'importKey')`.

The second problem: running native ES modules in Node.js Jest requires `--experimental-vm-modules` (Node < 22) or `NODE_OPTIONS=--experimental-vm-modules jest`. Without this flag, Jest will fail to parse the `import`/`export` syntax and throw a SyntaxError on the first `import` statement.

**Prevention:**

1. `package.json` must have `"type": "module"` and the jest config must set `transform: {}` to disable Babel transforms (which would try to CommonJS-ify the modules and break them differently).

2. Run Jest as:
```bash
NODE_OPTIONS=--experimental-vm-modules npx jest
```
Or in `package.json` scripts:
```json
"test": "NODE_OPTIONS=--experimental-vm-modules jest"
```

3. For `crypto.subtle` in tests: Node 18+ has `globalThis.crypto` with a full `subtle` implementation — use `testEnvironment: 'node'` rather than `jsdom` for the crypto and cipher tests. The cipher tests don't need DOM at all; the crypto tests need `crypto.subtle` which Node provides natively. `jsdom` is only needed for DOM-touching tests (none are planned for v1).

4. Jest config:
```json
{
  "testEnvironment": "node",
  "transform": {}
}
```

**Atbash decode trap:** `ciphers.js` exports `applyCipher(text, cipher, key, encode)`. Atbash is its own inverse — calling with `encode: false` and `encode: true` both call the same `atbash(text)` function, which is correct. But test coverage should verify this round-trip explicitly since it's easy to assume it needs an `encode` branch that doesn't exist.

**Warning signs:** `SyntaxError: Cannot use import statement in a module` from Jest. `TypeError: crypto.subtle is undefined` in tests. Tests pass locally but fail in CI if Node version differs.

**Confidence:** HIGH — this is the documented and widely-encountered pattern for Jest + native ESM.

**Phase:** Test infrastructure setup (whichever phase adds Jest).

---

### Pitfall 7: Supabase RLS self-referential policy on `conversation_members`

**What goes wrong:** The `members_select` policy in `schema.sql` is:
```sql
create policy "members_select" on conversation_members for select
  using (exists (
    select 1 from conversation_members cm
    where cm.conversation_id = conversation_members.conversation_id
    and cm.user_id = auth.uid()
  ));
```

This is a self-referential policy: to read a row in `conversation_members`, PostgreSQL checks whether another row in `conversation_members` satisfies the condition. This can produce infinite recursion in some Postgres versions and Supabase configurations, though Supabase typically detects and short-circuits this. The v0 commit history references "Fix RLS self-reference" (commit `d7f662f`) and "Fix invite flow RLS" (commit `32f086d`), suggesting this already caused real problems.

The deeper issue: during `showAcceptInvite`, the invite acceptor inserts the creator's membership row first, then their own. Between those two inserts, neither user is a member of the conversation — so any SELECT on `conversation_members` during that window will return empty (policy evaluates false). If the RLS check for the second insert (`members_insert` uses `with check (true)`) relies on being able to read the first insert, there can be ordering sensitivity.

**Current mitigation in v0:** The schema uses `with check (true)` for `members_insert`, which bypasses the read-based RLS check for inserts. This is correct — inserts don't need to verify membership because the act of inserting IS creating membership.

**Remaining risk:** The `conversations_select` policy also does a cross-table join to `conversation_members`. A user who has just accepted an invite and been added to `conversation_members` may be able to read the conversation immediately. But a user querying conversations in a realtime callback may get an empty result if the realtime event fires before the second `conversation_members` row is committed (race condition between the acceptor's sequential inserts).

**Prevention:**
- Keep `members_insert` as `with check (true)` — do not add a membership check to the insert policy.
- Consider wrapping the entire invite acceptance (create conversation + add both members + mark invite used) in a Postgres function (`security definer`) that executes atomically. This eliminates the window where the conversation exists but neither member row exists yet, and removes the sequential insert race.
- If staying with client-side sequential inserts, ensure the realtime subscription on `conversation_members` is established before the invite URL is opened (i.e., subscribe on inbox mount, not on invite acceptance).

**Warning signs:** "Error adding creator" or "Error adding you" errors during invite acceptance. Creator sees conversation in inbox briefly then it disappears. Realtime event fires but subsequent data fetch returns empty.

**Confidence:** MEDIUM — based on code evidence + general Postgres RLS behavior. The v0 commit history confirms this was a real issue.

**Phase:** Schema + RLS design (Phase 1), invite flow (Phase 2).

---

### Pitfall 8: Card-flip animation inside a scrolling list — iOS Safari

**What goes wrong:** CSS `transform: rotateY(180deg)` card flips require `transform-style: preserve-3d` on the card container. On iOS Safari, `overflow: hidden` on any ancestor element cancels `preserve-3d` — the 3D context collapses and the flip renders as a 2D fade or instant switch instead of a rotation. The scrolling messages list (`overflow-y: auto` or `overflow-y: scroll`) is exactly this ancestor.

The second problem: iOS Safari has historically had a bug where `-webkit-overflow-scrolling: touch` (momentum scrolling) breaks `preserve-3d` on descendant elements. While this CSS property is deprecated in modern iOS, older devices still encounter it.

**Third problem:** Touch events on a flippable card inside a scroll list create event ambiguity. A vertical swipe to scroll and a tap to flip both start with `touchstart`. If the flip animation starts on `touchstart`, iOS may interpret a slow tap as a scroll attempt and cancel it. Use `click` events, not `touchstart`, for the flip trigger — `click` fires after the browser has resolved the touch intent.

**Prevention:**
- Do not put the 3D flip on a child inside a scrolling container. Instead, flip the entire bubble by toggling a CSS class and using a `clip-path` or 2D transform approach, or use the flip as a "zoom in" modal that escapes the scroll container entirely.
- If using true `preserve-3d`, the flipping element must not have `overflow: hidden` ancestors. This means the scroll container cannot clip the card during animation. One option: use `position: fixed` for the flipped-open state — remove from flow, show as overlay, animate. This avoids the ancestor overflow problem entirely and matches the "decode panel" metaphor better anyway.
- Test specifically on iOS 16+ physical device or Xcode simulator, not just Chrome DevTools mobile emulation — DevTools does not replicate iOS Safari's compositing behavior.

**Warning signs:** Flip works in Chrome/desktop but shows as instant switch on iPhone. Card clips during rotation at the exact moment it's halfway through. Scrolling accidentally triggers flips.

**Confidence:** MEDIUM — well-documented iOS Safari compositing limitation, but exact behavior depends on final CSS structure which isn't written yet.

**Phase:** Message bubble / card-flip UX (Phase 2 or whichever phase implements the chat screen).

---

## Minor Pitfalls

### Pitfall 9: PWA on iOS Safari — installed home screen limitations

**What goes wrong:**

**No push notifications.** As of iOS 16.4, installed PWAs on iOS do support Web Push — but only if the user adds to home screen and explicitly grants notification permission. Safari on iOS (not installed) still does not support Web Push. This distinction matters: if the app is opened in Mobile Safari browser tab, notifications will never work regardless of service worker setup.

**Service worker lifecycle on iOS.** iOS Safari aggressively kills service workers when the app is backgrounded. This means the service worker may not be running when a push notification arrives (if Web Push is added later). The service worker must be prepared to re-initialize state on `activate` rather than assuming it's been continuously running.

**Clipboard API.** `navigator.clipboard.writeText()` (used in `_copyLink`, app.js line 459) requires the page to be focused and requires user gesture context on iOS Safari. If the button click handler is `async` and awaits anything before calling `clipboard.writeText()`, iOS may reject it as "not user gesture." The current implementation calls it directly in response to the click, which should be fine — but any refactor that wraps it in an async chain before the clipboard call risks breaking it.

**Standalone display mode detection.** `window.navigator.standalone` is true on iOS when running as an installed PWA, false in Safari browser tab. This flag can be used to show an "Add to Home Screen" prompt — but `BeforeInstallPrompt` event (the standard PWA install prompt API) is NOT supported on iOS Safari at all. iOS users must be instructed manually with a banner explaining "tap Share then Add to Home Screen." Plan for this in UX.

**manifest.json icons.** The CLAUDE.md notes that `icon-192.png` and `icon-512.png` are missing. On iOS, the relevant icon is `apple-touch-icon` specified via `<link rel="apple-touch-icon">` in the HTML — the manifest `icons` array is not used by iOS for the home screen icon. Both need to be provided.

**Warning signs:** "Add to home screen" installs with a generic icon. Notifications never appear even after permission granted (user opened in browser not installed PWA). Copy Link button silently fails on some iOS versions.

**Confidence:** MEDIUM — iOS PWA behavior is well-documented but Apple updates it frequently. Node that iOS 17+ improved some of these behaviors.

**Phase:** PWA / manifest setup (Phase 1 for icons and registration path), notifications (out of scope for v1 per PROJECT.md).

---

### Pitfall 10: Realtime subscription leak on navigation

**What goes wrong:** `showChat` and `showInbox` each unsubscribe from the previous channel before creating a new one:
```js
if (_inboxSub) _inboxSub.unsubscribe()
if (_chatSub)  _chatSub.unsubscribe()
```
This works correctly when navigating inbox → chat → inbox. But if the user navigates directly from one chat to another chat (which can't happen in the current UI but could be triggered via URL hash), `_inboxSub` is not unsubscribed because `showChat` only manages `_chatSub`. Similarly, if `route()` is called multiple times in rapid succession (e.g., hash changes fired during invite acceptance), multiple subscriptions may be created for the same channel before the old one is torn down.

**Prevention:** In the rebuild with a module-based architecture, subscriptions should be owned by the component/module that creates them and torn down in a cleanup function called by the router before mounting the next view. A simple `currentSub` registry or a `cleanup()` pattern on each view function prevents accumulation.

**Warning signs:** Duplicate message renders in the chat. Inbox fires multiple re-renders for one event. Supabase dashboard shows many open realtime connections from a single client.

**Confidence:** HIGH — visible in v0 code structure. Minor in practice because current nav flow doesn't allow the problematic path.

**Phase:** Router / navigation architecture (Phase 1).

---

### Pitfall 11: `_esc()` HTML escaping is correct but incomplete for XSS in decoded messages

**What goes wrong:** Decoded message text is rendered via:
```js
`<div class="bubble-text">${_esc(m._decoded)}</div>`
```
And `_esc` is:
```js
function _esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')
}
```

This escapes the four critical characters (`&`, `<`, `>`, newlines) and is correct for preventing tag injection. However, it does not escape single quotes (`'`) or double quotes (`"`). This is fine for a `<div>` text context — but if decoded text is ever interpolated into an HTML attribute (e.g., `title="${_esc(text)}"` or `onclick="doThing('${_esc(text)}')`), unescaped quotes break out of the attribute.

The current v0 only uses `_esc` in text content nodes, not attributes. But the invite URL is interpolated directly into an `onclick` attribute in `showNewChat` (line 454):
```js
<button class="btn" onclick="_copyLink('${url}')">Copy Link</button>
```
If `url` ever contains a single quote (it shouldn't, being a UUID-based URL, but it's worth noting), this would break the handler.

**Prevention:** In the rebuild, avoid inline `onclick` attributes with dynamic string interpolation entirely. Use `data-*` attributes and `addEventListener` in the module code. This is both safer and better architecture.

**Confidence:** HIGH — visible in code. Low severity in practice given the specific content types involved.

**Phase:** General code architecture (Phase 1 — eliminate inline event handlers as part of the module restructure).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Auth + Profile setup | Profile insert conflict on stale session | Upsert with `onConflict: 'id'`, distinguish id vs username conflicts |
| Service worker registration | Wrong path on GitHub Pages, stale cache after deploy | Use `./sw.js` relative path, bump cache version on every deploy |
| Crypto module (carried from v0) | `toB64` spread crash on large buffers, empty-key fallback | Fix `toB64` before writing tests, remove `|| 'cipher'` fallback |
| Realtime subscriptions | Inbox misses invite-accepted events, subscription leaks on navigation | Subscribe to `conversation_members`, use cleanup pattern in router |
| RLS / invite acceptance | Self-referential policy risk, sequential insert race | Keep `members_insert` as `check (true)`, consider server-side function for atomicity |
| Jest + ES modules | `--experimental-vm-modules` missing, `crypto.subtle` undefined | `testEnvironment: node`, `transform: {}`, script in package.json |
| Card-flip UX | `preserve-3d` broken by `overflow: hidden` ancestor on iOS Safari | Escape the scroll container for flip state (overlay/fixed), test on real iOS |
| PWA install | Wrong SW registration path, missing `apple-touch-icon`, iOS clipboard | Relative SW path, add `<link rel="apple-touch-icon">`, keep clipboard call synchronous |

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| v0 confirmed bugs (1, 2, 3) | HIGH | Direct code evidence + commit history |
| Crypto pitfalls (4, 5) | HIGH | Direct code inspection + known JS engine behavior |
| Jest/ESM pitfalls (6) | HIGH | Well-documented, testable claim |
| RLS pitfalls (7) | MEDIUM | Code evidence + commit history confirms real issue; Supabase RLS internals not verified against current version |
| Card-flip / iOS (8) | MEDIUM | Known iOS Safari compositing behavior; specific CSS structure not yet written |
| PWA iOS limitations (9) | MEDIUM | iOS PWA capabilities change frequently; training data current to ~Aug 2025 |
| Subscription leaks (10) | HIGH | Direct code inspection |
| XSS / escaping (11) | HIGH | Direct code inspection |
