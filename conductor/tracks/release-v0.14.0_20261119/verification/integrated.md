# Phase 2 Evidence — Pre-merge Verification, Dry Run, and PR Inputs

- **Track:** `release-v0.14.0_20261119` — Release v0.14.0
- **Phase:** 2 — Pre-merge Verification, Dry Run, and PR Inputs
- **Date:** 2026-11-19
- **Branch:** `chore/release-v0.14.0_20261119`
- **Base commit:** `9dee5cc4cb6b740a3f5974ec155cb470a3d09d1b`
- **Head SHA (release content, at verification time):** `1d2acc98f061f01abfd4eeed944d4c7e84b292ad`
- **Phase 1 checkpoint:** `6677c9bff4ab6ac05191ceb6f975f6698dc7e8b4`
- **Result:** **pass** — the exact verification chain exited 0 (`PHASE2_EXIT=0`) and the release-workflow dry run concluded `success` with all gates green, image build successful, and no publish/deploy.

> Evidence-commit note: the only commits added on top of the verified release content are evidence-only (`3b54ca9` blocked draft, then this rewritten pass evidence). No source, test, config, workflow, dependency, or lockfile content changed after verification.

## Status summary

| Task | Status | Note |
| --- | --- | --- |
| P2.T1 — full configured verification matrix | done | Exact chain exit 0; all five layers green with real numbers recorded below. |
| P2.T2 — release-workflow dry run | done | Run `44464649923` concluded `success`; all three gates and image build green; publish/Coolify skipped because `dry_run=true`. |
| P2.T3 — assemble PR inputs | done | Release summary, checkpoint, verification table, dry-run facts, post-merge gates, and explicit omission notes recorded below. |

## Command table (P2.T1)

Exact commands and key output. The subagent could not execute three shell commands due to permission policy; the primary executed them verbatim and supplied the real results recorded here. Denied commands were never retried, rephrased, chained, piped, or wrapped by the subagent.

| Layer | Exact command | Exit | Key output |
| --- | --- | --- | --- |
| **Full Phase 2 chain** | `pnpm check && pnpm test:coverage && pnpm build && pnpm exec playwright test && pnpm audit --audit-level=high && gh workflow run release.yml --ref chore/release-v0.14.0_20261119 --field dry_run=true` | **0** (`PHASE2_EXIT=0`) | Whole chain completed cleanly; dispatched dry-run run `44464649923`. |
| static + unit | `pnpm check` | 0 | `pnpm exec biome check . && pnpm exec tsc --noEmit && pnpm test` → **Biome 198 files, no fixes applied**; **tsc clean**; Vitest **57 files / 1016 tests passed**. |
| coverage | `pnpm test:coverage` | 0 | `vitest run --coverage` (v8) → **57 files / 1016 tests passed**. Coverage: **Statements 97.07%, Branches 91.21%, Functions 97.41%, Lines 98.87%** — all four above the 80% gate on `src/core` + `src/state`. |
| build | `pnpm build` | 0 | Vite **115 modules transformed**; `dist/assets/index-B9M-mrlA.js` **814.58 kB / gzip 216.01 kB** (gzipped code under the 2 MB pre-deploy budget). **PWA `generateSW`, 178 precache entries**; `dist/sw.js` + workbox shim generated. |
| e2e | `pnpm exec playwright test` | 0 | **85 tests using 2 workers** across `tablet`, `phone`, `prod`: **84 passed, 1 skipped (pre-existing `@ci` skip), 0 failed in 9.3m**. Toybox-clarity, a11y, runtime-guarantees, save-recovery, and journey specs all green. |
| audit | `pnpm audit --audit-level=high` | 0 | **5 vulnerabilities (1 low / 4 moderate), no high or critical** → passes the `--audit-level=high` gate. Result is the primary's real command output; no audit numbers were invented by the subagent. |
| dry-run trigger | `gh workflow run release.yml --ref chore/release-v0.14.0_20261119 --field dry_run=true` | 0 | Dispatched run `44464649923` on branch `chore/release-v0.14.0_20261119`, event `workflow_dispatch`. |

Non-failing, pre-existing warnings observed in local runs (unchanged from Phase 1, not regressions): Vite `configLoader: 'native'` advisory for the extensionless `./src/core/security-headers` import in `vite.config.ts:6:36`; a >500 kB chunk-size advisory; `THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated` browser console noise.

