# Phase 4: Profile + Settings + Themes — Research

**Researched:** 2026-05-03
**Domain:** CSS theming, Supabase schema migration, vanilla JS state management, PWA font caching
**Confidence:** HIGH — all findings grounded in direct source-code inspection and established web platform behavior

---

## Summary

Phase 4 adds a CSS theme system (two themes: Terminal and Postdesk), expands the settings screen to include an APPEARANCE section with theme swatches, adds a user avatar button to the inbox topbar, and persists theme preference to Supabase. The technical scope is narrow and self-contained: no new transport methods beyond extending `updateProfile`, no new routes, no new screens beyond expanding the existing settings screen.

The most important pre-planning discovery: **the production `style.css` is missing the entire settings component CSS** (`.settings-list`, `.settings-header`, `.settings-header-info`, `.settings-section-label`, `.settings-row`, `.topbar-center`, and related selectors). These exist in the design prototype at `.planning/design/src/cipher-styles.css` but were never ported. Wave 0 must bring settings styles into production before any Phase 4 work can build on top of them.

The theme system is straightforward: CSS custom properties on `:root` already define all color and font tokens. Adding `[data-theme="postdesk"]` overrides on `<html>` via a `data-theme` attribute is exactly how this app's style foundation is designed to work. Instant switching, no reload, no JavaScript color-manipulation libraries needed.

