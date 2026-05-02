# Cipher

## What This Is

A two-layer encrypted messaging PWA. Historical ciphers (Caesar, Vigenère, Morse, etc.) serve as both an aesthetic layer and a second authentication factor — the cipher type is never stored anywhere. AES-256-GCM via the browser's Web Crypto API handles actual security underneath. Pre-shared key model: the key never touches the server. Two people agree on a cipher and key out of band, then communicate through encoded messages that only they can read.

## Core Value

Two people can exchange messages that are genuinely unreadable to anyone else — including a fully-compromised server — using a pre-shared key and cipher they agreed on out of band.

## Requirements

### Validated

**Foundation (validated in Phase 1: Foundation)**
- [x] `crypto.js` is bug-free: chunked `toB64`, passphrase guards on encrypt/decrypt, SEC contracts preserved
- [x] `sw.js` uses `cipher-v2` cache key and relative asset paths
- [x] Jest ESM harness runs: `npm test` exits 0 with 10 passing tests
- [x] Transport abstraction layer complete: 17-method interface, Supabase impl, mock stubs, single swap point
- [x] `app.js` monolith replaced: 32-line boot file + `state/`, `lib/`, `screens/` module skeleton

**Auth & Profile (validated in Phase 2: auth-profile-settings)**
- [x] User can create an account with email and password
- [x] User can sign in and stay signed in across sessions
- [x] User can sign out from any screen
- [x] User has a unique @handle chosen on first login
- [x] User can change their display name in settings
- [x] User can sign out from settings
- [x] PROF-02 409 stale-session conflict bug fixed at transport layer (upsert over insert)

**Core Messaging (validated in Phase 3: core-messaging)**
- [x] User can see all their active conversations in the inbox (live-updating via realtime)
- [x] Inbox shows contact handle, cipher-encoded preview, and relative timestamp
- [x] User can send a message (cipher-encoded + AES-encrypted) with optimistic UI
- [x] User can receive messages in real-time (deduplication via seenIds Set)
- [x] Locked messages display the cipher-encoded text on the front of a card
- [x] Tapping a locked message flips the card to reveal cipher/key entry
- [x] User can decode a message by entering the cipher type and key
- [x] User can enable "keep decoded for me" to auto-decode future messages in that conversation
- [x] Cipher and key preferences are stored locally only, never sent to server (SEC-05)
- [x] Card-flip decode UX with 3D CSS transform and overlay fallback for older devices
- [x] Lock-pulse animation on incoming encrypted messages

### Active

**Conversations**
- [ ] User can generate a one-time invite link to start a conversation
- [ ] Recipient can open an invite link and join the conversation
- [ ] Invite creator's inbox updates in real-time when their invite is accepted

**Testing**
- [ ] Cipher logic (all 7 ciphers) has Jest unit tests covering encode/decode round-trips
- [ ] Crypto module (AES encrypt/decrypt) has Jest unit tests

### Out of Scope

- Stats dashboard — deferred to Phase 2; rewards engagement but not essential for v1
- Mesh network transport — future milestone; architecture must accommodate it but not build it
- Push notifications — requires Web Push API + service worker update; deferred
- cipher.readyboxhq.com domain — DNS config deferred; app works at GitHub Pages URL
- OAuth / social login — not needed for this user base
- Group conversations — two-person model is intentional to v1
- Server-side cipher type storage — intentional omission; it's a security feature

## Context

**Existing codebase:** A working v0 exists at `C:\Cipher Program\`. It was built fast as a proof-of-concept and has a working auth + invite + chat flow but poor architecture — all logic in a single 543-line `app.js`, functions tightly coupled to the DOM, no tests. The rebuild keeps the good parts (`ciphers.js`, `crypto.js`, `schema.sql`, `style.css`) and restructures the rest.

**Stack:** Vanilla JS (ES modules), no framework, no build step. Supabase (Postgres + Auth + Realtime + RLS). GitHub Pages hosting. Browser Web Crypto API for AES-256-GCM. JetBrains Mono font, dark amber aesthetic.

**Transport abstraction goal:** The app logic (send message, load conversation) must be separated from the transport layer (Supabase today). This enables swapping in a mesh network transport (Meshtastic-style) in a future milestone without rewriting the app.

**Design north star:** Cool to use. Feels like a tool, not a toy. Dark amber, cipher aesthetic. The card-flip decode UX reinforces the cipher theme — you see the encoded message (runes, Morse, shifted text) before you decode it.

**Known issues from v0 to fix:**
1. Invite creator's inbox never updates when invite accepted — realtime only watched `messages` table
2. Decode was a slide-up panel — replacing with card flip on the bubble
3. Profile had no settings screen — adding settings with display name + sign out

**GitHub repo:** github.com/ReadyBoxSystems/cipher
**Live app:** readyboxsystems.github.io/cipher
**Backend:** Supabase project "cipher" (org: ReadyBoxSystems)

## Constraints

- **Tech stack:** Vanilla JS, no framework, no build step — keeps the GitHub Pages deploy simple and dependency-free
- **No build step:** Cannot use TypeScript or JSX without adding a bundler; keep ES modules only
- **Crypto:** Must use browser Web Crypto API only — no third-party crypto libraries
- **Key security:** AES key must never leave the browser; Supabase stores only encrypted blobs + IV + salt
- **Transport abstraction:** Must be designed for mesh-readiness without building mesh now

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Card-flip decode UX | Shows cipher text before decode — reinforces the aesthetic, cipher text IS the experience | ✓ Built — Phase 3 |
| Transport abstraction layer | Separates Supabase from app logic; enables mesh swap in future milestone | ✓ Built — Phase 1 |
| Keep vanilla JS / no framework | GitHub Pages simplicity, no build tooling, consistent with prototype heritage | ✓ Validated — Phase 3 |
| Cipher type not stored server-side | Intentional second factor — recipient must know it out of band | ✓ Good |
| Jest for cipher/crypto testing | Pure functions with no DOM deps; Node 18+ has crypto.subtle; high value tests | ✓ Built — Phase 1 |
| Rebuild app.js as modules | Current monolith is untestable and hard to maintain | ✓ Built — Phase 1 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-02 — Phase 3 (Core Messaging) complete*
