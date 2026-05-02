// Inbox screen — #/ — conversation list.
// Registers the '' (root) route. First screen a signed-in user sees.
// Fetches conversations, contacts, and last-message previews in parallel.
// Owns two realtime subscriptions (D-06):
//   - subscribeConversationMembers: new conversations appear without reload
//   - subscribeMessages (per-conv): preview/time refreshes without reload

import { transport }             from '../transport/index.js'
import * as store                from '../state/store.js'
import * as router               from '../lib/router.js'
import { _ago, _strColor, _esc } from '../lib/utils.js'

router.register('', async () => {
  const app  = document.getElementById('app')
  const user = store.get('user')

  // Auth / profile guard — router auth guard handles missing user but guard
  // defensively here so the screen never renders for unauthenticated state.
  if (!user)               { router.navigate('#/auth');  return () => {} }
  if (!store.get('profile')) { router.navigate('#/setup'); return () => {} }

  // ── Render shell immediately so the screen never flashes blank ──────
  app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <div class="topbar-title">CIPHER</div>
        <div class="topbar-actions">
          <button class="icon-btn" id="inbox-new" type="button" aria-label="New conversation">+</button>
        </div>
      </div>
      <div class="inbox-list" id="inbox-list">
        <div class="center-msg">LOADING...</div>
      </div>
    </div>
  `

  const listEl = app.querySelector('#inbox-list')
  const newBtn = app.querySelector('#inbox-new')

  // ── Local cache for last messages (convId → message row or null) ─────
  const lastMsgs = {}

  // ── Data fetch + render helper ───────────────────────────────────────
  async function loadAndRender() {
    const { result: conversations } = await transport.getConversations(user.id)
    const convs = conversations || []

    // Fetch contacts in parallel.
    const contactResults = await Promise.all(
      convs.map(c => transport.getConversationContact(c.id, user.id))
    )
    const contacts = {}
    convs.forEach((c, i) => {
      contacts[c.id] = contactResults[i].result || {}
    })

    // Fetch last message per conversation in parallel.
    const msgResults = await Promise.all(
      convs.map(c => transport.getMessages(c.id))
    )
    convs.forEach((c, i) => {
      const msgs = msgResults[i].result || []
      lastMsgs[c.id] = msgs.length ? msgs[msgs.length - 1] : null
    })

    // Persist to store for other screens that may need it.
    store.set('conversations', convs)
    store.set('contacts', contacts)

    renderList(convs, contacts)
  }

  function renderList(convs, contacts) {
    if (!convs || convs.length === 0) {
      listEl.innerHTML = `
        <div class="center-msg" style="padding:48px 24px;text-align:center">
          <div style="font-size:13px;letter-spacing:0.1em;color:var(--text);margin-bottom:8px">NO MESSAGES YET</div>
          <div style="font-size:11px;letter-spacing:0.1em;color:var(--text-dim)">TAP + TO START A CONVERSATION</div>
        </div>
      `
      return
    }

    // Sort by most-recent activity: last message time or conversation updated_at.
    const sorted = [...convs].sort((a, b) => {
      const ta = lastMsgs[a.id] ? lastMsgs[a.id].created_at : a.updated_at
      const tb = lastMsgs[b.id] ? lastMsgs[b.id].created_at : b.updated_at
      return new Date(tb) - new Date(ta)
    })

    listEl.innerHTML = sorted.map(conv => {
      const contact = contacts[conv.id] || {}
      const handle  = contact.username  || '?'
      const initial = (contact.display_name || contact.username || '?')[0].toUpperCase()
      const lastMsg = lastMsgs[conv.id]

      // D-04: preview is the raw base64 payload (cipher-encoded text we cannot
      // decrypt server-side). Truncate to 40 chars; CSS ellipsis handles the rest.
      const previewText = lastMsg && lastMsg.payload
        ? lastMsg.payload.slice(0, 40)
        : ''
      const timeStr = _ago(lastMsg ? lastMsg.created_at : conv.updated_at)

      return `
        <div class="conv-row" data-conv-id="${conv.id}">
          <div class="avatar" style="background:${_strColor(handle)}">${_esc(initial)}</div>
          <div class="conv-info">
            <div class="conv-name">@${_esc(handle)}</div>
            <div class="conv-preview">${_esc(previewText)}</div>
          </div>
          <div class="conv-time">${_esc(timeStr)}</div>
        </div>
      `
    }).join('')
  }

  // ── Initial load ─────────────────────────────────────────────────────
  await loadAndRender()

  // ── Click delegation: row → chat, + → new ───────────────────────────
  function onListClick(e) {
    const row = e.target.closest('.conv-row')
    if (row) router.navigate('#/chat/' + row.dataset.convId)
  }
  function onNewClick() {
    router.navigate('#/new')
  }

  listEl.addEventListener('click', onListClick)
  newBtn.addEventListener('click', onNewClick)

  // ── Realtime subscriptions (D-06) ───────────────────────────────────
  const unsubs = []

  // 1. New conversation_member rows for this user → full re-fetch + re-render.
  const unsubMembers = transport.subscribeConversationMembers(user.id, async () => {
    await loadAndRender()
    // Re-wire per-conversation message subscriptions for any new conversations.
    // Existing unsubs are still valid; new convs need their own sub.
    const convs = store.get('conversations') || []
    const subscribedIds = new Set(unsubs.map(u => u._convId).filter(Boolean))
    for (const conv of convs) {
      if (!subscribedIds.has(conv.id)) {
        const unsubMsg = transport.subscribeMessages(conv.id, (msg) => {
          lastMsgs[msg.conversation_id] = msg
          renderList(store.get('conversations') || [], store.get('contacts') || {})
        })
        unsubMsg._convId = conv.id
        unsubs.push(unsubMsg)
      }
    }
  })

  // 2. Per-conversation message subscriptions → update preview + time on new message.
  const initialConvs = store.get('conversations') || []
  for (const conv of initialConvs) {
    const unsubMsg = transport.subscribeMessages(conv.id, (msg) => {
      lastMsgs[msg.conversation_id] = msg
      renderList(store.get('conversations') || [], store.get('contacts') || {})
    })
    unsubMsg._convId = conv.id
    unsubs.push(unsubMsg)
  }

  // ── Cleanup ──────────────────────────────────────────────────────────
  return () => {
    listEl.removeEventListener('click', onListClick)
    newBtn.removeEventListener('click', onNewClick)
    unsubMembers()
    for (const unsub of unsubs) unsub()
  }
})
