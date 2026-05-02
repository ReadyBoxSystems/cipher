// Chat screen — #/chat/:convId — full message thread.
// Plan 02 replaces the Plan 01 stub with:
//   - Message list fetch + render (mine right, theirs left)
//   - Optimistic send: cipher-encode → AES-encrypt → append locally → transport.sendMessage
//   - Rollback on transport failure
//   - Realtime subscription (D-06) with dedupe by message id (D-07)
//   - Two-row compose bar: cipher selector + key field / textarea + send button
//   - Per-conversation settings persisted via lib/settings (SEC-05 — never sent to server)
//
// Plan 03 layers on: decode UX (card flip), MORE expand, auto-decode toggle, animations.

import { transport }                        from '../transport/index.js'
import * as store                           from '../state/store.js'
import * as router                          from '../lib/router.js'
import { _ago, _esc }                       from '../lib/utils.js'
import { getSettings, putSettings }         from '../lib/settings.js'
import { encrypt }                          from '../crypto.js'
import { CIPHERS, CIPHER_LABELS, applyCipher } from '../ciphers.js'

router.register('chat', async (convId) => {
  const app  = document.getElementById('app')
  const user = store.get('user')

  // ── Guards ───────────────────────────────────────────────────────────
  if (!user)                 { router.navigate('#/auth');  return () => {} }
  if (!store.get('profile')) { router.navigate('#/setup'); return () => {} }
  if (!convId)               { router.navigate('#/');      return () => {} }

  // ── Fetch the contact (the OTHER person in this conversation) ────────
  const { result: contact, error: contactErr } = await transport.getConversationContact(convId, user.id)
  if (contactErr || !contact) {
    router.navigate('#/')
    return () => {}
  }

  // ── Read persisted per-conversation prefs (cipher + key) ─────────────
  const prefs = getSettings(convId)

  // ── Render screen shell ───────────────────────────────────────────────
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
          <input class="field-sm" id="compose-key" type="text" placeholder="key" value="${_esc(prefs.key)}" autocomplete="off" spellcheck="false" />
        </div>
        <div class="compose-row">
          <textarea class="compose-input" id="compose-text" placeholder="message" rows="1"></textarea>
          <button class="send-btn" id="compose-send" type="button" aria-label="Send message">→</button>
        </div>
        <div class="error-msg" id="compose-error" style="margin-top:6px"></div>
      </div>
    </div>
  `

  // ── DOM refs (wired after innerHTML set) ─────────────────────────────
  const listEl   = app.querySelector('#messages-list')
  const textEl   = app.querySelector('#compose-text')
  const keyEl    = app.querySelector('#compose-key')
  const cipherEl = app.querySelector('#compose-cipher')
  const sendBtn  = app.querySelector('#compose-send')
  const errEl    = app.querySelector('#compose-error')
  const back     = app.querySelector('#chat-back')

  // ── Local state ───────────────────────────────────────────────────────
  let messages       = []          // ordered list of message rows
  const seenIds      = new Set()   // realtime dedupe — all message ids we know about
  const decoded      = {}          // { [msgId]: plaintext } — own messages, plaintext known at send time

  // ── Helper: render the message list ──────────────────────────────────
  function renderMessages() {
    if (messages.length === 0) {
      listEl.innerHTML = '<div class="center-msg">NO MESSAGES YET</div>'
      return
    }

    listEl.innerHTML = messages.map(msg => {
      const mine = msg.sender_id === user.id

      // Surface text:
      //   Own messages: show the plaintext we captured at send time (optimistic UX).
      //   Others' messages: show truncated AES base64 payload as cipher-encoded placeholder.
      //   Plan 03 replaces this placeholder with the real cipher-encoded text after decrypt.
      const surface = decoded[msg.id]
        ? _esc(decoded[msg.id])
        : _esc(msg.payload.slice(0, 200))

      return `
        <div class="msg-wrap ${mine ? 'mine' : 'theirs'}">
          <div class="bubble ${mine ? 'mine' : 'theirs'}" data-msg-id="${msg.id}">
            <div class="bubble-text">${surface}</div>
          </div>
          <div class="msg-time">${_ago(msg.created_at)}</div>
        </div>
      `
    }).join('')

    // Always scroll to the newest message.
    listEl.scrollTop = listEl.scrollHeight
  }

  // ── Initial fetch ─────────────────────────────────────────────────────
  const { result: msgs, error: fetchErr } = await transport.getMessages(convId)
  if (fetchErr) {
    listEl.innerHTML = '<div class="center-msg">FAILED TO LOAD</div>'
  } else {
    messages = msgs || []
    messages.forEach(m => seenIds.add(m.id))
    // Merge into global store so inbox preview can reference without re-fetching.
    store.set('messages', { ...(store.get('messages') || {}), [convId]: messages })
    renderMessages()
  }

  // ── Send handler ──────────────────────────────────────────────────────
  async function onSend() {
    const text   = textEl.value
    const key    = keyEl.value
    const cipher = cipherEl.value
    errEl.textContent = ''

    // Client-side validation (CHAT-12).
    if (!text.trim()) { return }                              // silent no-op on empty text
    if (!key)         { errEl.textContent = 'KEY REQUIRED'; return }

    // Persist prefs (SEC-05 — cipher + key stay on device only).
    putSettings(convId, { cipher, key })

    // Apply the historical cipher first (encode=true), then AES-encrypt the result.
    const cipherText = applyCipher(text, cipher, key, true)
    let payload, iv, salt
    try {
      ;({ payload, iv, salt } = await encrypt(cipherText, key))
    } catch (_e) {
      errEl.textContent = 'SEND FAILED — TRY AGAIN'
      return
    }

    // ── Optimistic insert (D-07) ──────────────────────────────────────
    const tempId = 'opt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
    const optimistic = {
      id: tempId,
      conversation_id: convId,
      sender_id: user.id,
      payload,
      iv,
      salt,
      created_at: new Date().toISOString()
    }
    messages.push(optimistic)
    seenIds.add(tempId)
    decoded[tempId] = text   // capture plaintext so our own bubble shows it
    textEl.value = ''
    renderMessages()

    // ── Transport call ────────────────────────────────────────────────
    const { result: row, error: sendErr } = await transport.sendMessage(convId, user.id, payload, iv, salt)
    if (sendErr || !row) {
      // Rollback optimistic bubble on failure.
      messages = messages.filter(m => m.id !== tempId)
      seenIds.delete(tempId)
      delete decoded[tempId]
      renderMessages()
      errEl.textContent = 'SEND FAILED — TRY AGAIN'
      return
    }

    // Promote optimistic entry to the real server row, preserving the decoded text.
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

  // ── Realtime subscription (D-06) ──────────────────────────────────────
  // INSERT-only, scoped to convId. Dedupe by message id to swallow our own echo.
  const unsubMessages = transport.subscribeMessages(convId, (msg) => {
    if (seenIds.has(msg.id)) return   // already rendered (optimistic or duplicate)
    seenIds.add(msg.id)
    messages.push(msg)
    renderMessages()
  })

  // ── Event listeners ───────────────────────────────────────────────────
  function onBack()         { router.navigate('#/') }
  function onCipherChange() { putSettings(convId, { cipher: cipherEl.value }) }
  function onKeyChange()    { putSettings(convId, { key: keyEl.value }) }
  function onTextKey(e)     { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }

  back.addEventListener('click', onBack)
  sendBtn.addEventListener('click', onSend)
  cipherEl.addEventListener('change', onCipherChange)
  keyEl.addEventListener('input', onKeyChange)
  textEl.addEventListener('keydown', onTextKey)

  // ── Cleanup (called by router when navigating away) ───────────────────
  return () => {
    unsubMessages()
    back.removeEventListener('click', onBack)
    sendBtn.removeEventListener('click', onSend)
    cipherEl.removeEventListener('change', onCipherChange)
    keyEl.removeEventListener('input', onKeyChange)
    textEl.removeEventListener('keydown', onTextKey)
  }
})
