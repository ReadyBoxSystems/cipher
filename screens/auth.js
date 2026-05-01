// Auth screen — #/auth — sign in and sign up.
// Translates AuthScreen JSX (cipher-app.jsx lines 29-54) to vanilla JS.
// Per AUTH-04: errors render into .error-msg via textContent — no alert calls.

import { transport } from '../transport/index.js'
import * as store    from '../state/store.js'
import * as router   from '../lib/router.js'

router.register('auth', async () => {
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="screen auth-screen">
      <div class="cipher-logo">
        <div class="logo-mark"><span>⌘</span></div>
        <div class="logo-name">CIPHER</div>
        <div class="logo-by">BY READYBOX SYSTEMS</div>
      </div>
      <div class="auth-block">
        <div class="tab-row">
          <button class="tab active" data-mode="in" type="button">Sign In</button>
          <button class="tab" data-mode="up" type="button">Sign Up</button>
        </div>
        <form class="form" id="auth-form">
          <input class="field" id="auth-email" type="email" placeholder="email" autocomplete="email" required />
          <input class="field" id="auth-password" type="password" placeholder="password" autocomplete="current-password" required />
          <button class="btn" type="submit" id="auth-submit">SIGN IN</button>
        </form>
        <div class="error-msg" id="auth-error"></div>
      </div>
      <div class="legal-line">
        AES-256-GCM · Web Crypto<br />
        Server stores ciphertext only
      </div>
    </div>
  `

  const tabs    = app.querySelectorAll('.tab')
  const form    = app.querySelector('#auth-form')
  const emailEl = app.querySelector('#auth-email')
  const passEl  = app.querySelector('#auth-password')
  const submit  = app.querySelector('#auth-submit')
  const errEl   = app.querySelector('#auth-error')

  let mode = 'in'  // 'in' | 'up'

  function setMode(next) {
    mode = next
    tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode))
    submit.textContent  = mode === 'in' ? 'SIGN IN' : 'CREATE ACCOUNT'
    passEl.autocomplete = mode === 'up' ? 'new-password' : 'current-password'
    errEl.textContent   = ''
  }

  function onTabClick(e) {
    const next = e.currentTarget.dataset.mode
    if (next && next !== mode) setMode(next)
  }
  tabs.forEach(t => t.addEventListener('click', onTabClick))

  async function onSubmit(e) {
    e.preventDefault()
    errEl.textContent = ''
    const email = emailEl.value.trim()
    const pass  = passEl.value
    if (!email || !pass) { errEl.textContent = 'EMAIL AND PASSWORD REQUIRED'; return }

    submit.disabled = true
    const fn = mode === 'in'
      ? transport.signIn
      : transport.signUp
    const { user, error } = await fn(email, pass)
    submit.disabled = false

    if (error) {
      errEl.textContent = (error.message || 'AUTH FAILED').toUpperCase()
      return
    }
    if (!user) {
      // Sign-up with email confirmation enabled returns user but session=null.
      // Show a check-your-email message and stop — do not navigate.
      errEl.textContent = 'CHECK YOUR EMAIL TO CONFIRM YOUR ACCOUNT'
      return
    }
    store.set('user', user)
    // First-time user → setup. Returning user → inbox.
    // Profile is hydrated by app.js onAuthChange; check it on next tick via router decision below.
    if (mode === 'up') {
      router.navigate('#/setup')
    } else {
      // For sign-in, profile may not be hydrated yet (onAuthChange races). Inbox route
      // (Phase 3) will redirect to #/setup itself if profile is null. For Phase 2,
      // navigating to #/ is correct — the router has no inbox handler yet, so the
      // empty-shell is fine.
      router.navigate('#/')
    }
  }
  form.addEventListener('submit', onSubmit)

  return () => {
    tabs.forEach(t => t.removeEventListener('click', onTabClick))
    form.removeEventListener('submit', onSubmit)
  }
})
