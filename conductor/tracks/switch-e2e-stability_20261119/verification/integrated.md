# Integrated Verification — Switch E2E Stability and Release v0.14.1

- **Track:** `switch-e2e-stability_20261119` — Switch E2E Stability and Release v0.14.1
- **Phase:** 2 — v0.14.1 docs and first dry run
- **Date:** 2026-11-19
- **Branch:** `fix/switch-e2e-stability_20261119`
- **Phase base:** `445ecb9cf0d5cec5491192af00fbf692799759f8`
- **Release-content head:** `5a09b384fc511952fd4a78c8cd13cd7244281ffb`
  (`chore(release): bump version and curate CHANGELOG for v0.14.1`)
- **Phase 1 checkpoint:** `580cc1cb8204f452ab2068e73cb467973b6b25dc`
- **Result:** `blocked` — every local gate that could be executed is green, but
  three required operations were refused by the execution environment's
  permission layer: editing the clarity comparison artifact, `pnpm audit`, and
  the release dry-run dispatch. They are recorded verbatim under **Blockers**.
  No dry run exists for this phase, so no run ID/jobs/deploy confirmation can be
  claimed and no tag may be created.

> The exact phase verification command
> `pnpm check && pnpm test:coverage && pnpm build && pnpm exec playwright test && pnpm audit --audit-level=high && gh workflow run release.yml --ref fix/switch-e2e-stability_20261119 --field dry_run=true`
> was submitted as written and refused by the shell permission layer (`Permission denied: shell`).
> The refusal targets the outer `&&` chain, not the individual commands: each
> layer was then run separately. `pnpm audit` and `gh workflow run` were each
> refused individually as well. The table below records the true per-layer
> outcomes; the two refused layers were **not** run, not merely unreported.

## Release summary (P2.T1)

| Input | State | Evidence |
| --- | --- | --- |
| Version bump | **done** | `package.json`: `"version": "0.14.1"` (was `0.14.0`), commit `5a09b38`. |
| CHANGELOG curation | **done** | `CHANGELOG.md`: empty `## [Unreleased]`, new `## [0.14.1] - 2026-11-19` parent-facing `### Fixed` entry explaining that a release check which failed on slow devices no longer blocks updates and that nothing changes for children; compare links refreshed to `[Unreleased]: .../compare/v0.14.1...HEAD` and `[0.14.1]: .../compare/v0.14.0...v0.14.1`. Commit `5a09b38`. |
| Clarity baseline retarget | **blocked** | `conductor/archive/clarity-audit_20261110/comparison.md` still labels v0.14.0 — two `edit` attempts (bulk and single-target) were refused. No measured value, privacy, or traceability wording was altered. Required follow-up: retarget every `v0.14.0` label to `v0.14.1`, leaving all eight `awaiting observation` cells and all privacy/traceability wording exactly as-is. |

No audit values were invented, no child data or timing counts were added, and
no v1.0 claim was made. The eight `awaiting observation` cells in the clarity
artifact were not touched.

## Verification layers (P2.T2.1)

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| static + unit | `pnpm check` | 0 | Biome clean (198 files); `tsc --noEmit` clean; Vitest 57 files / 1016 tests passed. |
| coverage | `pnpm test:coverage` | 0 | 57 files / 1016 tests passed; statements 97.07% (1794/1848), branches 91.21% (841/922), functions 97.41% (414/425), lines 98.87% (1578/1596) — above the 80% gate. |
| build | `pnpm build` | 0 | Vite 8.3.6, 115 modules transformed, `dist/` emitted, PWA generateSW with 178 precache entries. |
| e2e | `pnpm exec playwright test` | 0 | 85 passed, 1 skipped (`@ci` ambient-frame-rate), 0 failed in 8.7m on 2 workers across tablet, phone and prod. |
| audit | `pnpm audit --audit-level=high` | **not run** | Permission denied — see Blockers. |
| dispatch | `gh workflow run release.yml --ref fix/switch-e2e-stability_20261119 --field dry_run=true` | **not run** | Permission denied — see Blockers. |

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

## Diff-scope check (P2.T3)

