---
phase: 03-core-messaging
plan: "01"
subsystem: inbox
tags: [inbox, realtime, router, screens]
dependency_graph:
  requires:
    - transport/index.js (getConversations, getConversationContact, getMessages, subscribeConversationMembers, subscribeMessages)
    - state/store.js (get/set for user, profile, conversations, contacts)
    - lib/router.js (register, navigate)
    - lib/utils.js (_ago, _strColor, _esc)
  provides:
    - screens/inbox.js ('' route — inbox list with realtime)
    - screens/chat.js ('chat' route stub — no-op until Plan 02)
  affects:
    - app.js (imports both new screens at boot)
tech_stack:
  added: []
  patterns:
    - router.register self-registration pattern (consistent with auth/setup/settings screens)
    - event delegation for click handling on dynamically rendered list
    - parallel Promise.all for contacts + messages fetch
    - local lastMsgs cache updated by realtime events
key_files:
  created:
    - screens/inbox.js
    - screens/chat.js
  modified:
    - app.js
decisions:
  - "D-04 honored: inbox preview displays raw base64 payload substring (first 40 chars) — cannot decrypt server-side; CSS ellipsis handles overflow"
  - "D-06 honored: inbox owns both subscribeConversationMembers and per-conversation subscribeMessages subscriptions"
  - "loadAndRender() extracted as shared helper so both initial load and realtime member-arrival trigger identical code path"
  - "unsubMsg._convId property used to track which conversation IDs already have subscriptions when new conversations arrive via realtime"
metrics:
  duration_minutes: 2
  completed_date: "2026-05-02T23:17:39Z"
  tasks_completed: 3
  files_modified: 3
---

# Phase 3 Plan 01: Inbox Screen Summary

Inbox screen implemented with live conversation list, empty state, and two realtime subscriptions. Signed-in users now land on a rendered inbox instead of a blank app shell.

## Files Created / Modified

**Created:**
- `screens/inbox.js` (173 lines) — full inbox implementation registering the `''` route
- `screens/chat.js` (11 lines) — registration stub registering the `'chat'` route; Plan 02 replaces this

**Modified:**
- `app.js` — added `import './screens/inbox.js'` and `import './screens/chat.js'` after the existing screen imports (2 lines added, no other changes)

## How the Inbox Renders (Data Flow)

1. Auth/profile guard runs first — redirects to `#/auth` or `#/setup` if state is missing
2. Topbar shell renders immediately (LOADING placeholder in list) so screen never flashes blank
3. `loadAndRender()` fires:
   - `transport.getConversations(user.id)` → array of conversations sorted by `updated_at` desc
   - `Promise.all(convs.map(c => transport.getConversationContact(c.id, user.id)))` — contacts fetched in parallel
   - `Promise.all(convs.map(c => transport.getMessages(c.id)))` — last message per conversation fetched in parallel
   - Results stored in `store` (conversations, contacts) and local `lastMsgs` cache
4. `renderList()` sorts conversations by most-recent activity (last message time or `conv.updated_at` if no messages) and builds `.conv-row` HTML with avatar initial, `@handle`, cipher-encoded preview (raw base64, first 40 chars per D-04), and relative time via `_ago()`
5. Empty state renders if `convs.length === 0` with copywriting: "NO MESSAGES YET" / "TAP + TO START A CONVERSATION"

## How Realtime Subscriptions Are Wired and Cleaned Up

**subscribeConversationMembers** (one subscription):
- Fires when a new `conversation_members` row arrives for the current user (i.e., someone accepted their invite, or they accepted someone else's)
- Handler calls `loadAndRender()` for a full re-fetch, then checks `store.get('conversations')` for any new conversation IDs that don't yet have a message subscription and opens them

**subscribeMessages** (one per conversation):
- Fires when a new message arrives in any of the user's conversations
- Handler updates `lastMsgs[msg.conversation_id]` then calls `renderList()` with current store state — no re-fetch required, instant update

**Cleanup function** (returned from route handler, called by router before next screen mounts):
- Removes `click` listener from `#inbox-list`
- Removes `click` listener from `#inbox-new` (`+` button)
- Calls `unsubMembers()` — closes the conversation-members Postgres-changes channel
- Calls every function in the `unsubs` array — closes all per-conversation message channels

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `screens/chat.js`: registered `'chat'` route renders `LOADING...` placeholder. Plan 02 replaces this with the full send/receive implementation. The placeholder is intentional and documented in the file.

## Self-Check: PASSED

- [x] `screens/inbox.js` exists (173 lines, >= 80)
- [x] `screens/chat.js` exists (11 lines)
- [x] `app.js` contains both new imports
- [x] Commit `bcf929a` — chat stub
- [x] Commit `0603e5e` — inbox implementation
- [x] Commit `b55819c` — app.js wiring
