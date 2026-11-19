# Phase 1 Evidence — Version and Release Documentation

- **Track:** `release-v0.14.0_20261119` — Release v0.14.0
- **Phase:** 1 — Version and Release Documentation
- **Date:** 2026-11-19
- **Branch:** `chore/release-v0.14.0_20261119`
- **Base commit:** `9dee5cc4cb6b740a3f5974ec155cb470a3d09d1b`
- **Head commit (at evidence time):** `078f2af` (see commits below; this evidence commit follows)
- **Result:** **verified**

All four tasks P1.T1–P1.T4 are complete. P1.T3 and P1.T4 were applied by the primary
as a documented handoff after the subagent hit a permission denial on files under
`conductor/`; the denied edits were never retried, rephrased, chained, piped, wrapped,
or routed through another tool by the subagent. This matches the precedent in
`conductor/archive/release-v0.13.0_20261118/verification/phase-1.md` §"Permission
denial and primary handoff".

## Task status / commits

| Task | Status | Commit |
| --- | --- | --- |
| P1.T1 — bump version | done | `780bf68` `chore(release): bump version to 0.14.0` |
| P1.T2 — curate parent-facing CHANGELOG | done | `eb05e20` `docs(release): curate parent-facing v0.14.0 changelog` |
| P1.T3 — retarget clarity baseline labels | done (primary handoff) | `078f2af` `docs(release): retarget clarity baseline to v0.14.0 and fix archive link` |
| P1.T4 — correct product-doc artifact link | done (primary handoff) | `078f2af` `docs(release): retarget clarity baseline to v0.14.0 and fix archive link` |

## Before / after values

### Version (P1.T1)
- Before: `package.json:3` = `"version": "0.13.0",`
- After: `package.json:3` = `"version": "0.14.0",`

### CHANGELOG (P1.T2)
- Before: empty `## [Unreleased]` followed directly by `## [0.13.0] - 2026-11-18`;
  link `[Unreleased]: .../compare/v0.13.0...HEAD`; no `[0.14.0]` section or link.
- After: empty `## [Unreleased]` retained; new `## [0.14.0] - 2026-11-19` inserted
  with three parent-voice notes (paged toybox tabs with dots/swipe and in-session
  page memory; hand-drawn piece/scenery pictures; removal by dragging a piece past
  the meadow edge with see-through preview, release-to-remove, one-tap ↩️ undo, and
  drag-back-to-cancel); `[Unreleased]` link → `.../compare/v0.14.0...HEAD`; new
  `[0.14.0]: .../compare/v0.13.0...v0.14.0` added before the intact `[0.13.0]` link.
- `0.13.0` strings remain only in the preserved CHANGELOG history section and the
  v0.13.0 compare link (`CHANGELOG.md:21`, `:361`, `:362`).

### Comparison labels (P1.T3, primary handoff)
- Before: 7 `v0.13.0` labels in `conductor/archive/clarity-audit_20261110/comparison.md`
  at lines 1 (title), 8 (section heading), 10 (baseline prose), 13 (table heading),
  29 (prose), 62 and 63 (traceability table).
- After: all 7 retargeted to `v0.14.0`. Primary-reported counts: `v0.14=7`,
  `v0.13=0`, `awaiting=8`.
- The 8 `awaiting observation` occurrences (lines 5, 11, 15, 16, 18, 30, 62, 63) are
  byte-identical to baseline; no number, child ID, timing value, or gate claim was
  added. Pre-existing gate-reference numbers and the imported cohort definition were
  left untouched.

### Product-doc link (P1.T4, primary handoff)
- Before: `conductor/product.md:108` contained
  `` `conductor/tracks/clarity-audit_20261110/` ``.
- After: `` `conductor/archive/clarity-audit_20261110/` ``. Primary-reported counts:
  `product_archive=1`, `product_tracks=0`. No other product history or Phase 3 option
  was rewritten; the historical `v0.13.0` prose was intentionally left intact.

## Verification

Exact command: `pnpm check`

```
$ pnpm check
$ pnpm exec biome check . && pnpm exec tsc --noEmit && pnpm test
Checked 198 files in 273ms. No fixes applied.
$ vitest run
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - import "./src/core/security-headers" without a file extension (vite.config.ts:6:36). Add the file extension
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
 RUN  v4.1.11 D:/Projects/3d-train-sim

 Test Files  57 passed (57)
      Tests  1016 passed (1016)
   Duration  3.47s (transform 6.18s, setup 0ms, import 13.30s, tests 3.11s, environment 14ms)
```

- **Exit code:** 0 (`CHECK_EXIT=0` re-confirmed by the primary after the two handoff edits).
- Biome clean on 198 files (was 197 at the v0.13.0 baseline — repository advanced);
  TypeScript clean; Vitest 57 files / 1016 tests passing (the brief's expected green
  baseline). Only the pre-existing Vite config-loader warning was printed.
