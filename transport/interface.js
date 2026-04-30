/**
 * Transport interface — the contract every transport implementation must fulfill.
 *
 * Per Phase 1 D-04 (locked): 17 methods, JSDoc-only, not executable.
 * Implementations: transport/supabase-transport.js (live), transport/mock-transport.js (tests).
 * Swap point: transport/index.js — change one import to switch the entire transport.
 *
 * Return shape convention:
 *   - Data-fetching methods return { result, error } (normalized — never raw Supabase { data, error })
 *   - Auth methods return { user, error } or void as documented
 *   - Subscribe* methods return a synchronous unsubscribe function: () => void
 *
 * @typedef {Object} Transport
 *
 * ── Auth (5) ──────────────────────────────────────────────────────────────
 * @property {(email: string, pass: string) => Promise<{ user: object | null, error: Error | null }>} signIn
 *   Wraps sb.auth.signInWithPassword.
 * @property {(email: string, pass: string) => Promise<{ user: object | null, error: Error | null }>} signUp
 *   Wraps sb.auth.signUp.
 * @property {() => Promise<void>} signOut
 *   Wraps sb.auth.signOut. No return value; errors are swallowed.
 * @property {() => Promise<{ user: object | null }>} getSession
 *   Wraps sb.auth.getSession; returns the user from session.data.session.user.
 * @property {(cb: (user: object | null) => void) => (() => void)} onAuthChange
 *   Wraps sb.auth.onAuthStateChange. cb fires with user (or null on sign-out).
 *   Returns a synchronous unsubscribe function.
 *
 * ── Profiles (3) ──────────────────────────────────────────────────────────
 * @property {(userId: string) => Promise<{ result: object | null, error: Error | null }>} getProfile
 *   sb.from('profiles').select('*').eq('id', userId).maybeSingle().
 * @property {(userId: string, username: string, displayName: string) => Promise<{ result: object | null, error: Error | null }>} createProfile
 *   sb.from('profiles').insert({ id, username, display_name }). Phase 2 will switch to upsert.
 * @property {(userId: string, patch: object) => Promise<{ result: object | null, error: Error | null }>} updateProfile
 *   sb.from('profiles').update(patch).eq('id', userId). Used by PROF-05 in Phase 2.
 *
 * ── Conversations (2) ─────────────────────────────────────────────────────
 * @property {(userId: string) => Promise<{ result: object[] | null, error: Error | null }>} getConversations
 *   Two-step: get conversation_member rows for userId, then fetch conversations.
 *   Returns array sorted by updated_at desc.
 * @property {(convId: string, userId: string) => Promise<{ result: object | null, error: Error | null }>} getConversationContact
 *   Returns the OTHER user's profile in the conversation (the contact).
 *
 * ── Messages (3) ──────────────────────────────────────────────────────────
 * @property {(convId: string) => Promise<{ result: object[] | null, error: Error | null }>} getMessages
 *   sb.from('messages').select('*').eq('conversation_id', convId).order('created_at', asc).
 * @property {(convId: string, senderId: string, payload: string, iv: string, salt: string) => Promise<{ result: object | null, error: Error | null }>} sendMessage
 *   sb.from('messages').insert({ conversation_id, sender_id, payload, iv, salt }).
 *   payload/iv/salt are base64 strings produced by crypto.js encrypt().
 * @property {(convId: string, cb: (msg: object) => void) => (() => void)} subscribeMessages
 *   Postgres-changes INSERT on messages filtered to conversation_id=eq.${convId}. cb fires per new message.
 *   Returns synchronous unsubscribe.
 *
 * ── Invites (4) ───────────────────────────────────────────────────────────
 * @property {(creatorId: string) => Promise<{ result: object | null, error: Error | null }>} createInvite
 *   sb.from('invites').insert({ creator_id }).select().maybeSingle(). Returns the invite row (with auto-generated code).
 * @property {(code: string) => Promise<{ result: object | null, error: Error | null }>} getInvite
 *   sb.from('invites').select('*').eq('code', code).maybeSingle().
 * @property {(code: string, acceptedBy: string, convId: string) => Promise<{ result: object | null, error: Error | null }>} acceptInvite
 *   Multi-step in v0 (insert conversation, insert two members, update invite). Phase 4 may replace with a Postgres function.
 *   For Phase 1, the supabase-transport implementation reproduces the v0 sequence.
 * @property {(userId: string, cb: (member: object) => void) => (() => void)} subscribeConversationMembers
 *   Postgres-changes INSERT on conversation_members filtered to user_id=eq.${userId}.
 *   Phase 3 INBOX-04 fix relies on this. Returns synchronous unsubscribe.
 */

// No runtime exports — this file is JSDoc documentation only.
export {}
