# Toybox Clarity and Outside-Drag Removal — Implementation Plan

> **Branch:** `feat/toybox-clarity_20261119`
> **Base:** `main` @ `6d762f35363010f0abd6f360850fa060d414b6ad`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Paged drawer model and geometry-derived piece icons

- **Goal:** Prove the toy grouping and piece-icon generation work as pure, deterministic data before any UI or drag behaviour changes.
- **Depends on:** none
- **Covers:** FR-1, FR-8, NFR-1, NFR-6, AC-1, AC-10
- **Touches:** `src/core/drawer.ts`, `src/core/drawer.test.ts`, `scripts/generate-piece-icons.mjs`, `src/ui/generated-piece-icons.ts`, `src/ui/toy-icons.ts`, `conductor/tracks/toybox-clarity_20261119/verification/phase-1.md`
- **Verification:** `node scripts/generate-piece-icons.mjs --check && pnpm check && pnpm test:coverage`
- **Status:** verified

- [x] **P1.T1: Add a pure paged drawer model** — covers: FR-1
  - [x] **P1.T1.1: Add page size and page-slicing helpers for dense tabs while leaving Nature and Critters single-page**
  - [x] **P1.T1.2: Keep disclosure filtering and MAX_PIECES cap inputs unchanged**
  - [x] **P1.T1.3: Unit-test full pages, partial final pages, and single-page tabs**
- [x] **P1.T2: Generate piece icons from shipped geometry** — covers: FR-8
  - [x] **P1.T2.1: Add a dev-only generator that reads the shipped GLB piece models and emits committed `src/ui/generated-piece-icons.ts` SVGs**
  - [x] **P1.T2.2: Re-export generated `PIECE_ICONS` from `src/ui/toy-icons.ts` without changing `SCENERY_ICONS`**
  - [x] **P1.T2.3: Add a deterministic `--check` mode and a unit assertion that every `PieceType` has a generated SVG**

**Result:** verified — deterministic GLB-derived icons and the pure paging model pass the exact phase verification command.
**Checkpoint:** `6fbbe35`
**Evidence:** conductor/tracks/toybox-clarity_20261119/verification/phase-1.md

## Phase 2: Paged drawer UI and outside-drag removal

- **Goal:** Prove on tablet and phone that dense tabs page by dots/swipe, placed toys can be removed by dragging beyond the board, and the trash bin is gone with undo intact.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, NFR-2, NFR-3, NFR-4, NFR-5, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9
- **Touches:** `src/ui/toy-drawer.ts`, `src/ui/toy-drag.ts`, `src/ui/app.ts`, `src/style.css`, `src/scene/track-ghost.ts`, `playwright.config.ts`, `e2e/toybox-clarity.spec.ts`, `e2e/smoke.spec.ts`, `e2e/undo.spec.ts`, `e2e/ride-toybox-flow.spec.ts`, `e2e/prod.spec.ts`, `conductor/tracks/toybox-clarity_20261119/verification/phase-2.md`
- **Verification:** `pnpm check && pnpm build && pnpm exec playwright test e2e/toybox-clarity.spec.ts e2e/smoke.spec.ts e2e/undo.spec.ts e2e/ride-toybox-flow.spec.ts e2e/a11y.spec.ts`
- **Status:** verified

- [x] **P2.T1: Render and wire paged drawer pages** — covers: FR-2
  - [x] **P2.T1.1: Render page dots with accessible names and only the current page's slots**
  - [x] **P2.T1.2: Wire dot taps and swipe gestures on empty drawer space, keeping piece-slot pointerdown as a placement drag**
  - [x] **P2.T1.3: Clamp current page when disclosure unlock changes the visible item set**
  - [x] **P2.T1.4: Keep selected page per tab for the session and reset it after reload**
- [x] **P2.T2: Replace trash with outside-board removal** — covers: FR-4
  - [x] **P2.T2.1: Add a visible removable preview when a lifted placed piece or scenery item is beyond the board edge**
  - [x] **P2.T2.2: Remove on release outside, cancel on re-entry, and cancel (never remove) for new toys dragged from the drawer**
  - [x] **P2.T2.3: Add the soft removal animation and one-tap undo restoration**
  - [x] **P2.T2.4: Remove `.trash-slot` markup, styles, wiring, and active e2e selectors without disabling tests**
