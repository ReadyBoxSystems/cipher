// Single swap point for the Transport implementation.
//
// To switch transports, change EXACTLY ONE LINE — the import below.
//   Live (default):    import { createSupabaseTransport as createTransport } from './supabase-transport.js'
//   Tests / offline:   import { createMockTransport     as createTransport } from './mock-transport.js'
//
// Per Phase 1 D-04 (locked): screens, state/store.js, lib/router.js, and app.js
// import the active transport from this file ONLY. They never reach into
// supabase-transport.js or mock-transport.js directly.

import { createSupabaseTransport as createTransport } from './supabase-transport.js'

/** @type {import('./interface.js').Transport} */
export const transport = createTransport()

// Re-export the factory so test harnesses (Phase 5) can spin up isolated instances if needed.
export { createTransport }
