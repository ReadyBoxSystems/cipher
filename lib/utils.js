// Pure utilities. Zero dependencies. Phase 5 will add Jest tests.
// Extracted from v0 app.js lines 514–530.

/** Relative time string: 'now' / '5m' / '3h' / '2d'. */
export function _ago(ts) {
  const d = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (d < 60)    return 'now'
  if (d < 3600)  return `${Math.floor(d / 60)}m`
  if (d < 86400) return `${Math.floor(d / 3600)}h`
  return `${Math.floor(d / 86400)}d`
}

/** Deterministic hsl() background color from a string (used for avatar tints). */
export function _strColor(str) {
  let h = 0
  for (const c of str) h = c.charCodeAt(0) + ((h << 5) - h)
  return `hsl(${Math.abs(h) % 360},30%,22%)`
}

/** HTML-escape user content. Replaces & < > and converts newlines to <br>. */
export function _esc(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}
