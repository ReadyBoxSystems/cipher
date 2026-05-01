// Supabase implementation of the Transport interface.
// See: transport/interface.js (the 17-method contract).
// Phase 1 D-04: this is one of two implementations; the other is mock-transport.js.

import { sb } from '../supabase.js'

/** @returns {import('./interface.js').Transport} */
export function createSupabaseTransport() {
  return {
    // ── Auth (5) ───────────────────────────────────────────────────────
    async signIn(email, pass) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: pass })
      return { user: data?.user ?? null, error: error ?? null }
    },
    async signUp(email, pass) {
      const { data, error } = await sb.auth.signUp({ email, password: pass })
      return { user: data?.user ?? null, error: error ?? null }
    },
    async signOut() {
      await sb.auth.signOut()
    },
    async getSession() {
      const { data } = await sb.auth.getSession()
      return { user: data?.session?.user ?? null }
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_event, session) => {
        cb(session?.user ?? null)
      })
      return () => { data?.subscription?.unsubscribe?.() }
    },

    // ── Profiles (3) ───────────────────────────────────────────────────
    async getProfile(userId) {
      const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle()
      return { result: data ?? null, error: error ?? null }
    },
    async createProfile(userId, username, displayName) {
      const { data, error } = await sb.from('profiles')
        .upsert(
          { id: userId, username, display_name: displayName },
          { onConflict: 'id' }
        )
        .select()
        .maybeSingle()
      return { result: data ?? null, error: error ?? null }
    },
    async updateProfile(userId, patch) {
      const { data, error } = await sb.from('profiles').update(patch).eq('id', userId).select().maybeSingle()
      return { result: data ?? null, error: error ?? null }
    },

    // ── Conversations (2) ──────────────────────────────────────────────
    async getConversations(userId) {
      const { data: mems, error: memErr } = await sb.from('conversation_members')
        .select('conversation_id').eq('user_id', userId)
      if (memErr) return { result: null, error: memErr }
      if (!mems?.length) return { result: [], error: null }
      const ids = mems.map(m => m.conversation_id)
      const { data, error } = await sb.from('conversations')
        .select('*').in('id', ids).order('updated_at', { ascending: false })
      return { result: data ?? [], error: error ?? null }
    },
    async getConversationContact(convId, userId) {
      const { data: others, error: otherErr } = await sb.from('conversation_members')
        .select('user_id').eq('conversation_id', convId).neq('user_id', userId)
      if (otherErr) return { result: null, error: otherErr }
      if (!others?.[0]) return { result: null, error: null }
      const { data, error } = await sb.from('profiles')
        .select('*').eq('id', others[0].user_id).maybeSingle()
      return { result: data ?? null, error: error ?? null }
    },

    // ── Messages (3) ───────────────────────────────────────────────────
    async getMessages(convId) {
      const { data, error } = await sb.from('messages')
        .select('*').eq('conversation_id', convId).order('created_at', { ascending: true })
      return { result: data ?? [], error: error ?? null }
    },
    async sendMessage(convId, senderId, payload, iv, salt) {
      const { data, error } = await sb.from('messages').insert({
        conversation_id: convId,
        sender_id: senderId,
        payload, iv, salt
      }).select().maybeSingle()
      return { result: data ?? null, error: error ?? null }
    },
    subscribeMessages(convId, cb) {
      const channel = sb.channel(`chat-${convId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages',
          filter: `conversation_id=eq.${convId}`
        }, (payload) => cb(payload.new))
        .subscribe()
      return () => { sb.removeChannel(channel) }
    },

    // ── Invites (4) ────────────────────────────────────────────────────
    async createInvite(creatorId) {
      const { data, error } = await sb.from('invites')
        .insert({ creator_id: creatorId }).select().maybeSingle()
      return { result: data ?? null, error: error ?? null }
    },
    async getInvite(code) {
      const { data, error } = await sb.from('invites')
        .select('*').eq('code', code).maybeSingle()
      return { result: data ?? null, error: error ?? null }
    },
    async acceptInvite(code, acceptedBy, convId) {
      // v0 multi-step sequence (app.js 491–504). Phase 4 may replace with a Postgres function.
      const { error: e1 } = await sb.from('conversations').insert({ id: convId })
      if (e1) return { result: null, error: e1 }

      const { data: invite, error: eInv } = await sb.from('invites')
        .select('creator_id').eq('code', code).maybeSingle()
      if (eInv || !invite) return { result: null, error: eInv ?? new Error('invite not found') }

      const { error: e2 } = await sb.from('conversation_members')
        .insert({ conversation_id: convId, user_id: invite.creator_id })
      if (e2) return { result: null, error: e2 }

      const { error: e3 } = await sb.from('conversation_members')
        .insert({ conversation_id: convId, user_id: acceptedBy })
      if (e3) return { result: null, error: e3 }

      const { data, error: e4 } = await sb.from('invites')
        .update({ accepted_by: acceptedBy, conversation_id: convId })
        .eq('code', code).select().maybeSingle()
      return { result: data ?? null, error: e4 ?? null }
    },
    subscribeConversationMembers(userId, cb) {
      const channel = sb.channel(`members-${userId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'conversation_members',
          filter: `user_id=eq.${userId}`
        }, (payload) => cb(payload.new))
        .subscribe()
      return () => { sb.removeChannel(channel) }
    },
  }
}
