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
//   - CHAT-05: card-flip (CSS 3D, 0.45s) reveals decode form on card back
//   - CHAT-06: only one card flipped at a time — second tap flips first back
//   - CHAT-07: cipher type + key entry on card back → DECODE MESSAGE
//   - CHAT-08: wrong key → inline WRONG KEY — CHECK CIPHER AND KEY error (never alert())
//   - CHAT-09: KEEP DECODED FOR ME checkbox persists prefs in localStorage
//   - CHAT-10: auto-decode on load + incoming when keep=true; no flip element rendered
//   - CHAT-11: one-shot lock-pulse animation on incoming message lock glyph
//   - CHAT-13: cipher prefs stored ONLY in localStorage via lib/settings — never sent to server
//   - D-02:    progressive fallback overlay if 3D transforms unsupported

import { transport }                             from '../transport/index.js'
import * as store                                from '../state/store.js'
import * as router                               from '../lib/router.js'
import { _ago, _esc }                            from '../lib/utils.js'
import { getSettings, putSettings }              from '../lib/settings.js'
import { encrypt, decrypt }                      from '../crypto.js'
import { CIPHERS, CIPHER_LABELS, applyCipher }   from '../ciphers.js'

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

  // ── 3D flip support detection (D-02: progressive fallback) ───────────
  const supports3D = (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('transform-style', 'preserve-3d'))

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

      <div class="decode-overlay hidden" id="decode-overlay-mount"></div>
    </div>
  `

  // ── DOM refs (wired after innerHTML set) ─────────────────────────────
  const listEl      = app.querySelector('#messages-list')
  const textEl      = app.querySelector('#compose-text')
  const keyEl       = app.querySelector('#compose-key')
  const cipherEl    = app.querySelector('#compose-cipher')
  const sendBtn     = app.querySelector('#compose-send')
  const errEl       = app.querySelector('#compose-error')
  const back        = app.querySelector('#chat-back')
  const overlayEl   = app.querySelector('#decode-overlay-mount')

  // ── Local state ───────────────────────────────────────────────────────
  let messages           = []          // ordered list of message rows
  const seenIds          = new Set()   // realtime dedupe — all message ids we know about
  const decoded          = {}          // { [msgId]: plaintext }
  let openFlippedId      = null        // tracks the single flipped bubble (CHAT-06)
  const justArrivedIds   = new Set()   // ids to render with .pulse this pass (CHAT-11)

  // ── Helper: build the card-flip bubble HTML ───────────────────────────
  function _buildFlippableBubble(msg, mine, surface, needsClip) {
    const isPulse = justArrivedIds.has(msg.id)
    return `
      <div class="msg-wrap ${mine ? 'mine' : 'theirs'}">
        <div class="bubble ${mine ? 'mine' : 'theirs'} flippable${openFlippedId === msg.id ? ' flipped' : ''}" data-msg-id="${msg.id}">
          <div class="bubble-card">
            <div class="bubble-front">
              <span class="lock-glyph${isPulse ? ' pulse' : ''}">⚿</span>
              <div class="bubble-text${needsClip ? ' clipped' : ''}">${_esc(surface)}</div>
              ${needsClip ? '<span class="bubble-more">MORE</span>' : ''}
            </div>
            <div class="bubble-back">
              <div class="panel-row">
                <select class="field-sm decode-cipher">
                  ${CIPHERS.map(c => `<option value="${c}"${c === prefs.cipher ? ' selected' : ''}>${_esc(CIPHER_LABELS[c])}</option>`).join('')}
                </select>
                <input class="field-sm decode-key" type="text" placeholder="key" value="${_esc(prefs.key)}" />
              </div>
              <div class="panel-row">
                <button class="btn-sm decode-go" type="button">DECODE MESSAGE</button>
                <label class="check-label">
                  <input type="checkbox" class="decode-keep"${prefs.keep ? ' checked' : ''} />
                  KEEP DECODED FOR ME
                </label>
              </div>
              <div class="error-msg decode-err"></div>
            </div>
          </div>
        </div>
        <div class="msg-time">${_ago(msg.created_at)}</div>
      </div>
    `
  }

  // ── Helper: build the fallback (no-3D) bubble HTML ───────────────────
  function _buildFallbackBubble(msg, mine, surface, needsClip) {
    return `
      <div class="msg-wrap ${mine ? 'mine' : 'theirs'}">
        <div class="bubble ${mine ? 'mine' : 'theirs'}" data-msg-id="${msg.id}">
          <div class="bubble-text${needsClip ? ' clipped' : ''}">${_esc(surface)}</div>
          ${needsClip ? '<span class="bubble-more">MORE</span>' : ''}
          <button class="icon-btn lock-icon" type="button" aria-label="Decode message" data-msg-id="${msg.id}">⚿</button>
        </div>
        <div class="msg-time">${_ago(msg.created_at)}</div>
      </div>
    `
  }

  // ── Helper: render the message list ──────────────────────────────────
  function renderMessages() {
    if (messages.length === 0) {
      listEl.innerHTML = '<div class="center-msg">NO MESSAGES YET</div>'
      return
    }

    listEl.innerHTML = messages.map(msg => {
      const mine      = msg.sender_id === user.id
      const isDecoded = msg.id in decoded

      // CHAT-10: if keep=true and we have plaintext, render plain bubble — no flip element
      if (prefs.keep && isDecoded) {
        return `
          <div class="msg-wrap ${mine ? 'mine' : 'theirs'}">
            <div class="bubble ${mine ? 'mine' : 'theirs'}">
              <div class="bubble-text">${_esc(decoded[msg.id])}</div>
            </div>
            <div class="msg-time">${_ago(msg.created_at)}</div>
          </div>
        `
      }

      // Locked bubble — determine surface text
      // If we have plaintext (e.g. just-sent own message, or decoded-and-flipped-back),
      // re-encode it to display the cipher text on the front face.
      // Otherwise fall back to the AES base64 payload slice as a visual placeholder.
      let surface
      if (isDecoded && prefs.cipher && prefs.key) {
        surface = applyCipher(decoded[msg.id], prefs.cipher, prefs.key, true)
      } else if (isDecoded) {
        surface = decoded[msg.id]
      } else {
        surface = msg.payload.slice(0, 200)
      }

      // MORE expand: clip if > 200 chars or > 5 newlines in the surface
      const needsClip = surface.length > 200 || (surface.match(/\n/g) || []).length > 5

      if (supports3D) {
        return _buildFlippableBubble(msg, mine, surface, needsClip)
      } else {
        return _buildFallbackBubble(msg, mine, surface, needsClip)
      }
    }).join('')

    // Wire animationend on .pulse glyphs to remove class (CHAT-11 belt-and-suspenders)
    listEl.querySelectorAll('.lock-glyph.pulse').forEach(el => {
      el.addEventListener('animationend', () => el.classList.remove('pulse'), { once: true })
    })

    // Always scroll to the newest message.
    listEl.scrollTop = listEl.scrollHeight
  }

  // ── Overlay fallback helpers (D-02) ──────────────────────────────────
  function openOverlay(msgId) {
    const m = messages.find(x => x.id === msgId)
    if (!m) return
    overlayEl.classList.remove('hidden')
    overlayEl.innerHTML = `
      <div class="decode-panel">
        <div class="panel-row">
          <select class="field-sm decode-cipher">
            ${CIPHERS.map(c => `<option value="${c}"${c === prefs.cipher ? ' selected' : ''}>${_esc(CIPHER_LABELS[c])}</option>`).join('')}
          </select>
          <input class="field-sm decode-key" type="text" placeholder="key" value="${_esc(prefs.key)}" />
        </div>
        <div class="panel-row">
          <button class="btn-sm decode-go-overlay" type="button">DECODE MESSAGE</button>
          <label class="check-label">
            <input type="checkbox" class="decode-keep"${prefs.keep ? ' checked' : ''} />
            KEEP DECODED FOR ME
          </label>
        </div>
        <div class="error-msg decode-err"></div>
      </div>
    `

    const panel     = overlayEl.querySelector('.decode-panel')
    const cipherSel = overlayEl.querySelector('.decode-cipher')
    const keyIn     = overlayEl.querySelector('.decode-key')
    const keepIn    = overlayEl.querySelector('.decode-keep')
    const errOut    = overlayEl.querySelector('.decode-err')
    const goBtn     = overlayEl.querySelector('.decode-go-overlay')

    goBtn.addEventListener('click', async () => {
      const cipher = cipherSel.value
      const key    = keyIn.value
      errOut.textContent = ''
      if (!key) { errOut.textContent = 'KEY REQUIRED'; return }
      const cipherText = await decrypt(m.payload, m.iv, m.salt, key)
      if (cipherText === null) { errOut.textContent = 'WRONG KEY — CHECK CIPHER AND KEY'; return }
      const plaintext = applyCipher(cipherText, cipher, key, false)
      decoded[msgId] = plaintext
      putSettings(convId, { cipher, key, keep: keepIn.checked })
      prefs.cipher = cipher; prefs.key = key; prefs.keep = keepIn.checked
      if (prefs.keep) {
        await Promise.all(messages.map(async (mm) => {
          if (decoded[mm.id]) return
          const ct = await decrypt(mm.payload, mm.iv, mm.salt, key)
          if (ct !== null) decoded[mm.id] = applyCipher(ct, cipher, key, false)
        }))
      }
      overlayEl.classList.add('hidden')
      renderMessages()
    })

    // Close overlay by tapping the scrim (outside the panel)
    overlayEl.addEventListener('click', (e) => {
      if (!panel.contains(e.target)) overlayEl.classList.add('hidden')
    }, { once: true })
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

    // CHAT-10: auto-decode all messages on load if keep=true
    if (prefs.keep && prefs.cipher && prefs.key) {
      await Promise.all(messages.map(async (m) => {
        if (decoded[m.id]) return
        const cipherText = await decrypt(m.payload, m.iv, m.salt, prefs.key)
        if (cipherText !== null) {
          decoded[m.id] = applyCipher(cipherText, prefs.cipher, prefs.key, false)
        }
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
  const unsubMessages = transport.subscribeMessages(convId, async (msg) => {
    if (seenIds.has(msg.id)) return   // already rendered (optimistic or duplicate)
    seenIds.add(msg.id)
    messages.push(msg)
    justArrivedIds.add(msg.id)

    // CHAT-10: auto-decode incoming message if keep=true
    if (prefs.keep && prefs.cipher && prefs.key) {
      const ct = await decrypt(msg.payload, msg.iv, msg.salt, prefs.key)
      if (ct !== null) decoded[msg.id] = applyCipher(ct, prefs.cipher, prefs.key, false)
    }

    renderMessages()
    // Clear justArrivedIds after animation window (CHAT-11)
    setTimeout(() => { justArrivedIds.clear() }, 700)
  })

  // ── Delegated event listener on messages-list ─────────────────────────
  // Attached once on mount; discarded naturally when router replaces innerHTML.
  listEl.addEventListener('click', async (e) => {

    // MORE expand (D-05)
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

    // Card flip — only when supports3D, only on front face clicks (CHAT-05, CHAT-06)
    const flippable = e.target.closest('.bubble.flippable')
    if (supports3D && flippable && !e.target.closest('.bubble-back')) {
      const id = flippable.dataset.msgId
      // Flip back the currently-open card if it's different (CHAT-06)
      if (openFlippedId && openFlippedId !== id) {
        const prev = listEl.querySelector(`.bubble.flippable[data-msg-id="${openFlippedId}"]`)
        if (prev) prev.classList.remove('flipped')
      }
      flippable.classList.toggle('flipped')
      openFlippedId = flippable.classList.contains('flipped') ? id : null
      return
    }

    // DECODE MESSAGE button on card back (CHAT-07, CHAT-08, CHAT-09)
    if (e.target.classList.contains('decode-go')) {
      e.stopPropagation()
      const back    = e.target.closest('.bubble-back')
      const bubble  = e.target.closest('.bubble.flippable')
      const msgId   = bubble.dataset.msgId
      const cipherSel = back.querySelector('.decode-cipher')
      const keyIn     = back.querySelector('.decode-key')
      const keepIn    = back.querySelector('.decode-keep')
      const errOut    = back.querySelector('.decode-err')
      const cipher = cipherSel.value
      const key    = keyIn.value
      errOut.textContent = ''
      if (!key) { errOut.textContent = 'KEY REQUIRED'; return }
      const m = messages.find(x => x.id === msgId)
      if (!m) return
      const cipherText = await decrypt(m.payload, m.iv, m.salt, key)
      if (cipherText === null) { errOut.textContent = 'WRONG KEY — CHECK CIPHER AND KEY'; return }
      const plaintext = applyCipher(cipherText, cipher, key, false)
      decoded[msgId] = plaintext
      putSettings(convId, { cipher, key, keep: keepIn.checked })
      prefs.cipher = cipher; prefs.key = key; prefs.keep = keepIn.checked
      bubble.classList.remove('flipped')
      openFlippedId = null
      // CHAT-10: if keep=true, bulk-decode all other locked messages now
      if (prefs.keep) {
        await Promise.all(messages.map(async (mm) => {
          if (decoded[mm.id]) return
          const ct = await decrypt(mm.payload, mm.iv, mm.salt, key)
          if (ct !== null) decoded[mm.id] = applyCipher(ct, cipher, key, false)
        }))
      }
      renderMessages()
      return
    }

    // Lock-icon fallback button → open overlay (D-02)
    const lockBtn = e.target.closest('.lock-icon')
    if (!supports3D && lockBtn) {
      e.stopPropagation()
      openOverlay(lockBtn.dataset.msgId)
      return
    }
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
