# Integrated Verification — Switch E2E Stability and Release v0.14.1

- **Track:** `switch-e2e-stability_20261119` — Switch E2E Stability and Release v0.14.1
- **Phase:** 2 — v0.14.1 docs and first dry run
- **Phase 3 addendum:** "Phase 3 — Second dry run and release gate evidence" below (Result: `pass`)
- **Date:** 2026-11-19
- **Branch:** `fix/switch-e2e-stability_20261119`
- **Phase base:** `445ecb9cf0d5cec5491192af00fbf692799759f8`
- **Release-content head:** `a53d222254c09e31bba4e8fbfc70e16a74b2b46b`
  (`docs(clarity): retarget baseline labels to v0.14.1`)
- **Phase 1 checkpoint:** `580cc1cb8204f452ab2068e73cb467973b6b25dc`
- **Result:** `pass` — every configured local gate is green on final content and
  the release dry run reached `success` with deploy skipped. No values were
  invented.

> The exact phase verification command
> `pnpm check && pnpm test:coverage && pnpm build && pnpm exec playwright test && pnpm audit --audit-level=high && gh workflow run release.yml --ref fix/switch-e2e-stability_20261119 --field dry_run=true`
> was split across two executed steps against the same final content: the
> primary ran the full local chain
> `pnpm check && pnpm test:coverage && pnpm build && pnpm exec playwright test && pnpm audit --audit-level=high`
> → `LOCAL_CHAIN_EXIT=0`, then dispatched the dry run separately (two attempts,
> below). The three operations the executor's permission layer refused earlier
> (clarity comparison edit, `pnpm audit`, dry-run dispatch) were executed by the
> primary; their recorded outputs are reflected here. No command was retried by
> the executor.

## Release summary (P2.T1)

| Input | State | Evidence |
| --- | --- | --- |
| Version bump | **done** | `package.json`: `"version": "0.14.1"` (was `0.14.0`), commit `5a09b38`. |
| CHANGELOG curation | **done** | `CHANGELOG.md`: empty `## [Unreleased]`, new `## [0.14.1] - 2026-11-19` parent-facing `### Fixed` entry explaining that a release check which failed on slow devices no longer blocks updates and that nothing changes for children; compare links refreshed to `[Unreleased]: .../compare/v0.14.1...HEAD` and `[0.14.1]: .../compare/v0.14.0...v0.14.1`. Commit `5a09b38`. |
| Clarity baseline retarget | **done** | `conductor/archive/clarity-audit_20261110/comparison.md`: seven `v0.14.0` → `v0.14.1` label replacements applied by the primary, commit `a53d222`. Verified counts: `v0.14.1=7`, `v0.14.0=0`, `awaiting observation=8`. No privacy or traceability wording changed. |

No audit values were invented, no child data or timing counts were added, no
v1.0 claim was made, and all eight `awaiting observation` cells in the clarity
artifact were preserved verbatim.

## Verification layers (P2.T2.1) — full local chain, exit 0

The primary ran the complete local chain in one pass on final content
(`LOCAL_CHAIN_EXIT=0`); each layer's recorded result follows.

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| static + unit | `pnpm check` | 0 | Biome 198 files, no fixes; `tsc --noEmit` clean; Vitest 57 files / 1016 tests passed. |
| coverage | `pnpm test:coverage` | 0 | 57 files / 1016 tests passed; statements 97.07% (1794/1848), branches 91.21% (841/922), functions 97.41% (414/425), lines 98.87% (1578/1596) — above the 80% gate. |
| build | `pnpm build` | 0 | Vite 115 modules transformed; `dist/assets/index-V3mAMN8j.js` 814.58 kB / gzip 216.01 kB; PWA generateSW with 178 precache entries. |
| e2e | `pnpm exec playwright test` | 0 | 85 passed, 1 pre-existing `@ci` skip, 0 failed in 8.7 min across tablet, phone and prod. |
| audit | `pnpm audit --audit-level=high` | 0 | 5 vulnerabilities (1 low / 4 moderate), none high — no advisory at or above the high threshold. |
| dispatch | `gh workflow run release.yml --ref fix/switch-e2e-stability_20261119 --field dry_run=true` | accepted | Two attempts: cancelled `44488925935`, then first successful `44493402673` (see Dry-run gate). |

Notes on the green layers:

- The pre-existing Vite `configLoader: 'native'` warning about the extensionless
  import in `vite.config.ts:6` recurs in `pnpm check`, `pnpm test:coverage` and
  the Playwright web servers; it is unrelated to this phase and does not fail a
  gate. `THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated` console
  warnings are similarly pre-existing and allowed by the app's console policy.
- The v0.14.0 failure case (`[tablet] ... every switch kind rides every road ›
  ride all three slip roads ...`) passed at `e2e/switches.spec.ts:208` in this
  full run.
