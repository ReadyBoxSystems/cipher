// tests/theme.test.js
// Unit tests for Phase 4 boot theme logic (THEME-02, THEME-04).
// The actual production code lives inline in app.js boot — these tests
// verify the pure expressions used there, isolated from DOM/Supabase.

import { jest } from '@jest/globals'

// ── Pure helpers mirroring app.js boot expressions ─────────────────────
function resolveBootTheme(getItem) {
  // Mirrors: localStorage.getItem('cipher-theme') || 'postdesk'
  return getItem('cipher-theme') || 'postdesk'
}

function syncProfileTheme(profile, getItem, setItem, setDataset) {
  // Mirrors the cross-device sync block in app.js:
  //   if (profile && profile.theme && profile.theme !== localStorage.getItem('cipher-theme')) {
  //     localStorage.setItem('cipher-theme', profile.theme)
  //     document.documentElement.dataset.theme = profile.theme
  //   }
  if (profile && profile.theme && profile.theme !== getItem('cipher-theme')) {
    setItem('cipher-theme', profile.theme)
    setDataset(profile.theme)
  }
}

// ── THEME-02: Boot default ─────────────────────────────────────────────

test('THEME-02: boot resolves to postdesk when no localStorage entry', () => {
  const storage = {}
  const getItem = (k) => storage[k] ?? null
  expect(resolveBootTheme(getItem)).toBe('postdesk')
})

test('THEME-02: boot resolves to saved value when localStorage has it', () => {
  const storage = { 'cipher-theme': 'terminal' }
  const getItem = (k) => storage[k] ?? null
  expect(resolveBootTheme(getItem)).toBe('terminal')
})

test('THEME-02: empty string in localStorage falls back to postdesk', () => {
  const storage = { 'cipher-theme': '' }
  const getItem = (k) => storage[k] ?? null
  expect(resolveBootTheme(getItem)).toBe('postdesk')
})

// ── THEME-04: Cross-device sync (profile.theme → localStorage) ─────────

test('THEME-04: sync writes Supabase theme to localStorage when different', () => {
  const storage = { 'cipher-theme': 'postdesk' }
  const dataset = { theme: 'postdesk' }
  const getItem = (k) => storage[k] ?? null
  const setItem = (k, v) => { storage[k] = v }
  const setDataset = (v) => { dataset.theme = v }

  syncProfileTheme({ theme: 'terminal' }, getItem, setItem, setDataset)

  expect(storage['cipher-theme']).toBe('terminal')
  expect(dataset.theme).toBe('terminal')
})

test('THEME-04: sync is a no-op when profile.theme equals localStorage value', () => {
  const storage = { 'cipher-theme': 'terminal' }
  const dataset = { theme: 'terminal' }
  const setItem = jest.fn((k, v) => { storage[k] = v })
  const setDataset = jest.fn((v) => { dataset.theme = v })
  const getItem = (k) => storage[k] ?? null

  syncProfileTheme({ theme: 'terminal' }, getItem, setItem, setDataset)

  expect(setItem).not.toHaveBeenCalled()
  expect(setDataset).not.toHaveBeenCalled()
})

test('THEME-04: sync handles null profile without throwing', () => {
  const storage = { 'cipher-theme': 'postdesk' }
  const setItem = jest.fn()
  const setDataset = jest.fn()
  const getItem = (k) => storage[k] ?? null

  expect(() => syncProfileTheme(null, getItem, setItem, setDataset)).not.toThrow()
  expect(setItem).not.toHaveBeenCalled()
  expect(storage['cipher-theme']).toBe('postdesk')
})

test('THEME-04: sync handles profile without theme field', () => {
  const storage = { 'cipher-theme': 'postdesk' }
  const setItem = jest.fn()
  const setDataset = jest.fn()
  const getItem = (k) => storage[k] ?? null

  // Profile object exists but theme is undefined (e.g. legacy profile pre-migration)
  syncProfileTheme({ id: 'abc', username: 'jordan' }, getItem, setItem, setDataset)

  expect(setItem).not.toHaveBeenCalled()
  expect(storage['cipher-theme']).toBe('postdesk')
})
