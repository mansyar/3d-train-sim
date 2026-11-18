# Integrated Verification Evidence — Release v0.13.0

- **Track:** `release-v0.13.0_20261118` — Release v0.13.0
- **Branch:** `chore/release-v0.13.0_20261118`
- **Head SHA at verification:** `92e06f410f77b5c0e442294d655a3617a02c8936` (phase base;
  the primary ran the exact verification command on this content before the evidence commit)
- **Base of track:** `68a36405be2b6b0f71998fc20b1b97360e3d711c`
- **Date:** 2026-11-18
- **Result:** **pass**

## Status of tasks

- P2.T1 (full configured verification matrix): done.
  - P2.T1.1: done — all layers ran on the final release-branch content via the primary's
    handoff execution of the exact command (the subagent's own invocation was denied; see
    Notes).
  - P2.T1.2: done — exact commands, exit codes, and counts recorded below from the handoff.
  - P2.T1.3: done — diff-scope check below.
- P2.T2 (assemble release PR inputs): done — summary, checkpoints, verification table,
  and tag-approval gate recorded below for the primary to place in `pr.md`.

## Verification command table

Authoritative command (exact, from the phase contract), executed by the primary on the
final release-branch content at HEAD `92e06f4`:

```
pnpm check && pnpm test:coverage && pnpm build && pnpm exec playwright test && pnpm audit --audit-level=high
```

| Layer | Command | Exit | Counts / result |
| --- | --- | --- | --- |
| static — lint + format | `pnpm exec biome check .` (via `pnpm check`) | 0 | Checked 197 files in 589ms. No fixes applied. |
| static — typecheck | `pnpm exec tsc --noEmit` (via `pnpm check`) | 0 | Clean (no diagnostics). |
| unit | `pnpm test` / `vitest run` (via `pnpm check`) | 0 | 57 test files passed; 1009 tests passed. |
| coverage | `pnpm test:coverage` / `vitest run --coverage` | 0 | 57 test files / 1009 tests passed. Statements 97.05% (1782/1836); Branches 91.19% (839/920); Functions 97.39% (411/422); Lines 98.86% (1570/1588). All above the 80% gate on `src/core` + `src/state`. |
| build | `pnpm build` / `vite build` | 0 | 115 modules transformed; `dist/assets/index-BtN8X-pO.js` 812.05 kB (gzip 215.28 kB); built in 938ms; PWA v1.3.0, precache 178 entries (10653.98 KiB). |
| e2e | `pnpm exec playwright test` | 0 | 73 tests using 2 workers; 72 passed, 1 skipped (pre-existing ambient-frame test); 11.7m; tablet, phone, and prod profiles. |
| audit | `pnpm audit --audit-level=high` | 0 | 5 vulnerabilities: 1 low, 4 moderate; `1 ignored: 1 high` (the single dated `GHSA-fc5q-39xc-vjpf` exception from the prior track). No new ignore; audit level unchanged. |
| **full chain** | `pnpm check && pnpm test:coverage && pnpm build && pnpm exec playwright test && pnpm audit --audit-level=high` | **0** | `verification_exit=0`. Every layer above passed; no `--workers=1` rerun needed (no flake). |

Verbatim key output from the primary's handoff:

