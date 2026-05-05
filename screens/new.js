import { transport } from '../transport/index.js'
import * as store    from '../state/store.js'
import * as router   from '../lib/router.js'

router.register('new', async () => {
  const app  = document.getElementById('app')
  const user = store.get('user')

  if (!user)                 { router.navigate('#/auth');  return () => {} }
  if (!store.get('profile')) { router.navigate('#/setup'); return () => {} }

  app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <div class="topbar-actions">
          <button class="icon-btn" id="new-back" type="button" aria-label="Back to inbox">←</button>
        </div>
        <div class="topbar-title">NEW CONVERSATION</div>
        <div style="width:44px"></div>
      </div>
      <div class="center-msg" id="new-body">GENERATING LINK...</div>
    </div>
  `

  const back = app.querySelector('#new-back')
  function onBack() { router.navigate('#/') }
  back.addEventListener('click', onBack)

  const { result: invite, error } = await transport.createInvite(user.id)

  if (error || !invite) {
    app.querySelector('#new-body').textContent = 'FAILED TO CREATE LINK — TAP BACK AND TRY AGAIN'
    return () => { back.removeEventListener('click', onBack) }
  }

  const base      = window.location.href.split('#')[0]
  const inviteUrl = `${base}#/invite/${invite.code}`

  app.querySelector('#new-body').outerHTML = `
    <div class="settings-list" id="new-body">
      <div class="settings-section-label">SHARE THIS LINK</div>
      <div style="padding:16px 20px 12px">
        <div style="background:var(--surface2);border:1px solid var(--border2);padding:12px;font-size:10px;letter-spacing:0.04em;word-break:break-all;color:var(--text-mid);margin-bottom:12px;line-height:1.6">${inviteUrl}</div>
        <button class="btn-sm" id="new-copy" type="button" style="width:100%;padding:10px">COPY LINK</button>
      </div>
      <div class="settings-section-label">NOTES</div>
      <div class="settings-row readonly"><span class="label">One use only</span></div>
      <div class="settings-row readonly"><span class="label">Expires in 7 days</span></div>
      <div class="settings-row readonly"><span class="label">Share it out of band — not through Cipher</span></div>
    </div>
  `

  const copyBtn = app.querySelector('#new-copy')
  function onCopy() {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      copyBtn.textContent = 'COPIED ✓'
      setTimeout(() => { copyBtn.textContent = 'COPY LINK' }, 2000)
    }).catch(() => {
      copyBtn.textContent = 'COPY FAILED'
      setTimeout(() => { copyBtn.textContent = 'COPY LINK' }, 2000)
    })
  }
  copyBtn.addEventListener('click', onCopy)

  return () => {
    back.removeEventListener('click', onBack)
    copyBtn.removeEventListener('click', onCopy)
  }
})
