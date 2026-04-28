import { sb } from './supabase.js'
import { encrypt, decrypt } from './crypto.js'
import { applyCipher, CIPHERS, CIPHER_LABELS, CIPHER_USES_KEY } from './ciphers.js'

const CIPHER_HINT = {
  caesar:    'Shift number',
  vigenere:  'Keyword',
  atbash:    'No key',
  railfence: 'Rail count',
  polybius:  'No key',
  morse:     'No key',
  futhark:   'No key'
}

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  user:          null,
  profile:       null,
  conversations: [],
  messages:      {},
  contacts:      {},
}

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

  if (!view || view === '')            showInbox()
  else if (view === 'chat' && param)   showChat(param)
  else if (view === 'invite' && param) showAcceptInvite(param)
  else if (view === 'new')             showNewChat()
  else if (view === 'settings')        showSettings()
  else                                 showInbox()
}

window.addEventListener('hashchange', route)

// ── Auth ──────────────────────────────────────────────────────────────────────

function showAuth(mode = 'in') {
  app.innerHTML = `
    <div class="screen auth-screen">
      <div class="cipher-logo">
        <div class="logo-mark"><span class="logo-mark-glyph">⌘</span></div>
        <div class="logo-name">CIPHER</div>
        <div class="logo-by">BY READYBOX SYSTEMS</div>
      </div>

      <div class="auth-block">
        <div class="tab-row">
          <button class="tab ${mode==='in'?'active':''}" onclick="_authMode('in')">Sign In</button>
          <button class="tab ${mode==='up'?'active':''}" onclick="_authMode('up')">Sign Up</button>
        </div>
        <form class="form" onsubmit="_doAuth(event,'${mode}')">
          <input class="field" id="a-email"    type="email"    placeholder="email"    required autocomplete="email">
          <input class="field" id="a-password" type="password" placeholder="password" required autocomplete="${mode==='up'?'new-password':'current-password'}">
          <button class="btn" id="a-btn">${mode==='in'?'Sign In':'Create Account'}</button>
        </form>
        <div class="error-msg" id="a-err"></div>
      </div>

      <div class="legal-line">
        AES-256-GCM · Web Crypto<br>
        Server stores ciphertext only
      </div>
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
      <div class="cipher-logo" style="margin-bottom:8px">
        <div class="logo-mark" style="width:44px;height:44px"><span class="logo-mark-glyph" style="font-size:18px">⌘</span></div>
      </div>
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
  const { data } = await sb.from('profiles').select('*').eq('id', state.user.id).maybeSingle()
  state.profile = data
}

// ── Inbox ─────────────────────────────────────────────────────────────────────

let _inboxSub = null

async function showInbox() {
  app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <button class="icon-btn" onclick="navigate('/settings')" title="Settings">≡</button>
        <div class="topbar-center">
          <div class="topbar-title">CIPHER</div>
          <div class="topbar-sub">@${state.profile?.username || '···'}</div>
        </div>
        <button class="icon-btn accent" onclick="navigate('/new')" title="New conversation">＋</button>
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
    if (!state.contacts[c.id]) {
      const { data: others } = await sb.from('conversation_members').select('user_id').eq('conversation_id', c.id).neq('user_id', state.user.id)
      if (others?.[0]) {
        const { data: p } = await sb.from('profiles').select('*').eq('id', others[0].user_id).maybeSingle()
        state.contacts[c.id] = p
      }
    }
    const { data: last } = await sb.from('messages').select('created_at').eq('conversation_id', c.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
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

  const n = state.conversations.length
  el.innerHTML = `
    <div class="inbox-meta">
      <span><span class="dot"></span>Encrypted · ${n} active</span>
      <span>Live</span>
    </div>
    ${state.conversations.map(c => {
      const p = state.contacts[c.id]
      const col = _strColor(p?.username || '?')
      const ini = (p?.display_name || p?.username || '?')[0].toUpperCase()
      const settings = getSettings(c.id)
      const cipherLabel = CIPHER_LABELS[settings.cipher] || 'Caesar'
      return `
        <div class="conv-row" onclick="navigate('/chat/${c.id}')">
          <div class="avatar has-cipher" style="background:${col}">${ini}</div>
          <div class="conv-info">
            <div class="conv-name">
              @${p?.username || '···'}
              <span class="conv-cipher-tag">${cipherLabel}</span>
            </div>
            <div class="conv-preview locked">
              <span class="lock-mini">⚿</span>Encrypted message
            </div>
          </div>
          <div class="conv-time">${c._lastAt ? _ago(c._lastAt) : ''}</div>
        </div>`
    }).join('')}`
}

window._signOut = async () => {
  await sb.auth.signOut()
  state.user = null; state.profile = null; state.conversations = []; state.messages = {}; state.contacts = {}
  navigate('/')
}

// ── Settings ──────────────────────────────────────────────────────────────────

function showSettings() {
  const col = _strColor(state.profile?.username || '?')
  const ini = (state.profile?.display_name || state.profile?.username || '?')[0].toUpperCase()

  app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <button class="icon-btn" onclick="navigate('/')">←</button>
        <div class="topbar-center">
          <div class="topbar-title">SETTINGS</div>
        </div>
        <div style="width:44px"></div>
      </div>

      <div class="settings-list">
        <div class="settings-header">
          <div class="avatar settings-avatar" style="background:${col}">${ini}</div>
          <div class="settings-header-info">
            <div class="name">@${state.profile?.username || '···'}</div>
            <div class="email">${state.user?.email || ''}</div>
          </div>
        </div>

        <div class="settings-section-label">PROFILE</div>
        <div class="settings-rows">
          <div class="settings-row readonly">
            <span class="s-label">Display name</span>
            <span class="s-value">${_esc(state.profile?.display_name || '')}</span>
          </div>
          <div class="settings-row readonly">
            <span class="s-label">Handle</span>
            <span class="s-value">@${state.profile?.username || '···'}</span>
          </div>
          <div class="settings-row readonly">
            <span class="s-label">Email</span>
            <span class="s-value">${state.user?.email || ''}</span>
          </div>
        </div>

        <div class="settings-section-label">APP</div>
        <div class="settings-rows">
          <div class="settings-row action" onclick="_installPWA()">
            <span class="s-label">Install Cipher</span>
            <span class="s-value"><span class="s-chev">›</span></span>
          </div>
        </div>

        <div class="settings-section-label">ACCOUNT</div>
        <div class="settings-rows">
          <div class="settings-row danger" onclick="_signOut()">
            <span class="s-label">Sign out</span>
            <span class="s-value"><span class="s-chev" style="color:var(--danger)">›</span></span>
          </div>
        </div>

        <div style="padding:24px 20px 32px;text-align:center;font-size:9px;letter-spacing:0.22em;color:var(--text-dim);text-transform:uppercase">
          v1.0 · readybox systems
        </div>
      </div>
    </div>`
}

