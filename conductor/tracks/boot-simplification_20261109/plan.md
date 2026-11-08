# Boot Simplification — Implementation Plan

> **Branch:** `refactor/boot-simplification_20261109`
> **Base:** `main` @ `9ac5fd1ded3a7d333409fa118bcb68d82510eef0`
>
> **Phase status:** `pending` | `in_progress` | `verified` | `failed` | `blocked`
>
> Only the primary agent writes this file. Phase subagents never edit it.

## Phase 1: The split

- **Goal:** `mountShell` renders the frame, `initScene` binds the scene, and `mountControls` wires the UI against it. The three listener arrays, the replay loop, the pre-bind unsubscribes and the `?? DEFAULT_DAY_PHASE` fallbacks are deleted.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-8, FR-9, FR-12, NFR-1, NFR-2, NFR-6, AC-1, AC-3
- **Touches:** `src/ui/app.ts`, `src/main.ts`
- **Verification:** `pnpm check` and `pnpm exec playwright test e2e/smoke.spec.ts`
- **Status:** verified

- [x] **P1.T1: Split the mount in `src/ui/app.ts`** — covers: FR-1, FR-2, FR-3
  - [x] P1.T1.1: Extract `mountShell(root)`, moving the frame `innerHTML` body out of `mountApp` unchanged (same elements, classes, attributes, order) and returning the canvas.
  - [x] P1.T1.2: Turn the rest of `mountApp` into `mountControls(root, options)`: drop the markup write, take the bound `SceneHandle`, and bind each capability from it so no `scene?.` guard or fallback remains for a capability the scene always provides.
  - [x] P1.T1.3: Shrink the options type to `world`, `audio`, `scene`, `isReady?`, `recoveryNote?` and confirm the file no longer declares or re-exports the capability shape it used to need.
- [x] **P1.T2: Rewire `src/main.ts`** — covers: FR-4, FR-5, FR-6
  - [x] P1.T2.1: Call `mountShell` → `initScene` → `mountControls`, and delete the three listener arrays, the replay loop and the three pre-bind unsubscribe branches.
  - [x] P1.T2.2: Make `dayClock` delegate to the bound scene (`phase`, `setPhase`, `subscribe`) with no `?? DEFAULT_DAY_PHASE`; keep the adapter object because persistence takes structural types.
- [x] **P1.T3: Remove what the change orphaned** — covers: FR-9, FR-12
  - [x] P1.T3.1: Delete imports and types that no longer have a user (`DEFAULT_DAY_PHASE` if it falls out of `main.ts`), without touching the storage gate, the PWA block or the dev handles.
  - [x] P1.T3.2: Confirm `SceneHandle` was not edited, and record the `git diff` of `src/scene/init-scene.ts` as empty.

**Result:** verified
**Checkpoint:** `64095cf`
**Evidence:** `conductor/tracks/boot-simplification_20261109/verification/phase-1.md`

**Deviations:** the options type carries a structural `SceneControls` view instead of `SceneHandle`, because `src/core/import-graph.test.ts` forbids every `src/ui → src/scene` edge (it parses `import type` too) and `src/core` was outside this phase's Touches. The compiler still checks all eighteen members at the `mountControls` call site in `main.ts`. `mountControls` re-queries the canvas because `createToyDrag` binds its pointer listeners to it; one source of truth, no second hand-off.

## Phase 2: The guard

- **Goal:** a source-level test fails if the boot order regresses or a listener queue returns, and the three first-event specs prove no listener was lost with the queues gone.
- **Depends on:** Phase 1
- **Covers:** FR-7, FR-10, NFR-5, AC-1, AC-2, AC-4, AC-5
- **Touches:** `src/ui/boot-order.test.ts`
- **Verification:** `pnpm check` and `pnpm exec playwright test e2e/smoke.spec.ts e2e/sun-moon.spec.ts e2e/fleet.spec.ts e2e/ride-toybox-flow.spec.ts`
- **Status:** verified

- [x] **P2.T1: Guard the boot order** — covers: FR-10, NFR-5
  - [x] P2.T1.1: Assert `src/main.ts` calls `mountShell`, `initScene` and `mountControls` in that order, and contains no listener array declaration and no replay loop over queued listeners.
  - [x] P2.T1.2: Prove the guard is not vacuous — it must find all three call sites and at least one `mountControls` argument naming the scene.
  - [x] P2.T1.3: Prove it bites: swap two calls, run the guard, record the failure, restore, and record the pass.
- [x] **P2.T2: Prove the first events still land** — covers: FR-7, AC-4
  - [x] P2.T2.1: Run smoke, sun-moon, fleet and ride-toybox-flow and record the counts; if a first-event assertion fails, fix the wiring rather than the spec.
  - [x] P2.T2.2: Run the full matrix once and record it; it must match the base at 57 passed, 1 skipped.

**Result:** verified
**Checkpoint:** `a8dc1bb`
**Evidence:** `conductor/tracks/boot-simplification_20261109/verification/phase-2.md`