```text
$ pnpm check && pnpm test:coverage && pnpm build && pnpm exec playwright test && pnpm audit --audit-level=high
$ pnpm exec biome check . && pnpm exec tsc --noEmit && pnpm test
Checked 197 files in 589ms. No fixes applied.
 Test Files  57 passed (57)
      Tests  1009 passed (1009)

$ vitest run --coverage
 Test Files  57 passed (57)
      Tests  1009 passed (1009)
All files          |   97.05 |    91.19 |   97.39 |   98.86 |
=============================== Coverage summary ===============================
Statements   : 97.05% ( 1782/1836 )
Branches     : 91.19% ( 839/920 )
Functions    : 97.39% ( 411/422 )
Lines        : 98.86% ( 1570/1588 )

$ vite build
✓ 115 modules transformed.
dist/assets/index-BtN8X-pO.js                             812.05 kB │ gzip: 215.28 kB
✓ built in 938ms
PWA v1.3.0
precache  178 entries (10653.98 KiB)

Running 73 tests using 2 workers
  ok 25 [tablet] e2e/perf-budget-observe.spec.ts:36:1 ... @ci (10.3s)
frame tick sample 1: 11.23 ticks/s
frame tick sample 2: 9.71 ticks/s
frame tick sample 3: 12.97 ticks/s
  ok 26 [tablet] e2e/perf-budget.spec.ts:82:1 ... @ci (10.2s)
interactive mark startTime: 2174 ms (budget <= 5000 ms)
frame tick sample 1: 12.18 ticks/s
frame tick sample 2: 9.15 ticks/s
frame tick sample 3: 12.75 ticks/s
FPS floor: 2.5 ticks/second
  ok 27 [tablet] e2e/perf-budget.spec.ts:182:1 ... negative mark @ci (6ms)
late-mark negative run threw: interactive mark startTime 5001 ms exceeds 5000 ms budget
  ok 28 [tablet] e2e/perf-budget.spec.ts:191:1 ... negative tick @ci (7ms)
low-tick negative run threw: frame ticks/second 2.4 below floor 2.5
  -  44 [tablet] e2e/smoke.spec.ts:935:1 ... @ci  [skipped: pre-existing ambient-frame test]
  1 skipped
  72 passed (11.7m)
5 vulnerabilities found
Severity: 1 low | 4 moderate
1 ignored: 1 high
verification_exit=0
```

Only pre-existing warnings were observed: the Vite `configLoader: 'native'` note, the
chunk-size warning, and `THREE.WebGLShadowMap` deprecation notices in browser console
output. No new warning, failure, ignore, or audit-level change was introduced.

## Diff-scope check

Command: `git diff --name-only 68a36405be2b6b0f71998fc20b1b97360e3d711c..HEAD`

```
CHANGELOG.md
conductor/archive/clarity-audit_20261110/comparison.md
conductor/tracks.md
conductor/tracks/release-v0.13.0_20261118/index.md
conductor/tracks/release-v0.13.0_20261118/metadata.json
conductor/tracks/release-v0.13.0_20261118/plan.md
conductor/tracks/release-v0.13.0_20261118/spec.md
conductor/tracks/release-v0.13.0_20261118/verification/phase-1.md
package.json
```

Command: `git log --oneline 68a36405..HEAD`

```
92e06f4 conductor(plan): Mark phase 'Pre-merge Verification' as in progress
0583a98 conductor: Record Phase 1 verification for release-v0.13.0_20261118
b764c05 docs(release): bump version and curate v0.13.0 release docs
6f3ed35 conductor(plan): Mark phase 'Version and Release Documentation' as in progress
056386f chore(conductor): Mark track 'Release v0.13.0' as in progress
```

`git log --merges 68a36405..HEAD` → no output (zero merge commits in range).

`git diff --stat 68a36405..HEAD` → 9 files changed, 510 insertions(+), 9 deletions(-):

```
CHANGELOG.md                                       |  20 +-
conductor/archive/clarity-audit_20261110/comparison.md   |  14 +-
conductor/tracks.md                                |   1 +
conductor/tracks/release-v0.13.0_20261118/index.md |  16 ++
conductor/tracks/release-v0.13.0_20261118/metadata.json  |  31 +++
conductor/tracks/release-v0.13.0_20261118/plan.md  |  73 +++++++
conductor/tracks/release-v0.13.0_20261118/spec.md  | 128 +++++++++++
conductor/tracks/release-v0.13.0_20261118/verification/phase-1.md | 234 +++++++++++++++++++++
package.json                                       |   2 +-
```

These snapshots were taken before this phase's evidence commit; adding
`verification/integrated.md` is the only subsequent change.

**Assessment:** the diff is limited to the Phase 1 release files (`package.json`,
`CHANGELOG.md`, `conductor/archive/clarity-audit_20261110/comparison.md`), the Phase 1
evidence file (`verification/phase-1.md`), and primary-owned Conductor track state
(`conductor/tracks.md`, `.../index.md`, `.../metadata.json`, `.../plan.md`, `.../spec.md`).
No `src/`, test, `e2e/`, dependency/lockfile, workflow, or runtime configuration file is in
the range. Adding this phase's `verification/integrated.md` keeps the scope consistent
(evidence only). NFR-1 / AC-4 diff-scope expectation holds.

## Phase checkpoints

- **Phase 1 — Version and Release Documentation:** `b764c050ffbbb3998b35e81744166489ad3a2724`
  (`docs(release): bump version and curate v0.13.0 release docs` — the squashed Phase 1
  checkpoint). Phase 1 evidence: `conductor/tracks/release-v0.13.0_20261118/verification/phase-1.md`.
