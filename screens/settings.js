// Settings screen — #/settings — profile view + display-name edit + sign out.
// Translates SettingsScreen JSX (cipher-app.jsx lines 430-500) to vanilla JS.
// Per PROF-05: display-name edit is optimistic (store updates before await).
// Per AUTH-03: this screen is the only sign-out surface in the app.
// Per Pitfall 4: sign-out clears BOTH user and profile in the store.

import { transport }       from '../transport/index.js'
import * as store          from '../state/store.js'
import * as router         from '../lib/router.js'
import { _strColor, _esc } from '../lib/utils.js'

router.register('settings', async () => {
  const app     = document.getElementById('app')
  const user    = store.get('user')
  const profile = store.get('profile')

  // Guard: settings requires both user and profile. The router auth-guard handles
  // missing user; missing profile means partial setup — bounce to #/setup.
  if (!user)    { router.navigate('#/auth');  return () => {} }
  if (!profile) { router.navigate('#/setup'); return () => {} }

  const username    = profile.username    || ''
  const displayName = profile.display_name || username
  const email       = user.email           || ''
  const initial     = (displayName[0] || username[0] || '?').toUpperCase()
  const avatarBg    = _strColor(username)

  // Read current theme from <html> (set by app.js boot block).
  // Falls back to 'postdesk' if attribute somehow missing (D-15).
  const currentTheme = document.documentElement.dataset.theme || 'postdesk'

  app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <button class="icon-btn" id="settings-back" type="button">←</button>
        <div class="topbar-center">
          <div class="topbar-title">SETTINGS</div>
        </div>
        <div style="width:44px"></div>
      </div>
      <div class="settings-list">
        <div class="settings-header">
          <div class="avatar" style="background:${avatarBg};width:48px;height:48px;font-size:18px">${_esc(initial)}</div>
          <div class="settings-header-info">
            <div class="name">@${_esc(username)}</div>
            <div class="email">${_esc(email)}</div>
          </div>
        </div>

        <div class="settings-section-label">PROFILE</div>
        <div class="settings-row" id="settings-displayname-row">
          <span class="label">Display name</span>
          <span class="value editable" id="settings-displayname-value">${_esc(displayName)} <span class="chev">›</span></span>
        </div>
        <div class="settings-row readonly">
          <span class="label">Handle</span>
          <span class="value">@${_esc(username)}</span>
        </div>
        <div class="settings-row readonly">
          <span class="label">Email</span>
          <span class="value">${_esc(email)}</span>
        </div>

        <div class="settings-section-label">APPEARANCE</div>
        <div class="theme-swatches" id="settings-theme-swatches">
          <div class="theme-swatch ${currentTheme === 'postdesk' ? 'active' : ''}" data-theme="postdesk" role="button" tabindex="0" aria-label="Postdesk theme">
            <div class="swatch-preview" data-theme-preview="postdesk"></div>
            <div class="swatch-label">POSTDESK</div>
          </div>
          <div class="theme-swatch ${currentTheme === 'terminal' ? 'active' : ''}" data-theme="terminal" role="button" tabindex="0" aria-label="Terminal theme">
            <div class="swatch-preview" data-theme-preview="terminal"></div>
            <div class="swatch-label">TERMINAL</div>
          </div>
        </div>

        <div class="settings-section-label">ACCOUNT</div>
        <div class="settings-row danger" id="settings-signout">
          <span class="label">Sign out</span>
          <span class="value"><span class="chev" style="color:var(--danger)">›</span></span>
        </div>

        <div style="padding:24px 20px 16px;text-align:center;font-size:9px;letter-spacing:0.22em;color:var(--text-dim);text-transform:uppercase">
          v1.0 · readybox systems
        </div>
      </div>
    </div>
  `

  const back        = app.querySelector('#settings-back')
  const nameRow     = app.querySelector('#settings-displayname-row')
  const nameValueEl = app.querySelector('#settings-displayname-value')
  const signoutRow  = app.querySelector('#settings-signout')
  const swatchesEl  = app.querySelector('#settings-theme-swatches')

  function renderNameValue(value) {
    nameValueEl.classList.add('editable')
    nameValueEl.innerHTML = `${_esc(value)} <span class="chev">›</span>`
  }

  function onBack() {
    router.navigate('#/')
  }

  function onNameRowClick() {
    // Avoid re-entering edit mode if already editing.
    if (nameValueEl.querySelector('input')) return
    const current = store.get('profile')?.display_name || ''
    nameValueEl.classList.remove('editable')
    nameValueEl.innerHTML = `<input class="field-sm" id="settings-displayname-input" style="max-width:140px;font-size:12px" />`
    const input = nameValueEl.querySelector('#settings-displayname-input')
    input.value = current
    input.focus()
    input.select()

    let committed = false
    async function commit() {
      if (committed) return
      committed = true
      const newName = input.value.trim()
      if (!newName || newName === current) {
        renderNameValue(current)
        return
      }
      // Optimistic: update store + UI immediately.
      const prev = store.get('profile')
      store.set('profile', { ...prev, display_name: newName })
      renderNameValue(newName)
      // Persist async; rollback on error.
      const { error } = await transport.updateProfile(user.id, { display_name: newName })
      if (error) {
        store.set('profile', prev)
        renderNameValue(current)
      }
    }
    function onKey(e) {
      if (e.key === 'Enter')       { e.preventDefault(); input.blur() }
      else if (e.key === 'Escape') { committed = true; renderNameValue(current) }
    }
    input.addEventListener('blur', commit)
    input.addEventListener('keydown', onKey)
  }

  function onSwatchClick(e) {
    const swatch = e.target.closest('.theme-swatch')
    if (!swatch) return
    const newTheme = swatch.dataset.theme  // 'postdesk' | 'terminal'
    if (!newTheme) return
    if (newTheme === (document.documentElement.dataset.theme || 'postdesk')) return  // no-op same theme

    // 1. Apply immediately to <html> — CSS cascade does the visual switch (THEME-03).
    document.documentElement.dataset.theme = newTheme
    // 2. Persist locally (survives reload — THEME-04).
    localStorage.setItem('cipher-theme', newTheme)
    // 3. Update store profile so other screens see new value.
    const prev = store.get('profile')
    if (prev) store.set('profile', { ...prev, theme: newTheme })
    // 4. Sync to Supabase async (cross-device — THEME-04). Silent on error: localStorage is source of truth.
    transport.updateProfile(user.id, { theme: newTheme }).catch(() => {})
    // 5. Re-render swatch active states (toggle .active class without re-mounting).
    swatchesEl.querySelectorAll('.theme-swatch').forEach(el => {
      el.classList.toggle('active', el.dataset.theme === newTheme)
    })
  }

  async function onSignOut() {
    await transport.signOut()
    store.set('user', null)
    store.set('profile', null)
    router.navigate('#/auth')
  }

  back.addEventListener('click', onBack)
  nameRow.addEventListener('click', onNameRowClick)
  signoutRow.addEventListener('click', onSignOut)
  swatchesEl.addEventListener('click', onSwatchClick)

  return () => {
    back.removeEventListener('click', onBack)
    nameRow.removeEventListener('click', onNameRowClick)
    signoutRow.removeEventListener('click', onSignOut)
    swatchesEl.removeEventListener('click', onSwatchClick)
  }
})
