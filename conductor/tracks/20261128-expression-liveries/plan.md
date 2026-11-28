# B. Expression — paint/sticker liveries — Implementation Plan

> **Branch:** `feat/20261128-expression-liveries`
> **Base:** `main` @ `dc2ba44a6f3f62b31341e0227be2534d572067e6`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Livery state + persistence

- **Goal:** Per-train livery state (paint + stickers) with unit-pinned oldest-first eviction, riding the snapshot preferences block additively.
- **Depends on:** none
- **Covers:** FR-4, NFR-5, AC-2 (logic half; browser half lands in Phase 5)
- **Touches:** `src/state/liveries.ts`, `src/state/liveries.test.ts`, `src/core/save.ts`, `src/core/save.test.ts`
- **Verification:** `pnpm test:coverage`
- **Status:** done

- [x] **P1.T1: Livery store** — covers: FR-4
  - [x] **P1.T1.1: Red failing tests** — default stock livery, set-paint, stamp/evict-oldest, restore-default, per-train isolation
  - [x] **P1.T1.2: Green implementation** — pure store, no DOM/three.js, no save-schema change beyond the preferences key
- [x] **P1.T2: Preferences round-trip** — covers: FR-4, NFR-5
  - [x] **P1.T2.1: Red failing tests** — missing livery key boots stock; portable world-only export excludes liveries
  - [x] **P1.T2.2: Green implementation** — additive `preferences.liveries` key, salvage-safe

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** 2c0a30d
**Evidence:** conductor/tracks/20261128-expression-liveries/verification/phase-1.md
-->

## Phase 2: Drawer livery section

- **Goal:** The train drawer shows 6 paint swatches, 4 sticker shapes, and restore-default — icon-only, ≥64 px, wired to the store's target vehicle.
- **Depends on:** Phase 1
- **Covers:** FR-1, NFR-1, NFR-4
- **Touches:** `src/ui/train-picker.ts`, `e2e/liveries-drawer.spec.ts`
- **Verification:** `pnpm exec playwright test e2e/liveries-drawer.spec.ts`
- **Status:** done

- [x] **P2.T1: Livery tray section** — covers: FR-1, NFR-4
- [x] **P2.T2: Vehicle targeting** — covers: FR-1 (tray follows the selected loco/wagon, keeps per-train state)
- [x] **P2.T3: Drawer spec** — covers: NFR-1 (section renders, every swatch taps with visible feedback, clean console)

## Phase 3: Paint application + reward

- **Goal:** Tapping a swatch repaints the whole 3D body instantly, with a mute-respecting reward sound and scale-bounce.
- **Depends on:** Phase 2
- **Covers:** FR-2, FR-6, AC-5
- **Touches:** `src/scene/train-fleet.ts`, `src/scene/rig-cargo.ts`, `src/audio/liveries.ts`, `e2e/liveries-paint.spec.ts`
- **Verification:** `pnpm exec playwright test e2e/liveries-paint.spec.ts`
- **Status:** done

- [x] **P3.T1: Body recolor path** — covers: FR-2 (store → loco shell / wagon body materials, all six engines)
- [x] **P3.T2: Reward sound + bounce** — covers: FR-6 (soft pop/ding via Howler path, instant mute, persists)
- [x] **P3.T3: Paint spec** — covers: AC-5 (repaint every vehicle; muted run changes livery with zero audible plays)

## Phase 4: Stickers + restore

- **Goal:** Tap-to-stamp on 4 side anchors with oldest-first eviction, restore-default clears to stock, reduced motion lands final-state.
- **Depends on:** Phase 3
- **Covers:** FR-3, FR-5, NFR-3, NFR-6, AC-3, AC-4, AC-6
- **Touches:** `src/scene/liveries/stickers.ts`, `src/scene/train-fleet.ts`, `src/ui/train-picker.ts`, `e2e/liveries-stickers.spec.ts`
- **Verification:** `pnpm exec playwright test e2e/liveries-stickers.spec.ts`
- **Status:** done

- [x] **P4.T1: Anchor stamp/evict** — covers: FR-3, NFR-6 (procedural/SVG sprites, capped, no per-frame allocation)
- [x] **P4.T2: Restore-default** — covers: FR-5, AC-4
- [x] **P4.T3: Stickers spec** — covers: AC-3, AC-6 (over-cap eviction pins oldest-first; reduced-motion run asserts final state)

## Phase 5: Integrated evidence

- **Goal:** Full six-train proof — every vehicle repainted + stickered, persistence wired so reload round-trips byte-identical, offline prod run precache-neutral, screenshots committed.
- **Depends on:** Phase 4
- **Covers:** AC-1, AC-2, AC-7, NFR-2, NFR-5
- **Touches:** `src/state/persistence.ts`, `src/state/persistence.test.ts`, `src/main.ts` (boot restore + watcher wiring only), `e2e/liveries-evidence.spec.ts`, `conductor/tracks/20261128-expression-liveries/evidence/` (committed bundle)
- **Verification:** `pnpm exec playwright test e2e/liveries-evidence.spec.ts`
- **Status:** verified

- [x] **P5.T1: Six-train evidence spec** — covers: AC-1 (repaint + sticker everything, zero console errors)
- [x] **P5.T2: Persistence wiring + round-trip + offline** — covers: AC-2, AC-7, NFR-2, NFR-5 (watch/restore livery preferences in `persistence.ts` following the mute/day-phase watcher shape; boot restore in `main.ts` before watchers attach; reload identity; network-disabled prod run; no new precache entries)
- [x] **P5.T3: Evidence bundle** — covers: AC-1 (screenshots + one cycle capture committed under the track's `evidence/` dir)