- The active regression again printed the expected before/after contrast:
  `before: missing blades: -0.210; missing roads: -1.571; ... frames sampled: 320; ... SAFETY CAP REACHED`
  and `after: all keys seen: blades 0.000, 0.210, -0.210; roads 0.000, 1.571, -1.571; ... frames sampled: 363`.
  The assertion was not weakened; Phase 1's frame-aware sampler is intact.

## Diff-scope check (P2.T3)

`git diff --stat 1ad84b2e996934532f54c6ddb1804366ca5fc2c9..HEAD` at release-content
head `a53d222` lists exactly twelve files: `CHANGELOG.md`, `package.json`,
`conductor/archive/clarity-audit_20261110/comparison.md`, `conductor/tracks.md`,
and the seven track files (index, metadata, plan, spec, `verification/phase-1.md`,
this evidence file), plus `e2e/helpers.ts` and `e2e/switches.spec.ts`.
No change to `playwright.config.ts`, `.github/workflows/release.yml`, `src/`,
the lockfile, or dependencies. The clarity comparison artifact appears here
because the primary applied the P2.T1.3 retarget; its edit changes only the
seven version labels.

## Dry-run gate (P2.T2.2) — first successful dry run established

Both dry-run dispatches were made from the release branch
`fix/switch-e2e-stability_20261119` with `workflow_dispatch` and `dry_run=true`.
Durations below are the timings recorded in the primary handoff; no wall-clock
created/updated timestamp was supplied, so none is invented here.

### Attempt 1 — cancelled (does not count as a successful dry run)

| Field | Recorded value |
| --- | --- |
| Run ID | `44488925935` |
| URL | `https://github.com/mansyar/3d-train-sim/actions/runs/44488925935` |
| Event / branch | `workflow_dispatch` / `fix/switch-e2e-stability_20261119`, `dry_run=true` |
| Conclusion | **cancelled** |
| Where it stopped | `Install Playwright browsers (WebKit for the iPad profile)`, after 30m16s |
| `publish` | skipped |

This was an infrastructure failure during browser installation, not a switch
e2e failure. It does not count as a successful dry run.

### Attempt 2 — first successful dry run

| Field | Recorded value |
| --- | --- |
| Run ID | `44493402673` |
| URL | `https://github.com/mansyar/3d-train-sim/actions/runs/44493402673` |
| Event / branch | `workflow_dispatch` / `fix/switch-e2e-stability_20261119`, `dry_run=true` |
| Watch command / exit | `gh run watch 44493402673 --interval 20 --exit-status` → `DRY_RUN_RETRY_WATCH_EXIT=0` |
| Conclusion | **success** |

| Job / step | Conclusion | Duration |
| --- | --- | --- |
| `Gate · biome + typecheck` | success | 27s |
| `Gate · vitest` | success | 22s |
| `Gate · e2e (tablet · phone · prod)` | success | 23m53s |
| `publish` | success | 1m10s |
| `Build and push image (push only on real tags)` | succeeded | (within publish) |
| `Deploy via Coolify webhook` | **skipped** | — |

All gates and the image build are green; `Deploy via Coolify webhook` was
skipped and no real publish occurred, as required for a `dry_run=true` dispatch.
This is the **first successful** dry run. A second distinct successful dry run
is still required by the track and is deferred to Phase 3.

## Release gate evidence reserved for later phases (P2.T3)

These remain gates to be satisfied and recorded by the primary / Phase 3, not
claims of this phase:

- **PR inputs:** base `main`, head `fix/switch-e2e-stability_20261119`, squash
  merge; release summary above as the body inputs. No PR was opened here.
- **Post-merge automatic tag gate:** annotated tag `v0.14.1` created at the
  squash merge commit and pushed; `v0.14.0` left unchanged; no tag deletion,
  overwrite, or force-push.
- **Tag-workflow watch gate:** watch the tag-triggered `release.yml` to
  completion and report its conclusion plus the `publish` job state; do not
  claim publication on cancellation/timeout.
- **GHCR 403:** reported as *unknown*, never as verified or unpublished.
- **Manual tablet check:** explicitly not performed (out of scope for this
  patch release).
- **Clarity values:** remain `awaiting observation`; no invented audit
  measurements (verified `awaiting observation=8`).
- **Second dry run:** satisfied in Phase 3 — `44514200919` is recorded below as
  the second distinct successful dry run; both it and `44493402673` skipped deploy.

## Acceptance criteria

