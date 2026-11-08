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
- **Status:** in_progress

- [ ] **P1.T1: Split the mount in `src/ui/app.ts`** — covers: FR-1, FR-2, FR-3
  - [ ] P1.T1.1: Extract `mountShell(root)`, moving the frame `innerHTML` body out of `mountApp` unchanged (same elements, classes, attributes, order) and returning the canvas.
  - [ ] P1.T1.2: Turn the rest of `mountApp` into `mountControls(root, options)`: drop the markup write, take the bound `SceneHandle`, and bind each capability from it so no `scene?.` guard or fallback remains for a capability the scene always provides.
  - [ ] P1.T1.3: Shrink the options type to `world`, `audio`, `scene`, `isReady?`, `recoveryNote?` and confirm the file no longer declares or re-exports the capability shape it used to need.
- [ ] **P1.T2: Rewire `src/main.ts`** — covers: FR-4, FR-5, FR-6
  - [ ] P1.T2.1: Call `mountShell` → `initScene` → `mountControls`, and delete the three listener arrays, the replay loop and the three pre-bind unsubscribe branches.
  - [ ] P1.T2.2: Make `dayClock` delegate to the bound scene (`phase`, `setPhase`, `subscribe`) with no `?? DEFAULT_DAY_PHASE`; keep the adapter object because persistence takes structural types.
- [ ] **P1.T3: Remove what the change orphaned** — covers: FR-9, FR-12
  - [ ] P1.T3.1: Delete imports and types that no longer have a user (`DEFAULT_DAY_PHASE` if it falls out of `main.ts`), without touching the storage gate, the PWA block or the dev handles.
  - [ ] P1.T3.2: Confirm `SceneHandle` was not edited, and record the `git diff` of `src/scene/init-scene.ts` as empty.

<!-- Primary agent appends after verification:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/boot-simplification_20261109/verification/phase-1.md
-->

## Phase 2: The guard

- **Goal:** a source-level test fails if the boot order regresses or a listener queue returns, and the three first-event specs prove no listener was lost with the queues gone.
- **Depends on:** Phase 1
- **Covers:** FR-7, FR-10, NFR-5, AC-1, AC-2, AC-4, AC-5
- **Touches:** `src/core/boot-order.test.ts`
- **Verification:** `pnpm check` and `pnpm exec playwright test e2e/smoke.spec.ts e2e/sun-moon.spec.ts e2e/fleet.spec.ts e2e/ride-toybox-flow.spec.ts`
- **Status:** pending

- [ ] **P2.T1: Guard the boot order** — covers: FR-10, NFR-5
  - [ ] P2.T1.1: Assert `src/main.ts` calls `mountShell`, `initScene` and `mountControls` in that order, and contains no listener array declaration and no replay loop over queued listeners.
  - [ ] P2.T1.2: Prove the guard is not vacuous — it must find all three call sites and at least one `mountControls` argument naming the scene.
  - [ ] P2.T1.3: Prove it bites: swap two calls, run the guard, record the failure, restore, and record the pass.
- [ ] **P2.T2: Prove the first events still land** — covers: FR-7, AC-4
  - [ ] P2.T2.1: Run smoke, sun-moon, fleet and ride-toybox-flow and record the counts; if a first-event assertion fails, fix the wiring rather than the spec.
  - [ ] P2.T2.2: Run the full matrix once and record it; it must match the base at 57 passed, 1 skipped.

<!-- Primary agent appends after verification:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/boot-simplification_20261109/verification/phase-2.md
-->

## Phase 3: Docs and measurement

- **Goal:** the boot order is recorded where the next agent will look, and the cost of the change is measured rather than asserted.
- **Depends on:** Phase 2
- **Covers:** FR-11, AC-6, AC-7, AC-8
- **Touches:** `conductor/tech-stack.md`, `conductor/product.md`
- **Verification:** `pnpm check` and `pnpm build`
- **Status:** pending

- [ ] **P3.T1: Document the boot order** — covers: FR-11
  - [ ] P3.T1.1: Record in `conductor/tech-stack.md` that the shell mounts, the scene binds, then controls wire against a bound `SceneHandle`, with the reason (no pre-bind gap, no listener queue).
  - [ ] P3.T1.2: Note that `src/main.ts` no longer carries fallbacks, so a missing scene is a construction error.
- [ ] **P3.T2: Mark the roadmap and measure** — covers: AC-6, AC-7, AC-8
  - [ ] P3.T2.1: Mark the `boot-simplification_20261109` roadmap row shipped with the measured numbers.
  - [ ] P3.T2.2: Record `pnpm check` counts and coverage, the `pnpm build` precache entries, and the gzipped JS delta against the base build.

<!-- Primary agent appends after verification:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/boot-simplification_20261109/verification/phase-3.md
-->

<!-- conductor-review appends ## Phase R1: Review Fixes here with its own contract. -->
