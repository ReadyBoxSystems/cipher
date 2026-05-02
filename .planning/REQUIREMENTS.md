# Requirements — Cipher v1

**Milestone:** v1.0 — Proper rebuild
**Status:** Defined
**Last updated:** 2026-04-27

---

## v1 Requirements

### Foundation (FOUND)

- [x] **FOUND-01**: Codebase is decomposed from monolith into modules (`transport/`, `state/`, `lib/`, `screens/`)
- [x] **FOUND-02**: Transport abstraction layer isolates all Supabase calls behind a 12-method interface
- [x] **FOUND-03**: `crypto.js` `toB64` uses a loop (not spread) to avoid V8 stack overflow on large buffers
- [x] **FOUND-04**: `crypto.js` removes the empty-key `|| 'cipher'` fallback — AES always uses a real key
- [x] **FOUND-05**: Service worker registers with `./sw.js` relative path and `scope: './'` for GitHub Pages
- [x] **FOUND-06**: Jest is configured for ES modules (`--experimental-vm-modules`, `transform: {}`, `testEnvironment: 'node'`)
- [x] **FOUND-07**: `package.json` has `"type": "module"` and a `test` script

### Authentication (AUTH)

- [x] **AUTH-01**: User can create an account with email and password
- [x] **AUTH-02**: User can sign in and remain signed in across sessions (Supabase session persistence)
- [x] **AUTH-03**: User can sign out (accessible from Settings screen)
- [x] **AUTH-04**: Auth errors are shown inline — never `alert()`

### Profile & Setup (PROF)

- [x] **PROF-01**: First-time user is prompted to choose a unique @handle after sign-up
- [x] **PROF-02**: Profile creation uses `upsert(onConflict: 'id')` — stale session does not cause 409 conflict
- [x] **PROF-03**: Handle-taken conflict (23505 on `username`) shows inline error; already-setup conflict (23505 on `id`) redirects to inbox
- [x] **PROF-04**: User can view their @handle and email on the Settings screen (read-only)
- [x] **PROF-05**: User can edit their display name inline on the Settings screen (optimistic update)

### Inbox (INBOX)

- [x] **INBOX-01**: User can see all their active conversations in the inbox, sorted by most recent activity
- [x] **INBOX-02**: Each conversation row shows the contact's @handle, avatar initial, and relative time of last message
- [x] **INBOX-03**: Inbox updates in real-time when a new message arrives in any conversation
- [x] **INBOX-04**: Inbox updates in real-time when someone accepts the user's invite (new conversation appears without refresh)
- [x] **INBOX-05**: Empty inbox shows actionable prompt to start a conversation

### New Conversation & Invites (INVITE)

- [ ] **INVITE-01**: User can generate a one-time invite link from the inbox
- [ ] **INVITE-02**: Invite link expires after 7 days
- [ ] **INVITE-03**: Unauthenticated user arriving at an invite link sees a purpose-built landing screen (sender @handle, description, CTA) — not the generic auth form
- [ ] **INVITE-04**: Recipient can sign up or sign in and join the conversation from the invite link
- [ ] **INVITE-05**: Invite code is preserved in `sessionStorage` through the sign-up/sign-in flow
- [ ] **INVITE-06**: Accepted invite creates a conversation and adds both parties as members atomically
- [ ] **INVITE-07**: User cannot accept their own invite link
- [ ] **INVITE-08**: Already-used invite shows appropriate message; members can navigate to the conversation

### Chat & Messaging (CHAT)

- [x] **CHAT-01**: User can type and send a message (cipher-encoded + AES-256-GCM encrypted)
- [x] **CHAT-02**: Sent messages appear in the message list immediately (optimistic or via realtime)
- [x] **CHAT-03**: User receives messages in real-time when the chat screen is open
- [x] **CHAT-04**: Locked messages display the cipher-encoded text on the card front (Caesar shift, Morse dots, Futhark runes, etc.)
- [x] **CHAT-05**: Tapping a locked message flips the card (CSS 3D flip, 0.45s) to reveal cipher/key entry on the back
- [x] **CHAT-06**: Only one card can be flipped at a time — tapping a second card flips the first back
- [x] **CHAT-07**: User can select cipher type and enter key on the card back to decode the message
- [x] **CHAT-08**: Successful decode reveals plaintext in the bubble; wrong key shows inline error (no `alert()`)
- [x] **CHAT-09**: User can enable "Keep decoded for me" per conversation — stores cipher + key in localStorage only
- [x] **CHAT-10**: With "keep decoded" on, messages are auto-decoded on load and render as plain bubbles (no flip element)
- [x] **CHAT-11**: Incoming locked message plays one pulse animation on the lock glyph — not continuous
- [x] **CHAT-12**: Compose bar shows cipher selector and key field; send requires non-empty message text
- [x] **CHAT-13**: Cipher and key preferences are stored in localStorage only — never sent to server

### Encryption & Security (SEC)

