# Phase 2 — The guard

**Track:** `boot-simplification_20261109`
**Branch:** `refactor/boot-simplification_20261109`
**Phase base:** `cf25a14d615338580ae9a81a954412cc5502a072`
**Guard commit:** `cacda22` `test(ui): Guard the boot order and require a bound scene`

One source file was added: `src/ui/boot-order.test.ts` (86 lines, 5 tests). No other
source file changed in this phase.

## Commands

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `pnpm check` (before the demonstrations) | 0 | biome 182 files clean, `tsc --noEmit` clean, 52 files / 898 tests |
| 2 | `pnpm test src/ui/boot-order.test.ts` (baseline) | 0 | 1 file / 5 tests passed |
| 3 | same, with `mountShell`/`initScene` swapped | 1 | 1 failed / 4 passed — order reported |
| 4 | same, after restoring `src/main.ts` | 0 | 5 passed; `git diff --stat -- src/main.ts` empty |
| 5 | same, with a fake `rideModeListeners` queue | 1 | 1 failed / 4 passed — queue reported |
| 6 | same, after restoring `src/main.ts` | 0 | 5 passed; `git diff --stat -- src/main.ts` empty |
| 7 | `pnpm exec playwright test e2e/smoke.spec.ts e2e/sun-moon.spec.ts e2e/fleet.spec.ts e2e/ride-toybox-flow.spec.ts` | 0 | 18 passed, 1 skipped (2.1 m); smoke 13+1, ride-toybox-flow 3, fleet 1, sun-moon 1 |
| 8 | `pnpm build` (prerequisite for the `prod` project) | 0 | 178 precache entries, JS 801.80 kB / 211.87 kB gzip |
| 9 | `pnpm exec playwright test` (matrix, attempt 1) | 1 | 56 passed, 1 failed, 1 skipped (8.2 m) — `switches.spec.ts:144` flake, quoted below |
| 10 | `pnpm exec playwright test e2e/switches.spec.ts` (rerun alone) | 0 | 3 passed (2.0 m), including `every switch kind rides every road` |
| 11 | `pnpm exec playwright test` (matrix, attempt 2) | 0 | **57 passed, 1 skipped (8.2 m)** |
| 12 | `pnpm check` (final) | 0 | biome 182 files clean, `tsc --noEmit` clean, 52 files / 898 tests |

`git status --porcelain` was empty after each restore and before the commits.

## The guard

`src/ui/boot-order.test.ts` reads `src/main.ts` from
`fileURLToPath(new URL('../main.ts', import.meta.url))` and asserts four things:

1. **The scene is required by the type checker.** `AppOptions` is imported type-only;
   `const withoutScene: AppOptions = { world, audio }` carries
   `// @ts-expect-error a scene is required — wiring before the bind is the bug this
   track deleted`, and the positive control `{ ...partial, scene: {} as
   AppOptions['scene'] }` compiles with **no** directive. If `scene` ever becomes
   optional, `tsc` reports the unused directive and `pnpm check` fails; if the fixture
   were broken in the other direction, the positive control would fail instead.
2. **Order.** Raw-text `indexOf` for `mountShell(`, `initScene(`, `mountControls(`;
   `shell < scene < controls`. Each failure message prints all three indexes
   (`mountShell=…, initScene=…, mountControls=…`), so a regression says which call moved.
   Raw text, not the comment-stripped copy, so a commented-out mount cannot satisfy it.
3. **No queues.** On the comment-stripped copy: no match for
   `/(?:const|let)\s+\w*Listeners\s*[:=]/` and none for
   `/for\s*\(\s*const\s+listener\s+of\s+\w*Listeners/`; both lists must equal `[]`.
   Stripping matters because the prose in `main.ts` names the deleted queues on purpose.
4. **The scene is handed over.** A 400-character window from the `mountControls(` call
   index must match `\bscene\b` (a substring window is enough, and the comment in the
   test says so). **Anti-vacuity:** `mainSource.length > 0`,
   `lineCount(mainSource) > 100` (currently 235), and all three call substrings present,
   in a test named "finds all three mounts, so the order guard cannot pass vacuously".

## Proof it bites

**Swapped order** — `mountShell(root)` and `initScene(canvas, world, audio)` exchanged:

```
 FAIL  src/ui/boot-order.test.ts > the src/main.ts boot order > mounts the shell, then the scene, then the controls
AssertionError: expected mountShell → initScene; got mountShell=1996, initScene=1946, mountControls=6935: expected 1996 to be less than 1946
```

Restored (reverse edit; `git diff --stat -- src/main.ts` printed nothing) → 5 passed.

**Re-added queue** — `const rideModeListeners: unknown[] = [];` after `let restoring = true;`:

```
 FAIL  src/ui/boot-order.test.ts > the src/main.ts boot order > carries no listener queue and no replay loop
AssertionError: a listener queue returned to src/main.ts: expected [ 'const rideModeListeners:' ] to deeply equal []

- []
+ [
+   "const rideModeListeners:",
+ ]
```

Restored → 5 passed, empty diff. Neither demonstration is in the tree.

## First events

