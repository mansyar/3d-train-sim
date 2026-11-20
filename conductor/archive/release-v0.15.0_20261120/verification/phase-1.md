# Phase 1 Verification — Release content and local matrix

- **Track:** `release-v0.15.0_20261120`
- **Phase:** 1 (Release content and local matrix)
- **Date:** 2026-11-20
- **Branch:** `chore/release-v0.15.0_20261120`
- **Phase base:** `0ac79e6b46547d8890d95219ac44c268ae80a7f9`
- **Head at verification:** `8e433c6` (release content `b3f513a` + primary-owned doc edits `8e433c6`; evidence commit follows)
- **Result:** `verified` after one primary rework of three subagent permission denials. The original blocked report is retained below; `## Primary rework 1` is the authoritative final result.

## Commands

| Layer | Command | Exit | Observed |
| --- | --- | --- | --- |
| static + unit | `pnpm check` | 0 | Biome checked 204 files, no fixes applied; `tsc --noEmit` clean; Vitest 60 test files / 1047 tests passed in 4.10s |
| coverage | `pnpm test:coverage` | 0 | 60 files / 1047 tests passed; Statements 97.18% (1832/1885), Branches 91.48% (859/939), Functions 97.45% (422/433), Lines 98.95% (1612/1629) — all above the 80% gate |
| build | `pnpm build` | 0 | vite v8.3.6; 117 modules transformed; built in 843ms; PWA v1.3.0 generateSW, precache 178 entries (10660.92 KiB) |
| e2e shard 1/2 — attempt 1 | `pnpm exec playwright test --shard=1/2` | 1 | 49 passed, 1 skipped, 1 failed: `[tablet] › e2e/cargo.spec.ts:412:1` "load and delivery crates arc between the platform slot and the wagon bed" → `deliver ends at destination`, expected `< 2.6114020282346333`, received `4.831034533301158`. Timing-sensitive arc assertion; the e2e file is outside Touches and test changes are forbidden, so no fix was attempted. |
| e2e shard 1/2 — attempt 2 (retry 1 of 2) | `pnpm exec playwright test --shard=1/2` | 0 | 50 passed, 1 skipped (the `@ci` ambient-frame test at `e2e/smoke.spec.ts:960` is intentionally skipped). Confirms attempt 1 was a flaky timing assertion. |
| e2e shard 2/2 | `pnpm exec playwright test --shard=2/2` | 0 | 41 passed across tablet, phone and prod profiles |
| audit | `pnpm audit --audit-level=high` | n/a | **NOT RUN** — shell permission denied. No vulnerability result is claimed. |

The exact chained command
`pnpm check && pnpm test:coverage && pnpm build && pnpm exec playwright test --shard=1/2 && pnpm exec playwright test --shard=2/2 && pnpm audit --audit-level=high`
was rejected by the shell permission layer (long `&&` chain). Each component was therefore executed individually in the same working directory; every component except the audit ran successfully, and the audit was independently denied by the shell permission layer.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | `package.json` is `0.15.0`; no dependency or lockfile diff | `git diff -- package.json` changes only the version line; `pnpm-lock.yaml` untouched | met |
| AC-2 | Changelog has empty `[Unreleased]`, a dated `[0.15.0] - 2026-11-20` section with cargo and sky entries, and refreshed compare links | `git diff -- CHANGELOG.md` | met |
| AC-3 | `product.md:115` states v0.14.1 shipped; v1.0 gate and Phase 3 wording unchanged | Required edit denied by permissions; line 115 still reads "**Fix complete 2026-11-19; v0.14.1 release gates pending**" | **blocked — not claimed** |
| AC-4 | Comparison baseline labels are v0.15.0; eight `awaiting observation` cells intact; no numbers invented | Required edit denied by permissions; `comparison.md` is still labelled v0.14.1 (cells untouched, no numbers invented) | **blocked — not claimed** |
| AC-5 | Biome, tsc, unit, coverage, build, Playwright (two shards) and audit all exit 0 on final content | All runnable gates exit 0 (shard 1/2 required one retry); audit did not run (permission denied) | **partial — not fully claimed** |
| AC-6 | Two distinct dry-run IDs, each with all gates green and deploy skipped | Later phase (Phase 2 / Phase 3) | not claimed here |
| AC-7 | Review PASS; archive/metadata/PR terminal proof; PR merged; annotated `v0.15.0` tag | Later phase (Phase 3 / post-merge) | not claimed here |
| AC-8 | Tag-triggered workflow watched; GHCR-403-is-unknown policy; no manual-device or v1.0 claim | Later phase (Phase 3 / post-merge); manual-device checks are human-only | not claimed here |

## Scope guard

