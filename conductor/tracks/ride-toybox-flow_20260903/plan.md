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

- [x] Task: Chunky SVG icons + 5-tab layout (6763925)
  - [x] Acceptance: zero emoji in toybox/train slots; 48×48 SVGs in
    `PIECE_ICONS` style (`var(--toy-*)`, brown outline); aria unchanged;
    panels one row at 360px (Adventure swipes); targets ≥64px (72px kept).
  - [x] Implement in `src/ui/app.ts` (`SCENERY_ICONS`), `src/core/trains.ts`
    (fleet icons) + `src/style.css` (slot svg sizing, panel row).
  - Notes: 9 scenery + 3 loco SVGs (steam=chimney/dome/cowcatcher,
    diesel=stripe/cab-hump, tram=windows/pantograph); tab-strip emoji kept
    per spec FR2 (🌉 mandated; SVG in pure core drawer.ts would break the
    core/UI boundary). trains.test passes unchanged (string asserts).
    Layout: 6×72+5×16=512 > 336 avail — user chose scrollable row over
    two-rows/compact; panel = max-content + auto margins (small panels stay
    centered, overflow scrolls without left-clip), touch-action pan-x so
    toy drags still place. Spec FR2/AC2 updated to the chosen resolution.
    Files: app.ts (+~150/−12), trains.ts, style.css. Gates: tsc + biome
    clean, 508 unit pass.
- [x] Task: E2E + docs (d33f798)
  - [x] Playwright spec `e2e/ride-toybox-flow.spec.ts` (3 tests × tablet +
    phone): riding hides build tools; 5 tabs with Rails 3 / Adventure 6 /
    Nature-Town-Critter 3 + swipe-overflow only when narrow; first piece
    pulses, loop closure fires `ride-pop` (animationstart observer — the
    class is gone in 0.45s), all slots render `<svg>`; clean console.
  - [x] `CHANGELOG.md` Unreleased parent-worded note.
  - Notes: two test bugs fixed, both harness-side — re-tapping the open
    Rails tab closes it (tap only when hidden); hidden panels measure
    scrollWidth 0 (re-open Adventure before measuring). Files:
    e2e/ride-toybox-flow.spec.ts (new), CHANGELOG.md. Gates: 6/6 e2e
    green, biome clean.
- [x] Task: Phase 3 Verification & Checkpoint (d33f798)
  - Verification Report: auto — 508 unit pass (trains.test covers new
    icon strings); tsc + biome clean; smoke 40/40 + new spec 6/6 = 46/46
    green. Scope since Phase 2 checkpoint: app.ts, trains.ts, style.css,
    ride-toybox-flow.spec.ts (code) + changelog/spec/plan (docs).
    Manual — `pnpm dev` phone-width: 12 SVGs readable, Adventure swipes
    with peek, small panels centered one row; confirmed by user 2026-09-03.
  - [checkpoint: d33f798870243226a358789ef6dc2af352c9714d]
