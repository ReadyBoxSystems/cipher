# Phase 4: Profile + Settings + Themes — Context

**Gathered:** 2026-05-03
**Status:** Ready for planning

<domain>
## Phase Boundary

One expanded settings screen that becomes the full profile + preferences destination. A CSS theme system with two themes (Postdesk and Terminal). Theme preference stored in localStorage for instant apply and synced to Supabase for cross-device consistency.

No new messaging capabilities. No vocabulary/copy changes. No layout restructuring between themes.

</domain>

<decisions>
## Implementation Decisions

### Settings Screen Structure
- **D-01:** Single screen at `#/settings` — no separate `#/profile` route. The existing settings screen expands to become the full profile + preferences destination.
- **D-02:** User's own avatar initial appears in the **inbox topbar** (top-right corner). Tapping it navigates to `#/settings`. This is the primary settings entry point — no gear icon.
- **D-03:** Settings screen sections: profile header (avatar, @handle, display name editable), PROFILE section (handle, email readonly), APPEARANCE section (theme swatches), ACCOUNT section (sign out).

### Theme System
- **D-04:** Two themes: **Postdesk** (warm parchment, serif + typewriter fonts) and **Terminal** (existing dark amber, unchanged).
- **D-05:** Theme scope is **CSS only** — colors, fonts, and CSS custom property values. No vocabulary changes, no copy changes, no DOM restructuring between themes.
- **D-06:** Theme switching is a CSS class on `<html>` or `<body>` (e.g., `data-theme="postdesk"` / `data-theme="terminal"`). Each theme overrides the root CSS custom properties (`--bg`, `--surface`, `--text`, `--accent`, etc.).
- **D-07:** Postdesk palette: warm cream background (~#F5F0E8), slightly lighter card surface (~#EDE8DC), deep ink navy-black (~#1A1A2E) for contrast, muted rust red (~#9B2335) for accents/active states, warm gold (~#C9A84C).
- **D-08:** Postdesk fonts: **Cormorant Garamond** (display serif, Google Fonts) for screen titles and major headings. **Special Elite** (typewriter, Google Fonts) for message body text and cipher content. Existing JetBrains Mono remains for Terminal theme.
- **D-09:** Google Fonts loaded via `<link>` in `index.html`. Both fonts added regardless of theme (small payload, avoids flash on first theme switch). Service worker must cache the font URLs.

### Theme Picker UX
- **D-10:** Theme picker lives in a new **APPEARANCE** section in settings, above ACCOUNT.
- **D-11:** Two tappable swatch cards side-by-side: "Postdesk" (cream swatch preview) and "Terminal" (dark swatch preview). Active theme shows a highlighted border or checkmark. Tapping switches instantly — no confirmation needed.

### Theme Persistence
- **D-12:** **localStorage-first:** Theme is read from localStorage on app boot and applied before any render (in `app.js` boot, before router runs). Eliminates flash of wrong theme.
- **D-13:** **Supabase sync:** A new `theme` column (`text`, default `'postdesk'`) added to the `profiles` table. On theme change: localStorage updates immediately, Supabase update fires async in background.
- **D-14:** On login: read `profile.theme` from Supabase and sync to localStorage if different. This handles cross-device consistency.
- **D-15:** **Default theme for new users: Postdesk.** New users who have no localStorage entry and no Supabase theme value get Postdesk.

### Claude's Discretion
- Avatar color generation in the inbox topbar (`_strColor` utility) — reuse existing pattern.
- Exact swatch card dimensions and styling — match the app's existing settings row aesthetic.
- Service worker font cache strategy (cache-first for Google Fonts is standard).
- Schema migration approach for adding `theme` column (can be done via Supabase SQL editor or migration file).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing code to read
- `screens/settings.js` — Full existing settings screen (expand this, don't replace wholesale)
- `screens/inbox.js` — Add avatar button to topbar here
- `style.css` — All CSS custom properties (root variables) to extend for theme system
- `lib/settings.js` — localStorage utility pattern (theme storage follows same pattern)
- `transport/supabase-transport.js` — `updateProfile` method to extend for theme field
- `schema.sql` — Profiles table structure; needs `theme text default 'postdesk'` column

### Design reference
- `.planning/design/design ideas/cipher_screenshot_description.md` — Postdesk color palette, typography specs, and design keywords. This is the canonical Postdesk reference.
- `.planning/design/design ideas/Screenshot 2026-05-03 163023.png` — Visual reference for Postdesk aesthetic

### No external specs — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `_strColor(username)` in `lib/utils.js` — generates avatar background color from username string. Reuse in inbox topbar avatar.
- `_esc()` in `lib/utils.js` — HTML escaping, use everywhere.
- `getSettings(convId)` / `putSettings(convId, patch)` in `lib/settings.js` — localStorage merge pattern. Theme storage in a top-level key (not per-conversation) follows the same localStorage pattern.
- `transport.updateProfile(userId, patch)` — already exists, extend to accept `{ theme }`.
- Existing `.settings-row`, `.settings-section-label`, `.settings-header` CSS classes — theme picker section reuses these patterns.

### Established Patterns
- CSS custom properties on `:root` — already the styling foundation. Theme = override these values with a `[data-theme="postdesk"]` selector.
- `store.get('profile')` / `store.set('profile', ...)` — profile data already in global store; `theme` field added here on load.
- Optimistic updates (display name edit) — same pattern applies to theme: update localStorage + store immediately, Supabase async.
- Screen registration via `router.register()` — settings screen already registered; inbox screen already registered.

### Integration Points
- `app.js` boot sequence — theme must be applied HERE, before router runs, to avoid flash. Read localStorage theme key, set `document.documentElement.dataset.theme`.
- `index.html` — add Google Fonts `<link>` tags here.
- `screens/inbox.js` topbar — add user avatar initial button (top-right), wired to `router.navigate('#/settings')`.
- `screens/settings.js` — add APPEARANCE section with swatch cards; wire theme switch handler.
- `transport/supabase-transport.js` — `updateProfile` already sends PATCH to profiles; extend to include `theme` field.

</code_context>

<specifics>
## Specific Ideas

- **Postdesk color palette (from design reference):**
  - Background: ~#F5F0E8 (pale parchment)
  - Surface/cards: ~#EDE8DC (lighter cream)
  - Text: ~#1A1A2E (deep ink navy)
  - Accent: ~#9B2335 (muted rust red)
  - Secondary accent: ~#C9A84C (warm gold)
  - Secondary: ~#4A5240 (muted olive)

- **Postdesk fonts:**
  - Cormorant Garamond — screen titles, topbar title, section headers
  - Special Elite — message body text, cipher content (the "typewriter" layer)
  - JetBrains Mono — stays for Terminal theme; fallback in Postdesk for code-like elements

- **Theme swatch cards:** Two cards side-by-side in the APPEARANCE section. Each shows a small color preview and the theme name. Active one has amber/rust border highlight. Tapping fires instant switch.

- **Boot theme apply:** In `app.js`, before any router call:
  ```js
  const savedTheme = localStorage.getItem('cipher-theme') || 'postdesk'
  document.documentElement.dataset.theme = savedTheme
  ```

</specifics>

<deferred>
## Deferred Ideas

- **Additional themes** (e.g., a "Slate" neutral or "Midnight Blue") — future milestone after Postdesk and Terminal are proven.
- **Per-conversation theme** — applying different aesthetics to different conversations — future idea, well out of scope.
- **Vocabulary/copy changes per theme** ("The Postdesk", "Open the desk") — discussed and deferred. May revisit in a polish phase.
- **Layout variations per theme** (raised letter-card inbox, wider message margins in Postdesk) — discussed and deferred. Postdesk v1 is CSS-only.
- **System dark/light preference detection** — deferred; default is Postdesk regardless of OS setting for now.

</deferred>

---

*Phase: 04-profile-settings-themes*
*Context gathered: 2026-05-03*
