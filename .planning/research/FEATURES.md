# Feature Landscape — Cipher

**Domain:** Encrypted messaging PWA with historical cipher aesthetic
**Researched:** 2026-04-27
**Mode:** Rebuild quality research — features locked, focus on what makes them excellent

---

## 1. Card-Flip Decode UX

### The Pattern

Each locked message bubble is a 3D card. Front face shows the cipher-encoded text (the runes, the Morse, the shifted alphabet). Tapping flips the card to reveal the decode controls on the back face — cipher selector, key field, decode button. Decoding flips back to front and shows plaintext.

This is the core UX moment in the app. The flip is the product.

### CSS Implementation Pattern

The flip is pure CSS 3D transforms triggered by a class toggle. The key properties:

```css
.card-container {
  perspective: 900px;          /* Parent provides the 3D depth */
}

.card {
  position: relative;
  transform-style: preserve-3d;   /* Children render in 3D space */
  transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}

.card.flipped {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;    /* Face hides when rotated past 90deg */
}

.card-back {
  transform: rotateY(180deg);     /* Starts facing away */
}
```

**Timing:** 0.4–0.5s with a material ease-in-out (`cubic-bezier(0.4, 0, 0.2, 1)`) reads as intentional and satisfying without being slow. Under 0.3s feels like a glitch. Over 0.6s feels like waiting.

### Critical Gotchas (HIGH confidence — MDN verified)

**The preserve-3d flatteners.** Any of these on the `.card` element or its ancestors will silently break the 3D effect with no console error:
- `opacity` less than 1 (common if you fade in new messages)
- `overflow: hidden` (common on bubble containers for border-radius clipping)
- `filter` of any kind
- `clip-path`

The `overflow` one is the biggest trap. Bubbles typically need `overflow: hidden` for rounded corners. The fix: apply `border-radius` and `overflow: hidden` on the `.card-container` wrapper (the perspective element), not on the `.card` itself.

**backface-visibility requires 3D transforms to have any effect.** It does nothing on a 2D-only element. Both faces need the property, and the back face must start with `transform: rotateY(180deg)`.

**Scroll position on flip.** When a card changes height during the flip (front is one line of cipher text, back is taller with form controls), the message list will reflow. This causes scroll jump. Prevention:

Option A — Fixed card height. Set a `min-height` that accommodates the back face. The locked state gets extra whitespace but scroll is stable.

Option B — Lock scroll position manually before flip, restore after transition ends:
```javascript
const list = document.getElementById('msg-list')
const scrollY = list.scrollTop
card.classList.add('flipped')
card.addEventListener('transitionend', () => {
  list.scrollTop = scrollY
}, { once: true })
```

Option B is better because it preserves the ambient aesthetic of each message taking only the space it needs.

**Only one card flipped at a time.** If the user taps a second message while one is already flipped, flip the first one back before flipping the second. Stacking two flipped cards in a message list looks broken. In the JS layer: track a single `activeFlip` reference.

**"Keep decoded" messages must not be card-flip elements.** A message that auto-decoded on load should render as a plain bubble — no flip behavior, no locked face. Structurally different element type, not a hidden face. This keeps the DOM clean and avoids re-triggering a flip animation on already-decoded messages during re-renders.

### Layout Recommendation

```
.msg-wrap
  └── .msg-card-container   ← perspective + overflow:hidden + border-radius here
        └── .msg-card        ← transform-style:preserve-3d + transition
              ├── .msg-card-front   ← backface-visibility:hidden
              │     └── cipher text, lock glyph
              └── .msg-card-back    ← backface-visibility:hidden, rotateY(180deg)
                    └── cipher selector, key input, decode button, keep-decoded toggle
```

The `perspective` element and the `overflow:hidden` element are the same element (`.msg-card-container`). This sidesteps the flattening conflict entirely.

### Feedback States

- The lock glyph (⚿) on the front face should be `--accent` colored, dimly glowing. Makes locked messages feel intentional, not broken.
- Cipher-encoded text on the front: render in `--text-dim` (dimmer than normal text). It's a locked message — it should feel inaccessible.
- After decode: transition the text color from `--text-dim` to `--text` on the front face. The decoded text arriving should feel like it "brightens."
- Wrong key: don't alert(). Show an inline error on the back face in `--danger` color. Alert() breaks the immersion completely.

---

## 2. "Keep Decoded" UX

### What It Is

A per-conversation preference. When on, the app auto-decodes every message (existing and incoming) using the locally-stored cipher + key, without the user touching anything. The message arrives decoded.

### The State Machine

