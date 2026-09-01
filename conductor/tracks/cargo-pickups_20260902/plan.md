# Plan: Station Cargo Pickups

**Track ID:** `cargo-pickups_20260902` · **Branch:** `track/cargo-pickups_20260902` ·
**Type:** Feature · **Spec:** [spec.md](spec.md)

## Phase 1: Core — Cargo Cycle Logic & Save Migration (TDD) [checkpoint: ba4e5bb]

> **Verification Report** — Automated: `pnpm exec biome check .` clean;
> `pnpm exec tsc --noEmit` clean; `CI=true pnpm test` 29 files / 398 tests
> passing; coverage on changed logic modules cargo.ts 100%, world.ts 100%
> lines, save.ts 98.3% lines, persistence.ts 92.6% lines (all >80%).
> Manual: dev server loads, existing worlds restore, existing rides behave
> unchanged (core-only phase — nothing user-visible yet). User confirmed:
> 2026-09-02.

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
- [x] Task: Save migration for delivery counts (`src/core/save.ts`) — snapshot
  version bump; per-station delivered-count map on `WorldData`; legacy/missing
  counts migrate to 0; serialize/deserialize round-trip (6940930)
  - Failing tests first: round-trip, v-1 migration to zero counts,
    unknown/malformed counts ignored
  - Notes: TDD red→green (6 new tests). Snapshot v3 adds optional
    `deliveries` (station id → count), omitted when empty like `preferences`;
    `WorldData.deliveries` is a required record (always present, possibly
    empty). Parsing is forgiving: non-records and malformed entries drop
    without emptying the world, counts must be positive integers and are
    clamped to `MAX_DELIVERED_CRATES`. Pre-v3 snapshots migrate to `{}`.
    Updated the v2-era expectations in `save.test.ts` and
    `persistence.test.ts` for the bump. Files: `src/core/save.ts`,
    `src/core/save.test.ts`, `src/state/persistence.test.ts`. Why: delivered
    crates must survive reloads, and the versioned-migration pattern from the
    river keeps old worlds safe.
- [x] Task: World store integration (`src/state/world.ts`, `persistence.ts`) —
  delivery-count read/update API; relocate keeps count, remove drops it,
  reset clears (0f036d5)
  - Failing tests first: relocate/remove/reset semantics; hydrate from
    migrated save
  - Notes: TDD red→green (9 world tests + 1 persistence test). Store gains
    `deliveryCount(id)` (0 for unknown ids), `deliverCrate(id)` (capped via
    `deliveredCountAfter`, notifies so autosave + live UI update together),
    and a defensive-copy `deliveries()` reader. Relocating keeps the count
    (ids are stable); `removeScenery` drops it; `reset` and `hydrate` swap
    the whole ledger. `persistence.WorldReader` grew `deliveries()` so every
    autosave carries the counts. Files: `src/state/world.ts`,
    `src/state/world.test.ts`, `src/state/persistence.ts`,
    `src/state/persistence.test.ts`. Why: the ride layer (Phase 3) needs one
    store call per delivery, and the store is the single writer to the save.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Station Asset — Blender Recipe & Mounting

- [x] Task: `scripts/blender-station.py` — deterministic, re-runnable recipe: (12a5c20)
  polished 1-cell station with integrated cargo platform, 8 named crate slots
  (`station_crate_1..8`), named-node + material contract, same export
  conventions as the tunnel recipe (`export_format="GLB"`, `export_yup`,
  selection-scoped); render checks via real renders; export `station.glb` +
  a shared `crate.glb` for wagons; `verify_glb()` JSON-chunk sanity check
  - Acceptance criteria (visual, verified at checkpoint): station reads as a
    chunky landmark at 0.7 scenery scale; crates sit flush on the platform;
    no inverted normals in zoom renders
  - Notes: recipe builds 16 objects — cream building + terracotta gable
    roof, door + windows, wooden cargo deck (0.18 high), sloping canopy on
    two dark posts, and 8 named crate slots (station_crate_1..8, 2x4 grid on
    the deck) — plus cargo_crate exported separately as crate.glb. Named
    contracts verified via verify_glb(): station.glb 24,260 B (15 nodes, 5
    station_* materials), crate.glb 2,380 B (cargo_crate / crate_wood).
    Render checks (quarter/deck/side) via real renders with the previous
    tunnel check scene hidden; crates read as distinct slots after resizing
    to 0.30 and separating crate orange from deck brown. Session lesson
    (same as tunnels): the live Blender scene held stale objects —
    render_checks() now hides everything outside the recipe.
    Files: `scripts/blender-station.py` (new), `public/assets/train-kit/
    station.glb` (new), `public/assets/train-kit/crate.glb` (new).
- [x] Task: Mount the new station model — point the scenery loader at
  `station.glb` (fantasy-town-kit stays for house/cottage), verify
  placement/anchor/scale unchanged, existing saves render placed stations on
  the new model
  - Notes: one-line catalog change in `SCENERY_URLS` plus a test update —
    house/cottage stay on the Kenney kit; the station asserts
    `/assets/train-kit/station.glb`. Verified in the live app via a
    throwaway Playwright spec (removed after): placement returns `placed`,
    rotation 180 shows the cargo deck + crate slots to the camera, and an
    existing save renders around it untouched. Full Playwright suite (55
    tests) green. Files: `src/core/scenery.ts`, `src/core/scenery.test.ts`.
    Why: the crate slots in the GLB are what Phase 3 toggles per delivery
    count.
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
