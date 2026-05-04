// Cipher PWA — boot file.
// Per Phase 1:
//   D-01: graceful empty shell — wires plumbing, mounts no screens (Phase 2 begins filling screens/).
//   D-03: replaces v0 monolith in full (no legacy code preserved alongside).
//   D-09: SW registration uses relative path + scope './' for GitHub Pages compatibility.
//
// Architecture:
//   transport/  — all Supabase calls live here; this file imports the active transport from transport/index.js
//   state/      — module-singleton store; this file hydrates state.user at boot
//   lib/router  — hash router with auth guard; this file starts it
//   screens/    — Phase 2+ adds files here; each screen self-registers via router.register()

import { transport } from './transport/index.js'
import * as store    from './state/store.js'
import * as router   from './lib/router.js'

// ── Screens (each self-registers via router.register at module load) ──
import './screens/auth.js'
import './screens/setup.js'
import './screens/settings.js'
import './screens/inbox.js'
import './screens/chat.js'

// ── Apply saved theme synchronously, before any render (THEME-01, THEME-02) ──
// Default for new users (no saved entry): 'postdesk' (D-15).
// Reading localStorage and writing dataset is synchronous — no flash possible
// because no screen has rendered yet at this point in boot.
const _savedTheme = localStorage.getItem('cipher-theme') || 'postdesk'
document.documentElement.dataset.theme = _savedTheme

// ── Service worker (D-09) ─────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {})
}

// ── Auth + profile hydration ──────────────────────────────────────────
// getSession() returns { user } — null if signed out. We additionally load the
// profile row so screens can read store.get('profile') without a per-mount fetch.
// onAuthChange fires on sign-in AND sign-out — on null we MUST clear both keys
// (Pitfall 4: profile would otherwise leak across user switches on the same device).
transport.getSession().then(async ({ user }) => {
  store.set('user', user)
  if (user) {
    const { result: profile } = await transport.getProfile(user.id)
    store.set('profile', profile)
    // Cross-device theme sync (D-14, THEME-04): if Supabase profile.theme
    // differs from local, prefer the server value (it represents the user's
    // last deliberate choice on any device). Apply to <html> and persist locally.
    if (profile && profile.theme && profile.theme !== localStorage.getItem('cipher-theme')) {
      localStorage.setItem('cipher-theme', profile.theme)
      document.documentElement.dataset.theme = profile.theme
    }
  }
  transport.onAuthChange(async (u) => {
    store.set('user', u)
    if (u) {
      const { result: profile } = await transport.getProfile(u.id)
      store.set('profile', profile)
      // Cross-device theme sync (D-14, THEME-04): if Supabase profile.theme
      // differs from local, prefer the server value (it represents the user's
      // last deliberate choice on any device). Apply to <html> and persist locally.
      if (profile && profile.theme && profile.theme !== localStorage.getItem('cipher-theme')) {
        localStorage.setItem('cipher-theme', profile.theme)
        document.documentElement.dataset.theme = profile.theme
      }
    } else {
      store.set('profile', null)
    }
  })

  // ── Start router ───────────────────────────────────────────────────
  router.start()
  router.route()
})