let _deferredInstall = null
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); _deferredInstall = e })
window._installPWA = () => { if (_deferredInstall) { _deferredInstall.prompt() } }

// ── Chat ──────────────────────────────────────────────────────────────────────

let _chatSub  = null
let _flippedId = null

async function showChat(convId) {
  _flippedId = null

  if (!state.contacts[convId]) {
    const { data: others } = await sb.from('conversation_members').select('user_id').eq('conversation_id', convId).neq('user_id', state.user.id)
    if (others?.[0]) {
      const { data: p } = await sb.from('profiles').select('*').eq('id', others[0].user_id).maybeSingle()
      state.contacts[convId] = p
    }
  }

  const contact  = state.contacts[convId]
  const settings = getSettings(convId)
  const col      = _strColor(contact?.username || '?')
  const ini      = (contact?.display_name || contact?.username || '?')[0].toUpperCase()
  const statusLabel = settings.keep
    ? `AUTO-DECODE · ${(CIPHER_LABELS[settings.cipher] || 'Caesar').toUpperCase()}`
    : `LOCKED · ${(CIPHER_LABELS[settings.cipher] || 'Caesar').toUpperCase()}`

  app.innerHTML = `
    <div class="screen chat-screen">
      <div class="chat-topbar">
        <button class="icon-btn" onclick="navigate('/')">←</button>
        <div class="chat-contact">
          <div class="avatar" style="background:${col}">${ini}</div>
          <div class="chat-contact-info">
            <div class="chat-contact-name">@${contact?.username || '···'}</div>
            <div class="chat-contact-status" id="chat-status">
              <span class="pulse"></span>${statusLabel}
            </div>
          </div>
        </div>
        <button class="icon-btn">⋯</button>
      </div>

      <div class="messages-list" id="msg-list"></div>

      <div class="compose-bar">
        <div class="compose-meta">
          <button class="cipher-pill" id="c-pill" onclick="_openCipherSheet('${convId}')">
            <span id="c-cipher-label">${CIPHER_LABELS[settings.cipher] || 'Caesar'}</span>
            <span class="caret">▾</span>
          </button>
          <input class="key-mini" id="c-key" type="text" placeholder="key"
            value="${_esc(settings.key)}"
            autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"
            style="${CIPHER_USES_KEY[settings.cipher] ? '' : 'display:none'}">
          ${settings.keep ? `<div class="auto-indicator"><span class="dot"></span>AUTO</div>` : ''}
        </div>
        <div class="compose-row">
          <textarea class="compose-input" id="c-text" placeholder="Type a message..." rows="1"
            oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();_send('${convId}')}"></textarea>
          <button class="send-btn" id="send-btn" onclick="_send('${convId}')">→</button>
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
  const settings = getSettings(convId)

  if (!msgs.length) {
    el.innerHTML = `<div class="center-msg">No messages yet.<br>Send the first one.</div>`
    return
  }

  el.innerHTML = `<div class="day-divider">TODAY</div>` + msgs.map(m => {
    const mine = m.sender_id === state.user.id
    if (m._decoded) {
      return `
        <div class="msg-wrap ${mine?'mine':'theirs'}">
          <div class="bubble ${mine?'mine':'theirs'}">
            <div class="cipher-tag-row">
              <span class="cipher-tag">${CIPHER_LABELS[settings.cipher] || 'Caesar'}</span>
            </div>
            <div class="bubble-text">${_esc(m._decoded)}</div>
          </div>
          <div class="msg-time">${_ago(m.created_at)}</div>
        </div>`
    }

    const isFlipped = _flippedId === m.id
    return `
      <div class="msg-wrap ${mine?'mine':'theirs'}">
        <div class="card-container">
          <div class="card flip-y${isFlipped?' flipped':''}" data-msg-id="${m.id}">
            <div class="card-face front">
              <div class="bubble locked ${mine?'mine':'theirs'}" onclick="_tapMsg('${m.id}')">
                <div class="cipher-tag-row">
                  <span class="lock-glyph-tiny">⚿</span>
                  <span class="cipher-tag">LOCKED</span>
                </div>
                <div class="bubble-cipher ${settings.cipher}">
                  ${CIPHER_LABELS[settings.cipher] || 'Caesar'} · tap to decode
                </div>
              </div>
            </div>
            <div class="card-face back">
              <div class="decode-form">
                <div class="decode-title">DECODE MESSAGE</div>
                <div class="decode-row">
                  <select class="field-sm" style="flex:1.4" onchange="_syncFlipKey(this)">
                    ${CIPHERS.map(c => `<option value="${c}" ${c===settings.cipher?'selected':''}>${CIPHER_LABELS[c]}</option>`).join('')}
                  </select>
                  <input class="field-sm d-key" type="text" placeholder="key" value="${_esc(settings.key)}"
                    autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"
                    style="${CIPHER_USES_KEY[settings.cipher]?'flex:1':'display:none'}">
                </div>
                <label class="check-label">
                  <input type="checkbox" class="d-keep" ${settings.keep?'checked':''}> Keep decoded for me
                </label>
                <div class="error-msg d-err" style="min-height:14px"></div>
                <div class="decode-row" style="gap:6px">
                  <button class="btn-sm" style="flex:1;background:transparent;border-color:var(--border2);color:var(--text-mid)"
                    onclick="event.stopPropagation();_tapMsg('${m.id}')">Cancel</button>
                  <button class="btn-sm" style="flex:1.2"
                    onclick="event.stopPropagation();_decode('${convId}','${m.id}')">Decode</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="msg-time">${_ago(m.created_at)}</div>
      </div>`
  }).join('')
}

window._tapMsg = (msgId) => {
  if (_flippedId && _flippedId !== msgId) {
    const prev = document.querySelector(`.card[data-msg-id="${_flippedId}"]`)
    if (prev) prev.classList.remove('flipped')
  }
  const card = document.querySelector(`.card[data-msg-id="${msgId}"]`)
  if (!card) return
  if (_flippedId === msgId) {
    card.classList.remove('flipped')
    _flippedId = null
  } else {
    card.classList.add('flipped')
    _flippedId = msgId
  }
}

window._syncFlipKey = (select) => {
  const card = select.closest('.card')
  const keyField = card?.querySelector('.d-key')
  if (keyField) keyField.style.display = CIPHER_USES_KEY[select.value] ? '' : 'none'
}

window._decode = async (convId, msgId) => {
  const card = document.querySelector(`.card[data-msg-id="${msgId}"]`)
  if (!card) return

  const cipher  = card.querySelector('select')?.value || 'caesar'
  const key     = card.querySelector('.d-key')?.value || ''
  const keep    = card.querySelector('.d-keep')?.checked || false
  const errEl   = card.querySelector('.d-err')

  putSettings(convId, { cipher, key, keep })

  const msg = (state.messages[convId] || []).find(m => m.id === msgId)
  if (!msg) return

  const cipherText = await decrypt(msg.payload, msg.iv, msg.salt, key || 'cipher')
  if (!cipherText) {
    if (errEl) errEl.textContent = 'Wrong key'
    return
  }

  const plain = applyCipher(cipherText, cipher, key, false)
  msg._decoded = plain

  if (keep) {
    for (const m of state.messages[convId] || []) {
      if (!m._decoded && m.id !== msgId) {
        const ct = await decrypt(m.payload, m.iv, m.salt, key || 'cipher')
        if (ct) m._decoded = applyCipher(ct, cipher, key, false)
      }
    }
  }

  _flippedId = null
  _renderMsgs(convId)
  _scrollBottom()
  _refreshChatStatus(convId)
}

function _refreshChatStatus(convId) {
  const settings = getSettings(convId)
  const statusEl = document.getElementById('chat-status')
  if (!statusEl) return
  const label = settings.keep
    ? `AUTO-DECODE · ${(CIPHER_LABELS[settings.cipher] || 'Caesar').toUpperCase()}`
    : `LOCKED · ${(CIPHER_LABELS[settings.cipher] || 'Caesar').toUpperCase()}`
  statusEl.innerHTML = `<span class="pulse"></span>${label}`

  const keyField = document.getElementById('c-key')
  if (keyField) {
    keyField.value = settings.key
    keyField.style.display = CIPHER_USES_KEY[settings.cipher] ? '' : 'none'
  }
  const pillLabel = document.getElementById('c-cipher-label')
  if (pillLabel) pillLabel.textContent = CIPHER_LABELS[settings.cipher] || 'Caesar'

  const composeAuto = document.querySelector('.auto-indicator')
  if (settings.keep && !composeAuto) {
    const meta = document.querySelector('.compose-meta')
    if (meta) {
      const ind = document.createElement('div')
      ind.className = 'auto-indicator'
      ind.innerHTML = `<span class="dot"></span>AUTO`
      meta.appendChild(ind)
    }
  }
}

// ── Cipher sheet ──────────────────────────────────────────────────────────────

window._openCipherSheet = (convId) => {
  const settings = getSettings(convId)
  const existing = document.querySelector('.sheet-backdrop')
  if (existing) { existing.remove(); return }

  const sheet = document.createElement('div')
  sheet.className = 'sheet-backdrop'
  sheet.onclick = () => sheet.remove()
  sheet.innerHTML = `
    <div class="sheet" onclick="event.stopPropagation()">
      <div class="sheet-header">SELECT CIPHER</div>
      <div class="sheet-list">
        ${CIPHERS.map(c => `
          <div class="sheet-row ${c===settings.cipher?'active':''}" onclick="_pickCipher('${convId}','${c}')">
            <span>${CIPHER_LABELS[c]}</span>
            <span class="sheet-row-hint">${CIPHER_HINT[c]}</span>
          </div>`).join('')}
      </div>
    </div>`
  app.appendChild(sheet)
}

window._pickCipher = (convId, cipher) => {
  putSettings(convId, { cipher })
  document.querySelector('.sheet-backdrop')?.remove()

  const pillLabel = document.getElementById('c-cipher-label')
  if (pillLabel) pillLabel.textContent = CIPHER_LABELS[cipher]

  const keyField = document.getElementById('c-key')
  if (keyField) keyField.style.display = CIPHER_USES_KEY[cipher] ? '' : 'none'

  const statusEl = document.getElementById('chat-status')
  if (statusEl) {
    const s = getSettings(convId)
    statusEl.innerHTML = `<span class="pulse"></span>${s.keep ? 'AUTO-DECODE' : 'LOCKED'} · ${(CIPHER_LABELS[cipher] || 'Caesar').toUpperCase()}`
  }
}

window._send = async (convId) => {
  const text = document.getElementById('c-text')?.value.trim()
  const key  = document.getElementById('c-key')?.value.trim() || ''
  if (!text) return

  const settings = getSettings(convId)
  putSettings(convId, { key })

  const encoded = applyCipher(text, settings.cipher, key, true)
  const { payload, iv, salt } = await encrypt(encoded, key || 'cipher')

  const { error } = await sb.from('messages').insert({
    conversation_id: convId,
    sender_id: state.user.id,
    payload, iv, salt
  })

  if (error) { alert('Failed to send.'); return }

  const ta = document.getElementById('c-text')
  if (ta) { ta.value = ''; ta.style.height = 'auto' }
}

function _scrollBottom() {
  const el = document.getElementById('msg-list')
  if (el) el.scrollTop = el.scrollHeight
}

// ── New Chat ──────────────────────────────────────────────────────────────────

async function showNewChat() {
  app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <button class="icon-btn" onclick="navigate('/')">←</button>
        <div class="topbar-center"><div class="topbar-title">NEW CHANNEL</div></div>
        <div style="width:44px"></div>
      </div>
      <div class="center-msg">Generating invite...</div>
    </div>`

  const { data, error } = await sb.from('invites').insert({ creator_id: state.user.id }).select().maybeSingle()
  if (error) { alert('Could not create invite.'); navigate('/'); return }

  const url = `${location.origin}${location.pathname}#/invite/${data.code}`

  app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <button class="icon-btn" onclick="navigate('/')">←</button>
        <div class="topbar-center"><div class="topbar-title">NEW CHANNEL</div></div>
        <div style="width:44px"></div>
      </div>
      <div class="invite-body">
        <div class="empty-glyph">⚷</div>
        <div class="invite-block">
          <div class="invite-hint">
            Share this one-time link to start a conversation.<br>
            Agree on a cipher and key out of band.
          </div>
          <div class="invite-link-box">
            <div class="small-tag">INVITE · 7D</div>
            ${url}
          </div>
          <button class="btn" onclick="_copyLink('${url}')">Copy Link</button>
        </div>
        <div class="invite-note">
          THE LINK DOES NOT REVEAL<br>YOUR KEY OR CIPHER
        </div>
      </div>
    </div>`
}

window._copyLink = async (url) => {
  await navigator.clipboard.writeText(url)
  const btn = document.querySelector('.invite-body .btn')
  if (btn) { btn.textContent = 'Copied'; setTimeout(() => btn.textContent = 'Copy Link', 2000) }
}

// ── Accept Invite ─────────────────────────────────────────────────────────────

async function showAcceptInvite(code) {
  app.innerHTML = `<div class="screen"><div class="center-msg">Processing invite...</div></div>`

  const { data: invite } = await sb.from('invites').select('*').eq('code', code).maybeSingle()

  if (!invite || new Date(invite.expires_at) < new Date()) {
    app.innerHTML = `<div class="screen"><div class="center-msg">This invite is invalid or has expired.</div></div>`
    return
  }

  if (invite.creator_id === state.user.id) {
    app.innerHTML = `<div class="screen"><div class="center-msg">That's your own invite link.</div></div>`
    return
  }

  if (invite.accepted_by) {
    if (invite.accepted_by === state.user.id || invite.creator_id === state.user.id) {
      navigate(`/chat/${invite.conversation_id}`)
    } else {
      app.innerHTML = `<div class="screen"><div class="center-msg">This invite has already been used.</div></div>`
    }
    return
  }

  const convId = crypto.randomUUID()

  const { error: e1 } = await sb.from('conversations').insert({ id: convId })
  if (e1) { app.innerHTML = `<div class="screen"><div class="center-msg">Error creating conversation.<br>${e1.message}</div></div>`; return }

  const { error: e2 } = await sb.from('conversation_members').insert({ conversation_id: convId, user_id: invite.creator_id })
  if (e2) { app.innerHTML = `<div class="screen"><div class="center-msg">Error adding creator.<br>${e2.message}</div></div>`; return }

  const { error: e3 } = await sb.from('conversation_members').insert({ conversation_id: convId, user_id: state.user.id })
  if (e3) { app.innerHTML = `<div class="screen"><div class="center-msg">Error adding you.<br>${e3.message}</div></div>`; return }

  const { error: e4 } = await sb.from('invites').update({ accepted_by: state.user.id, conversation_id: convId }).eq('code', code)
  if (e4) { app.innerHTML = `<div class="screen"><div class="center-msg">Error updating invite.<br>${e4.message}</div></div>`; return }

  const { data: creatorProfile } = await sb.from('profiles').select('*').eq('id', invite.creator_id).maybeSingle()
  state.contacts[convId] = creatorProfile

  navigate(`/chat/${convId}`)
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function _ago(ts) {
  const d = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (d < 60)    return 'now'
  if (d < 3600)  return `${Math.floor(d/60)}m`
  if (d < 86400) return `${Math.floor(d/3600)}h`
  return `${Math.floor(d/86400)}d`
}

function _strColor(str) {
  let h = 0
  for (const c of str) h = c.charCodeAt(0) + ((h << 5) - h)
  return `hsl(${Math.abs(h)%360},30%,22%)`
}

function _esc(s) {
  if (!s) return ''
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\n/g,'<br>')
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
