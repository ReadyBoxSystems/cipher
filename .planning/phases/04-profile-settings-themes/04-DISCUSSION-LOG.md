# Phase 4: Profile + Settings + Themes — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-03
**Phase:** 04-profile-settings-themes
**Areas discussed:** Profile screen, Theme scope, Theme picker UX, Theme persistence

---

## Profile Screen

| Option | Description | Selected |
|--------|-------------|----------|
| One expanded screen | Settings grows to cover profile + theme + sign out. One destination. | ✓ |
| Two separate screens | #/profile + #/settings split | |
| Profile card in inbox | Tap avatar in topbar to open profile sheet | |

**User's choice:** One expanded settings screen at `#/settings`

**Follow-up — Settings navigation:**

| Option | Description | Selected |
|--------|-------------|----------|
| Tap avatar in topbar | User's own avatar in inbox topbar navigates to settings | ✓ |
| Gear icon in topbar | Explicit ⚙ icon | |
| Swipe or long-press | Hidden gesture | |

**User's choice:** Tap avatar in inbox topbar

---

## Theme Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Visuals only | Colors, fonts, CSS custom properties only. No copy changes. | ✓ |
| Visuals + full vocabulary | All UI strings become theme-aware | |
| Visuals + select vocabulary | High-impact labels only ("The Postdesk", "Open the desk") | |

**User's choice:** Visuals only

**Follow-up — Layout changes:**

| Option | Description | Selected |
|--------|-------------|----------|
| Colors + fonts only | Pure CSS variable swap, identical DOM | ✓ |
| Colors + fonts + layout tweaks | Bubble shapes, inbox card style change per theme | |

**User's choice:** Colors and fonts only — same DOM structure for both themes

---

## Theme Picker UX

| Option | Description | Selected |
|--------|-------------|----------|
| Named swatches | Two tappable cards with color previews, side-by-side | ✓ |
| Settings row with current value | Single row "Theme  Postdesk ›" opens a list | |
| Live toggle | Light/Dark toggle switch | |

**User's choice:** Named swatch cards

---

## Theme Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| localStorage + Supabase sync | Fast apply on load + cross-device sync | ✓ |
| localStorage only | Device-only, no cross-device | |
| Supabase only | Cross-device but flash on load | |

**User's choice:** localStorage-first + async Supabase sync

**Follow-up — Default theme:**

| Option | Description | Selected |
|--------|-------------|----------|
| Postdesk | Warm, accessible, broader appeal | ✓ |
| Terminal | Existing dark amber, opt-in for new | |
| System preference | OS dark/light detection | |

**User's choice:** Postdesk as default for all new users

---

## Claude's Discretion

- Avatar color in topbar reuses `_strColor` utility
- Swatch card dimensions and styling
- Service worker font caching strategy
- Schema migration approach for `theme` column

## Deferred Ideas

- Additional themes beyond Postdesk + Terminal
- Per-conversation theming
- Vocabulary changes per theme ("The Postdesk", "Open the desk")
- Layout variations per theme (letter-card inbox, wider margins)
- System dark/light preference detection