- **Phase 2 — Pre-merge Verification:** this report. The exact verification command passed
  (`verification_exit=0`) on HEAD `92e06f4`; the checkpoint is the primary's acceptance
  commit for this phase (the primary squashes task commits on acceptance).

## PR summary inputs (for the primary to place in `pr.md`)

- **Version bump:** `package.json` version `0.12.0` → `0.13.0` (FR-1, AC-1). No lockfile change.
- **CHANGELOG curation:** `[Unreleased]` promoted into `## [0.13.0] - 2026-11-18` with
  parent-facing notes for local insights, install onboarding, accessibility polish, the
  pnpm/audit repair, and the CI performance gate; an empty `[Unreleased]` retained; compare
  links refreshed (`Unreleased` → `v0.13.0...HEAD`, added `[0.13.0]` → `v0.12.0...v0.13.0`)
  (FR-2, AC-2).
- **Clarity baseline retarget:** all seven labels in
  `conductor/archive/clarity-audit_20261110/comparison.md` retargeted from v0.12.0 to
  v0.13.0; all eight `awaiting observation` cells intact; no audit number added
  (FR-3, AC-3, NFR-2).
- **Verification:** full configured matrix passed on the final release-branch content
  (`verification_exit=0`) — see the command table above (FR-4, NFR-4, AC-4).
- **Skipped checks are explicit user decisions, not omissions (NFR-4):** no
  `workflow_dispatch` release dry run (PR CI is sufficient); no manual tablet check before
  tagging; no GHCR/production verification after the tag push.
- **Scope:** version and release docs plus Conductor state/evidence only; no player-facing
  code change in this track.
- **Note for doc sync:** `conductor/product.md:108` still describes the clarity artifact as
  “v0.12.0” in a historical shipped annotation. This is outside this track's Touches and is
  carried forward from the Phase 1 evidence as a follow-up for the primary.

## Tag-approval gate text (post-merge, not a phase)

> After the release PR is merged, the primary must ask the user for **explicit approval**
> before pushing the tag. On approval, the primary creates the annotated `v0.13.0` tag at
> the squash merge commit and runs `git push origin v0.13.0`, then stops. This gate covers
> FR-6, AC-6, and AC-7. The tag must not be pushed before PR merge and explicit approval;
> if approval is declined the branch stays untagged and the release is reported as
> prepared but not shipped. If a `v0.13.0` tag already exists, stop — never overwrite or
> force-push a tag. No GHCR or production verification is performed by this track.

## Deviations

None. No file outside the Touches list was modified. No source, config, dependency,
workflow, product doc, CHANGELOG, or `package.json` change was made after Phase 1.

## Notes

- The subagent's own invocation of the verification chain returned
  `Permission denied: shell`. Per the phase rules it was not retried, rephrased, or worked
  around (no `&&`-chain splitting, no wrapper, no Code Mode). The primary ran the exact
  command on the final release-branch content at HEAD `92e06f4` and handed back the output
  recorded above; the subagent did not re-run the chain. The prior `blocked` state of this
  file was superseded by that successful handoff.
- No Media section is included (release/docs track; no player-facing visual change).
- No release dry run, manual device check, tag, PR, or post-tag verification was performed
  by this phase.

## Primary verification

- Worktree was clean before acceptance; `git diff --name-only 92e06f410f77b5c0e442294d655a3617a02c8936..HEAD`
  listed only `conductor/tracks/release-v0.13.0_20261118/verification/integrated.md`,
  exactly the Phase 2 Touches plus evidence, and the two reported commits were
  `7fc97b7` and `7638f15`; `git log --merges` over the range was empty.
- The exact verification command had already been run by the primary on the final
  release-branch content at HEAD `92e06f4` (the phase base), with `verification_exit=0`.
  Phase 2 changed only this evidence file afterwards, so the same source/config/dependency
  content was verified; no re-run was necessary for the primary acceptance check.
- AC-4 and AC-5 are satisfied: the full matrix passed and the release PR inputs,
  phase checkpoints, and tag-approval gate are recorded above. FR-4/FR-5/NFR-4 are covered.
- No deviations. `package.json` remains `0.13.0`; CHANGELOG and comparison labels remain
  consistent; the audit gate is green with only the single pre-existing dated ignore.