## Diff-scope check (P2.T1.3)

Exact command: `git diff --name-only 9dee5cc4cb6b740a3f5974ec155cb470a3d09d1b..HEAD`

Result — exactly these paths, and nothing else:

```
CHANGELOG.md
conductor/archive/clarity-audit_20261110/comparison.md
conductor/product.md
conductor/tracks.md
conductor/tracks/release-v0.14.0_20261119/index.md
conductor/tracks/release-v0.14.0_20261119/metadata.json
conductor/tracks/release-v0.14.0_20261119/plan.md
conductor/tracks/release-v0.14.0_20261119/spec.md
conductor/tracks/release-v0.14.0_20261119/verification/phase-1.md
package.json
```

- Phase 1 release files: `package.json`, `CHANGELOG.md`, `conductor/archive/clarity-audit_20261110/comparison.md`, `conductor/product.md`.
- Conductor state/evidence: `conductor/tracks.md`, `conductor/tracks/release-v0.14.0_20261119/{index.md,metadata.json,plan.md,spec.md}`, `conductor/tracks/release-v0.14.0_20261119/verification/phase-1.md`.
- **No** `src/`, test, e2e, config, workflow (`.github/**`), dependency, or lockfile (`pnpm-lock.yaml`, `pnpm-workspace.yaml`) change. **Pass.**

## Release-workflow dry run (P2.T2)

**Status: pass.**

| Field | Value |
| --- | --- |
| Run ID | `44464649923` |
| Run URL | `https://github.com/mansyar/3d-train-sim/actions/runs/44464649923` |
| Event / ref | `workflow_dispatch` on `chore/release-v0.14.0_20261119` |
| Trigger | `gh workflow run release.yml --ref chore/release-v0.14.0_20261119 --field dry_run=true` |
| Watch | `gh run watch 44464649923 --interval 20 --exit-status` → `WATCH_EXIT=0` |
| Final conclusion | **`success`** |

Job conclusions:

| Job / step | Conclusion |
| --- | --- |
| `Gate · biome + typecheck` | success |
| `Gate · vitest` | success |
| `Gate · e2e (tablet · phone · prod)` | success (19m24s) |
| `publish` | success |
| `Build and push image (push only on real tags)` | succeeded in dry-run mode — no real tag present, so no image was pushed to GHCR |
| `Deploy via Coolify webhook` | **skipped** |

**No-publish / no-deploy confirmation:** `dry_run=true` was in effect. The image-build step succeeded, but no real tag existed, no GHCR push occurred, and the Coolify deploy webhook was skipped. No tag, push, PR, merge, or deployment was performed by this phase.

## PR inputs (P2.T3)

Inputs for the primary to place in `pr.md`:

- **PR title suggestion:** `chore(release): Release v0.14.0`
- **Base / head:** `main` ← `chore/release-v0.14.0_20261119` (base `9dee5cc4…`, Phase 1 checkpoint `6677c9bf…`).
- **Release summary:** Align the version, parent-facing changelog, and clarity comparison artifact to v0.14.0. `package.json` → `0.14.0`; `CHANGELOG.md` gains `## [0.14.0] - 2026-11-19` with parent notes for paged toybox tabs, hand-drawn piece icons, and removal by dragging a piece past the board, with an empty `[Unreleased]` and refreshed compare links; `conductor/archive/clarity-audit_20261110/comparison.md` version labels retargeted to v0.14.0 with every measured value left `awaiting observation`; `conductor/product.md` clarity-artifact link corrected to the archive path. No player-facing source change.
- **Verification:** full chain exit 0 — see Command table (Biome 198 files, tsc clean, 57 files/1016 tests ×2, coverage 97.07/91.21/97.41/98.87%, Vite 115 modules, PWA 178 precache, Playwright 84 passed/1 skip/9.3m, audit 5 vulnerabilities 1 low/4 moderate no high). Diff scope limited to Phase 1 release files and Conductor state/evidence.
- **Dry-run gate:** run `44464649923` — `https://github.com/mansyar/3d-train-sim/actions/runs/44464649923` — conclusion `success`, all gates green, image build success, no publish/deploy (Coolify skipped).
- **Phase 1 checkpoint:** `6677c9bff4ab6ac05191ceb6f975f6698dc7e8b4`.
- **Post-merge gates (not executed in this phase, by design):**
  1. On squash merge to `main`, automatically create an **annotated `v0.14.0` tag at the squash merge commit** (no second user confirmation) and run `git push origin v0.14.0`.
  2. Watch the tag-triggered `release.yml` workflow to completion and report success/failure/cancellation/skipped publish; treat a 403 GHCR query as **unknown**, not as published or unpublished. A cancelled run or skipped `publish` job is reported as failed for publication even if earlier gates passed. Do not overwrite, delete, or force-push the existing `v0.13.0` tag.
