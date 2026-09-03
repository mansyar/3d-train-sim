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
- [ ] Task: Phase Verification & Checkpoint (refer to workflow.md)

## Phase 2 — Ride-mode rail + celebration (UI glue, no unit tests)

- [ ] Task: Riding hides build tools
  - [ ] Acceptance: start ride → toybox triggers, trash, undo, delete-chip,
    grid-toggle hidden; train drawer locked; canvas lift/drag ignored;
    ⏹/whistle/film/mute/gate stay; stop → tools return, world exact.
  - [ ] Implement in `src/ui/app.ts` (ride-mode subscription) — no unit
    tests (glue); manual + smoke verification.
- [ ] Task: Ride-button pulse + loop pop
  - [ ] Acceptance: empty → non-empty adds pulse class; `closesLoop` fires
    one mute-respecting ding + pop class (removed on animationend);
    reduced-motion applies neither.
  - [ ] Implement in `src/ui/app.ts` + `src/style.css`
    (`is-ready-pulse`, `pop` keyframes, reduced-motion guards).
- [ ] Task: Phase Verification & Checkpoint (refer to workflow.md)

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
