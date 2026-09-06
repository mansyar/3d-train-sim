# Spec — Scene/UI Decomposition (`scene-ui-decomposition_20260906`)

**Type:** Chore (Refactor)

## Overview

`src/scene/init-scene.ts` (1,057 lines) and `src/ui/app.ts` (1,238 lines) have
grown into two monoliths that accrete complexity with every feature track. This
track restructures both into focused, cohesive modules with **zero behavior
change** — no new features, no fixes, no visual or UX differences. The refactor
is bounded: extract + light cleanup, verified by the existing gates and the
full Playwright suite.

## Goals

1. Split `init-scene.ts` into a thin orchestrator plus cohesive scene modules
   (flat in `src/scene/`), wired through a minimal, explicitly-passed
   `SceneContext` object holding shared refs (scene, camera, renderer, audio,
   state stores, ride controller, frame loop).
2. Split `app.ts` into a thin wiring shell plus flat DOM-overlay modules in
   `src/ui/` (e.g., `toybox-drawer.ts`, `ride-controls.ts`, `train-picker.ts`,
   `parent-gate.ts` — final names set during implementation).
3. Light cleanup during the move only: dedupe repeated wiring, rename unclear
   locals, remove code the moves orphaned.

## Non-Functional Requirements

- **No behavior change:** identical visuals, audio, input handling, save
  format, and console output. No signature or export changes consumed by other
  modules beyond internal reshuffling.
- **No performance change:** no new per-frame allocations in the render loop;
  the RAF loop and quality-tier behavior are untouched in spirit and
  measurement.
- **Extracted modules stay cohesive:** each new module < ~400 lines.
- **Both orchestrators shrink:** `init-scene.ts` and `app.ts` become thin
  wiring, each < ~300 lines.

## Constraints

- **Dead-code rule (conservative):** only remove code that the moves made
  unreachable (unused imports, orphaned helpers), each verified by grep +
  gates. Anything else that looks dead gets documented in `plan.md` for a
  future track, not deleted.
- **Order:** Phase A = scene split, Phase B = UI split; each phase gated
  independently with its own checkpoint.
- **Test policy per workflow.md:** scene/UI glue is non-logic code — no new
  unit tests required; the full existing suite must keep passing unchanged
  (Vitest, `tsc --noEmit`, biome, Playwright e2e in all profiles).
- **Docs:** update `tech-stack.md` folder-structure section; `CHANGELOG.md`
  untouched (not user-facing).

## Acceptance Criteria

1. `pnpm exec biome check .`, `pnpm exec tsc --noEmit`, `CI=true pnpm test`
   all pass.
2. Full Playwright e2e suite passes (tablet · phone · prod profiles).
3. `git diff` shows no behavior changes to `src/core/` or `src/state/`; e2e
   specs require no assertion changes (none expected).
4. File-size caps met: every new module < ~400 lines; `init-scene.ts` and
   `app.ts` each < ~300 lines.
5. Manual tablet check: build, decorate, ride, camera cycle, whistle, mute,
   parent-gate reset, starter swap — all behave exactly as before.

## Out of Scope

- Any feature work (roadmap items like double-slip switch, wagon builder,
  melodies).
- Componentization beyond file extraction (no framework, no state-management
  layer).
- Repo-wide dead-code sweep, `src/core`/`src/state` refactors, test rewrites.
- Renaming public APIs or moving assets.