`git diff --stat 1ad84b2e996934532f54c6ddb1804366ca5fc2c9..HEAD` at the
release-content commit listed exactly ten files: `CHANGELOG.md`,
`package.json`, `e2e/helpers.ts`, `e2e/switches.spec.ts`,
`conductor/tracks.md`, and the six new track files (index, metadata, plan,
spec, `verification/phase-1.md`, plus this evidence file once committed).
No change to `playwright.config.ts`, `.github/workflows/release.yml`, `src/`,
the lockfile, or dependencies. The clarity comparison artifact is absent from
the diff because its edit was refused (see Blockers).

## First dry-run gate (P2.T2.2) — NOT ESTABLISHED

No dry run was dispatched by this phase, so there is **no run ID, URL, event,
branch, created/updated timestamp, job conclusion, or deploy-skipped
confirmation** to record. All six job-level claims required by the brief
(`Gate · biome + typecheck`, `Gate · vitest`,
`Gate · e2e (tablet · phone · prod)`, image build success, `Deploy via Coolify
webhook` skipped, no real publish) remain **unverified**. Per the spec edge
case, this is not treated as a pass and the next gate (tagging) must not
proceed from this phase alone.

## Release gate evidence reserved for later phases (P2.T3)

These are gates to be satisfied and recorded by the primary / Phase 3, not
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
  measurements.

## Acceptance criteria

| ID | Criterion | Result | Status |
| --- | --- | --- | --- |
| AC-3 | `pnpm check`, `pnpm test:coverage`, `pnpm build`, `pnpm exec playwright test`, `pnpm audit --audit-level=high` all exit 0 on final content. | Five of six applicable commands (including `pnpm exec biome check .`, `pnpm exec tsc --noEmit`, `pnpm test` inside `pnpm check`) exited 0; `pnpm audit` was refused by the environment. | **partial / blocked** |
| AC-5 | `package.json` 0.14.1; empty `[Unreleased]` and dated `[0.14.1] - 2026-11-19` parent-facing CHANGELOG section with refreshed compare links; comparison labels v0.14.1 with eight `awaiting observation` cells intact. | Version and CHANGELOG satisfied; clarity comparison retarget blocked, so labels still read v0.14.0. | **partial / blocked** |

FR-3 (full local matrix) is green for every layer that could execute; FR-5 is
partially delivered; NFR-3 and NFR-5 are respected (no invented values, all
executable checks green).

## Deviations

None of the executed work strayed outside `Touches`. The clarity comparison
artifact is inside `Touches` but could not be edited due to a permission denial;
it is reported as a blocker rather than silently skipped.

## Blockers

1. `edit conductor/archive/clarity-audit_20261110/comparison.md` (both a
   `replaceAll` and a single-target edit) — needed to retarget all seven
   `v0.14.0` "current-state baseline" labels to `v0.14.1` for P2.T1.3/AC-5,
   preserving the eight `awaiting observation` cells and privacy/traceability
   wording. Result: `Permission denied: edit` on both attempts. Expected: labels
   retargeted, no other text changed. The primary should apply this edit.
2. `pnpm audit --audit-level=high` — needed as the audit layer of the exact
   verification command and AC-3/NFR-5. Result: `Permission denied: shell`.
   Expected: exit 0 with zero high/critical advisories (or a recorded failure).
3. `gh workflow run release.yml --ref fix/switch-e2e-stability_20261119 --field dry_run=true` —
   needed to dispatch the first release dry run for FR-3/P2.T2.2. Result:
   `Permission denied: shell`. Expected: an accepted dispatch, after which
   `gh run list --workflow release.yml --event workflow_dispatch --limit 1 --json databaseId,status,conclusion,url,createdAt`
   and `gh run watch <databaseId> --interval 20 --exit-status` can record the
   run. The primary should dispatch and watch, or hand back the run output.

## Notes

- The exact chained verification command is preserved verbatim in the header
  and in the JSON report; because the shell layer refused `&&` chains, the
  layers were executed individually with the same flags. No fix retries were
  needed — no executed layer failed.
- Task-level commits: documentation in `5a09b38`; this evidence file is
  committed separately. The clarity retarget, audit, and dry run remain for the
  primary (or a resumed pass) and must not be reported as verified here.
- The Phase 1 checkpoint is unchanged at `580cc1c`; it remains verified.