- Per the updated brief, verification was not re-run by the executor after handoff.

## Acceptance criteria coverage (AC-1..AC-4)

| ID | Criterion | Evidence / status |
| --- | --- | --- |
| AC-1 | `package.json` version `0.14.0`; remaining `0.13.0` only in CHANGELOG history, archives, or this track's prose. | **pass** — `package.json:3` = `0.14.0`. Repo-wide remaining app-version `0.13.0` hits are CHANGELOG history (`CHANGELOG.md:21,361,362`), archives (`conductor/archive/**`), this track's prose, and historical `v0.13.0` wording in `product.md`/`tracks.md`; all permitted. `comparison.md` has `v0.13=0`. |
| AC-2 | `CHANGELOG.md` has `[0.14.0] - 2026-11-19`, empty `[Unreleased]`, refreshed compare links, parent notes for paging/icons/removal. | **pass** — `CHANGELOG.md:10-21`, compare links `:360-362`; parent-voice notes cover all three features. Done in `eb05e20`. |
| AC-3 | `comparison.md` header/heading/table/prose name v0.14.0; every measured value stays `awaiting observation`. | **pass** — `v0.14=7`, `v0.13=0`, `awaiting=8` after handoff (`078f2af`). No number/gate/child-ID added. |
| AC-4 | `conductor/product.md` links the clarity artefact under `conductor/archive/`. | **pass** — `product_archive=1`, `product_tracks=0` after handoff (`078f2af`). Historical prose untouched. |

## Permission denial and primary handoff (resolved)

**Subagent denial (now resolved).** The subagent's `edit` calls on
`D:\Projects\3d-train-sim\conductor\archive\clarity-audit_20261110\comparison.md`
(replaceAll `v0.13.0` → `v0.14.0`) and
`D:\Projects\3d-train-sim\conductor\product.md` (link-path replacement) each returned:

```json
{"error":{"type":"permission.rejected","message":"Permission denied: edit"},"content":[]}
```

Per the phase rules the denials were not retried or worked around. Both files are
explicitly approved Touches for Phase 1, so the primary executed both edits verbatim
(`replaceAll: true`, 7 replacements in `comparison.md`; 1 link-path replacement in
`product.md`), committed them as `078f2af`, and supplied the verification counts above.
The subagent did not re-run the denied edits or re-run `pnpm check`.

## Scope statement

No `src/`, test, e2e, workflow, dependency, or lockfile change. The only files modified
across the phase are `package.json`, `CHANGELOG.md`,
`conductor/archive/clarity-audit_20261110/comparison.md`, `conductor/product.md`, and
this evidence file. No audit numbers, child IDs, timing values, or gate claims were
invented; the clarity comparison values remain `awaiting observation`. No generated
file or lockfile was touched to make a check pass.

## Deviations

None. All edits stayed inside the listed `Touches`. The two subagent permission
denials were resolved by the primary handoff and are recorded above, not silently
skipped.

## Notes

- Commits: `780bf68` (P1.T1), `eb05e20` (P1.T2), `078f2af` (P1.T3 + P1.T4 primary
  handoff), plus this evidence commit.
- `pnpm check` passed with exit 0 both on the subagent tree before handoff and on the
  primary tree after the two edits; only the pre-existing Vite config-loader warning
  was printed.
- The `0.13.0` wording retained in `conductor/product.md:108` describes the historical
  clarity-audit delivery event and is deliberately preserved per P1.T4 ("Do not
  otherwise rewrite product history or Phase 3 options") — consistent with AC-1's
  allowance for archives and historical records.

## Primary verification

At `2026-11-19T04:55:26Z` on final subagent HEAD `01c8ef0`:

- Worktree clean. `git diff --name-only 3495ac6c2e7fa0165886441a30065913a5fc58b9..HEAD`
  listed exactly `CHANGELOG.md`, `conductor/archive/clarity-audit_20261110/comparison.md`,
  `conductor/product.md`, `conductor/tracks/release-v0.14.0_20261119/verification/phase-1.md`,
  and `package.json`.
- Range commits were `780bf68`, `eb05e20`, `078f2af`, `513092c`, `01c8ef0`, matching
  the subagent report; no merge commits.
- Re-ran `pnpm check`: exit 0; Biome 198 files no fixes, tsc clean, Vitest 57 files /
  1016 tests passing; only the pre-existing Vite config-loader warning.
- Confirmed `package.json` version `0.14.0`; comparison `v0.14=7`, `v0.13=0`,
  `awaiting=8`; product `archive=1`, `tracks=0`.
- AC-1..AC-4 satisfied. No deviation.