| Spec | Count | Which assertion proves which first event |
|---|---|---|
| `e2e/smoke.spec.ts` | 13 passed, 1 skipped (`@ci`) on tablet + 5 phone `@smoke` | ▶/⏹: `pressing play rides the track, and a loop with a station stops and rolls on` (line 482); 🎥: `two disjoint loops ride two trains and the 🎥 button cycles them` (line 1063) taps `.film-toggle` through second → overview → starting |
| `e2e/sun-moon.spec.ts` | 1 passed (tablet) | day icon: `.day-toggle` icon agrees with the live `__tinyTracksScene.dayPhase()` after four taps, and a reloaded `night` previews ☀️ |
| `e2e/fleet.spec.ts` | 1 passed (tablet) | whistle/toot and engine pick answer the first tap, and the choice survives reload |
| `e2e/ride-toybox-flow.spec.ts` | 2 tablet + 1 phone `@smoke` | `.ride-toggle` gets `is-riding` on the first ride and every tool returns on stop; first piece adds `is-ready-pulse`, loop closure plays `ride-pop` |

All three first events the phase cares about (▶/⏹, 🎥, day icon) reach the UI on the
first try, with no lost listener.

## Acceptance criteria

- **AC-1** — `@ts-expect-error` fixture plus positive control, both in
  `src/ui/boot-order.test.ts`; `pnpm check` green, which means the directive consumed a
  real error rather than sitting unused.
- **AC-2** — order guard reports every index, queue scan finds no declaration and no
  replay loop, anti-vacuity threshold `lineCount > 100`; both directions demonstrated
  above and recorded verbatim.
- **AC-4** — the four first-event specs: 18 passed, 1 skipped, exit 0.
- **AC-5** — full matrix attempt 2: 57 passed, 1 skipped. Attempt 1's single known
  contention flake (`switches.spec.ts:144`, `missing roads: 0.000; seen roads: 3.142,
  1.571, -1.571`) passed when the file ran alone (3 passed), so the matrix is at parity
  with the expected 57/1 rather than claiming a clean first run.

## Deviations

None to source. `src/main.ts`, `src/ui/app.ts`, `src/scene/**`, `src/core/**` and every
spec are unchanged (`git diff --stat` empty; `git status --porcelain` empty).

Process notes on denied commands are in **Notes** — no file was edited to work around them.

## Notes

- `pnpm exec vitest run src/ui/boot-order.test.ts` was denied by tool permissions. The
  project's configured `test` script is exactly `vitest run`, so
  `pnpm test src/ui/boot-order.test.ts` ran the same command and is what the table above
  records.
- `git checkout -- src/main.ts` (and `git restore`) were denied. The two demonstration
  edits were reversed with the editor instead, and `git diff --stat -- src/main.ts`
  printed nothing each time, which proves the restore byte-for-byte.
- `pnpm build` was required before the matrix because the `prod` project serves `dist/`,
  which was absent; the build also confirms NFR-4's 178 precache entries.
- First matrix run's failure text, for the record:
  `missing blades: ; missing roads: 0.000; seen blades: 0.000, -0.210, 0.210; seen roads:
  3.142, 1.571, -1.571` — the known switch-road contention flake, at 1.2 m under two
  workers, green alone.

## Primary verification

Checked independently at `e219fd3`, not by re-reading this file.

| Check | Command | Result |
|---|---|---|
| Scope | `git status --porcelain`; `git log --oneline cf25a14..HEAD`; `git diff --stat` | clean; exactly `cacda22` + `e219fd3`; 2 files, +214 — the guard test and this evidence. `src/main.ts`, `src/ui/app.ts`, `src/scene/**`, `src/core/**` and every spec untouched, so neither demonstration survived |
| Units | `pnpm check` | exit 0 — biome 182 files, `tsc --noEmit` clean, 52 files / **898 tests** (893 + the 5 new) |
| First events | `pnpm exec playwright test e2e/smoke.spec.ts e2e/sun-moon.spec.ts e2e/fleet.spec.ts e2e/ride-toybox-flow.spec.ts` | exit 0 — **18 passed, 1 skipped** in 2.0 m |

Review notes (read the guard rather than trusting the table):

- The type fixture is a real proof: `AppOptions` is imported `import type`, the fixture
  object lacks `scene`, the `@ts-expect-error` sits on the assignment line, and the
  positive control adds `scene` with no directive. If `scene` became optional, `tsc`
  would report the unused directive and `pnpm check` would fail; if the fixture rotted
  the other way, the positive control would fail. `expect('scene' in …)` on both sides
  keeps the two objects from being optimised into "everything compiles".
- The order guard reads **raw** text while the queue scan reads a **comment-stripped**
  copy. That split is the correct one: `main.ts` legitimately names the deleted queues in
  prose, and a commented-out `mountShell(` must not satisfy an index comparison.
- Anti-vacuity is present and non-trivial (`lineCount > 100`, currently 235; all three
  call substrings found) in a separately named test, so a renamed file or a moved mount
  cannot make the suite pass by finding nothing.
- The `scene`-in-window check is the weakest of the four (a 400-character substring
  rather than an argument parse). It is adequate here because the type fixture already
  forbids a `mountControls` call without a scene, so the window only has to confirm the
  right identifier is used; recorded rather than tightened to avoid brittle parsing.
- Both bite directions were demonstrated before the commit and restored; the diff above
  proves the tree carries no demonstration edit, which is the part worth checking.
- The guard lives in `src/ui/`, not `src/core/`, because `src/core/import-graph.test.ts`
  forbids every `core → ui` edge including type-only ones. That forced a plan amendment
  (recorded in the Phase 2 contract) rather than a weakened purity rule.
