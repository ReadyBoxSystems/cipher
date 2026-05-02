# Phase 3: Core Messaging - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Inbox screen (conversation list + realtime updates), chat screen (send/receive messages), card-flip decode UX, cipher/key preference persistence, and the realtime subscriptions that keep both screens live. No invite flow (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Platform Target
- **D-01:** Android Chrome is the primary target, not iOS Safari. CSS 3D transforms (`transform-style: preserve-3d`, `backface-visibility: hidden`) work correctly on Android Chrome — no webkit-specific workarounds needed. The "iOS Safari fallback" called out in requirements is deprioritized; build the card flip for Android first.

### Card-Flip Fallback
- **D-02:** If the CSS 3D flip fails to render (progressive fallback only — don't add a `@supports` gate prematurely), fall back to a small lock-icon button rendered on the bubble. Tapping the icon opens a fixed overlay with the cipher/key entry form. Not a modal sheet — a full overlay. This keeps the decode flow functional without the flip animation.

### Compose Bar Layout
- **D-03:** Use the two-row layout already defined in `style.css`:
  - Row 1 (`.compose-meta`): cipher type `<select>` + key `<input>` side by side
  - Row 2 (`.compose-row`): text `<textarea>` (flex: 1) + send button on the right
  Send button is on the right of the text input row (standard). This layout is already CSS-complete — screens/chat.js just needs to render the correct markup.

### Inbox Conversation Preview
- **D-04:** Show the cipher-encoded text of the last message as the inbox row preview (`.conv-preview`). Truncated to one line via `text-overflow: ellipsis` (already in CSS). No "Locked" label — the encoded text itself (runes, Morse dots, shifted letters) IS the indicator. This reinforces the cipher aesthetic in the inbox list.

### Locked Message Bubble Appearance
- **D-05:** Cipher-encoded text is shown on the bubble face (front of card). Long encoded text fades off — use a CSS gradient mask on the bubble text container to create a soft fade at the bottom edge rather than a hard ellipsis. Include a tappable "MORE" text link below the fade that expands the bubble to full height. Tapping "MORE" again (or after decode) collapses it.

### Realtime Subscription Architecture
- **D-06:** Realtime subscriptions live in the screen that needs them, not in `app.js` boot:
  - `screens/inbox.js` owns `subscribeConversationMembers` (for INBOX-04: new conversation appears when invite accepted) and a cross-conversation `subscribeMessages` subscription (for INBOX-03: inbox timestamp updates when any message arrives)
  - `screens/chat.js` owns `subscribeMessages` scoped to the open conversation (CHAT-03)
  Each screen returns a cleanup function that unsubscribes. The router calls cleanup before mounting the next screen (already wired in `lib/router.js`).

### Message Delivery
- **D-07:** Optimistic send — append the sent message to local state immediately before the transport call confirms. If the transport call fails, remove the optimistic entry and show an inline error on the compose bar. On success, the realtime subscription may echo the message back; deduplicate by message ID.

### Claude's Discretion
- Exact CSS gradient fade implementation for the bubble overflow (gradient direction, fade height)
- Cross-conversation inbox realtime approach — subscribeMessages once per conversation vs. a broader subscription — pick the cleanest option given the transport interface
- Deduplication strategy for optimistic send + realtime echo (ID match, or skip if already present)
- "MORE" expand/collapse animation timing

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — INBOX-01 through INBOX-05, CHAT-01 through CHAT-13, SEC-05 (all Phase 3 requirements with acceptance criteria)
- `.planning/ROADMAP.md` — Phase 3 success criteria (6 items)

### Existing Source (read before writing new screens)
- `style.css` — Chat and inbox styles already present: `.compose-bar`, `.compose-meta`, `.compose-row`, `.compose-input`, `.send-btn`, `.bubble`, `.bubble-locked`, `.bubble-text`, `.conv-row`, `.conv-preview`, `.conv-name`, `.conv-time`, `.messages-list`, `.msg-wrap`
- `lib/settings.js` — `getSettings(convId)` / `putSettings(convId, patch)` — cipher + key localStorage per conversation; this is the "keep decoded" persistence layer
- `transport/interface.js` — Full method signatures for `getConversations`, `getConversationContact`, `getMessages`, `sendMessage`, `subscribeMessages`, `subscribeConversationMembers`
- `state/store.js` — `conversations`, `messages`, `contacts` keys already defined; `on(key, fn)` subscription pattern
- `lib/router.js` — `register(view, handler)`, `navigate(path)`, cleanup lifecycle
- `ciphers.js` — `applyCipher(type, key, text, direction)` — the encode/decode function
- `crypto.js` — `encrypt(plaintext, passphrase)` → `{ payload, iv, salt }` / `decrypt({ payload, iv, salt }, passphrase)` → plaintext or null

### Prior Phase Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Architecture decisions locked in Phase 1 (transport swap point, state store pattern, router registration pattern)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/settings.js` — Ready to use. `getSettings(convId)` returns `{ cipher, key, keep }` defaults; `putSettings(convId, patch)` persists. Chat screen reads/writes this for CHAT-09/CHAT-10/CHAT-13.
- `state/store.js` — `conversations`, `messages`, `contacts` state keys already declared. Inbox screen sets `conversations`; chat screen sets `messages[convId]`. Both screens subscribe via `store.on(key, fn)` and unsubscribe in their cleanup.
- `style.css` — Inbox and chat CSS is substantially complete from v0. New screens need to emit the right markup class names — minimal new CSS expected.
- `lib/utils.js` — `_ago(ts)` (relative time), `_strColor(str)` (avatar color), `_esc(str)` (HTML escape) — all needed by inbox and chat screens.

### Established Patterns (from Phase 2 screens)
- Screen self-registers: `router.register('view', async (param) => { ... return cleanup })`
- Auth guard: check `store.get('user')` and `store.get('profile')` at mount; navigate away if missing
- DOM write: `document.getElementById('app').innerHTML = \`...\``
- Event delegation: attach listeners after innerHTML write; detach in cleanup
- Inline errors: set `element.textContent = msg` — never `alert()`
- Uppercased labels for UI text (SEND, DECODE, MORE, KEEP DECODED)
- Optimistic updates: write to store before transport call; roll back on error

### Integration Points
- `app.js` imports screens at boot — `screens/inbox.js` and `screens/chat.js` must be added to the import list
- `screens/inbox.js` registers `''` (empty hash → inbox) and handles the `+` button (navigates to `#/new` in Phase 4 — stub for now)
- `screens/chat.js` registers `'chat'` with `param` = conversation ID
- Transport swap point is `transport/index.js` — screens never import from `supabase-transport.js` directly

</code_context>

<specifics>
## Specific Ideas

- Inbox preview shows cipher-encoded text truncated to one line — the runes/Morse/shifted text IS the locked indicator. No separate "Locked" label needed.
- Bubble overflow: soft CSS gradient fade (not ellipsis), with a tappable "MORE" label that expands to full height. Collapse on decode or second tap.
- Jordan confirmed: Android Chrome is the target. The iOS Safari card-flip risk in the requirements is effectively N/A for this phase. Build the flip for Android; add the overlay fallback as a safety net.
- Compose bar is already styled in `style.css` — the chat screen just needs to render `.compose-bar > .compose-meta + .compose-row` markup correctly.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-core-messaging*
*Context gathered: 2026-05-02*
