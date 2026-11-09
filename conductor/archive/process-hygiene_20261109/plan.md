# Process Hygiene — Implementation Plan

> **Branch:** `chore/process-hygiene_20261109`
> **Base:** `main` @ `abe4b8d`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Registry and Decisions Cleanup

- **Goal:** One normalized registry table, both intentional decisions recorded.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-4, AC-1, AC-2, AC-3
- **Touches:** `conductor/tracks.md`, `conductor/product-guidelines.md`, `conductor/product.md`
- **Verification:** `pnpm exec biome check .` + row-count check (rows == archive dirs, all `archived`)
- **Status:** verified

- [x] **P1.T1: Rebuild registry table** — covers: FR-1, FR-2
  - [x] **P1.T1.1: Generate one row per `conductor/archive/` directory**
  - [x] **P1.T1.2: Normalize all statuses to `archived`; delete duplicate name list**
- [x] **P1.T2: Record exception decisions** — covers: FR-3, FR-4
  - [x] **P1.T2.1: Add parent-only long-press exception to `conductor/product-guidelines.md`**
  - [x] **P1.T2.2: Add `user-scalable=no` intentional note to `conductor/product-guidelines.md`**
- [x] **P1.T3: Close roadmap row** — covers: AC-3
  - [x] **P1.T3.1: Mark `process-hygiene_20261109` shipped in `conductor/product.md`**
- **Result:** verified — 67 archived rows == 67 archive dirs, single table, no `done`, both decisions recorded, roadmap row shipped; biome + tsc + 899 tests green.
- **Checkpoint:** 28f0dc6
- **Evidence:** `conductor/tracks/process-hygiene_20261109/verification/phase-1.md`
