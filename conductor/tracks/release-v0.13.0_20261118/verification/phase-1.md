# Phase 1 Evidence — Version and Release Documentation

- **Track:** `release-v0.13.0_20261118` — Release v0.13.0
- **Phase:** 1 — Version and Release Documentation
- **Date:** 2026-11-18
- **Branch:** `chore/release-v0.13.0_20261118`
- **Base commit:** `6f3ed355ba0d824684f97cc8b7c305ea4e17400e`
- **Head commit at primary handoff:** `60f0dbdff823169c37b746838016de166d38ad94`
  (comparison retarget). The evidence-update commit recording this report
  follows and advances HEAD by one commit.
- **Result:** **verified**

## Summary

All three tasks are complete. P1.T1 (version bump) and P1.T2 (parent-facing
CHANGELOG curation) were completed and committed by the subagent. P1.T3
(retarget the clarity comparison artifact's labels) was initially blocked
because the permission layer rejected the subagent's `edit` call on
`conductor/archive/clarity-audit_20261110/comparison.md` with
`Permission denied: edit`. Per the phase rules the denial was not retried or
worked around; the primary executed the approved `replaceAll: true` edit
(7 replacements) and handed back the command output recorded verbatim under
"Primary handoff" below. All seven labels now name v0.13.0, all eight
`awaiting observation` cells remain intact, and no audit number was added.
`pnpm check` passed (exit 0).

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static + unit (phase verification) | `pnpm check` | 0 | `biome check .`: 197 files checked, no fixes applied. `tsc --noEmit`: passed. `vitest run`: 57 test files, 1009 tests passed. Only a pre-existing Vite `configLoader: 'native'` warning about a missing file extension in `vite.config.ts:6:36`. |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | `package.json` version is `0.13.0`; remaining `0.12.0` strings appear only in CHANGELOG history, archives, or this track's prose. | `package.json:3` = `0.13.0`; before/after grep below. Remaining app-version hits are CHANGELOG history (`CHANGELOG.md:37,352,353`), this track's prose (`spec.md`, `plan.md`), and archived track prose (`conductor/archive/clarity-audit_20261110/*`, `conductor/product.md`). The three `pnpm-lock.yaml` hits are a third-party dependency version (`@dimforge/rapier3d-compat@0.12.0`), not the app version; the lockfile was not touched. | pass |
| AC-2 | `CHANGELOG.md` has `[0.13.0] - 2026-11-18`, empty `[Unreleased]`, refreshed compare links, and notes for local insights, install onboarding, a11y polish, pnpm/audit, and perf gate. | `CHANGELOG.md:10-35` (empty `[Unreleased]`, new version section with all five notes in parent voice) and `CHANGELOG.md:351-353` (compare links). | pass |
| AC-3 | `comparison.md` header, section heading, table heading, and baseline prose name v0.13.0; every measured value remains `awaiting observation`. | All seven labels in `comparison.md` now name v0.13.0 (primary handoff edit, committed as `60f0dbd`); the stale-label grep returns no matches. All eight `awaiting observation` cells remain intact; no number added. | pass |

## Before / after grep: stale `0.12.0` strings

Command (native grep, repo root, respects `.gitignore`): `0\.12\.0`

### Before (45 matches)

```
CHANGELOG.md:20:  ## [0.12.0] - 2026-11-17
CHANGELOG.md:334: [Unreleased]: .../compare/v0.12.0...HEAD
CHANGELOG.md:335: [0.12.0]: .../compare/v0.11.0...v0.12.0
package.json:3:   "version": "0.12.0",
pnpm-lock.yaml:859:  '@dimforge/rapier3d-compat@0.12.0':
pnpm-lock.yaml:3428: '@dimforge/rapier3d-compat@0.12.0': {}
pnpm-lock.yaml:3667:      '@dimforge/rapier3d-compat': 0.12.0
conductor/product.md:108: ... v0.12.0 comparison artifact ...
conductor/tracks/release-v0.13.0_20261118/spec.md: 11, 20, 21, 37, 43, 84 (track prose)
conductor/tracks/release-v0.13.0_20261118/plan.md: 17, 18, 21, 23 (track prose)
conductor/archive/clarity-audit_20261110/plan.md: 37, 44 (archive)
conductor/archive/clarity-audit_20261110/verification/phase-2.md: 15, 30, 34, 41 (archive)
conductor/archive/clarity-audit_20261110/comparison.md: 1, 8, 10, 13, 29, 62, 63 (archive)
conductor/archive/clarity-audit_20261110/verification/integrated.md: 14, 25 (archive)
conductor/archive/clarity-audit_20261110/verification/check-artifacts.py: 120, 127, 130 (archive)
conductor/archive/clarity-audit_20261110/verification/artifacts.md: 65 (archive)
conductor/archive/clarity-audit_20261110/spec.md: 11, 45, 69, 88, 118 (archive)
conductor/archive/clarity-audit_20261110/pr.md: 5, 30, 68 (archive)
```

### After subagent edits, before primary handoff (44 matches)

```
CHANGELOG.md:37:  ## [0.12.0] - 2026-11-17
CHANGELOG.md:352: [0.13.0]: .../compare/v0.12.0...v0.13.0
CHANGELOG.md:353: [0.12.0]: .../compare/v0.11.0...v0.12.0
pnpm-lock.yaml:859:  '@dimforge/rapier3d-compat@0.12.0':
pnpm-lock.yaml:3428: '@dimforge/rapier3d-compat@0.12.0': {}
pnpm-lock.yaml:3667:      '@dimforge/rapier3d-compat': 0.12.0
conductor/product.md:108: ... v0.12.0 comparison artifact ...
conductor/tracks/release-v0.13.0_20261118/spec.md: 11, 20, 21, 37, 43, 84 (track prose)
conductor/tracks/release-v0.13.0_20261118/plan.md: 17, 18, 21, 23 (track prose)
conductor/archive/clarity-audit_20261110/verification/artifacts.md: 65 (archive)
conductor/archive/clarity-audit_20261110/comparison.md: 1, 8, 10, 13, 29, 62, 63 (archive — retargeted later in the primary handoff)
conductor/archive/clarity-audit_20261110/pr.md: 5, 30, 68 (archive)
conductor/archive/clarity-audit_20261110/spec.md: 11, 45, 69, 88, 118 (archive)
conductor/archive/clarity-audit_20261110/verification/phase-2.md: 15, 30, 34, 41 (archive)
conductor/archive/clarity-audit_20261110/plan.md: 37, 44 (archive)
conductor/archive/clarity-audit_20261110/verification/check-artifacts.py: 120, 127, 130 (archive)
conductor/archive/clarity-audit_20261110/verification/integrated.md: 14, 25 (archive)
```

Delta at this intermediate point: `package.json:3` and the stale `[Unreleased]`
compare link are gone; a new history link `[0.13.0]: ...v0.12.0...v0.13.0` was
added (expected). All hits at this point are CHANGELOG history, archives, this
track's prose, or an unrelated third-party lockfile version. The subsequent
primary handoff removed the seven `comparison.md` hits (see below).

## Before / after grep: comparison labels (`comparison.md`)

Command: `v0\.12\.0|0\.12\.0` in `conductor/archive/clarity-audit_20261110/comparison.md`

### Before (7 matches)

```
1: # Comparison Artifact — v0.12.0 Current-State Baseline
8: ## Current-state baseline: v0.12.0 (FR-5, AC-4)
10: The baseline is **Tiny Tracks v0.12.0** — the version current when this audit
13: | Measure (...) | v0.12.0 current-state baseline | v1.0 gate reference (...) |
29: numbers exist, and none are invented here.** The v0.12.0 column stays
62: | AC-4 | ... states v0.12.0 as the current-state baseline, marks every value "awaiting observation" | ... |
63: | FR-5 | v0.12.0 baseline defined, imported definitions cited, all measured values left empty and labelled "awaiting observation" | ... |
```

### After (0 stale matches; 7 labels now v0.13.0)

```
1: # Comparison Artifact — v0.13.0 Current-State Baseline
8: ## Current-state baseline: v0.13.0 (FR-5, AC-4)
10: The baseline is **Tiny Tracks v0.13.0** — the version current when this audit
13: | Measure (...) | v0.13.0 current-state baseline | v1.0 gate reference (...) |
29: numbers exist, and none are invented here.** The v0.13.0 column stays
62: | AC-4 | ... states v0.13.0 as the current-state baseline, marks every value "awaiting observation" | ... |
63: | FR-5 | v0.13.0 baseline defined, imported definitions cited, all measured values left empty and labelled "awaiting observation" | ... |
```

`grep "v0\.12\.0|0\.12\.0" comparison.md` → **No matches found**. The subagent's
edit was denied and was not retried; the primary executed the approved
`replaceAll: true` edit and returned the output above.

## `awaiting observation` integrity (`comparison.md`)

Command: `awaiting observation` in `comparison.md`
- Before: 8 matches (lines 5, 11, 15, 16, 18, 30, 62, 63).
- After: 8 matches (same lines).
- No measured cell was changed and no number was added. The two data rows
  (`time-to-first-ride`, `unassisted session length`) still read
  `awaiting observation` in the current-state column.

## Permission denial and primary handoff

**Subagent denial (now resolved).** The subagent's `edit` call on
`D:\Projects\3d-train-sim\conductor\archive\clarity-audit_20261110\comparison.md`
(replaceAll `v0.12.0` → `v0.13.0`) returned
`{"error":{"type":"permission.rejected","message":"Permission denied: edit"}}`.
Per the phase rules the denial was not retried or worked around. The file is an
explicitly approved Touch for Phase 1, so the primary executed the edit with
`replaceAll: true` (7 replacements) and handed back the output below. The
subagent did not re-run the denied edit or re-run `pnpm check`.

**Primary handoff — verbatim command output:**

```text
=== comparison labels ===
stale_exit=
1: # Comparison Artifact - v0.13.0 Current-State Baseline
8: ## Current-state baseline: v0.13.0 (FR-5, AC-4)
10: The baseline is **Tiny Tracks v0.13.0** - the version current when this audit
13: | Measure (definition imported from `progressive-disclosure_20261110`) | v0.13.0 current-state baseline | v1.0 gate reference (from `conductor/product.md`) |
29: numbers exist, and none are invented here.** The v0.13.0 column stays
62: | AC-4 | Cites Progressive Disclosure's audit-comparison notes as the source, states v0.13.0 as the current-state baseline, marks every value "awaiting observation" | Imported field definitions and baseline table above |
63: | FR-5 | v0.13.0 baseline defined, imported definitions cited, all measured values left empty and labelled "awaiting observation" | Baseline table and "Why no numbers exist" above |
=== awaiting count ===
8
=== status ===
 M conductor/archive/clarity-audit_20261110/comparison.md
=== check ===
$ pnpm exec biome check . && pnpm exec tsc --noEmit && pnpm test
Checked 197 files in 410ms. No fixes applied.
$ vitest run
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - import "./src/core/security-headers" without a file extension (vite.config.ts:6:36). Add the file extension
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.

 RUN  v4.1.11 D:/Projects/3d-train-sim

  Test Files  57 passed (57)
       Tests  1009 passed (1009)
    Start at  22:38:42
    Duration  5.64s (transform 10.01s, setup 0ms, import 21.34s, tests 5.33s, environment 19ms)

check_exit=0
```

The handoff confirms zero stale labels in `comparison.md`, an `awaiting
observation` count of 8, and `pnpm check` exit 0.

## Deviations

None. No file outside the Touches list was modified. No lockfile was changed.

## Notes

- P1.T1 committed as `633ff12` (`chore(release): bump version to 0.13.0`).
- P1.T2 committed as `507aa54` (`docs(release): curate parent-facing v0.13.0 changelog`).
- P1.T3 comparison retarget committed as `60f0dbd`
  (`docs(release): retarget clarity baseline to v0.13.0`) by the subagent from
  the primary's handoff tree.
- `pnpm check` passed (exit 0) on the subagent tree before handoff and again on
  the primary tree after the comparison edit; only a pre-existing Vite
  config-loader warning was printed. The handoff run is reproduced verbatim
  above and was not repeated by the subagent.
- The three `0.12.0` hits in `pnpm-lock.yaml` are the unrelated third-party
  package `@dimforge/rapier3d-compat@0.12.0`, not the Tiny Tracks version; they
  are not stale app-version strings and lockfiles were not modified.
- `conductor/product.md:108` and other `conductor/archive/**` files retain
  `v0.12.0` as historical records of the archived clarity-audit track —
  permitted by AC-1 and outside this phase's Touches.
- Post-handoff grep for stale labels in `comparison.md` returns
  `No matches found`; a repo-wide grep still finds `0.12.0` only in CHANGELOG
  history, this track's prose (including this evidence file's quoted
  before/after blocks), archived clarity-audit files, and the unrelated
  lockfile dependency.
