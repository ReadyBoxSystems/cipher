import { sb } from './supabase.js'
import { encrypt, decrypt } from './crypto.js'
import { applyCipher, CIPHERS, CIPHER_LABELS, CIPHER_USES_KEY } from './ciphers.js'

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  user:          null,
  profile:       null,
  conversations: [],
  messages:      {},    // { convId: [msg, ...] }
  contacts:      {},    // { convId: profile }
}

// Cipher settings live only on-device, never touch the server
function loadSettings()      { return JSON.parse(localStorage.getItem('cs') || '{}') }
function saveSettings(s)     { localStorage.setItem('cs', JSON.stringify(s)) }
function getSettings(convId) { const s = loadSettings(); return s[convId] || { cipher: 'caesar', key: '', keep: false } }
function putSettings(convId, patch) {
  const s = loadSettings()
  s[convId] = { ...getSettings(convId), ...patch }
  saveSettings(s)
}

// ── Router ────────────────────────────────────────────────────────────────────

const app = document.getElementById('app')
window.navigate = (path) => { location.hash = path }

async function route() {
  const hash  = location.hash.slice(1) || '/'
  const parts = hash.split('/').filter(Boolean)
  const view  = parts[0] || ''
  const param = parts[1] || ''

  if (!state.user) {
    if (view === 'invite') sessionStorage.setItem('pending_invite', param)
    return showAuth()
  }

  if (!state.profile) {
    await loadProfile()
    if (!state.profile) return showSetup()
  }

  const pending = sessionStorage.getItem('pending_invite')
  if (pending) { sessionStorage.removeItem('pending_invite'); return showAcceptInvite(pending) }

  if (!view || view === '')           showInbox()
  else if (view === 'chat' && param)  showChat(param)
  else if (view === 'invite' && param) showAcceptInvite(param)
  else if (view === 'new')            showNewChat()
  else                                showInbox()
}

window.addEventListener('hashchange', route)

// ── Auth ──────────────────────────────────────────────────────────────────────

function showAuth(mode = 'in') {
  app.innerHTML = `
    <div class="screen auth-screen">
      <div class="auth-logo">
        <div class="logo-glyph">⌘</div>
        <div class="logo-name">CIPHER</div>
        <div class="logo-by">by ReadyBox Systems</div>
      </div>

      <div class="tab-row">
        <button class="tab ${mode==='in'?'active':''}"  onclick="_authMode('in')">Sign In</button>
        <button class="tab ${mode==='up'?'active':''}" onclick="_authMode('up')">Sign Up</button>
      </div>

      <form class="form" onsubmit="_doAuth(event,'${mode}')">
        <input class="field" id="a-email"    type="email"    placeholder="Email"    required autocomplete="email">
        <input class="field" id="a-password" type="password" placeholder="Password" required autocomplete="${mode==='up'?'new-password':'current-password'}">
        <button class="btn" id="a-btn">${mode==='in'?'Sign In':'Create Account'}</button>
      </form>

      <div class="error-msg" id="a-err"></div>
    </div>`
}

window._authMode = (m) => showAuth(m)

window._doAuth = async (e, mode) => {
  e.preventDefault()
  const email    = document.getElementById('a-email').value
  const password = document.getElementById('a-password').value
  const btn      = document.getElementById('a-btn')
  const err      = document.getElementById('a-err')
  btn.disabled   = true; btn.textContent = '···'; err.textContent = ''

  const { data, error } = mode === 'up'
    ? await sb.auth.signUp({ email, password })
    : await sb.auth.signInWithPassword({ email, password })

  if (error) {
    err.textContent = error.message
    btn.disabled = false
    btn.textContent = mode === 'in' ? 'Sign In' : 'Create Account'
    return
  }

  state.user = data.user
  await route()
}

// ── Setup ─────────────────────────────────────────────────────────────────────

