# Implementation Plan — Oops-Proof Building

Track: `oops-proof-building_20260903` · Spec: `./spec.md`

Workflow: `conductor/workflow.md` (TDD for logic-bearing `src/state/` code;
acceptance + smoke + manual tablet check for UI glue). Every task below is
sequential within its phase.

## Phase 1: Undo core (logic — `src/state/world.ts`, `src/state/world.test.ts`)

- [ ] Task: Red — single-step undo model tests
- [ ] Place piece/scenery success arms undo; failed place (occupied / water / out-of-bounds / capacity) arms nothing
- [ ] Remove captures snapshot + index; unknown id arms nothing
- [ ] Relocate/rotate captures from cell + rotation; not-found arms nothing
- [ ] Undo restores exact toy (same id / type / kind / cell / rotation / index), notifies once, returns true; empty undo returns false with no notify
- [ ] Second mutation overwrites first (single-step); successful undo clears; hydrate + reset clear pending undo; selectTrain / deliverCrate neither arm nor clear
- [ ] Task: Green — implement `canUndo()` / `undo()` in `createWorldStore` (in-memory inverse closure, defensive copies, no save-schema change)
- [ ] Inverse closures: place → remove id; remove → splice snapshot back at index; relocate → relocate back to from cell + rotation (covers same-cell rotate)
- [ ] Coverage >80% on new logic (`CI=true pnpm test -- --coverage`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Rail UI + feedback (glue — `src/ui/app.ts`, `src/ui/style.css`, audio registry)

- [ ] Task: Undo button affordance (acceptance, no unit tests)
- [ ] ↩️ SVG slot in the rail, ≥64px, icon-only; hidden when `!canUndo`, pops in <100ms after a mutation; hides after undo / reload / reset
- [ ] Tap restores via `store.undo()` + pop-bounce + happy ding (existing placement ding, mute-respecting); subscribes to world for show/hide
- [ ] Hidden/dimmed state never blocks ▶ / ⏹ / 🎺; 48px tolerance kept
- [ ] Task: Invalid-drop tuning (acceptance)
- [ ] Keep ghost tint + trash pulse; exaggerate wobble-home + distinct soft thunk vs. ding; bad drop creates no undo
- [ ] Instant trash + ✕-chip unchanged (no confirm gates, no long-press)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Integration, smoke + docs

- [ ] Task: Ride / persist / gate interplay (acceptance + smoke)
- [ ] Undo notifies → existing soft-stop of touched rides + autosave fires (no `ride.ts` change expected)
- [ ] Parent-gate reset clears undo; reload hydrates exact world with no ↩️
- [ ] Playwright smoke via `window.__tinyTracksWorld`: place → undo → assert gone; trash → undo → assert back; bad drop → no undo; clean console
- [ ] Tablet manual: 360px phone + iPad widths, touch-only, reduced-motion respected
- [ ] Task: Docs + gates (biome + tsc + vitest + e2e)
- [ ] CHANGELOG `Unreleased` note (parent-facing); no tech-stack change (no new deps)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