- No release dry run, manual device check, or tag push was performed.

## Primary verification

- Worktree was clean before review; the primary ran the independent check on the
  final subagent tree at `7a183bd`.
- `git diff --name-only 6f3ed355ba0d824684f97cc8b7c305ea4e17400e..HEAD` =
  `CHANGELOG.md`, `conductor/archive/clarity-audit_20261110/comparison.md`,
  `conductor/tracks/release-v0.13.0_20261118/verification/phase-1.md`,
  `package.json` — exactly the Phase 1 Touches plus evidence.
- `git log --oneline 6f3ed35..HEAD` reported exactly the five commits in the
  subagent report (`633ff12`, `507aa54`, `56766b6`, `60f0dbd`, `7a183bd`);
  `git log --merges` over the range was empty.
- Re-ran the exact verification command `pnpm check`: exit 0; Biome checked 197
  files with no fixes, `tsc --noEmit` clean, Vitest 57 files / 1009 tests passed.
- Independently confirmed `package.json:3` = `0.13.0`; `CHANGELOG.md` has an
  empty `[Unreleased]`, a dated `[0.13.0] - 2026-11-18` section, and refreshed
  compare links; `comparison.md` has seven `v0.13.0` labels and zero stale
  `v0.12.0` labels, with the `awaiting observation` count still 8.
- AC-1, AC-2 and AC-3 are satisfied. No deviation from the approved contract.
- Follow-up for post-implementation doc sync: `conductor/product.md:108` still
  describes the clarity artifact as “v0.12.0” in the historical shipped
  annotation. This is outside Phase 1 Touches; the approved decision to retarget
  the baseline label should be reflected there during doc sync.