A conversation has three decode states:
1. **Locked** — No preference set. All messages show as cipher text. User must flip to decode one at a time.
2. **Live-decoding** — `keep: true`, `key` stored. Messages auto-decode on load and on receive. Card flip never appears.
3. **Partially decoded** — `keep: true` but no key yet (shouldn't happen after v1 design, but guard for it).

### What the UI Looks Like When "Keep" Is On

The compose bar should show a persistent indicator that auto-decode is active — something subtle like a dim amber dot or a small `AUTO` label near the cipher selector. Not a banner, not a modal. One small ambient signal.

The "Keep decoded for me" toggle lives on the back face of the card (in the decode flow). Once checked and decoded, it persists. But the user needs a way to turn it off. This belongs in settings or in a long-press context menu on the conversation. For v1, the simplest path: put a "Cipher settings" option in the chat topbar menu (three-dot or gear icon), which opens a minimal sheet — current cipher, key (masked), keep toggle.

**Do not show the key in plaintext** in the settings sheet. Show `••••••` with an eye toggle. The key is a secret.

### The Incoming Message Flow (Keep On)

When a realtime message arrives and `keep: true`:
1. Message renders immediately as a normal decoded bubble (no flip, no lock glyph)
2. No animation needed — it just appears like a normal message in any messaging app
3. Scroll to bottom as usual

This is the "comfortable" mode. The app behaves like iMessage once you've trusted a contact. The cipher is invisible.

### The Incoming Message Flow (Keep Off)

When a realtime message arrives and `keep: false`:
1. Message renders as a locked card (cipher text on front, lock glyph)
2. A subtle pulse animation on the lock glyph draws attention — one pulse, not continuous
3. Scroll to bottom

The pulse communicates "something arrived and needs your attention" without an alert or badge.

### Toggle Copy

The checkbox label matters. "Keep decoded for me" is correct — it communicates local-only storage implicitly ("for me" = "on my device"). Avoid "Remember cipher settings" (sounds like a preference panel) or "Auto-decode" (sounds like the app is doing something magical). "Keep decoded for me" is plain language that accurately describes what happens.

---

## 3. PWA Install + Offline UX

### Service Worker Caching Strategy

The v0 sw.js is a correct foundation — cache-first for app shell, passthrough for Supabase calls. The rebuild should keep this structure and harden two things:

**Cache versioning.** Version the cache name with a build hash or date string so deploys invalidate correctly. The v0 uses `cipher-v1` as a static string — this means after a GitHub Pages deploy, users on the old service worker keep serving the old files indefinitely until they manually clear cache. Fix: `cipher-2026-04-27` or tie it to a version constant that you increment intentionally.

**Font caching.** The v0 doesn't cache JetBrains Mono. If the user is offline, the app loads with a system monospace fallback and the entire aesthetic shifts. Add the Google Fonts request to the precache list (or better: self-host the font in the repo so it's a local asset and the problem goes away).

Recommended cache strategy by resource type (HIGH confidence — MDN verified):

| Resource | Strategy | Rationale |
|---|---|---|
| index.html, app JS, CSS | Cache-first | App shell; deploy versioning handles staleness |
| manifest.json, icons | Cache-first | Static; rarely change |
| JetBrains Mono font | Cache-first (self-hosted) | Aesthetic-critical; no reason to re-fetch |
| Supabase API calls | Network-only (passthrough) | Messages must be live; never stale |
| Supabase Realtime (WebSocket) | Not cacheable | Service workers can't intercept WebSockets |

**The one thing not to cache:** Supabase auth tokens. The service worker should never intercept `supabase.co/auth/` requests. The v0 correctly skips all `supabase.co` URLs — preserve that.

### Offline State Handling

When offline, the app shell loads from cache and the UI renders. But Supabase calls fail. The experience without handling: the user sees "Loading..." forever, or a cryptic network error.

