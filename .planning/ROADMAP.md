# Roadmap: Cipher PWA

## Overview

A rebuild of a working v0 — the concept is proven, the architecture is not. Five phases move from module skeleton and bug fixes through auth, core messaging, invite flow, and finally a proper test suite. Every phase delivers a coherent, verifiable capability. The transport abstraction thread runs through everything: Phase 1 creates the interface, every subsequent phase uses it, and the final result is a codebase where swapping Supabase for a mesh transport is a one-line change.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Module skeleton, transport abstraction, v0 bug fixes, Jest config (completed 2026-04-30)
- [x] **Phase 2: Auth + Profile + Settings** - Auth screens, profile setup, settings screen (completed 2026-05-01)
- [ ] **Phase 3: Core Messaging** - Inbox, chat, realtime, card-flip decode UX
- [ ] **Phase 4: Invite Flow** - Invite generation, landing screen, atomic invite acceptance
- [ ] **Phase 5: Tests** - Jest tests for all pure modules + mock-transport integration tests

## Phase Details
**Plans**: 3 plans
- [x] 01-01-PLAN.md — Fix v0 bugs (crypto.js toB64, empty-key fallback, sw.js path) and stand up Jest ESM test harness
- [x] 01-02-PLAN.md — Transport abstraction layer (interface.js JSDoc, supabase-transport.js, mock-transport.js stubs, index.js swap point)
- [x] 01-03-PLAN.md — Module restructure: state/store.js, lib/{router,settings,utils}.js, ~30-line app.js boot file, screens/ placeholder

### Phase 2: Auth + Profile + Settings
**Goal**: A user can create an account, set their @handle, view their profile, edit their display name, and sign out — and none of these flows produce `alert()` calls or 409 conflicts on stale sessions
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, PROF-01, PROF-02, PROF-03, PROF-04, PROF-05
**Success Criteria** (what must be TRUE):
  1. User can sign up with email and password and reach the @handle setup screen
  2. User can sign in and remain signed in after closing and reopening the browser tab
  3. User can view their @handle and email on the Settings screen
  4. User can edit their display name inline on Settings and see the update immediately (optimistic)
  5. User can sign out from the Settings screen and land on the auth screen
**Plans**: TBD
**UI hint**: yes

### Phase 3: Core Messaging
**Goal**: Two users can open the app, see their conversations in the inbox, exchange cipher-encoded AES-encrypted messages, and decode them using the card-flip UX — in real-time, on both iOS Safari and desktop
**Depends on**: Phase 2
**Requirements**: INBOX-01, INBOX-02, INBOX-03, INBOX-04, INBOX-05, CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06, CHAT-07, CHAT-08, CHAT-09, CHAT-10, CHAT-11, CHAT-12, CHAT-13, SEC-05
**Success Criteria** (what must be TRUE):
  1. User can see all conversations in the inbox sorted by most recent activity, with avatar, @handle, and relative time
  2. User can send a message and it appears immediately in the chat thread (cipher-encoded text visible in the bubble)
  3. Tapping a locked message flips the card (0.45s 3D CSS flip) to reveal cipher/key entry — card flip works on iOS Safari or falls back to a fixed overlay
  4. User can enter cipher type and key on the card back to decode; wrong key shows an inline error, never an `alert()`
  5. With "Keep decoded for me" enabled, future messages in that conversation auto-decode on load with no flip element rendered
  6. Incoming message in an open conversation appears in real-time; inbox updates in real-time when a new message arrives in any conversation
**Plans**: 3 plans
- [x] 03-01-PLAN.md — Inbox screen + app.js boot wiring + chat.js stub (INBOX-01..05)
- [x] 03-02-PLAN.md — Chat screen base: send (optimistic + AES + cipher), realtime receive, compose bar (CHAT-01..04, 12, SEC-05)
- [ ] 03-03-PLAN.md — Decode UX: card-flip, MORE expand, keep-decoded, lock-pulse, overlay fallback (CHAT-05..11, 13)
**UI hint**: yes

### Phase 4: Invite Flow
**Goal**: A user can generate an invite link, share it with anyone, and that person can click the link, sign up or sign in, and land directly in a conversation — with the invite acceptance creating the conversation and membership atomically, and the invite creator's inbox updating without a refresh
**Depends on**: Phase 3
**Requirements**: INVITE-01, INVITE-02, INVITE-03, INVITE-04, INVITE-05, INVITE-06, INVITE-07, INVITE-08
**Success Criteria** (what must be TRUE):
  1. User can tap + in the inbox and get a shareable one-time invite link
  2. An unauthenticated user opening an invite link sees a purpose-built landing screen (sender @handle, description, CTA) — not the generic auth form
  3. Invite code is preserved through the sign-up/sign-in flow so the recipient lands in the right conversation after auth
  4. Accepting an invite creates the conversation and adds both parties as members atomically — a crash or network drop mid-flow does not leave orphaned records
  5. The invite creator's inbox shows the new conversation in real-time when the invite is accepted (no refresh required)
  6. A user cannot accept their own invite; an already-used invite shows an appropriate message with a navigation option
**Plans**: TBD
**UI hint**: yes

### Phase 5: Tests
**Goal**: All pure modules (ciphers, crypto, settings) have Jest unit tests, key screen flows have integration tests using mock-transport, and `npm test` passes clean on the final codebase
**Depends on**: Phase 4
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05
**Success Criteria** (what must be TRUE):
  1. All 7 ciphers have encode→decode round-trip tests that pass in Jest
  2. Caesar, Vigenère, and Rail Fence tests cover edge cases: shift=0, empty key, single character
  3. `crypto.js` encrypt→decrypt round-trip test passes with a correct key and returns `null` for a wrong key (no exception thrown)
  4. Send-message and decode-message flows have integration tests using `mock-transport.js` with no Supabase calls
  5. `npm test` exits 0 with all tests passing on the final codebase
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete   | 2026-04-30 |
| 2. Auth + Profile + Settings | 3/3 | Complete   | 2026-05-01 |
| 3. Core Messaging | 2/3 | In Progress|  |
| 4. Invite Flow | 0/TBD | Not started | - |
| 5. Tests | 0/TBD | Not started | - |

## Backlog

### Phase 999.1: PWA Icons — Cipher Rotor Wheel (BACKLOG)

**Goal:** Create icon-192.png and icon-512.png using a static render of the cipher rotor/wheel UI with the C in the center. Currently 404ing from manifest.json — app works but shows generic browser icon on home screen install.
**Requirements:** TBD
**Plans:** 2/3 plans executed

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)
