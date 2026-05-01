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
  }
  transport.onAuthChange(async (u) => {
    store.set('user', u)
    if (u) {
      const { result: profile } = await transport.getProfile(u.id)
      store.set('profile', profile)
    } else {
      store.set('profile', null)
    }
  })

  // ── Start router ───────────────────────────────────────────────────
  router.start()
  router.route()
})