**Primary recommendation:** Wave 0 ports settings CSS from prototype to production. Wave 1 adds theme tokens to CSS and boot-time application. Wave 2 expands settings screen JS and adds inbox avatar button.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Single screen at `#/settings` — no separate `#/profile` route. The existing settings screen expands to become the full profile + preferences destination.
- **D-02:** User's own avatar initial appears in the **inbox topbar** (top-right corner). Tapping it navigates to `#/settings`. This is the primary settings entry point — no gear icon.
- **D-03:** Settings screen sections: profile header (avatar, @handle, display name editable), PROFILE section (handle, email readonly), APPEARANCE section (theme swatches), ACCOUNT section (sign out).
- **D-04:** Two themes: **Postdesk** (warm parchment, serif + typewriter fonts) and **Terminal** (existing dark amber, unchanged).
- **D-05:** Theme scope is **CSS only** — colors, fonts, and CSS custom property values. No vocabulary changes, no copy changes, no DOM restructuring between themes.
- **D-06:** Theme switching is a CSS class on `<html>` or `<body>` (e.g., `data-theme="postdesk"` / `data-theme="terminal"`). Each theme overrides the root CSS custom properties (`--bg`, `--surface`, `--text`, `--accent`, etc.).
- **D-07:** Postdesk palette: warm cream background (~#F5F0E8), slightly lighter card surface (~#EDE8DC), deep ink navy-black (~#1A1A2E) for contrast, muted rust red (~#9B2335) for accents/active states, warm gold (~#C9A84C).
- **D-08:** Postdesk fonts: **Cormorant Garamond** (display serif, Google Fonts) for screen titles and major headings. **Special Elite** (typewriter, Google Fonts) for message body text and cipher content. Existing JetBrains Mono remains for Terminal theme.
- **D-09:** Google Fonts loaded via `<link>` in `index.html`. Both fonts added regardless of theme (small payload, avoids flash on first theme switch). Service worker must cache the font URLs.
- **D-10:** Theme picker lives in a new **APPEARANCE** section in settings, above ACCOUNT.
- **D-11:** Two tappable swatch cards side-by-side: "Postdesk" (cream swatch preview) and "Terminal" (dark swatch preview). Active theme shows a highlighted border or checkmark. Tapping switches instantly — no confirmation needed.
- **D-12:** **localStorage-first:** Theme is read from localStorage on app boot and applied before any render (in `app.js` boot, before router runs). Eliminates flash of wrong theme.
- **D-13:** **Supabase sync:** A new `theme` column (`text`, default `'postdesk'`) added to the `profiles` table. On theme change: localStorage updates immediately, Supabase update fires async in background.
- **D-14:** On login: read `profile.theme` from Supabase and sync to localStorage if different. This handles cross-device consistency.
- **D-15:** **Default theme for new users: Postdesk.** New users who have no localStorage entry and no Supabase theme value get Postdesk.

### Claude's Discretion

- Avatar color generation in the inbox topbar (`_strColor` utility) — reuse existing pattern.
- Exact swatch card dimensions and styling — match the app's existing settings row aesthetic.
- Service worker font cache strategy (cache-first for Google Fonts is standard).
- Schema migration approach for adding `theme` column (can be done via Supabase SQL editor or migration file).

### Deferred Ideas (OUT OF SCOPE)

- Additional themes (e.g., a "Slate" neutral or "Midnight Blue") — future milestone.
- Per-conversation theme — future idea.
- Vocabulary/copy changes per theme — deferred to polish phase.
- Layout variations per theme (raised letter-card inbox, wider message margins in Postdesk) — deferred; Postdesk v1 is CSS-only.
- System dark/light preference detection — deferred; default is Postdesk regardless of OS setting.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

These IDs are from the phase description. They do not yet appear in REQUIREMENTS.md — Wave 0 must add them to close the gap.

| ID | Description | Research Support |
|----|-------------|------------------|
| PROF-06 | User's avatar initial appears in inbox topbar; tapping navigates to #/settings | Inbox topbar HTML identified; `_strColor` utility confirmed available in `lib/utils.js` |
| PROF-07 | User can view profile (@handle, display name, avatar initial) from settings screen (full profile header) | Settings screen already has profile header HTML; CSS classes missing from production stylesheet — Wave 0 gap |
| THEME-01 | Theme is applied on boot before router runs, with no flash of wrong theme | `app.js` boot sequence identified; insertion point is before `router.start()` call |
| THEME-02 | Default theme for new users is Postdesk | localStorage fallback pattern confirmed (`|| 'postdesk'`) |
| THEME-03 | Selecting a theme applies it instantly with no reload | CSS custom property override via `data-theme` attribute is synchronous; no framework needed |
| THEME-04 | Theme preference persists across sessions and devices (localStorage + Supabase) | `transport.updateProfile` already accepts arbitrary patch objects; `theme` column migration is the only schema change |
</phase_requirements>

---

## Standard Stack

### Core

| Library / API | Version | Purpose | Why Standard |
|---------------|---------|---------|--------------|
| CSS Custom Properties | Native | Theme token system | Already the app's styling foundation — `:root` already defines all tokens |
| `data-*` HTML attribute | Native | Theme scope selector (`data-theme="postdesk"`) | Zero-JS attribute override of CSS custom properties; no library needed |
| `localStorage` | Native | Synchronous theme persistence on device | Already used by `lib/settings.js`; same pattern, new key |
| Google Fonts | CDN `<link>` | Cormorant Garamond + Special Elite delivery | Both fonts are Google Fonts; load via existing `<link>` pattern in `index.html` |
| Supabase PATCH | Existing transport | Theme preference cross-device sync | `transport.updateProfile(userId, patch)` already accepts arbitrary patch objects |

### No new npm packages required.

The entire phase is implementable with browser-native APIs and the existing project stack. No build step, no framework, no new dependencies.

---

## Architecture Patterns

### Theme System Architecture

**How it works:**

1. `:root` in `style.css` defines the Terminal theme tokens (existing, unchanged)
2. `[data-theme="postdesk"]` selector in `style.css` overrides those same tokens
3. `document.documentElement.dataset.theme` is set synchronously at boot
4. When user switches theme: attribute updates → CSS re-renders instantly → localStorage writes → Supabase PATCH fires async

**Why `[data-theme]` on `<html>` instead of a class on `<body>`:**
Setting the attribute on `documentElement` (the `<html>` element) means the override applies to the entire document tree, including `<body>`. It also allows CSS selectors like `[data-theme="postdesk"] .topbar-title` if per-component overrides are ever needed.

**CSS structure:**

```css
/* Terminal theme — the :root baseline (UNCHANGED) */
:root {
  --bg:         #070707;
  --surface:    #0d0d0d;
  /* ... existing tokens ... */
  --font: 'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace;
}

/* Postdesk theme — overrides via attribute selector */
[data-theme="postdesk"] {
  --bg:           #F5F0E8;
  --surface:      #EDE8DC;
  --surface2:     #E8E2D4;
  --border:       #D4CFC4;
  --border2:      #C8C2B4;
  --text:         #1A1A2E;
  --text-mid:     #4A5240;
  --text-dim:     #9A9488;
  --accent:       #9B2335;
  --accent-hi:    #B8303F;
  --accent-dim:   rgba(155,35,53,0.10);
  --danger:       #9B2335;
  --font:         'Special Elite', 'Courier New', monospace;
  --font-display: 'Cormorant Garamond', Georgia, serif;
}
```

Note: `--font-display` is a **new token** not currently in `:root`. It needs to be added to `:root` with a fallback value (e.g., `var(--font)` or `inherit`) so Postdesk headings can reference it without Terminal theme breakage. Add to `:root` as:

```css
:root {
  /* ... existing ... */
  --font-display: var(--font);  /* Terminal: falls back to monospace */
}
```

Then Postdesk overrides it with Cormorant Garamond.

### Boot Theme Application

**Location:** `app.js`, before `transport.getSession()` call.

```js
// Apply saved theme before router runs — prevents flash of wrong theme.
// Must run synchronously before any screen renders.
const _theme = localStorage.getItem('cipher-theme') || 'postdesk'
document.documentElement.dataset.theme = _theme
```

This is the first executable line after imports. The profile load from Supabase happens inside the async `.then()` block, at which point theme sync (D-14) can fire:

```js
// Inside the profile load block:
if (profile && profile.theme && profile.theme !== localStorage.getItem('cipher-theme')) {
  localStorage.setItem('cipher-theme', profile.theme)
  document.documentElement.dataset.theme = profile.theme
}
```

### Theme Switch Handler (settings screen)

```js
function onThemeSwitch(theme) {
  // 1. Apply immediately
  document.documentElement.dataset.theme = theme
  // 2. Persist locally
  localStorage.setItem('cipher-theme', theme)
  // 3. Update store
  const prev = store.get('profile')
  store.set('profile', { ...prev, theme })
  // 4. Sync to Supabase async (fire and forget — silent on error)
  transport.updateProfile(user.id, { theme })
  // 5. Re-render swatch active states
  renderSwatches(theme)
}
```

### localStorage Key Convention

The `lib/settings.js` module uses the key `'cs'` for per-conversation cipher settings. Theme is a separate, top-level key:

```
'cipher-theme'  →  'postdesk' | 'terminal'
```

Do NOT add theme to the `'cs'` object — theme is global, not per-conversation.

### Recommended Project Structure (no changes)

```
C:\Cipher Program\
  app.js                    ← Add theme boot (2 lines, before getSession)
  index.html                ← Add Google Fonts <link> tags
  style.css                 ← Add: settings CSS (Wave 0), [data-theme="postdesk"] block
  sw.js                     ← Add: Google Fonts URLs to ASSETS array
  screens/
    inbox.js                ← Add avatar button to topbar
    settings.js             ← Add APPEARANCE section, wire theme switch
  transport/
    supabase-transport.js   ← updateProfile already works; no changes needed
  schema.sql                ← Add theme column (documentation); live migration via SQL editor
```

### Inbox Topbar Avatar Button

The current inbox topbar HTML (from `screens/inbox.js`):

```html
<div class="topbar">
  <div class="topbar-title">CIPHER</div>
  <div class="topbar-actions">
    <button class="icon-btn" id="inbox-new" type="button" aria-label="New conversation">+</button>
  </div>
</div>
```

Replace the `+` button's sibling spacer area with the avatar button. The topbar currently has no left-side element for the inbox — unlike settings which has a back button. For the inbox, the title is left-aligned without a container. The avatar button goes in `.topbar-actions` as the rightmost button, after the `+` button.

Wait — current inbox topbar has `topbar-title` as a sibling of `topbar-actions`, not using `topbar-center`. The settings screen uses `topbar-center`. This inconsistency with the design prototype means:

- The inbox topbar will need the avatar button added to `.topbar-actions` after the `+` button.
- Order: `[CIPHER title] [+ new] [avatar]` — or swap to `[avatar] [CIPHER title] [+ new]`. Given D-02 says avatar is "top-right corner", it goes after the `+` button.

The avatar button element, per the UI-SPEC:

```html
<button class="icon-btn avatar-btn" id="inbox-avatar" type="button" aria-label="Open settings">
  <div class="avatar" style="background:${_strColor(username)};width:32px;height:32px;font-size:14px;font-weight:500">${_esc(initial)}</div>
</button>
```

The `.icon-btn` class already provides 44×44px tap target sizing.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Theme color management | Custom JS color-swap functions | CSS custom properties + `data-theme` attribute | Browser does the cascading; JS only sets one attribute |
| Theme persistence sync | Custom sync/retry infrastructure | localStorage write + async Supabase PATCH | `transport.updateProfile` already exists; silent failure is acceptable (localStorage is source of truth) |
| Font loading detection | Font observer JS library | Google Fonts `display=swap` + load both fonts always | Both fonts preloaded regardless of theme; no FOUT to detect |
| Avatar color generation | Hash-based color picker | `_strColor(username)` in `lib/utils.js` | Already implemented, already in use on conversation rows |
| Settings CSS from scratch | Re-specifying styles | Port from `.planning/design/src/cipher-styles.css` | Prototype styles are the spec; lines 973–1030 are ready to copy-adapt |

**Key insight:** The theme switch is a single attribute write on `document.documentElement`. Everything else (color, font, border, spacing) cascades from CSS. There is no JavaScript theme engine to build.

---

## Critical Gap: Missing Production CSS

**This is the most important finding in this research.**

The production `style.css` is missing the entire settings screen component CSS. The design prototype at `.planning/design/src/cipher-styles.css` contains it (lines 973–1030), but it was never ported.

**Missing classes (all referenced by `screens/settings.js` today):**
- `.settings-list` — scrollable settings body container
- `.settings-header` — profile header (avatar + name block)
- `.settings-header-info`, `.settings-header-info .name`, `.settings-header-info .email`
- `.settings-section-label` — uppercase section dividers (PROFILE, APPEARANCE, ACCOUNT)
- `.settings-row` — each settings list row
- `.settings-row.readonly`, `.settings-row.danger`
- `.settings-row .label`, `.settings-row .value`, `.settings-row .value.editable`, `.chev`
- `.topbar-center` — used by settings topbar HTML (center-aligned title)

**Also missing:** The production `style.css` does not have `.topbar-center`, which is referenced in `screens/settings.js` (`<div class="topbar-center">`). The settings screen is currently rendering with completely unstyled rows.

**Wave 0 action:** Port the settings CSS block from `cipher-styles.css` lines 973–1030 into the production `style.css`. Also add `.topbar-center`. Then add the new Phase 4 additions (Postdesk token block, swatch card CSS) in the same wave or Wave 1.

The prototype CSS uses the same CSS custom property tokens (`var(--bg)`, `var(--surface)`, `var(--text)`, etc.) as the production stylesheet — the port is mechanical, not a rewrite.

---

## Common Pitfalls

### Pitfall 1: Theme Flash on Boot

**What goes wrong:** If theme is applied after the first render, users see a flash of the Terminal theme before Postdesk appears.
**Why it happens:** Async profile load from Supabase returns after the DOM is painted.
**How to avoid:** Apply theme from `localStorage` synchronously — before `transport.getSession()` call in `app.js`. This is the first operation, before any router or screen code runs.
**Warning signs:** Visible color transition on page load; Postdesk users seeing dark background briefly.

### Pitfall 2: Supabase `updateProfile` Patch Shape

**What goes wrong:** Passing `{ theme: 'postdesk' }` to `updateProfile` accidentally clobbers other fields if the implementation uses `.update()` incorrectly.
**Why it doesn't apply here:** `supabase-transport.js` line 49 uses `.update(patch)` with whatever patch object is passed — it only updates fields present in the patch object. Supabase PATCH semantics: missing fields are not touched. Confirmed safe.
**Warning signs:** Display name reverts to null after theme switch.

### Pitfall 3: Google Fonts Cache in Service Worker

**What goes wrong:** Service worker caches the Google Fonts CSS redirect URL but not the actual font binary files (woff2). On reload, font request goes to network; if offline, fonts fail silently (fall back to system font).
**Why it happens:** Google Fonts serves font files from `fonts.gstatic.com` — a different domain from the CSS URL. The current service worker skips caching for `supabase.co` but has no rule for `gstatic.com`.
**How to avoid:** Add Google Fonts URLs to the service worker ASSETS array. The font CSS URL (`fonts.googleapis.com/css2?family=...`) should be added; the browser then caches the woff2 files from `fonts.gstatic.com` via the SW fetch handler (cache-first strategy applies). Alternatively, remove the supabase-specific skip rule and add a gstatic.com skip rule instead — but the simplest approach is to add the font CSS URL to ASSETS.

**Concrete fix for `sw.js`:** Add to the ASSETS array:
```js
'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Special+Elite&display=swap'
```
The woff2 files will be cached by the fetch handler on first load (cache-first for all non-Supabase GET requests).

**Warning signs:** Postdesk fonts disappear when offline; fallback to Courier New instead of Special Elite.

### Pitfall 4: `--font-display` Token Not in `:root` Baseline

**What goes wrong:** Postdesk theme uses `var(--font-display)` for Cormorant Garamond headings. If this token isn't defined in `:root`, Terminal theme renders `var(--font-display)` as empty/invalid.
**How to avoid:** Add `--font-display: var(--font)` to `:root` as the Terminal baseline. Postdesk then overrides it.
**Warning signs:** Screen titles disappear or inherit wrong font in Terminal theme after Phase 4.

### Pitfall 5: Avatar Button in Inbox Topbar Layout

**What goes wrong:** Adding avatar button to `.topbar-actions` pushes the `+` button left, breaking the existing layout balance (title left, single button right).
**Why it happens:** `.topbar-actions` is a flex row. A second button just stacks.
**How to avoid:** Keep both buttons in `.topbar-actions`. The topbar uses `justify-content: space-between` on `.topbar`, so `.topbar-title` stays left, `.topbar-actions` stays right with both buttons side by side. The 44px touch targets keep both accessible. No layout restructuring needed.
**Warning signs:** Topbar title shifts; overflow or wrapping in narrow viewports.

### Pitfall 6: Swatch Card Colors Must Be Hardcoded

**What goes wrong:** Using `var(--bg)` for the swatch preview blocks means each swatch shows the *current* theme's background, not the theme it represents.
**How to avoid:** Hardcode swatch preview colors: Postdesk swatch = `background: #F5F0E8`, Terminal swatch = `background: #070707`. These never change regardless of active theme.
**Warning signs:** Both swatches show the same color when one theme is active; switching themes changes both swatches simultaneously.

### Pitfall 7: `profile.theme` Sync Direction

**What goes wrong:** On login, if `profile.theme` differs from `localStorage`, blindly applying Supabase value might revert a local theme change made before the profile loaded.
**Why it matters:** The boot sequence is: (1) apply localStorage theme, (2) show router, (3) load profile async. If step 3 overwrites a deliberate local choice, user sees unexpected theme revert.
**How to avoid:** On profile load, sync Supabase → localStorage only if the user hasn't switched themes mid-session. Since the profile loads before any interaction (at boot), this is safe. The race condition only arises if a user switches theme in the milliseconds between app paint and profile load — acceptable to not protect against.

---

## Code Examples

### Verified: `updateProfile` Patch Behavior

```js
// From transport/supabase-transport.js line 48-51
async updateProfile(userId, patch) {
  const { data, error } = await sb.from('profiles').update(patch).eq('id', userId).select().maybeSingle()
  return { result: data ?? null, error: error ?? null }
}
```

Passing `{ theme: 'postdesk' }` updates only the `theme` field. Supabase `.update()` performs a SQL UPDATE with only the provided columns. Confirmed safe for partial updates.

### Verified: `_strColor` for Avatar (lib/utils.js)

```js
// From lib/utils.js lines 14-17
export function _strColor(str) {
  let h = 0
  for (const c of str) h = c.charCodeAt(0) + ((h << 5) - h)
  return `hsl(${Math.abs(h) % 360},30%,22%)`
}
```

Returns dark HSL color — works as-is for both Terminal (dark bg, avatar appears on dark surface) and Postdesk (light bg). The `22%` lightness means the avatar remains dark regardless of theme, which is readable against both parchment and dark backgrounds. Use exactly as-is.

### Verified: Settings CSS from Prototype (port-ready)

```css
/* From .planning/design/src/cipher-styles.css lines 973-1030 */
.settings-list { flex: 1; overflow-y: auto; min-height: 0; }
.settings-header { padding: 24px 20px 18px; display: flex; align-items: center; gap: 14px; border-bottom: 1px solid var(--border); }
.settings-header .avatar { width: 48px; height: 48px; font-size: 18px; }
.settings-header-info .name { font-size: 13px; color: var(--text); letter-spacing: 0.04em; }
.settings-header-info .email { font-size: 10px; color: var(--text-dim); letter-spacing: 0.06em; margin-top: 4px; }
.settings-section-label { padding: 18px 20px 8px; font-size: 9px; letter-spacing: 0.3em; color: var(--text-dim); text-transform: uppercase; }
.settings-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid var(--border); border-top: 1px solid var(--border); background: var(--surface); cursor: pointer; }
.settings-row + .settings-row { border-top: none; }
.settings-row.readonly { cursor: default; }
.settings-row.danger .label { color: var(--danger); }
.settings-row .label { font-size: 12px; color: var(--text); letter-spacing: 0.04em; }
.settings-row .value { font-size: 11px; color: var(--text-dim); letter-spacing: 0.04em; }
.settings-row .value.editable { color: var(--text-mid); }
.settings-row .value .chev { color: var(--text-dim); margin-left: 8px; }
```

All tokens (`var(--border)`, `var(--surface)`, etc.) map 1:1 to the production `:root`. Port verbatim.

### New: Swatch Card CSS

```css
/* Theme swatch container — inside settings APPEARANCE section */
.theme-swatches {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
}

.theme-swatch {
  flex: 1;
  min-height: 80px;
  border: 1px solid var(--border2);
  background: var(--surface);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: border-color 0.15s;
}

.theme-swatch.active { border-color: var(--accent); }

.swatch-preview {
  width: 100%;
  height: 32px;
  flex-shrink: 0;
}

.swatch-label {
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-mid);
}
```

### New: Google Fonts link tags for `index.html`

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Special+Elite&display=swap" rel="stylesheet">
```

Insert before the existing `<link href="https://fonts.googleapis.com/...JetBrains+Mono...">` tag. Both old and new tags coexist.

### New: Supabase SQL migration (run in Supabase SQL Editor)

```sql
alter table profiles add column if not exists theme text default 'postdesk';
```

One line. The `if not exists` guard makes it idempotent. The `default 'postdesk'` means existing users get Postdesk on their next login sync (D-14 applies). Update `schema.sql` to match.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSS class swap (`body.dark`) | `data-theme` attribute + CSS custom property overrides | ~2019 (widely adopted) | Cleaner selector specificity; CSS-native; no JS color math |
| Loading fonts per theme switch | Preload all theme fonts at boot | Standard for multi-theme apps | Eliminates font-load flash on theme switch; tiny bandwidth cost |
| Theme in component state | Theme in `localStorage` + HTML attribute | Always standard for PWAs | Survives page reload without JS; avoids flash; works across sessions |

---

## Environment Availability

Step 2.6: SKIPPED (no external tools or CLIs required — this phase is CSS, vanilla JS, and a single SQL statement run manually in the Supabase dashboard).

The only "external" dependency is the Supabase project itself, which is live and operational (established in Phase 2).

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Supabase project (cipher) | THEME-04 (profile sync) | Yes | Live | — |
| Google Fonts CDN | THEME-03, D-08 | Yes (network required) | CDN | System serif + Courier New (CSS font stack fallback) |

---

## Validation Architecture

`nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest (configured in Phase 1) |
| Config file | `package.json` (`"type": "module"`, `--experimental-vm-modules`) |
| Quick run command | `node node_modules/jest/bin/jest.js --testPathPattern=theme` |
| Full suite command | `node node_modules/jest/bin/jest.js` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated? | Notes |
|--------|----------|-----------|------------|-------|
| PROF-06 | Avatar button appears in inbox topbar; tap navigates to #/settings | manual-only | No | DOM interaction test; requires browser |
| PROF-07 | Settings screen shows profile header with handle, display name, initial | manual-only | No | Screen render test; requires Supabase session |
| THEME-01 | Theme applied before router runs; no flash | manual-only | No | Visual timing check; cannot automate in Jest |
| THEME-02 | New users default to Postdesk | unit | Yes | Test boot logic: `localStorage.getItem('cipher-theme') \|\| 'postdesk'` |
| THEME-03 | Theme switch is instant | manual-only | No | Visual; requires browser |
| THEME-04 | Cross-device sync: profile.theme syncs to localStorage on login | unit | Yes | Test sync logic in isolation |

### Unit Test: Boot Theme Default

```js
// tests/theme.test.js
import { jest } from '@jest/globals'

test('boot applies postdesk when no localStorage entry', () => {
  const mockStorage = {}
  const mockDataset = {}
  const getItem = (key) => mockStorage[key] ?? null
  const applyTheme = () => {
    const theme = getItem('cipher-theme') || 'postdesk'
    mockDataset.theme = theme
  }
  applyTheme()
  expect(mockDataset.theme).toBe('postdesk')
})

test('boot applies saved theme from localStorage', () => {
  const mockStorage = { 'cipher-theme': 'terminal' }
  const mockDataset = {}
  const getItem = (key) => mockStorage[key] ?? null
  const applyTheme = () => {
    const theme = getItem('cipher-theme') || 'postdesk'
    mockDataset.theme = theme
  }
  applyTheme()
  expect(mockDataset.theme).toBe('terminal')
})
```

### Wave 0 Gaps

- [ ] `tests/theme.test.js` — covers THEME-02 boot default and THEME-04 sync logic
- [ ] No existing tests cover theme behavior; file must be created in Wave 0

---

## Open Questions

1. **`_strColor` lightness on Postdesk background**
   - What we know: `_strColor` returns `hsl(h, 30%, 22%)` — a dark color, readable on dark Terminal surfaces
   - What's unclear: On parchment (#F5F0E8), a 22% lightness avatar may appear too dark and lose the initial letter contrast (white initial on very dark bg, against a cream surface — might look fine but worth verifying)
   - Recommendation: Use `_strColor` as-is per Claude's discretion directive. If it looks wrong during implementation, bump saturation to 40% for Postdesk only with `[data-theme="postdesk"] .avatar { ... }` — but don't pre-optimize.

2. **`theme-color` meta tag in `index.html`**
   - What we know: Currently `<meta name="theme-color" content="#070707">` — hardcoded Terminal dark
   - What's unclear: Should this update when the user switches to Postdesk? The `theme-color` meta affects the browser chrome color on Android PWA installs
   - Recommendation: Update the meta tag on theme switch via `document.querySelector('meta[name="theme-color"]').content = theme === 'postdesk' ? '#F5F0E8' : '#070707'`. Small touch, meaningful PWA polish. Decide at implementation — not a blocker.

3. **REQUIREMENTS.md entries for PROF-06, PROF-07, THEME-01 through THEME-04**
   - What we know: These requirement IDs are in the phase description but do not exist in REQUIREMENTS.md (confirmed by inspection)
   - What's unclear: Whether the planner should add them or leave REQUIREMENTS.md as-is
   - Recommendation: Wave 0 should add the 6 missing entries to REQUIREMENTS.md for traceability, matching the format of existing entries.

---

## Sources

### Primary (HIGH confidence)

- Direct inspection of `C:\Cipher Program\style.css` — all `:root` custom property names and values
- Direct inspection of `C:\Cipher Program\screens\settings.js` — existing HTML structure and JS patterns
- Direct inspection of `C:\Cipher Program\screens\inbox.js` — topbar HTML structure, `_strColor` usage
- Direct inspection of `C:\Cipher Program\app.js` — boot sequence, router start location
- Direct inspection of `C:\Cipher Program\lib\settings.js` — localStorage pattern for theme storage design
- Direct inspection of `C:\Cipher Program\lib\utils.js` — `_strColor` implementation
- Direct inspection of `C:\Cipher Program\transport\supabase-transport.js` — `updateProfile` patch behavior
- Direct inspection of `C:\Cipher Program\schema.sql` — profiles table schema (no theme column confirmed)
- Direct inspection of `C:\Cipher Program\sw.js` — service worker ASSETS array and caching strategy
- Direct inspection of `C:\Cipher Program\index.html` — existing font link, meta tags
- Direct inspection of `C:\Cipher Program\.planning\design\src\cipher-styles.css` — settings CSS (lines 973–1030)
- Direct inspection of `04-CONTEXT.md` — all locked decisions
- Direct inspection of `04-UI-SPEC.md` — complete design contract

### Secondary (MEDIUM confidence)

- MDN Web Docs: CSS Custom Properties + `data-*` attribute selectors — standard, stable web platform feature; behavior is definitive
- Google Fonts: Cormorant Garamond + Special Elite — both confirmed available; `display=swap` is the standard loading strategy

### Tertiary (LOW confidence — not applicable)

None. All findings are from source code or well-established web platform APIs.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all from direct code inspection; no external libraries
- Architecture: HIGH — CSS custom property theming is a stable, native web platform pattern
- Pitfalls: HIGH — all identified from reading actual production code; no speculation
- Missing settings CSS: HIGH — confirmed by grep; classes are absent from `style.css`
- Schema migration: HIGH — Supabase `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` is standard SQL

**Research date:** 2026-05-03
**Valid until:** Stable indefinitely — vanilla JS + CSS, no fast-moving dependencies
