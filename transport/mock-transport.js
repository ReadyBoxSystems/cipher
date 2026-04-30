// Mock implementation of the Transport interface — typed stubs only.
// Per Phase 1 D-02: every method exists with the correct signature and returns empty data.
// Phase 5 will replace these stubs with functional in-memory Maps when test data shapes are pinned down.
//
// See: transport/interface.js (the 17-method contract).

/** @returns {import('./interface.js').Transport} */
export function createMockTransport() {
  const noop = () => {}

  return {
    // ── Auth (5) ───────────────────────────────────────────────────────
    async signIn(_email, _pass)        { return { user: null, error: null } },
    async signUp(_email, _pass)        { return { user: null, error: null } },
    async signOut()                    { /* no-op */ },
    async getSession()                 { return { user: null } },
    onAuthChange(_cb)                  { return noop },

    // ── Profiles (3) ───────────────────────────────────────────────────
    async getProfile(_userId)                            { return { result: null, error: null } },
    async createProfile(_userId, _username, _display)    { return { result: null, error: null } },
    async updateProfile(_userId, _patch)                 { return { result: null, error: null } },

    // ── Conversations (2) ──────────────────────────────────────────────
    async getConversations(_userId)                      { return { result: null, error: null } },
    async getConversationContact(_convId, _userId)       { return { result: null, error: null } },

    // ── Messages (3) ───────────────────────────────────────────────────
    async getMessages(_convId)                           { return { result: null, error: null } },
    async sendMessage(_convId, _senderId, _p, _iv, _s)   { return { result: null, error: null } },
    subscribeMessages(_convId, _cb)                      { return noop },

    // ── Invites (4) ────────────────────────────────────────────────────
    async createInvite(_creatorId)                       { return { result: null, error: null } },
    async getInvite(_code)                               { return { result: null, error: null } },
    async acceptInvite(_code, _acceptedBy, _convId)      { return { result: null, error: null } },
    subscribeConversationMembers(_userId, _cb)           { return noop },
  }
}
