# Plan: Station Cargo Pickups

**Track ID:** `cargo-pickups_20260902` · **Branch:** `track/cargo-pickups_20260902` ·
**Type:** Feature · **Spec:** [spec.md](spec.md)

## Phase 1: Core — Cargo Cycle Logic & Save Migration (TDD)

- [x] Task: Cargo cycle state machine (`src/core/cargo.ts`) — pure module: per-train
  load state (`empty ⇄ loaded`), `onStationStop(loadState)` → `load | deliver`,
  delivery-count increment with `MAX_DELIVERED_CRATES = 8` cap (1785e8e)
  - Write failing tests first (Red): load on empty, deliver on loaded,
    alternation across stops, single-station alternation, cap enforcement,
    no-op outcomes
  - Implement to pass (Green); refactor; verify coverage >80%
  - Notes: TDD red→green (7 unit tests, all passing; module fully covered).
    API settled as three pure functions — `actionAtStop(load)` (empty loads,
    loaded delivers; alternates by construction, no route bookkeeping),
    `loadAfterAction(action)` (refactored to drop an unused parameter after
    green), `deliveredCountAfter(count)` (caps at `MAX_DELIVERED_CRATES = 8`;
    later deliveries still celebrate but the pile stops growing). Files:
    `src/core/cargo.ts` (new), `src/core/cargo.test.ts` (new). Why: the whole
    pickup/deliver choreography reduces to one deterministic per-stop answer,
    so the ride wiring in Phase 3 stays trivial.
- [ ] Task: Save migration for delivery counts (`src/core/save.ts`) — snapshot
  version bump; per-station delivered-count map on `WorldData`; legacy/missing
  counts migrate to 0; serialize/deserialize round-trip
  - Failing tests first: round-trip, v-1 migration to zero counts,
    unknown/malformed counts ignored
- [ ] Task: World store integration (`src/state/world.ts`, `persistence.ts`) —
  delivery-count read/update API; relocate keeps count, remove drops it,
  reset clears
  - Failing tests first: relocate/remove/reset semantics; hydrate from
    migrated save
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Station Asset — Blender Recipe & Mounting

- [ ] Task: `scripts/blender-station.py` — deterministic, re-runnable recipe:
  polished 1-cell station with integrated cargo platform, 8 named crate slots
  (`station_crate_1..8`), named-node + material contract, same export
  conventions as the tunnel recipe (`export_format="GLB"`, `export_yup`,
  selection-scoped); render checks via real renders; export `station.glb` +
  a shared `crate.glb` for wagons; `verify_glb()` JSON-chunk sanity check
  - Acceptance criteria (visual, verified at checkpoint): station reads as a
    chunky landmark at 0.7 scenery scale; crates sit flush on the platform;
    no inverted normals in zoom renders
- [ ] Task: Mount the new station model — point the scenery loader at
  `station.glb` (fantasy-town-kit stays for house/cottage), verify
  placement/anchor/scale unchanged, existing saves render placed stations on
  the new model
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Ride & Scene Wiring — Load, Deliver, Celebrate

- [ ] Task: Wagon crate meshes — load `crate.glb` template, attach one per
  wagon, visibility-toggled; gentle scale pop-in on load (instant toggle
  under reduced motion); change-driven only, never per-frame
- [ ] Task: Wire the cycle into rides (`ride-motion.ts` / `init-scene.ts`) — on
  each station stop: `cargo.onStationStop` decides load vs deliver; deliver →
  remove wagon crates, bump the station's count in the world, fire a
  pooled/instanced confetti burst at the station; loads/delivers during the
  existing pause (duration unchanged); trains with no stations never show
  crates
- [ ] Task: Station crate slots — station model's 8 slots toggle visible from
  the persisted count (change-driven); count updates reflect live without
  reload
- [ ] Task: Confetti burst (`src/scene/`) — small pooled particle burst, capped
  lifetime, zero steady-state allocation, skipped under reduced motion; no
  new audio (existing ding carries it)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Smoke, Docs & Final Gates

- [ ] Task: Playwright smoke (`e2e/cargo.spec.ts`) — place a loop with two
  stations, press play, assert crate load then delivery (wagon crate
  visibility, station slot gain), reload persistence of counts, no external
  requests/console errors
- [ ] Task: Docs — CHANGELOG parent-facing bullets under `[Unreleased]`;
  product.md roadmap line; tech-stack.md notes (station recipe in the
  asset-authoring section/folder map)
- [ ] Task: Full gate suite — `pnpm exec biome check .`,
  `pnpm exec tsc --noEmit`, `CI=true pnpm test -- --coverage`,
  `pnpm exec playwright test`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
