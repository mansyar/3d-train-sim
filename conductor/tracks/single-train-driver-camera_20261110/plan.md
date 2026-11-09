# Single Train and Driver Camera — Implementation Plan

> **Branch:** `feat/single-train-driver-camera_20261110`
> **Base:** `main` @ `93e919e` (behind PR merge; will refresh to origin/main at materialize)
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the primary records them.

## Phase 1: Single-train selection (logic)

- **Goal:** Exactly one ride is selected by the loop-then-longest rule, with TDD coverage and no regression in existing ride/controller tests.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-7, AC-1, AC-2, AC-3
- **Touches:** `src/core/pathing.ts`, `src/core/pathing.test.ts`, `src/state/ride.ts`, `src/state/ride.test.ts`, `src/core/park-spot.ts`
- **Verification:** `pnpm check`
- **Status:** verified

- [x] **P1.T1: Red — selection unit tests** — covers: FR-2
  - [x] **P1.T1.1: Closed-short beats open-long** (AC-1)
  - [x] **P1.T1.2: No closed → longest open; tie → smaller anchor deterministically regardless of input order** (AC-2)
  - [x] **P1.T1.3: startAll over 3 components yields exactly 1 ride** (AC-3)
- [x] **P1.T2: Green — implement loop-then-longest selection** — covers: FR-1, FR-2
  - [x] **P1.T2.1: Filter closed components first, else all; rank by pieces then anchor; cap 1** in `selectRideComponents` / ride layer
  - [x] **P1.T2.2: Audit `park-spot.ts` call site (`selectRideComponents(..., 1)`) still correct after the rule change**
  - [x] **P1.T2.3: Confirm parked opener (FR-7) and scoped mid-ride edits (FR-3) unchanged**

**Result:** Verified 2026-11-10. `selectRideComponents` filters to `path.closed` when any exist else all, ranks by pieces then anchor; ride layer caps to 1 with never-swap guard. TDD: 3 Red failures → Green, `pnpm check` exit 0 (52 files, 904 tests). Park-spot call site needs no logic change.
**Checkpoint:** `5b8d3a3`
**Evidence:** `conductor/tracks/single-train-driver-camera_20261110/verification/phase-1.md`

## Phase 2: Driver camera and 🎥 cycle

- **Goal:** 🎥 cycles Overview → Chase → Driver at ≥1 ride, with the driver view at the cab looking forward; e2e proves the journey.
- **Depends on:** Phase 1
- **Covers:** FR-4, FR-5, FR-6, AC-4, AC-5
- **Touches:** `src/scene/film-camera.ts`, `src/ui/ride-controls.ts`, `src/ui/app.ts`, `e2e/smoke.spec.ts`
- **Verification:** `pnpm check`
- **Status:** verified

- [x] **P2.T1: Driver view in film-camera** — covers: FR-4
  - [x] **P2.T1.1: Add `driver` filmed target; position at cab eye (derived from rig model), look along current heading; eased lerp like chase**
  - [x] **P2.T1.2: Cycle order Overview → Chase → Driver → wrap; stop returns to overview (FR-6)**
- [x] **P2.T2: 🎥 visibility at ≥1 ride** — covers: FR-5
  - [x] **P2.T2.1: Change `subscribeFilmCount` threshold from ≥2 to ≥1 in `ride-controls.ts` / wallet**
  - [x] **P2.T2.2: Keep reduced-motion hidden; keep idle hidden**
- [x] **P2.T3: E2E rewrite** — covers: AC-4, AC-5
  - [x] **P2.T3.1: Replace two-disjoint-loops journey with single-train + driver-view journey (chase → driver near cab → overview → wrap)**
  - [x] **P2.T3.2: Open-line-only journey rides the open line; stop returns to overview**
  - [x] **P2.T3.3: Remove `ridingTrainCount === 2` witnesses**

**Result:** Verified 2026-11-10. `pnpm check` exit 0 (Biome 182, tsc, Vitest 52 files/904 tests). Primary ran `pnpm e2e` (exit 0, 21 tests passed on tablet+phone) proving AC-4/AC-5 (smoke.spec 1063 single-loop driver, 1182 open-line). Deviations: `src/scene/init-scene.ts` exposes `filmedView()/cameraSpot()` witnesses (AC-4 provability), `src/style.css` stale two-train comment noted not edited.
**Checkpoint:** `10e2163`
**Evidence:** `conductor/tracks/single-train-driver-camera_20261110/verification/phase-2.md`

## Phase 3: Docs sync and full matrix

- **Goal:** Product docs match the single-train behaviour and the full e2e matrix is green.
- **Depends on:** Phase 2
- **Covers:** FR-1, AC-6
- **Touches:** `conductor/product.md`, `README.md`, `CHANGELOG.md`, `e2e/*.spec.ts`
- **Verification:** `pnpm check`
- **Status:** pending

- [ ] **P3.T1: Doc sync** — covers: FR-1
  - [ ] **P3.T1.1: `conductor/product.md` — core loop (up to 4 → 1), V1 scope, shipped-roadmap note superseded; add shipped line for this track**
  - [ ] **P3.T1.2: `README.md` and `CHANGELOG.md` if they repeat the multi-train promise**
- [ ] **P3.T2: Full verification** — covers: AC-6
  - [ ] **P3.T2.1: `pnpm test:coverage` gate 80% on src/core + src/state**
  - [ ] **P3.T2.2: `pnpm build` then full Playwright matrix (tablet, phone, prod); record counts**
  - [ ] **P3.T2.3: Media demo (GIF) of driver view for the PR body**
