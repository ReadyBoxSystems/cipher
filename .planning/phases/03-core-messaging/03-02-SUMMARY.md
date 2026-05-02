---
phase: 03-core-messaging
plan: "02"
subsystem: messaging
tags: [chat, realtime, optimistic-send, compose, cipher, aes, supabase]

dependency_graph:
  requires:
    - transport/index.js (getMessages, sendMessage, subscribeMessages, getConversationContact)
    - state/store.js (get/set for user, profile, messages)
    - lib/router.js (register, navigate)
    - lib/utils.js (_ago, _esc)
    - lib/settings.js (getSettings, putSettings — localStorage cipher/key prefs)
    - crypto.js (encrypt — AES-256-GCM via Web Crypto)
    - ciphers.js (CIPHERS, CIPHER_LABELS, applyCipher)
    - screens/chat.js stub from Plan 01 (replaced entirely)
  provides:
    - screens/chat.js (full 'chat' route — message list, send, realtime, compose bar)
  affects:
    - Plan 03 (layers decode UX on top of this — card flip, auto-decode toggle, MORE expand)

tech-stack:
  added: []
  patterns:
    - Optimistic insert with stable tempId; promote to real row on success; rollback on failure
    - seenIds Set deduplication for realtime echo suppression (D-07)
    - decoded{} map carries own-message plaintext through optimistic → real row promotion
    - Two-row compose bar: .compose-meta (cipher select + key) / .compose-row (textarea + send)
    - Enter key (no shift) fires send; Shift+Enter allowed for newlines
    - Per-conversation cipher prefs persisted via lib/settings — never touches transport

key-files:
  created: []
  modified:
    - screens/chat.js

key-decisions:
  - "Own messages render their captured plaintext (decoded map) — never need to re-decrypt a message the user just typed"
  - "Others' messages render truncated base64 payload as placeholder — Plan 03 replaces with real cipher text after AES decrypt"
  - "seenIds Set initialized from initial fetch results so realtime echo of own send is swallowed cleanly (D-07)"
  - "putSettings called on cipher-select change and key-input so prefs stay current even if user changes without sending"
  - "Contact fetch failure navigates back to inbox — chat screen is meaningless without a contact"

patterns-established:
  - "Optimistic-send pattern: push temp row to messages[] + seenIds, clear input, renderMessages(), await transport, then promote or rollback"
  - "Cleanup return: unsubMessages() + removeEventListener for every named handler (consistent with inbox/settings pattern)"

requirements-completed: [CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-12, SEC-05]

duration: 3min
completed: "2026-05-02"
---

# Phase 3 Plan 02: Chat Screen Summary

**Full chat screen replaces stub: optimistic AES-encrypted send, realtime receive deduped by Set, two-row compose bar with persisted cipher/key prefs**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-02T23:18:35Z
- **Completed:** 2026-05-02T23:21:33Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Replaced the 11-line Plan 01 stub with a 223-line full implementation of the chat screen
- Send flow: text → `applyCipher(encode=true)` → `encrypt()` → optimistic bubble → `transport.sendMessage` → promote or rollback
- Realtime flow: `subscribeMessages` fires per INSERT; `seenIds.has()` deduplicate own-message echo (D-07)
- Compose bar: two-row layout (cipher select + key field / textarea + send button) wired with Enter-to-send shortcut
- Per-conversation cipher + key persisted to localStorage via `putSettings` on change and on send (SEC-05)

## Task Commits

1. **Task 1: Replace screens/chat.js with full chat screen implementation** — `cbee673` (feat)

## Files Created/Modified

- `screens/chat.js` — Full implementation (223 lines): auth guard, contact fetch, message list render, optimistic send + rollback, realtime subscribe + dedupe, compose bar wiring, cleanup

## Optimistic-Send + Dedupe Sequence

1. User taps send (or presses Enter):
   - Client-side: empty text → silent no-op; empty key → `KEY REQUIRED` inline error
   - `putSettings(convId, { cipher, key })` — persist prefs before any async work
   - `applyCipher(text, cipher, key, true)` → cipher-encoded text
   - `encrypt(cipherText, key)` → `{ payload, iv, salt }` (AES-256-GCM)