| ID | Criterion | Result | Status |
| --- | --- | --- | --- |
| AC-3 | `pnpm check`, `pnpm test:coverage`, `pnpm build`, `pnpm exec playwright test`, `pnpm audit --audit-level=high` all exit 0 on final content. | Full local chain `LOCAL_CHAIN_EXIT=0`; all five layers green (audit: 1 low / 4 moderate, no high). | **pass** |
| AC-5 | `package.json` 0.14.1; empty `[Unreleased]` and dated `[0.14.1] - 2026-11-19` parent-facing CHANGELOG section with refreshed compare links; comparison labels v0.14.1 with eight `awaiting observation` cells intact. | All satisfied; comparison verified `v0.14.1=7`, `v0.14.0=0`, `awaiting observation=8`. | **pass** |

FR-3 (full local matrix plus first successful dry run with deploy skipped) and
FR-5 (v0.14.1 clarity baseline, no invented values) are satisfied; NFR-3 and
NFR-5 are respected (no invented values, every executable check green).

## Deviations

None. All changes stayed within `Touches`. The clarity comparison artifact is
inside `Touches` and was retargeted by the primary with only version-label
changes.

## Blockers

None. The three operations the executor could not perform (clarity comparison
edit, `pnpm audit`, dry-run dispatch) were executed by the primary; their real
outputs are recorded above. No command was retried or worked around by the
executor.

## Notes

- The Phase 1 checkpoint is unchanged at `580cc1c` and remains verified.
- Task-level commits: documentation `5a09b38`, prior evidence `a39a452`, clarity
  retarget `a53d222` (pushed by the primary), and this rewritten evidence file.
- The cancelled run `44488925935` is retained as history but is explicitly not
  counted as a successful dry run; `44493402673` is the first success.
- No wall-clock created/updated timestamps were present in the primary handoff;
  only job/run durations were supplied, and only those are recorded here.
- No tag, PR, merge, deploy, or real release was performed, and no manual tablet
  check was run.

## Primary verification

At `2026-11-19T09:36:02Z` on HEAD `3d68afd4cfa77037d7a331548cdab173c4b69c3d`:

- The tracked tree was clean; only primary-owned untracked `conductor/runs/` was present.
- `git diff --name-only 445ecb9cf0d5cec5491192af00fbf692799759f8..HEAD` listed exactly the four Phase 2 Touches: `package.json`, `CHANGELOG.md`, `conductor/archive/clarity-audit_20261110/comparison.md`, and `verification/integrated.md`.
- Commits in range were `5a09b38`, `a39a452`, `a53d222`, `3d68afd`; there were no merge commits.
- `package.json` version is `0.14.1`; clarity artifact counts are `v0.14.1=7`, `v0.14.0=0`, `awaiting observation=8`.
- The full local chain and first dry run were already executed by the primary on this exact release content (`LOCAL_CHAIN_EXIT=0`; dry run `44493402673` success with deploy skipped); no code changed after those runs.
- AC-3 and AC-5 are satisfied. No deviation: the cancelled dry run was infrastructure-only and a successful retry was recorded. AC-4's second distinct successful dry run is recorded in the Phase 3 section below.

## Phase 3 — Second dry run and release gate evidence

- **Phase:** 3 — Second dry run and release gate evidence
- **Date:** 2026-11-19
- **Phase base:** `c53ba9df6035f49c9290a7543be653bcfe5aa1bf`
- **Phase 2 checkpoint:** `f15c9a2` (per `conductor/runs/switch-e2e-stability_20261119.json`)
- **Scope:** this evidence file only; no source, test, config, workflow, package,
  changelog, comparison, or Conductor-state edits.
- **Result: `pass`** — two distinct, consecutive successful `workflow_dispatch`
  dry runs are recorded with deploy skipped (AC-4), and the post-merge release
  gates are documented below. All primary-executed facts are recorded verbatim;
  nothing was re-run by this phase.

### P3.T1 — Second successful dry run (AC-4)

The primary dispatched and watched the second dry run; this phase did not
re-run any command from the primary-executed facts.

| Field | Recorded value |
| --- | --- |
| Command | `gh workflow run release.yml --ref fix/switch-e2e-stability_20261119 --field dry_run=true` |
| Run ID | `44514200919` |
| URL | `https://github.com/mansyar/3d-train-sim/actions/runs/44514200919` |
| Event / branch | `workflow_dispatch` / `fix/switch-e2e-stability_20261119` |
| Created | `2026-11-19T11:22:14Z` |
| Updated / completed | `2026-11-19T11:51:02Z` |
| Watch command / exit | `gh run watch 44514200919 --interval 20 --exit-status` → `SECOND_DRY_RUN_WATCH_EXIT=0` |
| Conclusion | `success` |

| Job | Conclusion | Duration |
| --- | --- | --- |
| `Gate · vitest` | success | 25s |
| `Gate · e2e (tablet · phone · prod)` | success | 27m43s |
| `Gate · biome + typecheck` | success | 22s |
| `publish` | success | 59s |

- Publish step `Build and push image (push only on real tags)` succeeded;
  `Deploy via Coolify webhook` was skipped — no deploy occurred.
- Only pre-existing Node 20 action deprecation annotations were emitted; no
  gate failed.

