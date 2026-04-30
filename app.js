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

// ── Service worker (D-09) ─────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {})
}

// ── Auth hydration ────────────────────────────────────────────────────
// getSession() returns { user } — null if signed out. Set on the store so the router's
// auth guard sees the right value before route() is first called.
transport.getSession().then(({ user }) => {
  store.set('user', user)
  transport.onAuthChange((u) => store.set('user', u))

  // ── Start router ───────────────────────────────────────────────────
  router.start()
  router.route()
})
