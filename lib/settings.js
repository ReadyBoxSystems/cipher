// Per-conversation cipher settings. Stored in localStorage only — NEVER sent to server.
// This is the second-factor secret (cipher type + key) — see SEC-04, SEC-05, CHAT-13.
//
// Extracted from v0 app.js lines 15–23. localStorage key 'cs' preserved for backward compat.

const STORAGE_KEY = 'cs'

/** Read the entire settings object from localStorage. Returns {} if absent or unparsable. */
export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch (_e) {
    return {}
  }
}

/** Replace the entire settings object in localStorage. */
export function saveSettings(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

/** Get settings for one conversation, or the default ({ cipher: 'caesar', key: '', keep: false }). */
export function getSettings(convId) {
  const s = loadSettings()
  return s[convId] || { cipher: 'caesar', key: '', keep: false }
}

/** Merge `patch` into the conversation's settings and persist. */
export function putSettings(convId, patch) {
  const s = loadSettings()
  s[convId] = { ...getSettings(convId), ...patch }
  saveSettings(s)
}
