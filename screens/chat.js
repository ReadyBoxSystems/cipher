import { transport }                             from '../transport/index.js'
import * as store                                from '../state/store.js'
import * as router                               from '../lib/router.js'
import { _ago, _esc }                            from '../lib/utils.js'
import { getSettings, putSettings }              from '../lib/settings.js'
import { encrypt, decrypt }                      from '../crypto.js'
import { CIPHERS, CIPHER_LABELS, CIPHER_USES_KEY, applyCipher } from '../ciphers.js'

router.register('chat', async (convId) => {
  const app  = document.getElementById('app')
  const user = store.get('user')

  if (!user)                 { router.navigate('#/auth');  return () => {} }
  if (!store.get('profile')) { router.navigate('#/setup'); return () => {} }
  if (!convId)               { router.navigate('#/');      return () => {} }

  const { result: contact, error: contactErr } = await transport.getConversationContact(convId, user.id)
  if (contactErr || !contact) { router.navigate('#/'); return () => {} }

  const prefs = getSettings(convId)

  app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <div class="topbar-actions">
          <button class="icon-btn" id="chat-back" type="button" aria-label="Back to inbox">←</button>
        </div>
        <div class="topbar-title">@${_esc(contact.username)}</div>
        <div style="width:44px"></div>
      </div>

      <div class="messages-list" id="messages-list">
        <div class="center-msg">LOADING...</div>
      </div>

      <div class="compose-bar">
        <div class="compose-meta">
          <select class="field-sm" id="compose-cipher">
            ${CIPHERS.map(c => `<option value="${c}"${c === prefs.cipher ? ' selected' : ''}>${_esc(CIPHER_LABELS[c])}</option>`).join('')}
          </select>
          <input class="field-sm" id="compose-key" type="text"
            placeholder="${CIPHER_USES_KEY[prefs.cipher] ? 'key' : 'enc. key'}"
            value="${_esc(prefs.key)}" autocomplete="off" spellcheck="false"
            ${CIPHER_USES_KEY[prefs.cipher] ? '' : 'style="opacity:0.5"'} />
        </div>
        <div class="compose-row">
          <textarea class="compose-input" id="compose-text" placeholder="message" rows="1"></textarea>
          <button class="send-btn" id="compose-send" type="button" aria-label="Send message">→</button>
        </div>
        <div class="error-msg" id="compose-error" style="margin-top:6px"></div>
      </div>
    </div>
  `

  const listEl   = app.querySelector('#messages-list')
  const textEl   = app.querySelector('#compose-text')
  const keyEl    = app.querySelector('#compose-key')
  const cipherEl = app.querySelector('#compose-cipher')
  const sendBtn  = app.querySelector('#compose-send')
  const errEl    = app.querySelector('#compose-error')
  const back     = app.querySelector('#chat-back')

  let messages         = []
  const seenIds        = new Set()
  const aesDecoded     = {}   // { [msgId]: cipher-text } — AES layer stripped, historical cipher still on
  const decoded        = {}   // { [msgId]: plaintext }  — fully decoded
  let openPanelId      = null
  const justArrivedIds = new Set()

  // ── Decode panel HTML (rendered below each locked bubble) ────────────
  function _decodePanel(msgId) {
    return `
      <div class="decode-panel-inline" id="dp-${msgId}">
        <div class="panel-row">
          <select class="field-sm decode-cipher">
            ${CIPHERS.map(c => `<option value="${c}"${c === prefs.cipher ? ' selected' : ''}>${_esc(CIPHER_LABELS[c])}</option>`).join('')}
          </select>
          <input class="field-sm decode-key" type="text" placeholder="key" value="${_esc(prefs.key)}" />
        </div>
        <div class="panel-row">
          <button class="btn-sm decode-go" type="button" data-msg-id="${msgId}">DECODE MESSAGE</button>
          <label class="check-label">
            <input type="checkbox" class="decode-keep"${prefs.keep ? ' checked' : ''} />
            KEEP DECODED FOR ME
          </label>
        </div>
        <div class="error-msg decode-err"></div>
      </div>
    `
  }


  // ── Render ───────────────────────────────────────────────────────────
  function renderMessages() {
    if (messages.length === 0) {
      listEl.innerHTML = '<div class="center-msg">NO MESSAGES YET</div>'
      return
    }

    listEl.innerHTML = messages.map(msg => {
      const mine      = msg.sender_id === user.id
      const isDecoded = msg.id in decoded
      const isPulse   = justArrivedIds.has(msg.id)

      // Once decoded (this session or auto-decoded via keep), show plaintext — no lock
      if (isDecoded) {
        return `
          <div class="msg-wrap ${mine ? 'mine' : 'theirs'}">
            <div class="bubble ${mine ? 'mine' : 'theirs'}">
              <div class="bubble-text">${_esc(decoded[msg.id])}</div>
            </div>
            <div class="msg-time">${_ago(msg.created_at)}</div>
          </div>
        `
      }

      // Locked bubble — shows cipher text if AES was stripped, nothing otherwise.
      // Never shows msg.payload (raw base64 AES blob) — that's an implementation detail.
      const surface   = aesDecoded[msg.id] ? aesDecoded[msg.id].slice(0, 200) : null
      const needsClip = surface !== null && (surface.length >= 200 || (surface.match(/\n/g) || []).length > 5)

      return `
        <div class="msg-wrap ${mine ? 'mine' : 'theirs'}">
          <div class="bubble ${mine ? 'mine' : 'theirs'}" data-msg-id="${msg.id}" style="cursor:pointer">
            <span class="lock-glyph${isPulse ? ' pulse' : ''}">⚿</span>
            ${surface !== null
              ? `<div class="bubble-text${needsClip ? ' clipped' : ''}">${_esc(surface)}</div>${needsClip ? '<span class="bubble-more">MORE</span>' : ''}`
              : ''}
          </div>
          ${_decodePanel(msg.id)}
          <div class="msg-time">${_ago(msg.created_at)}</div>
        </div>
      `
    }).join('')

    // Re-open the panel that was open before re-render
    if (openPanelId) {
      const panel = document.getElementById('dp-' + openPanelId)
      if (panel) panel.classList.add('open')
    }

    // Wire animationend on pulse glyphs to remove class
    listEl.querySelectorAll('.lock-glyph.pulse').forEach(el => {
      el.addEventListener('animationend', () => el.classList.remove('pulse'), { once: true })
    })

    listEl.scrollTop = listEl.scrollHeight
  }


  // ── Initial fetch ─────────────────────────────────────────────────────
  const { result: msgs, error: fetchErr } = await transport.getMessages(convId)
  if (fetchErr) {
    listEl.innerHTML = '<div class="center-msg">FAILED TO LOAD</div>'
  } else {
    messages = msgs || []
    messages.forEach(m => seenIds.add(m.id))
    store.set('messages', { ...(store.get('messages') || {}), [convId]: messages })

    if (prefs.keep && prefs.cipher && prefs.key) {
      await Promise.all(messages.map(async (m) => {
        const ct = await decrypt(m.payload, m.iv, m.salt, prefs.key)
        if (ct !== null) { aesDecoded[m.id] = ct; decoded[m.id] = applyCipher(ct, prefs.cipher, prefs.key, false) }
      }))
    }

    renderMessages()
  }

  // ── Send handler ──────────────────────────────────────────────────────
  async function onSend() {
    const text   = textEl.value
    const key    = keyEl.value
    const cipher = cipherEl.value
    errEl.textContent = ''

    if (!text.trim()) return
    if (!key) {
      errEl.textContent = CIPHER_USES_KEY[cipher] ? 'KEY REQUIRED' : 'ENCRYPTION KEY REQUIRED'
      return
    }

    putSettings(convId, { cipher, key, keep: prefs.keep })
    prefs.cipher = cipher
    prefs.key    = key

    const cipherText = applyCipher(text, cipher, key, true)
    let payload, iv, salt
    try {
      ;({ payload, iv, salt } = await encrypt(cipherText, key))
    } catch (_e) {
      errEl.textContent = 'SEND FAILED — TRY AGAIN'
      return
    }

    const tempId = 'opt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
    const optimistic = { id: tempId, conversation_id: convId, sender_id: user.id, payload, iv, salt, created_at: new Date().toISOString() }
    messages.push(optimistic)
    seenIds.add(tempId)
    decoded[tempId] = text
    textEl.value = ''
    renderMessages()

    const { result: row, error: sendErr } = await transport.sendMessage(convId, user.id, payload, iv, salt)
    if (sendErr || !row) {
      messages = messages.filter(m => m.id !== tempId)
      seenIds.delete(tempId)
      delete decoded[tempId]
      renderMessages()
      errEl.textContent = 'SEND FAILED — TRY AGAIN'
      return
    }

    const idx = messages.findIndex(m => m.id === tempId)
    if (idx !== -1) {
      messages[idx] = row
      seenIds.delete(tempId)
      seenIds.add(row.id)
      decoded[row.id] = text
      delete decoded[tempId]
      renderMessages()
    }
  }

  // ── Realtime subscription ─────────────────────────────────────────────
  const unsubMessages = transport.subscribeMessages(convId, async (msg) => {
    if (seenIds.has(msg.id)) return
    seenIds.add(msg.id)
    messages.push(msg)
    justArrivedIds.add(msg.id)

    if (prefs.keep && prefs.key && prefs.cipher) {
      const ct = await decrypt(msg.payload, msg.iv, msg.salt, prefs.key)
      if (ct !== null) {
        aesDecoded[msg.id] = ct
        decoded[msg.id] = applyCipher(ct, prefs.cipher, prefs.key, false)
      }
    }

    renderMessages()
    setTimeout(() => { justArrivedIds.delete(msg.id) }, 800)
  })

  // ── Delegated click handler ───────────────────────────────────────────
  listEl.addEventListener('click', async (e) => {

    // MORE expand
    if (e.target.classList.contains('bubble-more')) {
      e.stopPropagation()
      const text = e.target.previousElementSibling
      if (text && text.classList.contains('bubble-text')) {
        text.classList.remove('clipped')
        text.classList.add('expanded')
        e.target.classList.add('hidden')
      }
      return
    }

    // DECODE MESSAGE button
    if (e.target.classList.contains('decode-go')) {
      e.stopPropagation()
      const msgId    = e.target.dataset.msgId
      const panel    = document.getElementById('dp-' + msgId)
      const cipherSel = panel.querySelector('.decode-cipher')
      const keyIn    = panel.querySelector('.decode-key')
      const keepIn   = panel.querySelector('.decode-keep')
      const errOut   = panel.querySelector('.decode-err')
      const cipher   = cipherSel.value
      const key      = keyIn.value
      errOut.textContent = ''
      if (!key) { errOut.textContent = 'KEY REQUIRED'; return }
      const m = messages.find(x => x.id === msgId)
      if (!m) return
      const cipherText = await decrypt(m.payload, m.iv, m.salt, key)
      if (cipherText === null) { errOut.textContent = 'WRONG KEY — CHECK CIPHER AND KEY'; return }
      aesDecoded[msgId] = cipherText
      const plaintext   = applyCipher(cipherText, cipher, key, false)
      decoded[msgId]    = plaintext
      putSettings(convId, { cipher, key, keep: keepIn.checked })
      prefs.cipher = cipher
      prefs.key    = key
      prefs.keep   = keepIn.checked
      openPanelId  = null
      if (prefs.keep) {
        await Promise.all(messages.map(async (mm) => {
          if (decoded[mm.id]) return
          const ct = await decrypt(mm.payload, mm.iv, mm.salt, key)
          if (ct !== null) { aesDecoded[mm.id] = ct; decoded[mm.id] = applyCipher(ct, cipher, key, false) }
        }))
      }
      renderMessages()
      return
    }

    // Tap bubble → toggle its decode panel
    const bubble = e.target.closest('.bubble[data-msg-id]')
    if (bubble) {
      const id    = bubble.dataset.msgId
      const panel = document.getElementById('dp-' + id)
      if (!panel) return

      if (openPanelId && openPanelId !== id) {
        const prev = document.getElementById('dp-' + openPanelId)
        if (prev) prev.classList.remove('open')
      }

      const opening = !panel.classList.contains('open')
      panel.classList.toggle('open')
      openPanelId = opening ? id : null
    }
  })

  // ── Compose bar events ────────────────────────────────────────────────
  function onBack()      { router.navigate('#/') }
  function onTextKey(e)  { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }

  function onCipherChange() {
    prefs.cipher = cipherEl.value
    putSettings(convId, { cipher: prefs.cipher, key: prefs.key, keep: prefs.keep })
    // Update key field appearance for keyless ciphers
    const usesKey = CIPHER_USES_KEY[prefs.cipher]
    keyEl.placeholder = usesKey ? 'key' : 'enc. key'
    keyEl.style.opacity = usesKey ? '' : '0.5'
  }

  function onKeyChange() {
    prefs.key = keyEl.value
    putSettings(convId, { cipher: prefs.cipher, key: prefs.key, keep: prefs.keep })
  }

  back.addEventListener('click', onBack)
  sendBtn.addEventListener('click', onSend)
  cipherEl.addEventListener('change', onCipherChange)
  keyEl.addEventListener('input', onKeyChange)
  textEl.addEventListener('keydown', onTextKey)

  return () => {
    unsubMessages()
    back.removeEventListener('click', onBack)
    sendBtn.removeEventListener('click', onSend)
    cipherEl.removeEventListener('change', onCipherChange)
    keyEl.removeEventListener('input', onKeyChange)
    textEl.removeEventListener('keydown', onTextKey)
  }
})