- [x] **SEC-01**: All messages are AES-256-GCM encrypted before leaving the browser
- [x] **SEC-02**: PBKDF2 key derivation uses 100,000 iterations, SHA-256, per-message random salt
- [x] **SEC-03**: IV and salt are random per message; stored in Supabase alongside the encrypted payload
- [x] **SEC-04**: The AES passphrase is never sent to the server or stored outside the browser
- [x] **SEC-05**: Cipher type is never stored in the database — it is a secret second factor

### Testing (TEST)

- [ ] **TEST-01**: All 7 ciphers have Jest tests verifying encode→decode round-trips
- [ ] **TEST-02**: Caesar, Vigenère, Rail Fence tests verify edge cases (shift=0, empty key, single character)
- [ ] **TEST-03**: `crypto.js` `encrypt` → `decrypt` round-trip test passes with correct key
- [ ] **TEST-04**: `crypto.js` `decrypt` returns `null` for wrong key (not an exception)
- [ ] **TEST-05**: Key screen flows (send message, decode message) have integration tests using `mock-transport.js`

---

## v2 Requirements (Deferred)

- Stats dashboard — messages sent, ciphers used, active conversations. Rewards engagement.
- Push notifications — requires Web Push API + service worker update
- Mesh network transport — Meshtastic integration via transport adapter
- `cipher.readyboxhq.com` domain configuration
- Message deletion / conversation archiving
- Read receipts

---

## Out of Scope

- **OAuth / social login** — email + password sufficient for this user base; OAuth adds complexity
- **Group conversations** — two-person model is intentional in v1; security model is simpler
- **Server-side cipher type storage** — intentional omission; cipher type is the second factor
- **Message search** — encrypted blobs are unsearchable by design
- **Web Push in v1** — deferred; app must be open to receive messages in v1
- **Media attachments** — text-only in v1; binary payloads need size limits and storage design

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1: Foundation | Complete |
| FOUND-02 | Phase 1: Foundation | Complete |
| FOUND-03 | Phase 1: Foundation | Complete |
| FOUND-04 | Phase 1: Foundation | Complete |
| FOUND-05 | Phase 1: Foundation | Complete |
| FOUND-06 | Phase 1: Foundation | Complete |
| FOUND-07 | Phase 1: Foundation | Complete |
| SEC-01 | Phase 1: Foundation | Complete |
| SEC-02 | Phase 1: Foundation | Complete |
| SEC-03 | Phase 1: Foundation | Complete |
| SEC-04 | Phase 1: Foundation | Complete |
| AUTH-01 | Phase 2: Auth + Profile + Settings | Complete |
| AUTH-02 | Phase 2: Auth + Profile + Settings | Complete |
| AUTH-03 | Phase 2: Auth + Profile + Settings | Complete |
| AUTH-04 | Phase 2: Auth + Profile + Settings | Complete |
| PROF-01 | Phase 2: Auth + Profile + Settings | Complete |
| PROF-02 | Phase 2: Auth + Profile + Settings | Complete |
| PROF-03 | Phase 2: Auth + Profile + Settings | Complete |
| PROF-04 | Phase 2: Auth + Profile + Settings | Complete |
| PROF-05 | Phase 2: Auth + Profile + Settings | Complete |
| INBOX-01 | Phase 3: Core Messaging | Complete |
| INBOX-02 | Phase 3: Core Messaging | Complete |
| INBOX-03 | Phase 3: Core Messaging | Complete |
| INBOX-04 | Phase 3: Core Messaging | Complete |
| INBOX-05 | Phase 3: Core Messaging | Complete |
| CHAT-01 | Phase 3: Core Messaging | Complete |
| CHAT-02 | Phase 3: Core Messaging | Complete |
| CHAT-03 | Phase 3: Core Messaging | Complete |
| CHAT-04 | Phase 3: Core Messaging | Complete |
| CHAT-05 | Phase 3: Core Messaging | Complete |
| CHAT-06 | Phase 3: Core Messaging | Complete |
| CHAT-07 | Phase 3: Core Messaging | Complete |
| CHAT-08 | Phase 3: Core Messaging | Complete |
| CHAT-09 | Phase 3: Core Messaging | Complete |
| CHAT-10 | Phase 3: Core Messaging | Complete |
| CHAT-11 | Phase 3: Core Messaging | Complete |
| CHAT-12 | Phase 3: Core Messaging | Complete |
| CHAT-13 | Phase 3: Core Messaging | Complete |
| SEC-05 | Phase 3: Core Messaging | Complete |
| INVITE-01 | Phase 4: Invite Flow | Pending |
| INVITE-02 | Phase 4: Invite Flow | Pending |
| INVITE-03 | Phase 4: Invite Flow | Pending |
| INVITE-04 | Phase 4: Invite Flow | Pending |
| INVITE-05 | Phase 4: Invite Flow | Pending |
| INVITE-06 | Phase 4: Invite Flow | Pending |
| INVITE-07 | Phase 4: Invite Flow | Pending |
| INVITE-08 | Phase 4: Invite Flow | Pending |
| TEST-01 | Phase 5: Tests | Pending |
| TEST-02 | Phase 5: Tests | Pending |
| TEST-03 | Phase 5: Tests | Pending |
| TEST-04 | Phase 5: Tests | Pending |
| TEST-05 | Phase 5: Tests | Pending |
