# Phase 3 — Parent-gate recovery notice — Verification

- **Track:** save-resilience_20261107
- **Phase:** 3 — Parent-gate recovery notice
- **Date:** 2026-11-07
- **Branch:** `fix/save-resilience_20261107`
- **Base commit:** `2b7f26c8e421076f1aa20b52f67cad39fe3fbda9`
- **Head commit (verified):** `744f1d1dfdfcfaaf574035b7538b0a754e93eca0`
- **Result:** verified

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| red step | `pnpm test` | 1 | `src/core/recovery.test.ts` failed to import the not-yet-created module; 41 files / 777 existing tests passed |
| static | `pnpm exec biome check .` (first leg of `pnpm check`) | 0 | 162 files checked; no findings |
| static | `pnpm exec tsc --noEmit` (second leg of `pnpm check`) | 0 | No type errors |
| unit | `pnpm test` (third leg of `pnpm check`) | 0 | 42 files, 784 tests passed (7 new) |
| phase verification | `pnpm check` | 0 | Biome, typecheck, and the full Vitest suite passed |

The first two `pnpm check` runs exited `1` for formatter output and then for a
`RecoveryStatus` / `WorldRecoveryStatus` mismatch; both were fixed inside the
phase's files and the final run above is the recorded verification.

### Red step (test-first)

`src/core/recovery.test.ts` was written and run before `src/core/recovery.ts`
existed:

```text
$ pnpm test
 FAIL  src/core/recovery.test.ts [ src/core/recovery.test.ts ]
Error: Cannot find module './recovery' imported from
D:/Projects/3d-train-sim/src/core/recovery.test.ts

 Test Files  1 failed | 41 passed (42)
      Tests  777 passed (777)
```

After creating the pure formatter the same command exited `0` with 42 files and
784 tests. The new tests cover `clean`, `fresh`, `restored`, `salvaged` with 1,
with several (including pieces + scenery combined), and `salvaged` with 0.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-7 | After a salvaged or restored boot, the parent gate shows a dismissible note; dismissal lasts for the session. | `src/core/recovery.test.ts` — every status, singular/plural counts, and the zero-drop `null` case. `src/ui/parent-gate.ts` refreshes the note from `deps.recoveryNote()` when `armConfirm()` opens the tray, sets it with `textContent`, and keeps a closure-scoped `recoveryDismissed` flag so a dismissed note stays hidden for the session. | pass |
| AC-7 | e2e: corrupt `current`, boot, open the gate, see the note, dismiss, confirm it stays dismissed. | Deferred to Phase 4's Playwright spec. This phase supplies the formatter, the wiring, and the DOM hooks the e2e will drive (`.recovery-note`, `.recovery-note-text`, `.recovery-dismiss`). | deferred (Phase 4) |

No visual claim is made here: this phase's browser proof is Phase 4. The
verification is unit tests plus static checks and code review of the render and
dismiss paths.

## Behaviour as implemented

- `recoveryNotice(status, droppedPieces, droppedScenery)` is pure TypeScript in
  `src/core/recovery.ts` (no DOM, storage, or `src/state` imports). It returns
  `null` for `clean`, `fresh`, and a defensive zero-drop `salvaged`; a calm
  count-free line for `restored`; and a singular/plural total of pieces +
  scenery for `salvaged`.
- `src/main.ts` performs one `loadWorldRecovery()` at boot, hydrates from
  `recovery.snapshot` as before, and derives the note once the read settles.
  The dev-only readiness flag now reuses that same promise, removing the doubled
  dev read noted in Phase 2.
- `src/ui/app.ts` adds the note markup inside `.preset-tray` (`role="status"`,
  hidden by default) with a text span and an `aria-label`led dismiss button, and
  forwards the note source to `createParentGate`.
- `src/ui/parent-gate.ts` reads the note lazily when the 2 s hold arms the tray,
  shows it only for a non-null line, writes with `textContent`, and hides it via
  a session-scoped flag on dismiss. Nothing is persisted and the save format is
  unchanged.
- `src/style.css` styles `.recovery-note` as a quiet, static, grown-up card
  (`--toy-cream` / `--toy-steel`, 15 px text, 44 px dismiss target). It adds no
  animation, so the existing `prefers-reduced-motion` block needs no change.

## Evidence paths

- `src/core/recovery.ts` — `RecoveryStatus`, `recoveryNotice`
- `src/core/recovery.test.ts` — status and count coverage
- `src/main.ts` — single recovery read, note derivation, DEV readiness reuse
- `src/ui/app.ts` — `recoveryNote` option, note markup, gate wiring
- `src/ui/parent-gate.ts` — lazy reveal, `textContent` fill, session dismissal
- `src/style.css` — `.recovery-note`, `.recovery-note[hidden]`,
  `.recovery-note-text`, `.recovery-dismiss`
- `conductor/tracks/save-resilience_20261107/verification/phase-3.md`

## Deviations

None. All six changed source/test files are inside `Touches`; no file outside
`Touches` was modified.

## Notes

- The brief suggested passing a resolved `recoveryNote` string into `mountApp`.
  `mountApp` runs synchronously before the boot read settles, so `AppOptions`
  carries `recoveryNote?: () => string | null` instead — the gate asks when it
  opens, behind the 2 s hold. The value is still computed once from
  `recoveryNotice(...)`; only the moment of reading is deferred.
- `loadWorldRecovery()` is typed with `WorldRecoveryStatus`, which still includes
  `'unreadable'` even though the loader never returns it. `main.ts` narrows that
  unreachable case to `'fresh'` rather than widening the pure union or asserting
  a cast.
- `src/state/persistence.ts` and `src/core/save.ts` were not touched.
- Task commits: `9ec358f` (formatter + tests), `744f1d1` (wiring, note render,
  dismissal, styles). This evidence file is committed after the verified head.

## Primary verification

- **Command:** `pnpm check`
- **Exit code:** 0
- **Result:** Biome checked 162 files with no findings, `tsc --noEmit` reported
  no errors, and Vitest passed 42 files / 784 tests.
- **Tree:** `git status --porcelain` clean before verification.
- **Diff:** `2b7f26c..HEAD` touched only the six source/test files in `Touches`
  plus this evidence file.
- **Diff review:** the formatter is pure and total; the note is written with
  `textContent`; it lives inside the 2 s-hold tray; dismissal is a closure flag
  with no storage writes; `main.ts` reuses one `loadWorldRecovery()` for
  hydration and the DEV readiness flag.

