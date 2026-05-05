import { transport } from '../transport/index.js'
import * as store    from '../state/store.js'
import * as router   from '../lib/router.js'
import { _esc }      from '../lib/utils.js'

router.register('invite', async (code) => {
  const app  = document.getElementById('app')
  const user = store.get('user')

  if (!code) { router.navigate('#/'); return () => {} }

  if (!user) {
    // Router already stored code in sessionStorage — send to auth
    router.navigate('#/auth')
    return () => {}
  }

  app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <div class="topbar-actions">
          <button class="icon-btn" id="invite-back" type="button" aria-label="Back to inbox">←</button>
        </div>
        <div class="topbar-title">JOIN CONVERSATION</div>
        <div style="width:44px"></div>
      </div>
      <div class="center-msg" id="invite-body">LOADING...</div>
    </div>
  `

  const back = app.querySelector('#invite-back')
  function onBack() { router.navigate('#/') }
  back.addEventListener('click', onBack)

  const { result: invite, error } = await transport.getInvite(code)

  function showError(msg) {
    app.querySelector('#invite-body').textContent = msg
  }

  if (error || !invite)       { showError('INVITE NOT FOUND OR EXPIRED'); return () => { back.removeEventListener('click', onBack) } }
  if (invite.accepted_by)     { showError('THIS INVITE HAS ALREADY BEEN USED'); return () => { back.removeEventListener('click', onBack) } }
  if (invite.creator_id === user.id) { showError('THIS IS YOUR OWN INVITE LINK'); return () => { back.removeEventListener('click', onBack) } }

  const { result: creator } = await transport.getProfile(invite.creator_id)
  const handle = creator?.username || '?'

  app.querySelector('#invite-body').outerHTML = `
    <div class="settings-list" id="invite-body">
      <div style="padding:40px 20px 28px;text-align:center">
        <div style="font-size:10px;letter-spacing:0.3em;color:var(--text-dim);margin-bottom:10px">INVITED BY</div>
        <div style="font-size:20px;color:var(--accent);letter-spacing:0.08em;margin-bottom:28px">@${_esc(handle)}</div>
        <button class="btn-sm" id="invite-accept" type="button" style="width:100%;max-width:220px;padding:12px">JOIN CONVERSATION</button>
      </div>
      <div class="error-msg" id="invite-error" style="padding:0 20px 12px;text-align:center"></div>
    </div>
  `

  const acceptBtn = app.querySelector('#invite-accept')
  const errEl     = app.querySelector('#invite-error')

  async function onAccept() {
    acceptBtn.disabled    = true
    acceptBtn.textContent = 'JOINING...'
    errEl.textContent     = ''

    const convId = crypto.randomUUID()
    const { result, error: acceptErr } = await transport.acceptInvite(code, user.id, convId)

    if (acceptErr || !result) {
      acceptBtn.disabled    = false
      acceptBtn.textContent = 'JOIN CONVERSATION'
      errEl.textContent     = 'FAILED TO JOIN — TRY AGAIN'
      return
    }

    sessionStorage.removeItem('pending_invite')
    router.navigate(`#/chat/${result.conversation_id}`)
  }

  acceptBtn.addEventListener('click', onAccept)

  return () => {
    back.removeEventListener('click', onBack)
    acceptBtn.removeEventListener('click', onAccept)
  }
})
