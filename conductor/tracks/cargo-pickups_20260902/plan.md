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

## Phase 2: Station Asset — Blender Recipe & Mounting [checkpoint: 06f8619]

> **Verification Report** — Automated: biome clean, tsc clean, 399 unit
> tests, 55 Playwright e2e tests passing; verify_glb() confirms the named
> node/material contract; render checks (quarter/deck/side) show distinct
> crate slots and no normal artifacts. Manual: dev-server placement
> screenshots — station places and rotates, deck + crates face the camera
> at rotation 180, existing saves render untouched; user approved the
> Kenney-matched restyle. User confirmed: 2026-09-02.

- [x] Task: `scripts/blender-station.py` — deterministic, re-runnable recipe: (12a5c20, restyled 06f8619)
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
    Polish pass (user feedback: match the Kenney house style): imported the
    Kenney house/cottage into the check scene for a side-by-side, then
    restyled — teal roof + canopy (family palette), orange-brown corner
    timbers wrapping all four wall corners, framed windows (dark frame +
    mullions + white panes as their own station_panes node), a base plinth,
    and the deck extended to meet the wall. Final GLB: 33,584 B, 18 nodes,
    7 station_* materials; pane node initially missed the selection list —
    caught by verify_glb() and fixed.
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

## Phase 3: Ride & Scene Wiring — Load, Deliver, Celebrate [checkpoint: 9b0a597]

> **Verification Report** — Automated: biome clean, tsc clean, 404 unit
> tests (confetti pool 100% lines), 57 e2e tests, live throwaway spec
> showed load on stop 1 → deliver on stop 2 with deliveryCount ≥ 1 and no
> console errors. Manual: crates visibly pop aboard (logs + tender),
> confetti at delivery, station platform fills with the delivered crate.
> A user spot-check found the crates NOT rendering — two bugs fixed
> (9b0a597): the wagon re-dress path skipped crate attachment, and the
> mount height ignored the wagon's 1.5 root scale. User confirmed
> (with the fix verified on screenshots): 2026-09-02.

- [x] Task: Wagon crate meshes — load `crate.glb` template, attach one per
  wagon, visibility-toggled; gentle scale pop-in on load (instant toggle
  under reduced motion); change-driven only, never per-frame (330376d)
- [x] Task: Wire the cycle into rides (`ride-motion.ts` / `init-scene.ts`) — on
  each station stop: `cargo.onStationStop` decides load vs deliver; deliver →
  remove wagon crates, bump the station's count in the world, fire a
  pooled/instanced confetti burst at the station; loads/delivers during the
  existing pause (duration unchanged); trains with no stations never show
  crates
- [x] Task: Station crate slots — station model's 8 slots toggle visible from
  the persisted count (change-driven); count updates reflect live without
  reload (330376d)
- [x] Task: Confetti burst (`src/scene/`) — small pooled particle burst, capped
  lifetime, zero steady-state allocation, skipped under reduced motion; no
  new audio (existing ding carries it) (330376d)
  - Notes (all four Phase 3 wiring tasks, one commit): `src/core/confetti.ts`
    (TDD, 5 tests) — pooled burst physics with gravity, lifetime, palette
    index; `src/scene/confetti.ts` — pooled meshes over shared geometry + 4
    materials, scale-fade, reduced-motion gate; `load-wagons.ts` gains
    `loadCrate()`; `ride-motion.ts` gained `onStationCargo` alongside the
    ding callback; `init-scene.ts` attaches a `cargo_crate` clone to each
    wagon bed (lazy, survived late-GLB arrival via re-dressing) and
    `handleStationCargo` runs the per-rig cycle: load pops crates aboard
    (ease-out-back over 0.25 s, instant under reduced motion), deliver hides
    them, bumps `world.deliverCrate(stationId)` and bursts confetti at the
    station; `track-renderer.ts` `syncStationCrates` fills each station's
    `station_crate_1..8` slots from the persisted count on reconcile.
    Verified live (throwaway spec, removed after): load on stop 1, deliver
    on stop 2, deliveryCount ≥ 1, no console errors.
    Visual follow-up (user asked "is the crate visible on the wagon?": it
    was NOT — two bugs, fixed 9b0a597): (1) rigs are built before the wagon
    GLBs arrive, and the wagon-arrival re-dress cloned wagons without
    attaching crates — the crate-load dressing had already no-oped on the
    then-empty rigs, so no crate ever mounted; (2) the mount height was
    computed in world units but set as a child-local offset, under-sizing
    it by the wagon's 1.5 root scale so crates sank into the cargo. Fix:
    attach in the wagon re-dress path, divide the offset by the wagon
    scale. Screenshot bursts confirm crates riding on the logs and in the
    tender box.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Smoke, Docs & Final Gates [checkpoint: 9b0a597]

> **Verification Report** — Automated: full gate suite green after the
> crate fix — biome clean, tsc clean, 404 unit tests, 57 e2e tests across
> six specs (cargo.spec.ts: delivery + reload persistence, station-less
> regression, zero external requests, zero console errors). Docs: parent
> CHANGELOG bullet, product.md roadmap line, tech-stack.md asset map.
> Manual: the checkpoint's hands-on pass (loop + station, two stops,
> reload persistence). User confirmed: 2026-09-02.

- [x] Task: Playwright smoke (`e2e/cargo.spec.ts`) — place a loop with two
  stations, press play, assert crate load then delivery (wagon crate
  visibility, station slot gain), reload persistence of counts, no external
  requests/console errors
  - Notes: two tests x two viewports: (1) loop + station — ride, delivery
    count ≥ 1 after two stops, count identical after reload, crate.glb
    fetched, zero external requests/console errors; (2) station-less loop —
    rides unchanged, no scenery, no errors. (The spec asserts the count via
    the store rather than pixel-checking wagon visibility — the live visual
    verification is the checkpoint's manual step.)
- [x] Task: Docs — CHANGELOG parent-facing bullets under `[Unreleased]`;
  product.md roadmap line; tech-stack.md notes (station recipe in the
  asset-authoring section/folder map)
  - Notes: CHANGELOG gains a parent-facing cargo-delivery bullet;
    product.md roadmap strikes station cargo gameplay; tech-stack folder
    map lists station.glb/crate.glb and blender-station.py alongside the
    tunnel recipe.
- [x] Task: Full gate suite — `pnpm exec biome check .`,
  `pnpm exec tsc --noEmit`, `CI=true pnpm test -- --coverage`,
  `pnpm exec playwright test`
  - Notes: all green — biome clean, tsc clean, 404 unit tests
    (confetti pool 100% lines), 57 e2e tests across the six specs.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase: Review Fixes
- [x] Task: Apply review suggestions (1179d2f)
  - Notes: three findings from the formal review, all fixed. (Medium)
    `handleStationCargo` delivered before checking the station still
    existed — a station lifted mid-ride minted a permanent orphan ledger
    entry; now the existence check gates both the count and the confetti
    (covered by the delivery semantics; unit suite re-run green). (Low)
    Station drag-ghosts showed all 8 crate slots while a placed fresh
    station shows none — scenery templates now hide slots at load and
    reconcile fills the earned ones. (Low) `parseDeliveries` skips
    `__proto__`/`constructor` keys, with a regression case in the
    malformed-deliveries test. Files: `src/scene/init-scene.ts`,
    `src/scene/track-renderer.ts`, `src/core/save.ts`,
    `src/core/save.test.ts`. Gates after fixes: tsc + biome clean, 404
    tests green.