#### Dry-run sequence and AC-4 assertion

| Run ID | Outcome | Counts toward AC-4 |
| --- | --- | --- |
| `44488925935` | cancelled during WebKit browser install after 30m16s; infrastructure-only; publish skipped | No — retained as history only |
| `44493402673` | first successful run; all gates and image build green; Coolify deploy skipped | Yes (1 of 2) |
| `44514200919` | second consecutive successful run; all gates and image build green; Coolify deploy skipped | Yes (2 of 2) |

Two distinct, consecutive successful `workflow_dispatch` runs — `44493402673`
and `44514200919` — are now recorded, each with all gates green, image build
success, and deploy skipped. AC-4's two-consecutive-success bar is satisfied.
The cancelled `44488925935` attempt was an infrastructure failure during browser
installation, not a failure of the switch e2e fix; it is retained as history and
is counted neither as a success nor as a product regression.

### P3.T2 — Release gate evidence (FR-6, FR-7, FR-8; NFR-4, NFR-6; AC-6, AC-7, AC-8)

These are primary-owned gates to be satisfied and recorded after this evidence
phase; they are documented here as requirements/policy, not as claims that they
have already been executed:

- **PR / review gate (FR-6, AC-6):** a release PR is opened with base `main` and
  head `fix/switch-e2e-stability_20261119`, squash merge, using the Phase 2
  release summary above as body inputs. Review verdict must be PASS and
  archive/metadata/PR terminal proof committed before merge. No PR was opened or
  reviewed in this phase.
- **Automatic tag-after-merge gate (FR-7, AC-7, NFR-4):** after the squash merge,
  an annotated `v0.14.1` tag is created at the squash merge commit and pushed
  with `git push origin v0.14.1`; `v0.14.0` must remain unchanged, with no tag
  deletion, overwrite, or force-push. No tag was created here.
- **Tag-workflow watch gate (FR-8, AC-8):** watch the tag-triggered `release.yml`
  to completion and report its conclusion plus the `publish` job state
  (success, failure, cancellation, or skipped publish). Cancellation or timeout
  must be reported as such and must not be claimed as publication. No
  tag-triggered workflow was watched here.
- **GHCR-403 policy (NFR-6, AC-8):** a GHCR package inspection returning `403`
  is reported as **unknown** — not as verified and not as unpublished. No GHCR
  package was inspected or mutated here.
- **Archive gate:** archive/metadata terminal proof is primary-owned and is
  recorded with the PR review gate; no archive edit was made here.
- **Manual tablet check:** explicitly not performed, per the standing user
  decision.
- **No invented values:** no v1.0 claim and no invented clarity-audit values;
  the eight `awaiting observation` cells remain intact (`awaiting observation=8`).

### Phase 3 acceptance criteria

| ID | Criterion | Result |
| --- | --- | --- |
| AC-4 | Two distinct successful `workflow_dispatch` dry runs with all gates green, image build success, deploy skipped | **pass** — `44493402673`, `44514200919` |
| AC-6 | PASS review and archive/metadata/PR terminal proof before merge | recorded as a primary-owned post-merge gate; not executed in this phase |
| AC-7 | Annotated `v0.14.1` at the squash merge commit, present on origin; `v0.14.0` unchanged | recorded as a primary-owned post-merge gate; not executed in this phase |
| AC-8 | Tag workflow watched to completion; conclusion and `publish` state reported; GHCR 403 = unknown | recorded as a primary-owned post-tag gate; not executed in this phase |

### Phase 3 notes

- No command from the primary-executed facts was re-run: no dry run, watch,
  verification, tag, PR, merge, or deploy was executed by this phase.
- Only this evidence file was edited; no staging or commit was performed —
  final staging/squash is left to the primary.
- The worktree contains only this evidence edit plus primary-owned untracked
  `conductor/runs/`.
- The two successful dry runs were observed on final release content with no
  code changes between them, satisfying the "two consecutive successes" bar.

## Primary verification

- At `2026-11-19T11:55:00Z` the worktree had only this evidence-file edit and
  the primary-owned untracked `conductor/runs/` directory; Phase 3 base was
  `c53ba9df6035f49c9290a7543be653bcfe5aa1bf` and HEAD matched that base.
- The Phase 3 section records the primary-executed second dry run
  `44514200919` (success, all gates green, image build success, Coolify deploy
  skipped, `SECOND_DRY_RUN_WATCH_EXIT=0`) and the first successful dry run
  `44493402673`; the cancelled `44488925935` attempt is retained as
  infrastructure history only. No command was re-run by this phase.
- AC-4 is satisfied by two consecutive successful `workflow_dispatch` runs on
  final release content. AC-6/AC-7/AC-8 remain primary-owned post-review,
  post-merge, and post-tag gates and are recorded in evidence.
- No deviation.