`git diff --name-only 0ac79e6b..HEAD` at head-at-verification `b3f513a`:

```
CHANGELOG.md
package.json
```

No changes to `pnpm-lock.yaml`, `src/**`, `e2e/**`, `.github/**`, `playwright.config.ts`, `release.yml`, any other `conductor/` file, or any clarity artifact. This evidence file is committed separately from the release-content commit.

## Pre-existing warnings (recorded honestly, not fixed)

1. Vite `configLoader: 'native'` unsupported feature — extensionless import `./src/core/security-headers` at `vite.config.ts:6:36` (seen in check, coverage, build and both Playwright shards).
2. `THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead.` — browser console warnings throughout the e2e runs.
3. Build chunk-size advisory — `dist/assets/index-Bf7h83Ue.js` is 818.44 kB (217.54 kB gzip), above the 500 kB threshold.

## Deviations

- None in code. Three assigned actions could not be performed because the subagent's tool permissions denied them: the `conductor/product.md:115` wording edit (P1.T3), the `comparison.md` baseline relabel (P1.T4), and the `pnpm audit --audit-level=high` command (part of P1.T5). They are recorded as blockers in the structured report, not silently skipped.

## Notes

- The cargo-arc assertion at `e2e/cargo.spec.ts:412` failed once on shard 1/2 attempt 1 (`deliver ends at destination`: received distance 4.83 vs expected < 2.61) and passed on the immediate retry. It is a pre-existing timing-sensitive assertion unrelated to release content. No test or runtime change was made: the brief forbids test changes and the file is outside Touches.
- No clarity numbers, no v1.0 claim, no old-tag changes, and no Phase 2/3 work were performed in this phase.

## Primary rework 1 — permission-bound tasks completed (supersedes the blocked rows above)

The phase subagent's three blockers were tool-permission limits, not product or
code defects. The primary performed the two documentation edits (commit
`8e433c6`) exactly as specified and ran the denied audit itself:

- `conductor/product.md:115`: only the bold phrase changed to
  `**Shipped 2026-11-19 in v0.14.1 — release gates complete**`; the rest of the
  roadmap, the v1.0 ship gate and Phase 3 text are byte-for-byte unchanged
  (verified with `git diff -- conductor/product.md`).
- `conductor/archive/clarity-audit_20261110/comparison.md`: all seven `v0.14.1`
  baseline labels retargeted to `v0.15.0`; imported definitions, cohort, privacy
  text and every `awaiting observation` cell remain unchanged. No numbers were
  invented (verified with targeted grep: 10 `awaiting observation` mentions, no
  new measurements).
- `pnpm audit --audit-level=high`: exit 0. Output: `5 vulnerabilities found`,
  severity `1 low | 4 moderate` — **no high or critical vulnerabilities**, which
  is the configured gate. No dependency or lockfile changes were made; the
  pre-existing low/moderate advisories are recorded as known debt, not fixed in
  this release chore.

The primary then re-ran the **exact chained verification command** from the plan
(all six stages in one shell invocation) after the doc edits:

```
pnpm check && pnpm test:coverage && pnpm build && pnpm exec playwright test --shard=1/2 && pnpm exec playwright test --shard=2/2 && pnpm audit --audit-level=high
```

`FULL_MATRIX_EXIT=0`. Observed: Biome 204 files clean; tsc clean; 60 files /
1047 tests passed; coverage 97.18% statements / 91.48% branches / 97.45%
functions / 98.95% lines (all above the 80% gate); Vite build green (117
modules, 818.44 kB bundle, PWA service worker); Playwright shard 1/2 50 passed
+ 1 intentional `@ci` skip, shard 2/2 41 passed (91 passed / 1 skip across
tablet, phone and prod, including cargo, sky-detail, a11y, perf budgets and
sun-moon); audit exit 0 with the low/moderate advisories noted above. No test
was weakened, skipped or deleted, and the earlier flaky cargo-arc assertion
passed on the primary run without any test change.

Final scope guard `git diff --name-only 0ac79e6b..HEAD` after rework:
`CHANGELOG.md`, `package.json`, `conductor/product.md`,
`conductor/archive/clarity-audit_20261110/comparison.md`, and this evidence
file. No `src/**`, `e2e/**`, `.github/**`, `pnpm-lock.yaml`, save schema, UI,
audio or clarity report changes; no numbers and no v1.0 claim.

AC-3, AC-4 and AC-5 are now **met** by this rework. AC-6, AC-7 and AC-8 remain
later-phase items (dry runs, review/archive/tag and tag-workflow watch) and are
not claimed here. The original blocked report is retained above for audit
honesty; this section is the authoritative Phase 1 result.