function showSetup() {
  app.innerHTML = `
    <div class="screen setup-screen">
      <div class="setup-title">Choose your handle</div>
      <div class="setup-hint">This is how others find you. Lowercase, no spaces.</div>
      <form class="form" onsubmit="_doSetup(event)">
        <div class="at-wrap">
          <span class="at-sym">@</span>
          <input class="at-field" id="s-user" type="text" placeholder="yourname" required
            pattern="[a-z0-9_]+" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false">
        </div>
        <button class="btn" id="s-btn">Continue</button>
      </form>
      <div class="error-msg" id="s-err"></div>
    </div>`
}

window._doSetup = async (e) => {
  e.preventDefault()
  const username = document.getElementById('s-user').value.toLowerCase().trim()
  const btn = document.getElementById('s-btn')
  const err = document.getElementById('s-err')
  btn.disabled = true; btn.textContent = '···'; err.textContent = ''

  const { error } = await sb.from('profiles').insert({ id: state.user.id, username, display_name: username })
  if (error) {
    err.textContent = error.code === '23505' ? 'That handle is taken.' : error.message
    btn.disabled = false; btn.textContent = 'Continue'
    return
  }

  await loadProfile()
  navigate('/')
}

async function loadProfile() {
  const { data } = await sb.from('profiles').select('*').eq('id', state.user.id).single()
  state.profile = data
}

// ── Inbox ─────────────────────────────────────────────────────────────────────

let _inboxSub = null

