# Phase 3: Core Messaging - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 03-core-messaging
**Areas discussed:** iOS/Android card-flip fallback, Compose bar layout, Inbox preview, Locked bubble appearance

---

## iOS Safari Card-Flip Fallback

| Option | Description | Selected |
|--------|-------------|----------|
| CSS 3D flip for iOS Safari | Implement with webkit-specific fixes and test on iOS | |
| Android-first, overlay fallback | Target Android Chrome (CSS 3D works fine); if flip fails, small lock icon on bubble → tap → fixed overlay | ✓ |

**User's choice:** Android Chrome is the target, not iOS. Jordan clarified this is beyond his knowledge area but knows he wants Android. Fallback if flip doesn't render: small button/icon on bubble, tap opens overlay with cipher/key entry.

**Notes:** The "iOS Safari risk" called out in ROADMAP.md and STATE.md is deprioritized. Jordan's user base is Android. CSS 3D transforms are reliable on Android Chrome — no webkit workarounds needed.

---

## Compose Bar Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Single row (all 4 elements) | Cipher selector + key + input + send all in one line | |
| Two-row (existing design) | Top: cipher dropdown + key field. Bottom: text input + send button | ✓ |

**User's choice:** Existing style.css layout — Jordan confirmed "we have a pretty good UI design in the files here." Two-row layout: cipher selector and key field on top, text input and send button (right) on bottom.

**Notes:** `.compose-meta`, `.compose-row`, `.compose-input`, `.send-btn` are already defined in style.css. No new CSS needed.

---

## Inbox Conversation Preview

| Option | Description | Selected |
|--------|-------------|----------|
| Locked indicator | ⚿ symbol or "Locked" text — clean, consistent regardless of cipher type | |
| Encoded text | Truncated cipher output in the preview row — reinforces the aesthetic | ✓ |

**User's choice:** Encoded text. "Encoded text, for sure" — Jordan confirmed the cipher-encoded text as the inbox preview. The runes/Morse/shifted letters in the conversation list row are themselves the locked indicator.

**Notes:** `.conv-preview` in style.css already handles truncation (`text-overflow: ellipsis`). No new CSS needed.

---

## Locked Message Bubble Appearance

| Option | Description | Selected |
|--------|-------------|----------|
| Hard ellipsis | Standard text overflow, cuts off with ... | |
| Gradient fade + MORE | CSS gradient mask fades the text off; tappable "MORE" to expand full text | ✓ |

**User's choice:** "Encoded text should fade off. Maybe a 'more' to expand the full text." Gradient fade on the bubble text container, with a "MORE" tappable label that expands to full height.

**Notes:** Exact CSS gradient implementation and expand/collapse animation is Claude's discretion.

---

## Claude's Discretion

- Gradient fade CSS for bubble overflow (direction, height, color stop)
- Cross-conversation inbox realtime subscription approach
- Optimistic send deduplication (ID match when realtime echo arrives)
- "MORE" expand/collapse animation timing

## Deferred Ideas

None.
