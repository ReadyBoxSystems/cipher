# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 01-foundation
**Areas discussed:** Phase 1 end state, Mock transport scope, Old app.js disposition

---

## Phase 1 End State

| Option | Description | Selected |
|--------|-------------|----------|
| A — Stub screens | Each screen file has a real mount() rendering a placeholder | |
| B — Graceful empty shell | No screen files; router null-checks before calling mount(); app shows blank container | ✓ |
| C — Port v0 auth only | Extract auth.js from v0 as the one working screen; rest absent | |

**User's choice:** B — Graceful empty shell
**Notes:** Jordan confirmed B is fine. Screens belong in their own phases.

---

## Mock Transport Scope

| Option | Description | Selected |
|--------|-------------|----------|
| A — Typed stubs | All methods exist with correct signatures; all return `{ result: null, error: null }` | ✓ |
| B — Functional mock | Returns realistic in-memory data; app could run against it | |

**User's choice:** A — Typed stubs only
**Notes:** Jordan agreed Phase 5 is the right time to fill in real test data. No reason to do the work twice.

---

## Old app.js Disposition

| Option | Description | Selected |
|--------|-------------|----------|
| A — Replace immediately | Gut the monolith and write new boot file from scratch in one move | ✓ |
| B — Build alongside | New modules created first, then app.js replaced at the end | |

**User's choice:** A — Replace immediately
**Notes:** Jordan: "It's what I was hoping/figuring would happen with the rebuild." Clean cut, no coexistence.

---

## Claude's Discretion

- Screen null-check pattern in router.js
- transport/index.js re-export structure
- sw.js cache file list update

## Deferred Ideas

None.
