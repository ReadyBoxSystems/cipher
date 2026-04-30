// Hash-based router with auth guard and screen-cleanup lifecycle.
//
// Per Phase 1 D-06 (locked):
//   - Hash routing (GitHub Pages constraint — no server-side history-API rewrites)
//   - Registration pattern: screens self-register via register(view, handler)
//   - Auth guard lives here, not in screens
//   - currentCleanup is called before mounting the next screen
//
// Per D-01: missing handlers are a no-op (graceful empty shell — Phase 1 has zero screens registered).

import { get } from '../state/store.js'

/**
 * Registered route handlers, keyed by view name (the first hash segment).
 * Examples of view names: '', 'auth', 'setup', 'chat', 'invite', 'new'.
 * @type {Record<string, (param: string) => (Promise<void | (() => void)> | void | (() => void))>}
 */
const _routes = {}

/** Cleanup function returned by the most recently mounted screen. Called before next mount. */
let _currentCleanup = null

/** Register a screen handler for a view name. Handler may return a cleanup function. */
export function register(view, handler) {
  _routes[view] = handler
}

/** Programmatic navigation. Triggers hashchange, which calls route(). */
export function navigate(path) {
  location.hash = path
}

/**
 * Read the current hash, run the auth guard, run cleanup of the previously mounted screen,
 * then dispatch to the registered handler (if any).
 */
export async function route() {
  const hash  = location.hash.slice(1) || '/'
  const parts = hash.split('/').filter(Boolean)
  const view  = parts[0] || ''
  const param = parts[1] || ''

  // ── Auth guard ──────────────────────────────────────────────────────
  // Public routes: 'auth', 'invite' (the unauth invite-landing screen lives here per INVITE-03).
  // Everything else requires a signed-in user.
  const PUBLIC_VIEWS = new Set(['auth', 'invite'])
  const user = get('user')

  // Preserve invite code through auth flow per INVITE-05.
  // Store whenever we see an invite URL while unauthenticated — so the auth screen
  // can redirect back to the invite after sign-in/sign-up completes.
  if (!user && view === 'invite' && param) {
    sessionStorage.setItem('pending_invite', param)
  }

  if (!user && !PUBLIC_VIEWS.has(view)) {
    if (location.hash !== '#/auth') {
      location.hash = '#/auth'  // triggers another hashchange → route() re-enters
      return
    }
  }

  // ── Cleanup previous screen ─────────────────────────────────────────
  if (typeof _currentCleanup === 'function') {
    try { _currentCleanup() } catch (_e) { /* swallow — bad cleanup must not block next mount */ }
    _currentCleanup = null
  }

  // ── Dispatch ────────────────────────────────────────────────────────
  const handler = _routes[view]
  if (typeof handler !== 'function') {
    // D-01: graceful empty shell. No registered screen → no mount → no crash.
    return
  }

  const result = await handler(param)
  if (typeof result === 'function') {
    _currentCleanup = result
  }
}

/** Wire the global hashchange listener. Idempotent — safe to call once at boot. */
export function start() {
  window.addEventListener('hashchange', () => { route() })
}

// Expose navigate on window for inline onclick handlers from v0-style screens.
// Phase 2 screens may migrate away from inline handlers; this stays for compatibility.
if (typeof window !== 'undefined') {
  window.navigate = navigate
}