What to do instead:
- Detect offline state with `navigator.onLine` and the `offline` event
- Show a minimal persistent indicator: a dim red dot or "OFFLINE" label in the topbar
- Disable the send button and compose bar
- Messages list shows last-cached state (which is nothing, since messages aren't cached — the inbox will be empty)

For v1, caching messages locally is out of scope. An honest offline state is: "You need a connection to send or receive messages." The app shell loads, the user sees their inbox structure, but no content. That is acceptable and honest. Do not show stale message counts or ghost conversations.

### PWA Install Prompt

Requirements for browser installability (HIGH confidence — MDN verified):
- HTTPS (GitHub Pages satisfies this)
- Valid `manifest.json` with `name`, `icons` (192px + 512px), `start_url`, `display: standalone`
- Registered service worker
- Icons must actually exist (v0 has a known bug: icons referenced in manifest don't exist on disk)

**When to surface the install prompt.** The `beforeinstallprompt` event fires when the browser decides the app is eligible. Best practice: capture the event, don't immediately show it. Wait for a meaningful moment — after the user successfully sends their first message, or after their first successful login. Not on the auth screen, not on first load.

Implementation pattern:
```javascript
let _installPrompt = null

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()           // Suppress automatic browser prompt
  _installPrompt = e           // Save it for later
})

function showInstallButton() {
  if (!_installPrompt) return
  // Show a small "Install app" button in the topbar or settings
}

async function doInstall() {
  if (!_installPrompt) return
  _installPrompt.prompt()
  const { outcome } = await _installPrompt.userChoice
  if (outcome === 'accepted') _installPrompt = null
}
```

**Where to put the install button.** Settings screen. Not a banner, not a modal, not a floating button. Users who want to install will look in settings. The install prompt in a prominent position feels like an ad — it undermines the "tool, not toy" aesthetic. A single row in settings: `[ Install App ]` — same styling as other action rows.

**iOS Safari.** `beforeinstallprompt` does not fire on iOS. iOS users must use the Share sheet manually. In settings, detect iOS and show a manual instruction row instead of a button: "To install: tap Share → Add to Home Screen." Detect with `navigator.userAgent.includes('iPhone') || navigator.standalone !== undefined`.

---

## 4. Invite Link Flow

### The Trust Problem

An invite link arrives via SMS, Signal, Discord, or in person. The recipient has no prior context about what Cipher is. They tap a URL that ends in a hash fragment like `#/invite/a3f8b2c1`. If the landing experience is confusing or sketchy-feeling, they close it. The product never got a chance.

The landing experience must answer three questions in under 3 seconds:
1. What is this?
2. Is it safe to proceed?
3. What do I do next?

### Landing Screen Design

When `#/invite/:code` loads and the user is not authenticated, show a purpose-built landing screen before the auth form — not a generic auth screen.

What it needs:
- The sender's @handle ("@jordan invited you to Cipher")
- One sentence explaining the app ("Encrypted messaging. The server never sees your messages.")
- The invite expiry ("This link expires in 7 days")
- A single CTA: "Create account to continue" or "Sign in to continue" (two tabs, as in v0)
- The Cipher wordmark and aesthetic — this is the app's first impression

What it must not have:
- Marketing copy
- A list of features
- Any external links
- A "Learn more" option that goes anywhere

The invite code must be preserved through auth. The v0 stores it in `sessionStorage` before redirecting to auth, which is correct. The risk: if the user refreshes mid-flow, sessionStorage survives but a full navigation away loses it. Acceptable v1 behavior — document it.

### The Acceptance Flow

After auth and profile setup, the app processes the invite:

```
Check invite validity (code exists, not expired, not creator's own link, not already used)
  ↓
Create conversation + add both members
  ↓
Navigate to the new chat
```

Critical feedback moments:
- "Processing invite..." during the async operations — the v0 does this correctly
- Clear error messages for each failure case: expired, used, own invite, DB error
- On success: navigate directly to the chat with a subtle welcome state

**The "own invite" edge case.** If the creator opens their own link (common — they tap "Copy" and accidentally tap the link too), show a graceful message: "That's your invite link — share it with someone else." Not an error. Not alarming. Helpful.

**The "already used" edge case.** If the recipient opens the link again after already accepting it, navigate them directly to the conversation. Don't show an error. They're probably just trying to find the chat.

### What Makes It Feel Trustworthy

- Consistent aesthetic. The invite landing screen looks like the same app as the auth screen as the chat screen. No visual discontinuity.
- The sender is identified. "@jordan invited you" is personal. "You've been invited to join Cipher" is a marketing email.
- Security framing is ambient, not loud. "The server never sees your messages" as a subtitle, not as a SECURITY GUARANTEE badge.
- The link structure matters. `#/invite/a3f8b2c1` is cleaner than `/invite?code=a3f8b2c1&ref=...&utm=...`. Hash-only URLs feel clean and are already what the v0 uses.
- No unnecessary data collection during sign-up. Email + password + @handle. That's it. No phone number, no name, no birthday. The minimal ask signals that the app is not harvesting data.

---

## 5. Settings Screen

### What Belongs in v1 Settings

Settings for a minimal mobile app should answer: "What do I need to manage or change that I can't reach from the main flow?" Only include things that are genuinely needed.

**Include:**

| Item | Type | Why |
|---|---|---|
| Display name | Editable text field | Users want to fix typos or change what others see |
| @handle | Read-only, shown as context | People forget their own handle |
| Account email | Read-only | Orientation — which account am I using? |
| Sign out | Destructive action button | Must be accessible; v0 had it on the topbar as a power icon |
| Install app | Conditional action | Show only when `beforeinstallprompt` is ready (or iOS instruction) |
| App version | Read-only micro text | Useful for debugging; free to include |

**Explicitly exclude:**

| Item | Why |
|---|---|
| Notification settings | Notifications not built yet |
| Theme/appearance | One theme — this is intentional |
| Cipher defaults | Per-conversation settings live in the chat, not globally |
| Privacy/security toggles | Nothing to toggle — the security model is always-on |
| "About" section | A separate about page is empty calories for v1 |
| Account deletion | Important long-term, out of scope for v1 |

### Layout Pattern

Settings on mobile reads best as a single scrollable list of sections with row items. No tabs, no sub-pages for v1. Max one level deep.

```
[ Header: avatar initial, @handle, email ]

[ SECTION: Profile ]
  Display name →   [ editable field or tap to edit ]

[ SECTION: App ]
  Install app      [ button row, conditional ]

[ SECTION: Account ]
  Sign out         [ red text, destructive ]
```

The avatar/handle header at the top provides immediate orientation ("I'm looking at my own account"). This pattern is used by Signal, iMessage, Telegram — it's expected.

**Display name editing.** Two patterns exist:

Option A — Inline edit: tap the display name row, it becomes an input field in place. Save on blur or with a checkmark. No navigation.

Option B — Tap to edit screen: tap opens a dedicated edit screen. Simpler but adds a nav step.

Option A is correct for this app. A dedicated edit screen for one field is over-engineering. Inline edit with optimistic update (update the UI immediately, fire the Supabase call async, revert on error) feels snappy.

**Sign out placement.** Bottom of the list, styled in `--danger` color, in its own section. Not a topbar icon — the topbar is too easy to accidentally tap. The v0 put a power icon in the topbar alongside the new conversation button, which is a tap-target proximity problem. Settings → Sign Out is the correct pattern.

### What Makes It Feel Intentional

The difference between a settings screen that feels intentional and one that feels thrown-together:

1. **Every row has a purpose.** If you can't articulate why a setting exists, remove it.
2. **Destructive actions are visually distinct.** Sign out in red, separated from other actions by a section break.
3. **Read-only rows look different from interactive ones.** @handle and email have no chevron, no tap affordance. Display name has an edit affordance. Visual hierarchy communicates interaction model.
4. **No orphaned settings.** A setting with no visible effect (because the feature it controls isn't built yet) should not exist.

---

## Feature Dependencies

```
Auth → Setup (handle required before inbox)
Auth → Accept Invite (invite stored in sessionStorage across auth)
Setup → Inbox
Invite Link (creator side) → Invite Link (recipient side) → Chat
Chat → Card-Flip Decode
Card-Flip Decode → "Keep Decoded" toggle (surfaces during first decode)
"Keep Decoded" + Settings → Cipher settings management (settings screen)
PWA manifest + SW registered → Install prompt
```

## Anti-Features

| Anti-Feature | Why Avoid |
|---|---|
| Alert() for decode errors | Breaks the aesthetic completely. Inline error on back face of card. |
| Toast notifications for messages | Toasts disappear — missed messages feel unreliable. Real-time renders directly. |
| Onboarding tutorial / walkthrough | The card flip is self-explanatory. Cipher text is readable. The lock glyph communicates action. An onboarding flow would insult the aesthetic. |
| Vibration/haptics for decode | Nothing implemented server-side to trigger it. Adds complexity with no payoff. |
| Persistent "Install App" banner | Feels like an ad. Settings only. |
| Server-round-trip for cipher preference | The whole point is that the cipher never touches the server. |

## Sources

- MDN: transform-style — HIGH confidence. https://developer.mozilla.org/en-US/docs/Web/CSS/transform-style
- MDN: backface-visibility — HIGH confidence (Baseline Widely Available since March 2022). https://developer.mozilla.org/en-US/docs/Web/CSS/backface-visibility
- MDN: scrollIntoView — HIGH confidence. https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView
- MDN: PWA Caching Guide — HIGH confidence. https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching
- MDN: Making PWAs Installable — HIGH confidence. https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- Invite UX, settings patterns, "keep decoded" UX — MEDIUM confidence. Based on analysis of Signal, iMessage, Telegram patterns from training data + applied to this specific domain. No single authoritative source; conclusions derived from cross-app pattern analysis.
- Install prompt timing/placement — MEDIUM confidence. beforeinstallprompt API is HIGH confidence (MDN); the UX recommendation (suppress until meaningful engagement) is community-established best practice, consistent across web.dev articles and general PWA guidance.
