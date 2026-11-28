# Longer trains — Implementation Plan

> **Branch:** `feat/20261128-longer-trains`
> **Base:** `main` @ `bbec946b331cc08ec97305f9aac78e2a881ea377`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Length model + fit rule

- **Goal:** World holds one uniform wagon count (2–4) plus per-wagon outfits, with a pure fit function (consist length + one-wagon margin vs measured loop path length) and additive save support — all unit-tested.
- **Depends on:** none
- **Covers:** FR-2, FR-7 (model + save), A1, A3, A4
- **Touches:** `src/state/world.ts`, `src/state/world.test.ts`, `src/core/save.ts`, `src/core/save.test.ts`
- **Verification:** `pnpm check`
- **Status:** verified

- [ ] **P1.T1: Uniform length + per-wagon outfits in world state** — covers: FR-2, FR-4
  - [ ] **P1.T1.1:** RED: tests for default pair, grow-to-4, 5th-grow no-op, per-wagon outfit set, tap-last removal
  - [ ] **P1.T1.2:** GREEN: pure state transitions, no scene/DOM
- [ ] **P1.T2: Fit function against loop path length** — covers: FR-3, A4
  - [ ] **P1.T2.1:** RED: fits / does-not-fit cases including margin boundary
  - [ ] **P1.T2.2:** GREEN: pure function on path length + wagon count
- [ ] **P1.T3: Additive save support** — covers: FR-7, A3
  - [ ] **P1.T3.1:** RED: serialize/parse round-trip incl. corrupt-input salvage
  - [ ] **P1.T3.2:** GREEN: world snapshot carries length + outfits (portable export included)

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261128-longer-trains/verification/phase-1.md
-->

## Phase 2: Drawer controls

- **Goal:** The wagon row gains an icon-only `+` slot (dimmed when the loop can't fit), wagons are tappable to select, and tapping the last wagon removes it — proven in-browser.
- **Depends on:** Phase 1
- **Covers:** FR-1, FR-3 (drawer half), FR-4 (drawer half), FR-5 (drawer half)
- **Touches:** `src/ui/train-picker.ts`, `src/style.css` (scoped drawer rules), `e2e/longer-trains-drawer.spec.ts`
- **Verification:** `pnpm check` + `pnpm exec playwright test e2e/longer-trains-drawer.spec.ts`
- **Status:** in_progress

- [ ] **P2.T1: `+` slot with loop-fit dimming** — covers: FR-1, FR-3
- [ ] **P2.T2: Select-wagon-then-preset + tap-last-to-remove** — covers: FR-4, FR-5

## Phase 3: Scene consist + cargo

- **Goal:** Wagons 3–4 spawn in their outfits, follow the path with the consist (both directions on dead ends), and work station cargo — proven in-browser.
- **Depends on:** Phase 2
- **Covers:** FR-6, FR-8 (follow behavior), AC-1 (scene half), AC-6
- **Touches:** `src/scene/train-fleet.ts`, `src/scene/rig-cargo.ts`, `e2e/longer-trains-consist.spec.ts`
- **Verification:** `pnpm check` + `pnpm exec playwright test e2e/longer-trains-consist.spec.ts`
- **Status:** pending

- [ ] **P3.T1: Spawn/remove/dress wagons 3–4 with path follow** — covers: FR-2, FR-4
- [ ] **P3.T2: Cargo load/deliver from extra wagons** — covers: FR-6
- [ ] **P3.T3: Dead-end shuttle + straddled-switch follow, no fail states** — covers: FR-8, NFR-6

## Phase 4: Persistence wiring + reset + shrink-keeps

- **Goal:** Length + outfits reload byte-identically, world reset clears to the pair, loop edits recompute fit, and shrinking the loop keeps all wagons — proven in-browser.
- **Depends on:** Phase 3
- **Covers:** FR-3 (wiring), FR-7 (wiring), FR-8, AC-3, AC-4, AC-5
- **Touches:** `src/state/persistence.ts`, `src/state/persistence.test.ts`, `src/main.ts`, `e2e/longer-trains-persist.spec.ts`
- **Verification:** `pnpm check` + `pnpm exec playwright test e2e/longer-trains-persist.spec.ts`
- **Status:** pending

- [ ] **P4.T1: Restore-before-watchers + reset-clears wiring** — covers: FR-7
- [ ] **P4.T2: Fit recompute on track edits; shrink keeps wagons** — covers: FR-3, FR-8

## Phase 5: Integrated evidence

- **Goal:** Full-matrix green with committed screenshots of a 4-wagon mixed-outfit consist riding, plus the reload round-trip and cargo-run proof.
- **Depends on:** Phase 4
- **Covers:** AC-7 and all ACs end-to-end (FR-1 – FR-8, NFR-1 – NFR-6)
- **Verification:** `pnpm test:coverage` + `pnpm build` + full tablet matrix (`pnpm exec playwright test --project=tablet`)
- **Status:** pending

- [ ] **P5.T1: Evidence spec (4-wagon ride, mixed outfits, reload, cargo run)** — covers: AC-1 – AC-7
- [ ] **P5.T2: Full matrix + committed evidence bundle** — covers: NFR-1 – NFR-6

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
