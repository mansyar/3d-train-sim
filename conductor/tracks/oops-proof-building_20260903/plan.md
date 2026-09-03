# Implementation Plan — Oops-Proof Building

Track: `oops-proof-building_20260903` · Spec: `./spec.md`

Workflow: `conductor/workflow.md` (TDD for logic-bearing `src/state/` code;
acceptance + smoke + manual tablet check for UI glue). Every task below is
sequential within its phase.

## Phase 1: Undo core (logic — `src/state/world.ts`, `src/state/world.test.ts`)

- [x] Task: Red — single-step undo model tests
- [x] Place piece/scenery success arms undo; failed place (occupied / water / out-of-bounds / capacity) arms nothing
- [x] Remove captures snapshot + index; unknown id arms nothing
- [x] Relocate/rotate captures from cell + rotation; not-found arms nothing
- [x] Undo restores exact toy (same id / type / kind / cell / rotation / index), notifies once, returns true; empty undo returns false with no notify
- [x] Second mutation overwrites first (single-step); successful undo clears; hydrate + reset clear pending undo; selectTrain / deliverCrate neither arm nor clear
- [x] Task: Green — implement `canUndo()` / `undo()` in `createWorldStore` (in-memory inverse closure, defensive copies, no save-schema change)
- [x] Inverse closures: place → remove id; remove → splice snapshot back at index; relocate → relocate back to from cell + rotation (covers same-cell rotate)
- [x] Coverage >80% on new logic (`CI=true pnpm test -- --coverage`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Phase 1 Notes

- Red: 16 new tests failed as expected (`store.canUndo is not a function`), 46 existing passed.
- Green: `canUndo()` / `undo()` via in-memory inverse closures; inverses never touch the delivery ledger (undo of a placement preserves crates earned after it; undo of a removal restores its crate count).
- Test fix during Green: split the failed-placement test in three (an armed undo from the setup place polluted the assertions) — no spec change.
- Gates: full suite 492/492, `world.ts` coverage 93% stmts / 99% lines, `tsc --noEmit` clean, `biome check` clean. No tech-stack deviation.
- Code SHA: `02ac50f`.

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
