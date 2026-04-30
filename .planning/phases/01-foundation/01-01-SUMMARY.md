---
phase: 01-foundation
plan: 01
subsystem: testing
tags: [jest, aes-256-gcm, pbkdf2, service-worker, webcrypto, esm]

# Dependency graph
requires: []
provides:
  - "crypto.js: safe toB64 with chunked for-loop (no stack overflow on large payloads)"
  - "crypto.js: passphrase guards on encrypt and decrypt (SEC-04)"
  - "sw.js: cipher-v2 cache, relative asset paths matching Plan 03 module structure"
  - "Jest 30 ESM test harness: npm test exits 0, WebCrypto available in node environment"
  - "tests/crypto.test.js: 10 passing tests for crypto module behaviors"
affects: [01-02, 01-03, phase-05-testing]

# Tech tracking
tech-stack:
  added: [jest@30.2.0, jest-environment-node@30.2.0]
  patterns:
    - "TDD: failing test commit (RED) before implementation commit (GREEN)"
    - "Chunked base64 conversion via String.fromCharCode.apply with 0x8000 chunk size"
    - "Passphrase guard pattern: throw outside try/catch for programmer errors, return null inside for wrong-key events"

key-files:
  created:
    - package.json
    - jest.config.js
    - tests/.gitkeep
    - tests/crypto.test.js
    - .gitignore
  modified:
    - crypto.js
    - sw.js

key-decisions:
  - "jest.config.js extensionsToTreatAsEsm set to empty array — Jest 30 infers .js as ESM from package.json type:module; the ['.js'] value is now an error"
  - "npm test script uses node_modules/jest/bin/jest.js directly — Git Bash on Windows cannot execute .bin/jest shim (bash subshell syntax fails in Node's shebang handler)"
  - "decrypt passphrase guard is outside the try/catch — empty key is a programmer error, not a wrong-key event; this preserves the null-on-wrong-key contract"

patterns-established:
  - "Passphrase guard pattern: check before any crypto ops, throw outside try/catch for input errors"
  - "Chunked toB64: 0x8000 chunk size, String.fromCharCode.apply"

requirements-completed: [FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, SEC-01, SEC-02, SEC-03, SEC-04]

# Metrics
duration: 3min
completed: 2026-04-30
---

# Phase 01 Plan 01: Bugs + Jest Summary

**AES-256-GCM crypto.js patched for stack overflow and empty-key security hole, service worker bumped to cipher-v2 with relative paths, Jest 30 ESM harness wired with 10 passing tests**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-30T22:06:12Z
- **Completed:** 2026-04-30T22:09:21Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Patched `toB64` in crypto.js: replaced spread (`...new Uint8Array`) with a chunked for-loop, eliminating the V8 stack overflow on payloads over ~125KB (FOUND-03, FOUND-04)
- Added passphrase guards to both `encrypt` and `decrypt`: throws Error containing 'passphrase' for empty/null/undefined — closes the silent empty-key encryption hole (SEC-04)
- PBKDF2 parameters (100k iterations, SHA-256, 16-byte salt, 12-byte IV, AES-GCM) preserved unchanged (SEC-01, SEC-02, SEC-03)
- Replaced sw.js with cipher-v2 cache and relative-path ASSETS list matching Plan 03 module structure (FOUND-05)
- Created Jest 30 ESM test harness: package.json, jest.config.js, tests/.gitkeep, .gitignore; `npm test` exits 0 (FOUND-06, FOUND-07)
- Wrote 10 TDD tests covering all required crypto behaviors — all pass

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests for crypto.js** - `f243a4e` (test)
2. **Task 1 GREEN: Patch crypto.js** - `e9fde45` (feat)
3. **Task 2: Patch sw.js** - `52654f7` (feat)
4. **Task 3: Jest ESM harness** - `3f48062` (chore)

_Note: Task 1 used TDD — RED commit before GREEN commit_

## Files Created/Modified
- `crypto.js` — toB64 chunked loop, passphrase guards on encrypt + decrypt
- `sw.js` — cipher-v2 cache name, relative asset paths, Plan 03 module file list
- `package.json` — ESM type:module, Jest 30 devDependency, npm test script
- `jest.config.js` — node environment, no Babel transform, tests/ match pattern
- `tests/crypto.test.js` — 10 tests: round-trip, large payload, passphrase guard (5 empty/null/undefined cases)
- `tests/.gitkeep` — empty file to commit tests/ directory
- `.gitignore` — node_modules/, .DS_Store, *.log

## Decisions Made
- `extensionsToTreatAsEsm: []` instead of `['.js']` — Jest 30 infers .js as ESM from package.json `"type": "module"`. Using `['.js']` throws a validation error.
- Test script uses `node_modules/jest/bin/jest.js` instead of `node_modules/.bin/jest` — on Windows with Git Bash, the .bin shim's bash subshell syntax (`basedir=$(...)`) fails in Node's shebang handler. Direct path to jest.js is functionally identical.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Jest config extensionsToTreatAsEsm cannot include '.js' in Jest 30**
- **Found during:** Task 3 (Jest config creation)
- **Issue:** Plan specified `extensionsToTreatAsEsm: ['.js']` but Jest 30 throws a Validation Error: ".js is always inferred based on type in its nearest package.json" when `"type": "module"` is set
- **Fix:** Changed to `extensionsToTreatAsEsm: []` — ESM inference is automatic in Jest 30 with type:module
- **Files modified:** jest.config.js
- **Verification:** `npm test` exits 0, all tests pass
- **Committed in:** 3f48062 (Task 3 commit)

**2. [Rule 3 - Blocking] npm test script .bin/jest shim fails in Git Bash on Windows**
- **Found during:** Task 3 (npm test verification)
- **Issue:** `node_modules/.bin/jest` is a bash shebang script with `basedir=$(...)` subshell syntax that Git Bash on Windows cannot execute through Node's module loader
- **Fix:** Changed test script to use `node_modules/jest/bin/jest.js` directly — the actual entry point that .bin/jest would have called anyway
- **Files modified:** package.json
- **Verification:** `npm test` exits 0 with Jest 30.2.0
- **Committed in:** 3f48062 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 Jest 30 API change, 1 Windows platform blocking issue)
**Impact on plan:** Both fixes necessary for correctness on this platform. Functionally equivalent to plan intent. No scope creep.

## Issues Encountered
- Jest 30 has breaking change vs. research docs: `extensionsToTreatAsEsm: ['.js']` is no longer valid when `"type": "module"` is set in package.json. The ESM handling is now automatic. Research was accurate for older Jest versions.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- crypto.js is clean: safe base64, passphrase guards, SEC contracts preserved. Phase 5 crypto tests can rely on the exact same encrypt/decrypt signatures.
- sw.js is ready: Plan 03 module files are already in the ASSETS list. Plan 03 only needs to create those files — the service worker is already aware of them.
- Jest is wired: `npm test` works. Plan 02+ can add test files to tests/ and they will run immediately.
- No blockers.

---
*Phase: 01-foundation*
*Completed: 2026-04-30*