async function showInbox() {
  app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <div style="width:44px"></div>
        <div class="topbar-title">CIPHER</div>
        <div class="topbar-actions">
          <button class="icon-btn" onclick="navigate('/new')" title="New conversation">＋</button>
          <button class="icon-btn" onclick="_signOut()" title="Sign out" style="font-size:14px">⏻</button>
        </div>
      </div>
      <div class="inbox-list" id="inbox-list"><div class="center-msg">Loading...</div></div>
    </div>`

  await _loadConvs()
  _renderInbox()

  if (_inboxSub) _inboxSub.unsubscribe()
  _inboxSub = sb.channel('inbox')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async () => {
      await _loadConvs(); _renderInbox()
    }).subscribe()
}

async function _loadConvs() {
  const { data: mems } = await sb.from('conversation_members').select('conversation_id').eq('user_id', state.user.id)
  if (!mems?.length) { state.conversations = []; return }
  const ids = mems.map(m => m.conversation_id)
  const { data: convs } = await sb.from('conversations').select('*').in('id', ids).order('updated_at', { ascending: false })
  state.conversations = convs || []

  for (const c of state.conversations) {
    // Other member
    if (!state.contacts[c.id]) {
      const { data: others } = await sb.from('conversation_members').select('user_id').eq('conversation_id', c.id).neq('user_id', state.user.id)
      if (others?.[0]) {
        const { data: p } = await sb.from('profiles').select('*').eq('id', others[0].user_id).single()
        state.contacts[c.id] = p
      }
    }
    // Last message
    const { data: last } = await sb.from('messages').select('created_at').eq('conversation_id', c.id).order('created_at', { ascending: false }).limit(1).single()
    c._lastAt = last?.created_at
  }
}

function _renderInbox() {
  const el = document.getElementById('inbox-list')
  if (!el) return
  if (!state.conversations.length) {
    el.innerHTML = `<div class="center-msg">No conversations yet.<br>Tap <span class="accent">＋</span> to start one.</div>`
    return
  }
  el.innerHTML = state.conversations.map(c => {
    const p   = state.contacts[c.id]
    const col = _strColor(p?.username || '?')
    const ini = (p?.display_name || p?.username || '?')[0].toUpperCase()
    return `
      <div class="conv-row" onclick="navigate('/chat/${c.id}')">
        <div class="avatar" style="background:${col}">${ini}</div>
        <div class="conv-info">
          <div class="conv-name">@${p?.username || '···'}</div>
          <div class="conv-preview">Encrypted message</div>
        </div>
        <div class="conv-time">${c._lastAt ? _ago(c._lastAt) : ''}</div>
      </div>`
  }).join('')
}

window._signOut = async () => {
  await sb.auth.signOut()
  state.user = null; state.profile = null; state.conversations = []; state.messages = {}; state.contacts = {}
  navigate('/')
}

// ── Chat ──────────────────────────────────────────────────────────────────────

let _chatSub    = null
let _decoding   = null   // message id currently being decoded

async function showChat(convId) {
  // Ensure we have the contact loaded
  if (!state.contacts[convId]) {
    const { data: others } = await sb.from('conversation_members').select('user_id').eq('conversation_id', convId).neq('user_id', state.user.id)
    if (others?.[0]) {
      const { data: p } = await sb.from('profiles').select('*').eq('id', others[0].user_id).single()
      state.contacts[convId] = p
    }
  }

  const contact  = state.contacts[convId]
  const settings = getSettings(convId)

  app.innerHTML = `
    <div class="screen chat-screen">
      <div class="topbar">
        <button class="icon-btn" onclick="navigate('/')">←</button>
        <div class="topbar-title">@${contact?.username || '···'}</div>
        <div style="width:44px"></div>
      </div>

      <div class="messages-list" id="msg-list"></div>

      <!-- Decode panel -->
      <div class="decode-panel hidden" id="decode-panel">
        <div class="panel-row">
          <select class="field-sm" id="d-cipher" onchange="_syncDecodeKey()">
            ${CIPHERS.map(c => `<option value="${c}" ${c===settings.cipher?'selected':''}>${CIPHER_LABELS[c]}</option>`).join('')}
          </select>
          <input class="field-sm" id="d-key" type="text" placeholder="Key / Passphrase"
            value="${settings.key}" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"
            style="${CIPHER_USES_KEY[settings.cipher]?'':'display:none'}">
        </div>
        <div class="panel-row">
          <label class="check-label">
            <input type="checkbox" id="d-keep" ${settings.keep?'checked':''}> Keep decoded for me
          </label>
          <button class="btn-sm" onclick="_decode('${convId}')">Decode</button>
        </div>
      </div>

      <!-- Compose -->
      <div class="compose-bar">
        <div class="compose-meta">
          <select class="field-sm" id="c-cipher" onchange="_syncComposeKey()" style="flex:1.4">
            ${CIPHERS.map(c => `<option value="${c}" ${c===settings.cipher?'selected':''}>${CIPHER_LABELS[c]}</option>`).join('')}
          </select>
          <input class="field-sm" id="c-key" type="text" placeholder="Key / Passphrase"
            value="${settings.key}" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"
            style="${CIPHER_USES_KEY[settings.cipher]?'flex:1':'display:none'}">
        </div>
        <div class="compose-row">
          <textarea class="compose-input" id="c-text" placeholder="Type a message..." rows="1"
            oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"></textarea>
          <button class="send-btn" onclick="_send('${convId}')">→</button>
        </div>
      </div>
    </div>`

  await _loadMsgs(convId)
  _renderMsgs(convId)
  _scrollBottom()

  if (_chatSub) _chatSub.unsubscribe()
  _chatSub = sb.channel(`chat-${convId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
      (payload) => {
        if (!state.messages[convId]) state.messages[convId] = []
        state.messages[convId].push(payload.new)
        // Auto-decode if keep is on
        const s = getSettings(convId)
        if (s.keep && s.key) _autoDecodeMsg(payload.new, convId)
        else { _renderMsgs(convId); _scrollBottom() }
      }
    ).subscribe()
}

async function _autoDecodeMsg(msg, convId) {
  const s = getSettings(convId)
  const cipherText = await decrypt(msg.payload, msg.iv, msg.salt, s.key)
  if (cipherText) msg._decoded = applyCipher(cipherText, s.cipher, s.key, false)
  _renderMsgs(convId); _scrollBottom()
}

