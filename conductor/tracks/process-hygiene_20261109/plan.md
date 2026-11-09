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
- **Status:** in_progress

- [ ] **P1.T1: Rebuild registry table** — covers: FR-1, FR-2
  - [ ] **P1.T1.1: Generate one row per `conductor/archive/` directory**
  - [ ] **P1.T1.2: Normalize all statuses to `archived`; delete duplicate name list**
- [ ] **P1.T2: Record exception decisions** — covers: FR-3, FR-4
  - [ ] **P1.T2.1: Add parent-only long-press exception to `conductor/product-guidelines.md`**
  - [ ] **P1.T2.2: Add `user-scalable=no` intentional note to `conductor/product-guidelines.md`**
- [ ] **P1.T3: Close roadmap row** — covers: AC-3
  - [ ] **P1.T3.1: Mark `process-hygiene_20261109` shipped in `conductor/product.md`**
