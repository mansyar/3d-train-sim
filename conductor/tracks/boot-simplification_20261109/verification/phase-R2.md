# Phase R2 — Second-round review fixes — Verification

**Track:** `boot-simplification_20261109`
**Phase goal:** make the two rewritten guards witness what they name, then repair the four record errors round 2 found.
**Performed by:** primary agent (the phase is a guard test plus Conductor records; the phase subagent is denied writes under `conductor/`).

## Commands

| Command | Exit | Result |
|---|---|---|
| `pnpm exec biome check . --write` | 0 | Checked 182 files, fixed 1 (formatting of the rewritten test) |
| `pnpm test src/ui/boot-order.test.ts` | 0 | 6 tests passed |
| `pnpm check` | 0 | Biome 182 files, `tsc --noEmit` clean, **52 files / 899 tests** |

## R2-F1 — the scene argument is parsed, not spelled

`sceneArgument(source)` blanks string literals (`'…'`, `"…"` and template literals), finds
`mountControls(`, locates the first `{` after the following comma, brace-matches that object and
returns it only when it contains `scene` as a shorthand or a named property (`/\bscene\s*[,:}]/`).
`blockFrom` is shared with nothing else; it is the depth counter the guard needs.

The reviewer's brittleness cases are now accepted, and the decoys are still rejected, as one
table-driven test (`accepts every spelling of the same correct call and no decoy`):

| Fixture | Expected |
|---|---|
| `mountControls(root, { world, audio, scene, isReady });` | accepted |
| `mountControls(root, { world, audio, scene: handle });` | accepted |
| `mountControls(root, { world, audio, isReady() { return true; }, scene });` | accepted |
| multi-line object with `scene: sceneHandle,` last | accepted |
| `mountControls(root, { world, audio, note: 'scene,' });` | **rejected** — the decoy that the old window matched |
| `mountControls(root, { world, audio, sceneHandle });` | **rejected** |
| `mountControls(root);` | **rejected** |

Robustness demonstration: renaming the live entry to `scene: scene,` (the spelling the old regex
rejected) now passes the guard — `6 passed` — where the round-1 pattern would have gone red on
correct code. `git checkout -- src/main.ts` restored the file (`git diff --stat` empty).

## R2-F2 — a name-independent queue invariant

The name scan is kept as a backup, but three assertions no longer depend on what a variable is
called, and they run over the comment-stripped copy:

```ts
expect(carriesNoQueue, 'a loop returned to src/main.ts').not.toMatch(/\bfor\s*\(/);
expect(carriesNoQueue, 'a forEach replay returned to src/main.ts').not.toMatch(/\.forEach\s*\(/);
expect(carriesNoQueue, 'a collection returned to src/main.ts').not.toMatch(/\bnew\s+(?:Set|Map|Array|WeakMap|WeakSet)\b/);
```

Bite demonstration — `const subs: unknown[] = [];` plus `for (const fn of subs) fn;` inserted after
`let restoring = true;`: **1 failed / 5 passed**, failing on `a loop returned to src/main.ts` and
`a collection returned to src/main.ts` (the name scan alone would not have seen `subs`). The edit
was reverted with `git checkout -- src/main.ts` and `git diff --stat` was empty.

The comment in the test records the limit honestly: if the mount ever moves into a helper module,
this guard has to move with it.

## R2-F3 — the AC-4 paths and backticks

A PowerShell escape (`` `e ``) had written a literal ESC byte into `spec.md`, so AC-4 read
`2e/sun-moon.spec.ts` and the edge case lost its backticks. Both lines are restored, and a scan of
`conductor/**/*.md`, `src/**/*.ts` and `e2e/*.ts` found **no** remaining ESC bytes in the track.

AC-4 now reads: `` `e2e/sun-moon.spec.ts` (day icon), `e2e/smoke.spec.ts` (the camera-cycle button
inside the two-loops journey), `e2e/ride-toybox-flow.spec.ts` (ride controls) ``.

## R2-F4 — the Phase 2 guard description is history, not documentation

`verification/phase-2.md` now carries a block quote before the numbered guard description saying the
bullets describe the Phase 2 state, that review round 1 found each of the three checks could pass
while its property was gone, and that `phase-R1.md` holds the current patterns and the three bite
demonstrations. The review note at the end of the file that still called the raw-text/window split
"the correct one" is rewritten and marked superseded.

## R2-F5 — the JSDoc says what is true

The header claimed "every assertion reads the comment-stripped copy", while `lineCount(mainSource)`
reads the raw file deliberately. It now says the call-site and queue assertions read the stripped
copy, and that the anti-vacuity line count reads the raw file because a comment cannot lengthen it
into a false pass.

## Notes

- No `src/main.ts`, `src/scene`, `src/ui/app.ts`, dependency, lockfile, markup or style change, so no
  Playwright run was needed; `tsc` exercises the `@ts-expect-error` fixture on every `pnpm check`.
- The unit count moved 898 → 899: the new table-driven spelling test is the only addition.
- The guard still cannot prove the *binding* is the live scene (a same-typed stub would pass); that
  remains the residual risk recorded in `integrated.md`.