**Deviations:** the guard lives in `src/ui/boot-order.test.ts` rather than `src/core/`, because `src/core/import-graph.test.ts` forbids every `core → ui` edge (including `import type`) and that purity rule was not worth weakening for a test's address. Two demonstration edits (`mountShell`/`initScene` swapped, a fake `rideModeListeners`) were made and reverted during the phase; `git diff --stat -- src/main.ts` was empty both times and the committed range contains only the guard and its evidence. The subagent's `pnpm exec vitest run` and `git checkout --` were permission-denied, so it used the configured `pnpm test <path>` (same `vitest run`) and reversed the edits by hand — no file was edited to work around a denial.

## Phase 3: Docs and measurement

- **Goal:** the boot order is recorded where the next agent will look, and the cost of the change is measured rather than asserted.
- **Depends on:** Phase 2
- **Covers:** FR-11, AC-6, AC-7, AC-8
- **Touches:** `conductor/tech-stack.md`, `conductor/product.md`
- **Verification:** `pnpm check` and `pnpm build`
- **Status:** verified

- [x] **P3.T1: Document the boot order** — covers: FR-11
  - [x] P3.T1.1: Record in `conductor/tech-stack.md` that the shell mounts, the scene binds, then controls wire against a bound `SceneHandle`, with the reason (no pre-bind gap, no listener queue).
  - [x] P3.T1.2: Note that `src/main.ts` no longer carries fallbacks, so a missing scene is a construction error.
- [x] **P3.T2: Mark the roadmap and measure** — covers: AC-6, AC-7, AC-8
  - [x] P3.T2.1: Mark the `boot-simplification_20261109` roadmap row shipped with the measured numbers.
  - [x] P3.T2.2: Record `pnpm check` counts and coverage, the `pnpm build` precache entries, and the gzipped JS delta against the base build.

**Result:** verified
**Checkpoint:** `f23da57`
**Evidence:** `conductor/tracks/boot-simplification_20261109/verification/phase-3.md`

**Deviations:** performed by the primary agent because the phase writes Conductor-owned docs. The gzip baseline needed a build at the base commit, so a disposable worktree (`tt-boot-base`, removed and pruned) was used rather than rebuilding `main` in place. The bundle came out 227 B smaller, not larger.

## Phase R1: Review Fixes

- **Goal:** Close the seven round-1 findings. Three are guard holes that let a regression
  through green — the `scene` argument was matched by a 400-character window that the dev-handle
  comment satisfied, the queue scan only knew the `*Listeners` name, and the order check read
  raw text while its comment claimed the opposite. The rest are an orphaned type re-export and
  three evidence inaccuracies.
- **Depends on:** Phase 3
- **Covers:** F1, F2, F3, F4, F5, F6, F7
- **Touches:** `src/ui/boot-order.test.ts`, `src/ui/app.ts`, `conductor/tracks/boot-simplification_20261109/spec.md`, `conductor/tracks/boot-simplification_20261109/verification/integrated.md`, `conductor/tracks/boot-simplification_20261109/verification/phase-1.md`
- **Verification:** `pnpm check` and `pnpm exec playwright test e2e/smoke.spec.ts e2e/sun-moon.spec.ts e2e/ride-toybox-flow.spec.ts`
- **Status:** verified

- [x] **R1.T1: Match the `mountControls` argument list, not a window** — covers: F1
  - [x] R1.T1.1: Assert `/mountControls\(\s*root\s*,\s*\{[^}]*\bscene\s*,/` on the comment-stripped source, and prove it fails when `scene,` is deleted.
- [x] **R1.T2: Widen the queue scan past one naming convention** — covers: F2
  - [x] R1.T2.1: Look for `const`/`let` bindings with a listener/queue/pending/buffer/subscriber name initialised to `[`/`new Set`/`new Map`/`new Array`, and for `for…of` or `.forEach(` replays over such a name; prove a bare `const queue: unknown[] = []` fails.
- [x] **R1.T3: Read the order from the comment-stripped source** — covers: F3
  - [x] R1.T3.1: Use the stripped copy for order and anti-vacuity, and correct the JSDoc that claimed a commented-out mount could not satisfy it; prove a commented-out `mountShell` fails.
- [x] **R1.T4: Drop the orphaned `CellFromPoint` re-export** — covers: F4
  - [x] R1.T4.1: Remove the re-export and its type-only import from `src/ui/app.ts`; the type still lives in `src/ui/toy-drag.ts` for anyone who needs it.
- [x] **R1.T5: Correct the dev-handle edge case** — covers: F5
  - [x] R1.T5.1: Say that the `import.meta.env.DEV` block runs after `mountControls`, and why nothing depends on the handles existing earlier.
- [x] **R1.T6: Name the real AC-4 witnesses** — covers: F6
  - [x] R1.T6.1: Attribute the camera-cycle witness to `e2e/smoke.spec.ts` (two-loops journey) and drop `e2e/fleet.spec.ts` from AC-4.
- [x] **R1.T7: Label the matrix runs** — covers: F7
  - [x] R1.T7.1: Date and head the integrated matrix pass, and state that the Phase 2 run in `phase-2.md` is a different run at an earlier head.

**Result:** verified
**Checkpoint:** `5e6d034`
**Evidence:** `conductor/tracks/boot-simplification_20261109/verification/phase-R1.md`

**Deviations:** performed by the primary agent (every finding touches Conductor state). `src/ui/app.ts` changed only to delete the orphaned type re-export, which the reviewer asked for; it is dead at the base commit too, so this is a recorded cleanup rather than a behaviour change.
