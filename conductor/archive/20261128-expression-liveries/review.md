# Review: B. Expression — paint/sticker liveries

- **Track:** `20261128-expression-liveries`
- **Type:** `feature`
- **Branch:** `feat/20261128-expression-liveries`
- **Range:** `dc2ba44a6f3f62b31341e0227be2534d572067e6..17a88cd`
- **Date:** `2026-11-28`
- **Verdict:** `PASS`

## Summary

Five phases of livery work are well-built and fully green (93/93 tablet e2e,
1096 unit tests, coverage above gate), but the track misses one explicit spec
edge case: the parent-gated full reset never clears liveries. The store's
`reset()` does not notify, and no reset wiring calls it, so painted bodies,
stuck stickers, and stored liveries all survive a world reset. One High
finding blocks; no Medium or Low findings.

Re-review of the fix delta (`5382d89..e28adda`): **PASS** — `reset()` notifies
each affected id with stock via the existing notify path (silent on empty),
`main.ts` wires `world.onReset` after the world save so the cleared snapshot
persists last; unit plus e2e proof green, no new issues.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `pnpm check` (biome + tsc + vitest) | pass | 63 files / 1096 tests, biome 227 files clean, tsc clean |
| coverage | `pnpm test:coverage` | pass | statements 97.13%, branches 91.73%, functions 97.25%, lines 98.91% (gate ≥80%) |
| lint | `pnpm exec biome check .` (inside `pnpm check`) | pass | no findings |
| format check | `pnpm exec biome check .` (no `--write`) | pass | no findings |
| typecheck | `pnpm exec tsc --noEmit` (inside `pnpm check`) | pass | clean |
| build | `pnpm build` | pass | 178 precache entries, no livery/sticker/paint/decal additions |
| e2e | `playwright test --project=tablet --grep-invert=@ci` | pass | 93 passed / 0 failed (9.8 min) |
| manual-device | skipped (human-only standing rule) | n/a | offline prod test is the automated stand-in |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P2.T1–T3 | `e2e/liveries-drawer.spec.ts` (4 tests) | covered |
| FR-2 | P3.T1–T2 | `e2e/liveries-paint.spec.ts` | covered |
| FR-3 | P4.T1–T2 | `e2e/liveries-stickers.spec.ts` | covered |
| FR-4 | P4.T3 (+P2 drawer restore) | stickers + drawer specs | covered |
| FR-5 | P1.T2 + P5.T2 | `save.test.ts`, evidence reload test | partial — reset edge missing (F1) |
| FR-6 | P3.T3 | paint spec incl. muted variant | covered |
| NFR-1 | P2 | drawer spec (64px icon-only targets) | covered |
| NFR-2 | P3/P5 | build entry count + offline prod test | covered |
| NFR-3 | P3/P4 | paint + stickers reduced-motion tests | covered |
| NFR-4 | P2 | drawer spec (icon-only, no keyboard trap) | covered |
| NFR-5 | P5 | evidence offline prod test | covered |
| NFR-6 | P3/P4 | subscription-driven updates, no per-frame allocs | covered |
| AC-1 | P5.T1 | evidence spec, zero console errors | covered |
| AC-2 | P5.T2 | byte-identical IndexedDB reload | covered |
| AC-3 | P4 | sticker cap/eviction test | covered |
| AC-4 | P5.T3 | committed `evidence/` bundle (6 PNGs + GIF) | covered |
| AC-5 | P3 | muted repaint, zero audible plays | covered |
| AC-6 | P4 | reduced-motion stickers test | covered |
| AC-7 | P5 | offline prod flow | covered |

## Findings

### Critical

- none

### High

- **F1 — Full reset does not clear liveries (store `reset()` is silent and unwired)**
  - **File:** `src/main.ts` (reset wiring area, cf. line 309); `src/state/liveries.ts:184-186`
  - **What:** No `world.onReset` wiring calls `liveryStore.reset()`, and
    `LiveryStore.reset()` clears `entries` without notifying subscribers — so
    even if wired, the scene painter and `watchLiveryPersistence` would never
    learn of the clear. After `world.reset()`, the world-subscription save
    re-persists the stale liveries via `readLiveries`, and repainted materials
    plus stickers stay on screen and in storage.
  - **Why:** Spec edge case (spec.md line 94) requires the parent-gated full
    reset to clear all liveries with the world. A child resetting the toy
    expects stock engines back but keeps old paints/stickers across the reset
    and across later reloads. Correctness bug in behavior this diff introduces.
  - **Fix:** Make `LiveryStore.reset()` notify subscribers of the clear
    (snapshot affected ids before clearing and notify each with the stock
    livery, or add a dedicated reset notification the scene and persistence
    subscribe to), and in `src/main.ts` next to the installHint reset wiring
    add `world.onReset(() => liveryStore.reset())` so the clear lands after
    world state is fresh and the livery watcher persists the cleared snapshot
    exactly once.
  - **Requirement:** FR-5 (spec edge: full reset clears all liveries)
  - **Test gap:** Unit test that `liveryStore.reset()` notifies subscribers /
    clears the snapshot, plus an integration test that `world.reset()` returns
    painted vehicles to stock in the scene and persists no liveries.

### Medium

- none

### Low

- none

## Overrides

- none

## Plan compliance

Every phase has a Result/Evidence and the primary independently re-verified
each before acceptance. All 14 top-level tasks are implemented; the two
deferred halves called out mid-run are closed (AC-2 browser half by the Phase 5
evidence reload test; wagon-side application by the Phase 3 whole-consist
repaint). The final diff stays within the union of the phases' Touches plus
recorded deviations (one-line `app.ts` store re-export via the composition
root, DEV-gated test witness with disposal cleanup, widened Phase 5 Touches
for the missing persistence wiring, regenerated evidence bundle).

## Out of scope

- Reviewer open question (not a finding): restore-default clears the whole
  consist when invoked for a loco id. Decision: consist-as-one-vehicle is the
  intended semantic (paint already covers the whole consist); the fix phase
  makes store and scene consistent on that semantic with a test.

## Debt

- none (strict mode: no deferrals; the single High finding goes to the fix phase)

## Doc sync

`none` — code-only fix (notifying `reset()` + one wiring line + tests); the
reset-clears-liveries behavior was already specified in `spec.md`, and no
product, workflow, or tech-stack text changed.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLOCK | 0 | 1 | 0 | 0 | 0 |
| 1-fix1 | PASS | 0 | 0 | 0 | 0 | 1 |
