---
phase: 03-core-messaging
plan: "03"
subsystem: screens/chat.js + style.css
tags: [decode-ux, card-flip, animations, cipher, keep-decoded, progressive-enhancement]
dependency_graph:
  requires: [03-02]
  provides: [CHAT-05, CHAT-06, CHAT-07, CHAT-08, CHAT-09, CHAT-10, CHAT-11, CHAT-13]
  affects: [style.css, screens/chat.js]
tech_stack:
  added: []
  patterns:
    - CSS 3D card-flip with preserve-3d + rotateY(180deg) + backface-visibility
    - CSS mask-image gradient fade on overflow text
    - Delegated event listener for dynamic chat list interaction
    - Promise.all parallel decrypt for batch auto-decode
    - CSS.supports() progressive enhancement gate for 3D fallback
key_files:
  created: []
  modified:
    - screens/chat.js
    - style.css
decisions:
  - "CSS.supports('transform-style', 'preserve-3d') used as 3D gate — no user-agent sniffing"
  - "Delegated listener on #messages-list attached once on mount; discarded when router replaces innerHTML (no explicit removeEventListener needed)"
  - "MORE trigger: surface length > 200 chars OR > 5 newline characters — covers both long single-line encoded strings (Polybius/Morse) and multi-line content"
  - "Own messages re-encode to cipher text for the locked bubble front face using prefs.cipher/key (not raw base64) when prefs are set"
  - "animationend + setTimeout(700ms) double-fence ensures pulse class is removed even if animationend fires late on low-end Android"
metrics:
  duration_minutes: 3
  completed_date: "2026-05-02"
  tasks_completed: 2
  files_modified: 2
---

# Phase 03 Plan 03: Decode UX (Card Flip) Summary

Card-flip decode UX on the chat screen with keep-decoded auto-decode, MORE expand, one-shot lock-pulse, and a fixed-overlay fallback for browsers without 3D transform support.

## What Was Built

### style.css — CSS additions (111 lines appended, no existing rules touched)

- `.bubble.flippable` — transparent wrapper; hosts `perspective: 800px`
- `.bubble-card` — `transform-style: preserve-3d`, `transition: transform 0.45s ease`
- `.bubble.flipped .bubble-card` — `transform: rotateY(180deg)` trigger
- `.bubble-front` / `.bubble-back` — `backface-visibility: hidden`; back face positioned `absolute; inset: 0; transform: rotateY(180deg)` so it sits behind the front at rest
- `.bubble-text.clipped` — `max-height: calc(5 * 1.55 * 13px)` ≈ 101px; `mask-image` gradient fade; `transition: max-height 0.25s ease`
- `.bubble-text.expanded` — removes max-height and mask
- `.bubble-more` — 11px accent uppercase expand link
- `@keyframes lock-pulse` + `.lock-glyph.pulse` — single 0.6s ease forwards animation (CHAT-11)
- `.decode-overlay` — `position: fixed; inset: 0; background: rgba(7,7,7,0.88); z-index: 100` (D-02)

### screens/chat.js — Extended from 224 to 469 lines

#### Flip / Decode State Machine

Three bubble render states in `renderMessages()`:

| State | Condition | Render |
|-------|-----------|--------|
| Plain decoded | `prefs.keep && decoded[id]` | Plain `.bubble > .bubble-text` (CHAT-10) |
| Flippable locked (3D) | `supports3D && !keep\|!decoded` | `.bubble.flippable > .bubble-card > .bubble-front + .bubble-back` |
| Fallback locked | `!supports3D && !decoded` | `.bubble > .bubble-text + .lock-icon button` |

#### CHAT-06: One-at-a-time enforcement

`openFlippedId` tracks the currently flipped bubble. On click of a `.bubble.flippable`:
1. If `openFlippedId` differs from tapped ID → find old element, remove `.flipped`
2. Toggle `.flipped` on tapped element
3. Update `openFlippedId` (null if just un-flipped)

#### CHAT-10: Auto-decode paths

Two paths both use `Promise.all` over async map:
1. **On load** — after `getMessages` resolves, if `prefs.keep && prefs.cipher && prefs.key`, parallel-decrypt all messages
2. **On realtime incoming** — `subscribeMessages` callback awaits decrypt before `renderMessages()`
3. **On successful decode** — if keep checkbox is checked, bulk-decrypt all remaining locked messages

#### CHAT-11: Lock-pulse (one-shot)

- `justArrivedIds` Set populated in realtime callback before `renderMessages()`
- `renderMessages()` adds `.pulse` class when `justArrivedIds.has(msg.id)`
- After render: `animationend` listener on each `.lock-glyph.pulse` removes `.pulse` (belt)
- `setTimeout(() => justArrivedIds.clear(), 700)` prevents pulse re-rendering on next scroll (suspenders)

#### D-02: Overlay fallback

`openOverlay(msgId)` renders into `#decode-overlay-mount` (sibling of `.compose-bar` inside `.screen`):
- Populates inner HTML with `.decode-panel` containing same cipher select + key input + DECODE MESSAGE + KEEP DECODED FOR ME + `.decode-err`
- `decode-go-overlay` button runs identical decrypt → applyCipher → decoded → putSettings flow
- Overlay closes on: successful decode OR clicking the scrim (outside `.decode-panel`)

#### SEC-05 / CHAT-13: No server transmission of cipher prefs

`putSettings(convId, { cipher, key, keep })` writes to `localStorage` key `'cs'`. Verified: zero network calls carry cipher or key. Only `payload`, `iv`, `salt` are sent via `transport.sendMessage`.

## Deviations from Plan

None — plan executed exactly as written. Minor note: the `MORE` text check in the plan's verify grep looked for `'MORE'` as a JS string literal; the actual usage is `>MORE<` inside an HTML template string — semantically identical, accepted by the plan's overall intent.

## Known Stubs

None. All decode paths are fully wired. The AES base64 payload slice (`msg.payload.slice(0, 200)`) on never-decoded foreign messages is intentional placeholder behavior (per plan spec), not a stub — it displays until the user enters the correct key.

## Self-Check: PASSED

- `style.css` exists and contains all required CSS: FOUND
- `screens/chat.js` exists at 469 lines: FOUND
- Commit `21f0cd1` (style.css): FOUND
- Commit `bbd8c42` (chat.js): FOUND