2. Optimistic insert: `tempId = 'opt-' + Date.now() + '-' + random` appended to `messages[]`, added to `seenIds`, plaintext stored in `decoded[tempId]`; `textEl.value = ''`; `renderMessages()`
3. `transport.sendMessage(convId, user.id, payload, iv, salt)`:
   - **Success:** find `tempId` in `messages[]`, replace with real `row`, transfer `decoded[tempId]` to `decoded[row.id]`, re-render
   - **Failure:** remove `tempId` from `messages[]` and `seenIds`, delete `decoded[tempId]`, re-render; show `SEND FAILED — TRY AGAIN`
4. Realtime echo arrives: `seenIds.has(row.id)` → true → skipped (already rendered from step 3 promotion)

## Compose Bar Wiring

- `.compose-meta` row: `<select id="compose-cipher">` pre-populated from `CIPHERS`/`CIPHER_LABELS`, `value` pre-set from `getSettings(convId).cipher`; on `change` → `putSettings(convId, { cipher })`
- `.compose-meta` row: `<input id="compose-key">` pre-populated from `getSettings(convId).key`; on `input` → `putSettings(convId, { key })`
- `.compose-row`: `<textarea id="compose-text" class="compose-input">`; `keydown` listener fires `onSend()` on Enter (no Shift)
- `.compose-row`: `<button id="compose-send" class="send-btn" aria-label="Send message">→</button>`
- `.error-msg` div below compose-row shows inline errors (KEY REQUIRED, SEND FAILED — TRY AGAIN); cleared at start of each `onSend()` call

## What Plan 03 Still Needs to Layer On

- **Card-flip decode UX:** bubble face shows cipher-encoded text; tapping flips to reveal key-entry; Plan 03 replaces the base64 payload placeholder with the real `applyCipher(decrypted, cipher, key, false)` result
- **MORE expand link:** long cipher-text truncated with a "MORE ›" link that expands inline
- **Keep-decoded toggle:** checkbox in the flip side; stores `keep: true` in `putSettings`; auto-decodes on realtime receive
- **iOS Safari CSS check:** card-flip CSS correctness on Safari before committing; overlay fallback if needed
- **Lock-pulse animation:** ambient pulse on locked bubbles (theirs only)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `decoded[msg.id]` surface for others' messages: currently shows `msg.payload.slice(0, 200)` (raw base64). This is an intentional documented placeholder. Plan 03 replaces this with the AES-decrypted + cipher-decoded text once the decode UX is built.

## Issues Encountered

- The plan's automated verification command (`node --input-type=module -e "import('./screens/chat.js')"`) fails in Node with `ERR_UNSUPPORTED_ESM_URL_SCHEME` because `supabase.js` imports the Supabase client from a CDN `https://` URL — this is browser-only code and is not a bug in `screens/chat.js`. All 17 acceptance-criteria grep checks passed manually. This same constraint has been present throughout all phases.

## Self-Check: PASSED

- [x] `screens/chat.js` exists (223 lines, >= 180)
- [x] Contains `router.register('chat'` — 1 occurrence
- [x] Contains `transport.getMessages(` — 1 occurrence
- [x] Contains `transport.sendMessage(` — 1 occurrence
- [x] Contains `transport.subscribeMessages(` — 1 occurrence
- [x] Contains `transport.getConversationContact(` — 1 occurrence
- [x] Contains `import { encrypt } from '../crypto.js'` — verified
- [x] Contains `applyCipher(` — 1 occurrence
- [x] Contains `putSettings(` — 3 occurrences
- [x] Contains `SEND FAILED — TRY AGAIN` — 2 occurrences
- [x] Contains `KEY REQUIRED` — 1 occurrence
- [x] Contains `aria-label="Send message"` — 1 occurrence
- [x] Contains `aria-label="Back to inbox"` — 1 occurrence
- [x] Contains `class="compose-bar"`, `class="compose-meta"`, `class="compose-row"`, `class="compose-input"`, `class="send-btn"` — all present
- [x] Contains `class="messages-list"`, `class="bubble`, `class="msg-wrap`, `class="bubble-text"` — all present
- [x] Contains `seenIds` (Set, .has(), .add()) — all present
- [x] Contains `return ()` followed by `unsubMessages` — cleanup present
- [x] Zero occurrences of `alert(` — confirmed
- [x] Zero occurrences of `card-flip`, `flipped`, `bubble-more`, `decode-panel`, `keep-decoded`, `decode-overlay`, `lock-pulse` — confirmed
- [x] Commit `cbee673` exists

---
*Phase: 03-core-messaging*
*Completed: 2026-05-02*
