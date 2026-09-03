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

- [x] Task: Undo button affordance (acceptance, no unit tests)
- [x] ↩️ SVG slot in the rail, ≥64px, icon-only; hidden when `!canUndo`, pops in <100ms after a mutation; hides after undo / reload / reset
- [x] Tap restores via `store.undo()` + pop-bounce + happy ding (existing placement ding, mute-respecting); subscribes to world for show/hide
- [x] Hidden/dimmed state never blocks ▶ / ⏹ / 🎺; 48px tolerance kept
- [x] Task: Invalid-drop tuning (acceptance)
- [x] Keep ghost tint + trash pulse; exaggerate wobble-home + distinct soft thunk vs. ding; bad drop creates no undo
- [x] Instant trash + ✕-chip unchanged (no confirm gates, no long-press)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Phase 2 Notes

- Deviation (noted, not a spec change): ↩️ is an emoji glyph like its rail siblings (🎥/🗑️/🔊), not an inline SVG — an SVG would break the rail's visual consistency. Icon-only, 72px, no reading involved.
- `thunk()` is TDD'd logic (Red: 2 fail / 28 pass; Green: 30/30): the rotation `click` voice at 0.55 rate, baseline restored on end — no new audio downloads (whistle-echo precedent), mute-respecting, capped at the click voice level.
- Undo tap diffs before/after toy maps (defensive copies from the store make this safe): restored toy pings at its return cell, taken-back placement pings where it vanished, same-cell rotate is ding-only. Bad drops never touch the store, so no undo is armed.
- Wobble-home grew 48px → 72px with a wider swing; reduced-motion still hides ping/wobble entirely. Ghost tint + trash pulse + silent trash + ✕-chip untouched.
- Gates: full suite 494/494, `tsc --noEmit` clean, `biome check` clean. No tech-stack deviation.
- Code SHA: `d4643dd`.

## Phase 3: Integration, smoke + docs

- [x] Task: Ride / persist / gate interplay (acceptance + smoke)
- [x] Undo notifies → existing soft-stop of touched rides + autosave fires (no `ride.ts` change expected)
- [x] Parent-gate reset clears undo; reload hydrates exact world with no ↩️
- [x] Playwright smoke via `window.__tinyTracksWorld`: place → undo → assert gone; trash → undo → assert back; bad drop → no undo; clean console
- [x] Tablet manual: 360px phone + iPad widths, touch-only, reduced-motion respected
- [x] Task: Docs + gates (biome + tsc + vitest + e2e)
- [x] CHANGELOG `Unreleased` note (parent-facing); no tech-stack change (no new deps)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Phase 3 Notes

- Ride interplay needs no `ride.ts` change: `undo()` funnels through the same `notify()` as every other mutation, and soft-stop-on-edit is already unit-covered (`ride.test.ts`: remove → soft-stop). Reset/hydrate clearing is unit-covered (Phase 1).
- New `e2e/undo.spec.ts` (tablet + phone projects, 4/4 green): place → ↩️ visible → tap → gone + hidden; refused double-placement arms nothing new; trash → undo → back; reload → world kept with no ↩️; clean console throughout.
- Tablet manual steps for the user (touch-only, 360px + iPad): place a track (↩️ pops in <100ms) → tap ↩️ (pop + ding, button hides) → drag a toy to nowhere (big wobble + soft knock, no ↩️) → trash a toy → ↩️ → back; mute → all silent; reduced-motion → still feedback, no animation.
- Gates: full unit suite 494/494, `tsc --noEmit` clean, `biome check` clean (one format autofix on the new spec), undo e2e 4/4. No tech-stack deviation (no new deps, no new audio files).
- Code SHAs: `d4643dd` (UI + audio), `cd819b2` (e2e + CHANGELOG).
