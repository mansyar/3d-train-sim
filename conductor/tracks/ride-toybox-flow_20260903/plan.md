# Implementation Plan — Build-to-Ride Flow & Toybox Clarity

**Track:** `ride-toybox-flow_20260903` · **Spec:** [spec.md](spec.md)

Roadmap: pure logic first (TDD), then UI glue with manual verification, then
icons + e2e/docs. One phase at a time, sequential tasks.

## Phase 1 — Logic: drawer split + ride-ready detect (TDD)

- [x] Task: Drawer 4 → 5 tabs (0ffc42e)
  - [x] Red: extend `src/core/drawer.test.ts` — Rails holds
    straight/corner/crossing only; new `adventure` tab holds
    bridge/tunnel/slope-up/hill/slope-down/switch with icon 🌉 and aria
    `Adventure toys`; order rails, adventure, nature, town, critter.
  - [x] Green: update `src/core/drawer.ts` (`DRAWER_TABS`, `TAB_FOR_KIND`,
    `TAB_ICONS`, `TAB_ARIA`).
  - [x] Verify: `CI=true pnpm test -- --coverage` covers `drawer.ts` >80%.
  - Notes: Red wrote 10 drawer tests (5 failed as expected); Green split
    DRAWER_TABS 4→5, retargeted TAB_FOR_KIND adventure kinds, added 🌉 icon
    + aria, and routed drawerTabs() grouping via tabForKind so adventure
    pieces land on their own tab. Files: src/core/drawer.ts,
    src/core/drawer.test.ts. Why: Rails tab held 9 toys wrapping to 2 rows
    on phones; ≤6 per panel keeps one row at 360px. Tests 10/10 green,
    drawer.ts 100% stmts/lines, tsc + biome clean.
- [x] Task: Ride-ready detector (42847f8)
  - [x] Red: new `src/core/ride-ready.test.ts` — `isRideable([])` false,
    `isRideable([one])` true; `closesLoop(before, after)` true only when the
    new piece creates a graph cycle (straight line → false, closed oval →
    true), using `track-graph` connections.
  - [x] Green: new `src/core/ride-ready.ts` — minimal pure fns, no three.js,
    no per-frame work (runs on edit only).
  - [x] Verify: coverage >80% for `ride-ready.ts`.
  - Notes: Red failed on missing module as expected; Green added
    isRideable/hasCycle (union-find over connectionsFor)/closesLoop.
    Simplified find (no path compression — 64-piece cap, edit-time only)
    for 100% line coverage. Files: src/core/ride-ready.ts,
    src/core/ride-ready.test.ts. Why: pure edit-time detector keeps the
    render loop allocation-free while giving app.ts a one-call celebration
    signal. Tests 11/11 green, ride-ready.ts 95% stmts / 100% lines,
    tsc + biome clean.
- [x] Task: Phase 1 Verification & Checkpoint
  - Verification Report: auto — full suite 33 files / 508 tests pass;
    ride-ready.ts 95% stmts / 100% lines / 100% funcs; drawer.ts 100%;
    tsc --noEmit clean; biome clean. Manual — `pnpm dev` toybox shows 5
    tabs (Rails 3, Adventure 6, Nature/Town/Critter unchanged), confirmed
    by user 2026-09-03.
  - [checkpoint: f2b3fa5094bcd34462b97238a0a453d521a9a4a1]

## Phase 2 — Ride-mode rail + celebration (UI glue, no unit tests)

- [x] Task: Riding hides build tools (980b3c8)
  - [x] Acceptance: start ride → toybox triggers, trash, undo, delete-chip,
    grid-toggle hidden; train drawer locked; canvas lift/drag ignored;
    ⏹/whistle/film/mute/gate stay; stop → tools return, world exact.
  - [x] Implement in `src/ui/app.ts` (ride-mode subscription) — no unit
    tests (glue); manual + smoke verification.
  - Notes: moved `riding` state up top; guards at canvas pointerdown,
    beginDrag, setDrawer; ride-mode callback hides toys/trains triggers,
    trash, grid, chip, closes drawers, refreshUndo respects riding; window
    pointerup drops mid-ride gestures committing nothing (second-finger ▶
    edge). Zero CSS — rail buttons obey UA [hidden]. Also fixed two stale
    'four tabs' comments → five. Files: src/ui/app.ts (+33/−6). Why:
    hiding beats disabling — a dimmed button still invites a tap that reads
    as failure when the train stops. Gates: tsc + biome clean, 508 unit
    pass, smoke 39/40 (ambient-FPS flake 3.0 under load; passes solo with
    and without the change).
- [x] Task: Ride-button pulse + loop pop (ff61761)
  - [x] Acceptance: first piece → ▶ pulses; 4th corner closing a square →
    ding + pop; muted → silent; reduced-motion → still; riding stops
    further pulses.
  - [x] Implement in `src/ui/app.ts` + `src/style.css` (glue); logic
    already unit-tested (`closesLoop`). Manual + smoke verification.
  - Notes: world subscriber snapshots pieces() (fresh copies per
    state/world.ts:127 — no live-array aliasing); empty→non-empty adds
    .is-ready-pulse, closesLoop→ding+restartable .pop (animationend
    cleanup); refreshRide spends the invitation when riding/empty; JS
    prefers-reduced-motion guard + CSS animation:none belt-and-braces
    (separate rule — the shared stillness rule's display:none would hide
    ▶ itself). Files: app.ts (+46), style.css (+25). Gates: tsc + biome
    clean.
  - Fix 07b5130: scale-pulse made ▶ never "stable" so clicks timed out
    (smoke 13 failed) — pulse is now a box-shadow halo (box never moves).
    Full smoke 40/40 green.
- [x] Task: Phase 2 Verification & Checkpoint (07b5130)
  - Verification Report: auto — 508 unit pass; tsc + biome clean; full
    smoke 40/40 green (after glow-pulse fix). Scope since Phase 1
    checkpoint: src/ui/app.ts, src/style.css only (UI glue, no logic).
    Manual — `pnpm dev` glow-on-first-piece, ding+pop on loop close,
    tools hide/return around rides, muted loop-close silent; confirmed by
    user 2026-09-03.
  - [checkpoint: 07b5130bc141dd2997bf00ec03674fc196f5d222]

## Phase 3 — SVG icons + layout + e2e/docs

- [ ] Task: Chunky SVG icons + 5-tab layout
  - [ ] Acceptance: zero emoji in toybox/train drawer; 48×48 SVGs in
    `PIECE_ICONS` style (`var(--toy-*)`, brown outline); aria unchanged;
    panels fit one row at 360px; targets ≥64px.
  - [ ] Implement in `src/ui/app.ts` (`SCENERY_ICONS`, train icons) +
    `src/style.css` (tab/panel sizing).
- [ ] Task: E2E + docs
  - [ ] Playwright spec: riding hides build tools; 5 tabs visible with
    correct counts; loop closure pops without console errors (touch tablet
    viewport).
  - [ ] `CHANGELOG.md` Unreleased note (parent-worded, one line).
- [ ] Task: Phase Verification & Checkpoint (refer to workflow.md)