async function _loadMsgs(convId) {
  const { data } = await sb.from('messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true })
  const msgs = data || []

  // Auto-decode if keep is on
  const s = getSettings(convId)
  if (s.keep && s.key) {
    for (const m of msgs) {
      const ct = await decrypt(m.payload, m.iv, m.salt, s.key)
      if (ct) m._decoded = applyCipher(ct, s.cipher, s.key, false)
    }
  }

  state.messages[convId] = msgs
}

function _renderMsgs(convId) {
  const el = document.getElementById('msg-list')
  if (!el) return
  const msgs = state.messages[convId] || []
  if (!msgs.length) {
    el.innerHTML = `<div class="center-msg">No messages yet.<br>Send the first one.</div>`
    return
  }
  el.innerHTML = msgs.map(m => {
    const mine = m.sender_id === state.user.id
    return `
      <div class="msg-wrap ${mine?'mine':'theirs'}">
        <div class="bubble ${mine?'mine':'theirs'}" onclick="_tapMsg('${m.id}','${convId}')">
          ${m._decoded
            ? `<div class="bubble-text">${_esc(m._decoded)}</div>`
            : `<div class="bubble-locked"><span class="lock-glyph">⚿</span><span class="lock-label">Tap to decode</span></div>`
          }
        </div>
        <div class="msg-time">${_ago(m.created_at)}</div>
      </div>`
  }).join('')
}

window._tapMsg = (msgId, convId) => {
  _decoding = msgId
  document.getElementById('decode-panel')?.classList.toggle('hidden')
}

window._decode = async (convId) => {
  if (!_decoding) return
  const msg    = (state.messages[convId] || []).find(m => m.id === _decoding)
  if (!msg) return

  const cipher = document.getElementById('d-cipher').value
  const key    = document.getElementById('d-key').value
  const keep   = document.getElementById('d-keep').checked

  putSettings(convId, { cipher, key, keep })

  const cipherText = await decrypt(msg.payload, msg.iv, msg.salt, key || 'cipher')
  if (!cipherText) { alert('Wrong key — could not decrypt.'); return }

  const plain = applyCipher(cipherText, cipher, key, false)
  msg._decoded = plain

  // Sync compose fields
  const cc = document.getElementById('c-cipher')
  const ck = document.getElementById('c-key')
  if (cc) { cc.value = cipher; _syncComposeKey() }
  if (ck) ck.value = key

  _renderMsgs(convId)
  _scrollBottom()
  document.getElementById('decode-panel')?.classList.add('hidden')
  _decoding = null
}

window._syncDecodeKey = () => {
  const c  = document.getElementById('d-cipher')?.value
  const kf = document.getElementById('d-key')
  if (kf) kf.style.display = CIPHER_USES_KEY[c] ? '' : 'none'
}

window._syncComposeKey = () => {
  const c  = document.getElementById('c-cipher')?.value
  const kf = document.getElementById('c-key')
  if (kf) kf.style.display = CIPHER_USES_KEY[c] ? 'flex' : 'none'
}

window._send = async (convId) => {
  const text   = document.getElementById('c-text').value.trim()
  const cipher = document.getElementById('c-cipher').value
  const key    = document.getElementById('c-key').value.trim()
  if (!text) return

  putSettings(convId, { cipher, key })

  const encoded = applyCipher(text, cipher, key, true)
  const { payload, iv, salt } = await encrypt(encoded, key || 'cipher')

  const { error } = await sb.from('messages').insert({
    conversation_id: convId,
    sender_id: state.user.id,
    payload, iv, salt
  })

  if (error) { alert('Failed to send.'); return }

  const ta = document.getElementById('c-text')
  ta.value = ''; ta.style.height = 'auto'
}

function _scrollBottom() {
  const el = document.getElementById('msg-list')
  if (el) el.scrollTop = el.scrollHeight
}

// ── New Chat ──────────────────────────────────────────────────────────────────

async function showNewChat() {
  app.innerHTML = `<div class="screen"><div class="topbar"><button class="icon-btn" onclick="navigate('/')">←</button><div class="topbar-title">NEW CONVERSATION</div><div style="width:44px"></div></div><div class="center-msg">Creating invite link...</div></div>`

  const { data, error } = await sb.from('invites').insert({ creator_id: state.user.id }).select().single()
  if (error) { alert('Could not create invite.'); navigate('/'); return }

  const url = `${location.origin}${location.pathname}#/invite/${data.code}`

  app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <button class="icon-btn" onclick="navigate('/')">←</button>
        <div class="topbar-title">NEW CONVERSATION</div>
        <div style="width:44px"></div>
      </div>
      <div class="invite-body">
        <div class="invite-hint">Share this link to start a conversation.<br>Only one person can use it.</div>
        <div class="invite-link">${url}</div>
        <button class="btn" onclick="_copyLink('${url}')">Copy Link</button>
        <div class="invite-note">Expires in 7 days.<br>The link does not reveal your key or cipher.</div>
      </div>
    </div>`
}

window._copyLink = async (url) => {
  await navigator.clipboard.writeText(url)
  const btn = document.querySelector('.invite-body .btn')
  if (btn) { btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy Link', 2000) }
}

// ── Accept Invite ─────────────────────────────────────────────────────────────

async function showAcceptInvite(code) {
  app.innerHTML = `<div class="screen"><div class="center-msg">Processing invite...</div></div>`

  const { data: invite } = await sb.from('invites').select('*').eq('code', code).single()

  if (!invite || new Date(invite.expires_at) < new Date()) {
    app.innerHTML = `<div class="screen"><div class="center-msg">This invite is invalid or has expired.</div></div>`
    return
  }

  if (invite.creator_id === state.user.id) {
    app.innerHTML = `<div class="screen"><div class="center-msg">That's your own invite link.</div></div>`
    return
  }

  if (invite.accepted_by) {
    // Already accepted — navigate to that conversation if we're a member
    if (invite.accepted_by === state.user.id || invite.creator_id === state.user.id) {
      navigate(`/chat/${invite.conversation_id}`)
    } else {
      app.innerHTML = `<div class="screen"><div class="center-msg">This invite has already been used.</div></div>`
    }
    return
  }

  // Generate ID client-side — avoids RLS blocking the SELECT before members are added
  const convId = crypto.randomUUID()

  const { error: e1 } = await sb.from('conversations').insert({ id: convId })
  if (e1) { app.innerHTML = `<div class="screen"><div class="center-msg">Error creating conversation.<br>${e1.message}</div></div>`; return }

  const { error: e2 } = await sb.from('conversation_members').insert({ conversation_id: convId, user_id: invite.creator_id })
  if (e2) { app.innerHTML = `<div class="screen"><div class="center-msg">Error adding creator.<br>${e2.message}</div></div>`; return }

  const { error: e3 } = await sb.from('conversation_members').insert({ conversation_id: convId, user_id: state.user.id })
  if (e3) { app.innerHTML = `<div class="screen"><div class="center-msg">Error adding you.<br>${e3.message}</div></div>`; return }

  const { error: e4 } = await sb.from('invites').update({ accepted_by: state.user.id, conversation_id: convId }).eq('code', code)
  if (e4) { app.innerHTML = `<div class="screen"><div class="center-msg">Error updating invite.<br>${e4.message}</div></div>`; return }

  const { data: creatorProfile } = await sb.from('profiles').select('*').eq('id', invite.creator_id).single()
  state.contacts[convId] = creatorProfile

  navigate(`/chat/${convId}`)
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function _ago(ts) {
  const d = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (d < 60)   return 'now'
  if (d < 3600) return `${Math.floor(d/60)}m`
  if (d < 86400) return `${Math.floor(d/3600)}h`
  return `${Math.floor(d/86400)}d`
}

function _strColor(str) {
  let h = 0
  for (const c of str) h = c.charCodeAt(0) + ((h << 5) - h)
  return `hsl(${Math.abs(h)%360},30%,22%)`
}

function _esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')
}

// ── Boot ──────────────────────────────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}

sb.auth.getSession().then(({ data: { session } }) => {
  state.user = session?.user || null
  sb.auth.onAuthStateChange((_e, s) => { state.user = s?.user || null })
  route()
})
