# Phase R1 — Review Fixes — Verification

**Performed by:** primary agent (every finding touches Conductor state)
**Track:** `boot-simplification_20261109`

## Goal

Close the seven round-1 findings: three guard holes that let a regression through green, one
orphaned type re-export, and three evidence inaccuracies.

## Commands

| Command | Exit | Result |
|---|---|---|
| `pnpm test src/ui/boot-order.test.ts` | 0 | 5 passed after the fixes |
| `pnpm test src/ui/boot-order.test.ts` with `scene,` deleted from the `mountControls` options | 1 | 1 failed / 4 passed — `mountControls must be called with root and an options object carrying the bound scene` |
| `pnpm test src/ui/boot-order.test.ts` with `mountShell(root)` commented out | 1 | 2 failed / 3 passed — `mountShell( not found in src/main.ts` and the anti-vacuity test |
| `pnpm test src/ui/boot-order.test.ts` with `const queue: unknown[] = []` added | 1 | 1 failed / 4 passed — `a listener queue returned to src/main.ts` |
| `pnpm check` | 0 | Biome 182 files, `tsc --noEmit` clean, 52 files / 898 tests |
| `pnpm exec playwright test e2e/smoke.spec.ts e2e/sun-moon.spec.ts e2e/ride-toybox-flow.spec.ts` | 0 | 17 passed, 1 skipped (2.4 m) |

Every demonstration edit to `src/main.ts` was reverted with `git checkout -- src/main.ts` and
verified with an empty `git diff --stat`.

## F1 — the `scene` argument is matched, not sampled

`mountControls` now has to match
`/mountControls\(\s*root\s*,\s*\{[^}]*\bscene\s*,/` on the comment-stripped source. The old check
took a 400-character window from the call site, and the dev-handle comment inside it contains
"scene", so deleting `scene,` from the options object stayed green — a guard that proved only that
the call existed. The failure message names the requirement rather than the regex.

## F2 — the queue scan no longer knows one name

The scan now looks for the shape rather than a convention: a `const`/`let` binding whose name
contains `listener`, `queue`, `pending`, `buffer` or `subscriber` and whose value is `[`,
`new Set`, `new Map` or `new Array`, plus any `for…of` or `.forEach(` replay over such a name.
`rideModeListeners` was not the only shape this track deleted, and a future re-introduction is
unlikely to pick the same suffix.

## F3 — the order reads the stripped copy

The JSDoc promised that a commented-out mount could not satisfy the order, while `indexOf` and
`toContain` read raw text. Every assertion now reads `mainWithoutComments`, so a comment can
neither satisfy the order nor hide a real queue, and the doc comment says exactly that. The
demonstration comments out `mountShell(root)` and substitutes a bare `createElement('canvas')`;
two tests fail, so the guard is watching the code and not the prose.

## F4 — the orphaned re-export

`src/ui/app.ts` imported `CellFromPoint` only to re-export it, and nothing imported it from
`./app` (it is dead at the base commit too). Both lines are gone; the type still lives in
`src/ui/toy-drag.ts`, where the drag machine defines it.

## F5, F6 — two evidence corrections

`spec.md` said the dev handles are assigned before `mountControls`; the `import.meta.env.DEV`
block runs after it. The edge case now says so and adds why nothing depends on the earlier
assignment (`e2e` waits on `__tinyTracksReady`, which flips on the recovery read). AC-4 credited
the camera-cycle witness to `e2e/fleet.spec.ts`; the witness is the two-loops journey in
`e2e/smoke.spec.ts` (`smoke.spec.ts:1063`), and `fleet` covers the engine pick, the toot and the
reload instead.

## F7 — the matrix runs are labelled

`verification/integrated.md` records the integrated pass at the phase-3 head `edd3706`, keeps
attempt 1 (55 passed / 2 failed / 1 skipped) with its two page-crash failures, and states that
the Phase 2 matrix in `phase-2.md` (56 / 1 / 1 at `a8dc1bb`) is a different run at an earlier
head. `phase-1.md` also stops citing the working commits `faca892`/`9e43f86`, which no longer
resolve after the phase squash, and shows the reproducible `+185/−121` stat.

## Notes

No `src/core`, `src/scene`, dependency, lockfile, markup or style change. The only source edit
outside the test file is the two-line dead re-export deletion in `src/ui/app.ts`.
