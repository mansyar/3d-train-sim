# Progressive Disclosure — Implementation Plan

> **Branch:** `feat/progressive-disclosure_20261110`
> **Base:** `main` @ `6d49b657d860d65d116810412d0146760cd6d7aa`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Tier model (logic)

- **Goal:** Pure disclosure model decides visible kinds and unlock state, fully unit-tested.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, NFR-1, NFR-4, AC-1, AC-2, AC-3
- **Touches:** `src/core/disclosure.ts`, `src/core/disclosure.test.ts`
- **Verification:** `pnpm check`
- **Status:** verified

- [x] **P1.T1: Disclosure tier model** — covers: FR-1, FR-2
  - [x] **P1.T1.1: Kind tiers table + tests** (basics vs `switch-3way` / `switch-slip` / `station`)
  - [x] **P1.T1.2: Visibility selector + tests** (locked → basics; unlocked → all)
- [x] **P1.T2: Ride-count unlock + grandfather** — covers: FR-3, FR-4, FR-5
  - [x] **P1.T2.1: Ride counter + threshold (3) + tests**
  - [x] **P1.T2.2: Grandfather rule + tests** (world has advanced piece → unlocked)

<!--
The primary appends after acceptance:
**Result:** verified (primary: `pnpm check` exit 0 — biome 184 files clean, tsc clean, 53 files / 928 tests pass)
**Checkpoint:** cea0533
**Evidence:** conductor/tracks/progressive-disclosure_20261110/verification/phase-1.md
-->

## Phase 2: Toybox gating + celebration

- **Goal:** Basics-only toybox on fresh install; icon-only unlock celebration.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-6, NFR-1, NFR-3, AC-4
- **Touches:** `src/ui/toy-drawer.ts`, `src/core/drawer.ts`
- **Verification:** `pnpm check`
- **Status:** verified

- [x] **P2.T1: Toybox gating** — covers: FR-2
  - [x] **P2.T1.1: Hide advanced slots while locked**
  - [x] **P2.T1.2: MAX_PIECES cap dimming preserved**
- [x] **P2.T2: Unlock celebration** — covers: FR-6
  - [x] **P2.T2.1: Bounce + ding, mute + reduced-motion respected**
  - [x] **P2.T2.2: Sub-100 ms tap feedback preserved**

**Result (Phase 2):** verified (primary: `pnpm check` exit 0 — 54 files / 938 tests pass)
**Checkpoint (Phase 2):** 5155d72
**Evidence (Phase 2):** conductor/tracks/progressive-disclosure_20261110/verification/phase-2.md
**Deviations (Phase 2):** `src/ui/app.ts` (ride-end counting hook on existing `subscribeRideMode` push, no ride-controller change needed), `src/style.css` (`.drawer-tab.pop` reusing `ride-pop`, `[hidden]` guards, reduced-motion `animation: none` cover)

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 2
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->

## Phase 3: Persistence, migration, measurement

- **Goal:** Unlock flag persists and migrates; e2e proves gating, unlock, and reload.
- **Depends on:** Phase 2
- **Covers:** FR-4, FR-5, FR-7, NFR-1, NFR-2, NFR-3, NFR-4, AC-5, AC-6
- **Touches:** `src/core/save.ts`, `src/state/world.ts`, `e2e/disclosure.spec.ts`
- **Verification:** `pnpm exec playwright test e2e/disclosure.spec.ts`
- **Status:** in_progress

- [x] **P3.T1: Persistence + migration** — covers: FR-4, FR-5, FR-7
  - [x] **P3.T1.1: Save/load unlock flag; parent reset clears**
  - [x] **P3.T1.2: Pre-tier world migration (grandfather)**
- [x] **P3.T2: E2E + measurement hooks** — covers: AC-5, AC-6
  - [x] **P3.T2.1: disclosure.spec.ts (locked → 3 rides → unlocked → reload persists)**
  - [x] **P3.T2.2: Audit-comparison notes (baseline fields recorded)**

**Result (Phase 3):** verified (primary: `pnpm exec playwright test e2e/disclosure.spec.ts` 3 passed + `pnpm check` exit 0 — 54 files / 938 tests)
**Checkpoint (Phase 3):** f62000d
**Evidence (Phase 3):** conductor/tracks/progressive-disclosure_20261110/verification/phase-3.md
**Deviations (Phase 3):** `src/state/persistence.ts` (WorldReader.disclosure + snapshotOf carry), `src/ui/toy-drawer.ts` (delegates to world store, re-gates on subscription), `src/main.ts` (boot restore via parseDisclosureState + grandfather), `src/ui/toy-drawer.test.ts` (harness mock, test-only) — all accepted as smallest possible wiring
