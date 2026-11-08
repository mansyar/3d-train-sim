# Phase 3 — Docs and measurement

**Track:** `boot-simplification_20261109`
**Branch:** `refactor/boot-simplification_20261109`
**Phase base:** `edf45f36ce99a7dd378664a29c365aefa3089172`
**Performed by:** primary agent (the phase subagent is denied writes under `conductor/`)

## Goal

Record the boot order where the next agent will look, and measure what the change cost
instead of asserting it.

## Commands

| Command | Exit | Result |
|---|---|---|
| `pnpm check` | 0 | biome clean, `tsc --noEmit` clean, 52 files / **898 tests** |
| `pnpm test:coverage` | 0 | statements **97.36%** (1623/1667), branches **91.06%** (713/783), functions **98.10%** (363/370), lines **99.44%** (1438/1446) — identical to the base |
| `pnpm build` (HEAD) | 0 | 178 precache entries, **10 642.67 KiB**; gzipped JS + sw = **218 485 B** |
| `pnpm build` (base `9ac5fd1`, throwaway worktree) | 0 | 178 precache entries, **10 643.51 KiB**; gzipped = **218 712 B** |

Gzip delta: **−227 B** (the file got slightly smaller). Both totals are the same four
files (`dist/assets/index-*.js`, `sw.js`, `workbox-*.js`, `workbox-window.prod.es5`),
gzipped at level 9 with the same script, so they are like for like. The base build was
made in `C:\Users\Ansyar\AppData\Local\Temp\tt-boot-base`, installed with
`pnpm install --offline --frozen-lockfile`, and removed afterwards (`git worktree prune`
leaves no entry).

## What the tech stack now records

`conductor/tech-stack.md`, folder map:

- `src/main.ts` — annotated with the three-step boot (`mountShell` → `initScene` →
  `mountControls`), why the order exists, that `scene` is a required `AppOptions` member
  enforced by the compiler, that `src/ui/boot-order.test.ts` keeps it that way, and that
  no listener queues or `scene?.` fallbacks remain (a missing scene is a construction
  error, not a state).
- `src/ui/` — notes the `mountShell` / `mountControls` split and lists
  `boot-order.test.ts` as the guard.

`conductor/product.md`, roadmap: the `boot-simplification_20261109` row is marked
**Shipped 2026-11-08** with the outcome and the measured numbers (898 unit tests, matrix
57 passed / 1 skipped, 178 precache entries, gzipped JS −227 B).

## Acceptance criteria

| ID | Criterion | Witness |
|---|---|---|
| AC-6 | `pnpm check` green, 893 + the new guard = 898 tests, coverage not lower than the base | command table; coverage figures are the base's to the basis point |
| AC-7 | `pnpm build` still 178 precache entries and the gzipped bundle is not larger | 178 vs 178; 218 485 B vs 218 712 B (−227 B) |
| AC-8 | the tech stack and the roadmap describe the shipped order | the two file sections above |

## Deviations

- The phase was performed by the primary agent: `conductor/tech-stack.md` and
  `conductor/product.md` are Conductor-owned paths the phase subagent cannot write.
- The gzip baseline needed a second build at the base commit, so a disposable worktree was
  used rather than rebuilding `main` in place. No branch, tag or remote ref was touched.
- No source file changed in this phase; the range is documentation only.

## Notes

- The bundle shrank by 227 B rather than growing: `mountControls` and `mountShell` share
  one options object and the deleted replay/unsubscribe scaffolding outweighs the extra
  function boundary. Nothing was optimised for this.
- The tech-stack note deliberately names the *reason* (a pre-bind gap produced a class of
  bugs the queues only papered over) so a future refactor does not reintroduce a
  "temporarily unbound" scene to make construction easier.