- [x] **P2.T3: Verify tablet and phone behaviour** — covers: FR-7
  - [x] **P2.T3.1: Add `@smoke`-tagged e2e coverage for paging, drag isolation, outside removal, cancel paths, new-toy safety, undo, and absent trash bin**
  - [x] **P2.T3.2: Include the new spec in the phone allowlist and update existing smoke/undo/ride-toybox-flow specs while leaving a11y spec unmodified**
  - [x] **P2.T3.3: Record the full verification matrix and scope check in phase evidence**

- **Result:** verified — paged drawer and outside-board removal pass on tablet and phone; trash bin is gone with one-tap undo intact.
- **Checkpoint:** `475bbe0b1390c1020e9f2d3ec2ed9a44c9d3b938`
- **Evidence:** `conductor/tracks/toybox-clarity_20261119/verification/phase-2.md`

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

## Phase R1: Review Fixes

- **Goal:** Resolve F1 (AC-2 tab-switch page memory is not asserted) and F2 (several distinct pieces share identical generated icons) without weakening gates or changing scope.
- **Depends on:** Phase 2
- **Covers:** FR-2, FR-3, FR-8, NFR-6, AC-2, AC-10
- **Touches:** `e2e/toybox-clarity.spec.ts`, `scripts/generate-piece-icons.mjs`, `src/ui/generated-piece-icons.ts`, `src/core/drawer.test.ts`, `verification/phase-R1.md`
- **Verification:** `node scripts/generate-piece-icons.mjs --check && pnpm check && pnpm build && pnpm exec playwright test e2e/toybox-clarity.spec.ts e2e/smoke.spec.ts e2e/a11y.spec.ts`
- **Status:** verified

- [x] **R1.T1: Assert tab-switch page memory** — covers: FR-2, FR-3, AC-2
  - [x] **R1.T1.1: Extend the paging test to switch to Nature and back to Rails, asserting the remembered dot's aria-current and viewport slots**
- [x] **R1.T2: Differentiate colliding generated icons** — covers: FR-8, NFR-6, AC-10
  - [x] **R1.T2.1: Apply deterministic per-piece framing/line-weight tweaks to colliding hulls, regenerate the icon module, and assert no two PieceTypes sharing a drawer page have identical icon strings**

- **Result:** verified — F1 and F2 resolved; tab-switch page memory is asserted and generated icons are distinct within every drawer tab.
- **Checkpoint:** `d110f58f7bac3127b1be5d3771e0ebba662830e1`
- **Evidence:** `conductor/tracks/toybox-clarity_20261119/verification/phase-R1.md`

## Phase R2: Hand-Drawn Icon Clarity

- **Goal:** Replace geometry-derived silhouettes with intuitive hand-authored SVG icons that clearly read as their track pieces, while keeping paging, outside-drag removal, undo, and all configured gates intact.
- **Depends on:** Phase R1
- **Covers:** FR-8, NFR-6, FR-7, AC-8, AC-10
- **Touches:** `src/ui/toy-icons.ts`, `src/ui/generated-piece-icons.ts`, `scripts/generate-piece-icons.mjs`, `src/core/drawer.test.ts`, `e2e/toybox-clarity.spec.ts`, `verification/phase-R2.md`
- **Verification:** `pnpm check && pnpm build && pnpm exec playwright test e2e/toybox-clarity.spec.ts e2e/smoke.spec.ts e2e/a11y.spec.ts`
- **Status:** in_progress

- [ ] **R2.T1: Restore intuitive hand-authored piece icons** — covers: FR-8, AC-10
  - [ ] **R2.T1.1: Restore the curated `PIECE_ICONS` from the pre-track baseline and remove the generated-icon re-export so every piece has a recognizable rail/feature drawing**
- [ ] **R2.T2: Remove the generator pipeline and adapt tests** — covers: NFR-6, AC-10
  - [ ] **R2.T2.1: Delete `scripts/generate-piece-icons.mjs` and `src/ui/generated-piece-icons.ts`, then adapt the icon-uniqueness assertions to read the hand-authored source with no generator or `--check` references**
- [ ] **R2.T3: Verify the revised icon contract** — covers: FR-7, AC-8
  - [ ] **R2.T3.1: Run the exact phase verification, confirm no runtime WebGL/generated module remains, and record evidence with the new icon behavior**
