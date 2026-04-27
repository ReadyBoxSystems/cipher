# Phase 1: Foundation - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Decompose the v0 monolith into the module skeleton, wire the transport abstraction layer, patch the three confirmed v0 bugs, and get Jest running. No user-facing screens are built in this phase — that starts in Phase 2.

</domain>

<decisions>
## Implementation Decisions

### App End State
- **D-01:** Phase 1 produces a graceful empty shell. The app boots, wires up all plumbing, and shows a blank container. No stub screen files. The router null-checks before calling `mount()` so a missing screen never causes a console error. Screens are built starting in Phase 2.

### Mock Transport
- **D-02:** `mock-transport.js` is typed stubs only in Phase 1. Every method in the interface exists with the correct signature but returns empty data (`{ result: null, error: null }`). Phase 5 fills in functional in-memory data when tests are written and the exact data shapes are known.

### Old app.js Disposition
- **D-03:** The 543-line monolith is replaced immediately. Phase 1 deletes the old content and writes the new ~30-line boot file from scratch. No legacy code preserved alongside the new structure.

### Transport Abstraction (from research — locked)
- **D-04:** 17-method plain-JS object interface defined in `transport/interface.js` (JSDoc only, not executed). Supabase implementation in `transport/supabase-transport.js`. Swap point is `transport/index.js` — changing one import there switches the entire transport.

### State Management (from research — locked)
- **D-05:** Module singleton + event emitter in `state/store.js`. Plain object with `get/set/on/off/emit`. No library, no framework. Screens subscribe to state keys they care about and unsubscribe in their cleanup function.

### Router (from research — locked)
- **D-06:** Hash-based routing stays (GitHub Pages constraint — no server to handle history API routes). Extracted from `app.js` into `lib/router.js` as a registration-pattern module. Auth guard lives in the router, not in screens. Router holds `currentCleanup` reference and calls it before mounting the next screen.

### v0 Bug Fixes (from requirements — locked)
- **D-07:** `crypto.js` `toB64` — replace spread (`...new Uint8Array(buf)`) with a `for` loop to avoid V8 stack overflow on large buffers.
- **D-08:** `crypto.js` empty-key fallback — remove `|| 'cipher'`. A missing key must not silently encrypt with a known string. For keyless ciphers (Atbash, Morse), the send flow must enforce a real key.
- **D-09:** Service worker — change `register('/sw.js')` to `register('./sw.js', { scope: './' })`. Bump cache name to `cipher-v2`.

### Jest Config (from research — locked)
- **D-10:** `package.json` with `"type": "module"` and `test` script: `node --experimental-vm-modules node_modules/.bin/jest`. `jest.config.js` with `testEnvironment: 'node'`, `transform: {}`, `extensionsToTreatAsEsm: ['.js']`. No Babel. Tests in `tests/` directory.

### Claude's Discretion
- Screen cleanup null-check implementation in `router.js` — exact pattern up to implementer.
- `transport/index.js` re-export structure — up to implementer as long as one-line swap works.
- Cache name and cache list in `sw.js` — bump to `cipher-v2` and update file list to match new structure.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & Module Structure
- `.planning/research/ARCHITECTURE.md` — Full file structure, component responsibilities, transport interface design, state store pattern, router pattern, subscription lifecycle, anti-patterns to avoid
- `.planning/research/SUMMARY.md` — Exact Jest config, exact transport interface methods, top 5 pitfalls with fix instructions

### Requirements
- `.planning/REQUIREMENTS.md` — FOUND-01 through FOUND-07, SEC-01 through SEC-04 (all Phase 1 requirements with acceptance criteria)
- `.planning/ROADMAP.md` — Phase 1 success criteria (5 items, lines 28–33)

### Existing Source Files (read before modifying)
- `crypto.js` — Current implementation; two bugs to fix (toB64 spread, empty-key fallback)
- `app.js` — Current monolith; read to understand what to extract before replacing
- `sw.js` — Current service worker; update registration path and cache name
- `supabase.js` — Unchanged; stays at root; imported only by `transport/supabase-transport.js`
- `ciphers.js` — Unchanged; pure functions; stays at root

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ciphers.js` — Pure functions, zero dependencies, already testable. Keep at root unchanged.
- `crypto.js` — Pure async functions using browser Web Crypto API. Keep at root, patch two bugs. Node 18+ has `crypto.subtle` natively so Jest tests work without mocking.
- `supabase.js` — Supabase client init. Keep at root unchanged. Only `supabase-transport.js` imports it.
- `style.css`, `manifest.json`, `schema.sql` — Unchanged from v0.

### Established Patterns (v0 — to be replaced)
- State: module-level `const state = {}` object in `app.js` → moves to `state/store.js`
- Settings: `loadSettings/saveSettings/getSettings/putSettings` inline in `app.js` → moves to `lib/settings.js`
- Utilities: `_ago()`, `_strColor()`, `_esc()` at bottom of `app.js` → move to `lib/utils.js`
- Router: inline `route()` + `hashchange` listener in `app.js` → moves to `lib/router.js`

### Integration Points
- `app.js` (new boot file) is the only entry point — imports transport, store, and router; registers SW
- `index.html` script tag imports `app.js` — no change needed
- `transport/index.js` is the single swap point — `app.js` imports transport from here only

</code_context>

<specifics>
## Specific Ideas

- Jordan confirmed: the monolith replacement should be a clean cut. No coexistence, no migration period. Phase 1 writes the new structure and the old content is gone.
- Jordan's context: not deeply involved in implementation decisions — the research and requirements are the authoritative specs. The planner and executor should trust those documents.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-27*
