// Setup screen — #/setup — first-time @handle picker.
// No design reference in cipher-app.jsx; built from the same primitives as auth.js
// (cipher-logo + auth-block + .form + .field + .btn + .error-msg).
// Per PROF-03: 23505 on username → "handle taken"; 23505 on id → silent redirect (PROF-02 should prevent this, but guard).
// Per Pitfall 5: include a sign-out escape hatch so a user stuck here can recover.

import { transport } from '../transport/index.js'
import * as store    from '../state/store.js'
import * as router   from '../lib/router.js'

const HANDLE_RE = /^[a-z0-9_]{2,30}$/

router.register('setup', async () => {
  const app  = document.getElementById('app')
  const user = store.get('user')

  // Guard: setup requires a user. If null (race condition), bounce to auth.
  if (!user) { router.navigate('#/auth'); return () => {} }

  // Guard: if profile already exists (returning user), redirect to inbox.
  if (store.get('profile')) { router.navigate('#/'); return () => {} }

  app.innerHTML = `
    <div class="screen auth-screen">
      <div class="cipher-logo">
        <div class="logo-mark"><span>⌘</span></div>
        <div class="logo-name">CIPHER</div>
        <div class="logo-by">BY READYBOX SYSTEMS</div>
      </div>
      <div class="auth-block">
        <div class="tab-row" style="pointer-events:none">
          <button class="tab active" type="button" style="flex:1">Choose Your Handle</button>
        </div>
        <form class="form" id="setup-form">
          <input class="field" id="setup-handle" type="text" placeholder="@handle" autocomplete="off" maxlength="30" pattern="[a-z0-9_]{2,30}" required />
          <button class="btn" type="submit" id="setup-submit">CONFIRM HANDLE</button>
        </form>
        <div class="error-msg" id="setup-error"></div>
        <button class="btn" type="button" id="setup-signout"
          style="background:transparent;border-color:var(--border2);color:var(--text-dim);margin-top:8px">
          Sign out
        </button>
      </div>
      <div class="legal-line">
        Lowercase letters, numbers, underscores · 2–30 chars
      </div>
    </div>
  `

  const form     = app.querySelector('#setup-form')
  const handleEl = app.querySelector('#setup-handle')
  const submit   = app.querySelector('#setup-submit')
  const errEl    = app.querySelector('#setup-error')
  const signout  = app.querySelector('#setup-signout')

  handleEl.focus()

  async function onSubmit(e) {
    e.preventDefault()
    errEl.textContent = ''
    const handle = handleEl.value.trim().toLowerCase()
    if (!HANDLE_RE.test(handle)) {
      errEl.textContent = 'HANDLE: 2–30 LOWERCASE LETTERS, NUMBERS, OR UNDERSCORES'
      return
    }

    submit.disabled = true
    const { result, error } = await transport.createProfile(user.id, handle, handle)
    submit.disabled = false

    if (error) {
      if (error.code === '23505') {
        const detail = `${error.message || ''} ${error.details || ''}`.toLowerCase()
        if (detail.includes('username')) {
          errEl.textContent = 'HANDLE TAKEN — TRY ANOTHER'
          return
        }
        // 23505 on id (profile already exists for this user) — defensive after PROF-02 fix.
        // Treat as already-set-up: hydrate the existing profile and continue.
        const { result: existing } = await transport.getProfile(user.id)
        if (existing) store.set('profile', existing)
        router.navigate('#/')
        return
      }
      errEl.textContent = (error.message || 'SOMETHING WENT WRONG').toUpperCase()
      return
    }

    store.set('profile', result)
    router.navigate('#/')
  }

  async function onSignOut() {
    await transport.signOut()
    store.set('user', null)
    store.set('profile', null)
    router.navigate('#/auth')
  }

  form.addEventListener('submit', onSubmit)
  signout.addEventListener('click', onSignOut)

  return () => {
    form.removeEventListener('submit', onSubmit)
    signout.removeEventListener('click', onSignOut)
  }
})