- **Explicit omissions:** **No manual tablet check was performed** (explicit user decision — human-only iPad Safari / Android Chrome touch feel, audio unlock, frame rate). **No audit numbers or clarity-audit measurements were invented by this subagent** — audit figures above come from the primary's real command execution, and clarity values remain `awaiting observation`.

## Permission denials (verbatim) — resolved by primary execution

Three shell commands were permission-denied for the subagent. They were not retried, rephrased, chained, piped, wrapped, or routed through another tool. The primary then executed each verbatim and supplied the real results now recorded above; they are no longer blockers.

1. `pnpm check && pnpm test:coverage && pnpm build && pnpm exec playwright test && pnpm audit --audit-level=high`
   → `{"error":{"type":"permission.rejected","message":"Permission denied: shell"},"content":[]}`
   → Primary result: all five layers green (see Command table).
2. `gh workflow run release.yml --ref chore/release-v0.14.0_20261119 --field dry_run=true`
   → `{"error":{"type":"permission.rejected","message":"Permission denied: shell"},"content":[]}`
   → Primary result: run `44464649923` dispatched and concluded `success` (see Dry run).
3. The full chain including the `gh workflow run` step
   → `{"error":{"type":"permission.rejected","message":"Permission denied: shell"},"content":[]}`
   → Primary result: `PHASE2_EXIT=0`.

## Acceptance criteria coverage (AC-5, AC-6, AC-7)

| ID | Criterion | Status |
| --- | --- | --- |
| AC-5 | All five verification commands exit 0 and are recorded. | **done** — full chain exit 0; every layer recorded with real numbers. |
| AC-6 | `workflow_dispatch` dry run green with no publish, URL recorded. | **done** — run `44464649923` `success`, all gates green, Coolify skipped, URL recorded. |
| AC-7 | `review.md` PASS and PR open with terminal proof. | **not in scope for this phase** — review and PR are primary-owned after Phase 2 acceptance; inputs assembled above. |

## Deviations

- The typed `&&` verification chain and two individual commands were permission-denied for the subagent; the primary executed them verbatim and supplied real results, which are recorded here. No denied command was retried or rephrased.
- No file outside `Touches` was modified. No evidence artifact, lockfile, or generated file was changed to make a check pass.

## Notes

- No commit, tag, push, PR creation, merge, reset, rebase, or deploy was performed for release content by this phase; only this evidence file was committed.
- The dry run was dispatched by the primary against the branch already pushed to `origin`.
- Result is **pass**: Phase 2 gates are satisfied and the phase is ready for review and the release PR. Post-merge tagging and tag-triggered workflow watch remain primary-owned gates, executed after squash merge.

## Primary verification

At `2026-11-19T05:45:50Z` on HEAD `81722b5`, the worktree was clean, the range
`1d2acc98f061f01abfd4eeed944d4c7e84b292ad..HEAD` contained only
`conductor/tracks/release-v0.14.0_20261119/verification/integrated.md`, and the
only two commits in range were `3b54ca9` and `81722b5` with no merge commits. The
exact verification chain and dry run were already executed by the primary on the
same release content before the evidence-only commits: `PHASE2_EXIT=0`, all local
layers green, and dry-run run `44464649923` concluded `success` with all gates
green, image build success, and Coolify deploy skipped. The primary independently
watched the dry run with `gh run watch 44464649923 --interval 20 --exit-status`
(`WATCH_EXIT=0`). AC-5 and AC-6 are satisfied; AC-7 remains a post-review,
pre-merge PR gate. No deviation.
