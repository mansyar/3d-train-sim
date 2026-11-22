# Integrated Verification — Release v0.15.1 (release-v0.15.1_20261123)

- **Track:** release-v0.15.1_20261123
- **Branch:** `chore/release-v0.15.1_20261123`
- **Date:** 2026-11-22
- **Scope:** All three phases complete; full local matrix plus two consecutive release dry runs.
- **Result:** PASS. Manual-device checks remain a human-only exception; post-merge tag/workflow and Conductor completion gates are governed by the release runbook.

## Required commands

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| Static | `pnpm exec biome check .` via `pnpm check` | 0 — 204 files clean | `verification/phase-1.md` |
| Static | `pnpm exec tsc --noEmit` via `pnpm check` | 0 | `verification/phase-1.md` |
| Unit | `pnpm test` via `pnpm check` | 0 — 60 files / 1051 tests | `verification/phase-1.md` |
| Coverage | `pnpm test:coverage` | 0 — 97.18% statements / 91.48% branches / 97.45% functions / 98.95% lines; all >80% | `verification/phase-1.md` |
| Build | `pnpm build` | 0 — 117 modules, 819.02 kB bundle, PWA 178 precache entries | `verification/phase-1.md` |
| E2E shard 1 | `pnpm exec playwright test --shard=1/2` | 0 — 50 passed, 1 pre-existing `@ci` skip (`e2e/smoke.spec.ts:960`) | `verification/phase-1.md` |
| E2E shard 2 | `pnpm exec playwright test --shard=2/2` | 0 — 41 passed across tablet, phone and prod | `verification/phase-1.md` |
| Security | `pnpm audit --audit-level=high` | 0 — 5 advisories: 1 low, 4 moderate, no high/critical | `verification/phase-1.md` |
| Exact chain | full Phase 1 command under the primary | `FULL_MATRIX_EXIT=0` | `verification/phase-1.md` `## Primary verification (authoritative)` |
| Release dry run 1 | `gh workflow run release.yml --ref chore/release-v0.15.1_20261123 --field dry_run=true` | run `45068023992` success, deploy skipped | `verification/phase-2.md` |
| Release dry run 2 | same command | run `45069711685` success, deploy skipped | `verification/phase-3.md` |

The full suite was sharded deliberately to avoid the resource degradation previously observed in one long single-run matrix; no test was skipped, weakened or deleted. The only skip is the pre-existing `@ci` case outside this diff. The deterministic perf gate logged `frame contract: 12 systems over 30 observed frames`; its negative proofs threw the expected `late-mark` and `over-tick` messages. Only pre-existing Vite `configLoader: 'native'`, WebGLShadowMap deprecation and >500 kB chunk warnings were observed.

## Requirements coverage

| ID | Status | Evidence |
| --- | --- | --- |
| FR-1 version `0.15.1` | PASS | `package.json:3`, Phase 1 scope guard |
| FR-2 curated CHANGELOG | PASS | Phase 1 evidence; empty `[Unreleased]`, dated `[0.15.1] - 2026-11-23` cargo/cloud/determinism entries, refreshed links |
| FR-3 product drift and shipped rows | PASS | `23965a1`; perf row, toybox row, three new shipped rows |
| FR-4 clarity baseline relabel | PASS | `comparison.md`: 7 `v0.15.1`, 0 `v0.15.0`, 8 `awaiting observation` |
| FR-5 full matrix | PASS | Required commands table; `FULL_MATRIX_EXIT=0` |
| FR-6 two consecutive dry runs | PASS | `45068023992`, `45069711685` |
| FR-7 PR/review/archive/tag/watch | Partial by design: archive/PR are Conductor completion gates and tag/watch are post-merge runbook steps; no early tag created | `verification/phase-3.md` |
| NFR-1 no runtime/config/deps changes | PASS | Scope guard: only release content and Conductor state |
| NFR-2 no clarity numbers/v1.0 claim | PASS | All eight comparison cells empty; no gate claim |
| NFR-3 honest evidence | PASS | phase-1/2/3 evidence and non-claims |
| NFR-4 no tag overwrite/force-push | PASS | `git tag --list v0.15.1` empty; no force-push |
| NFR-5 all gates green | PASS | Required commands table |
| NFR-6 manual device human-only | PASS | Not claimed by any agent |
| AC-1..AC-6 | PASS | Phase 1 + Phase 2 + this table |
| AC-7/8 | Partial by design | Post-merge PR/archive/tag/watch gates; no pre-merge claim |

## Scope guard

`git diff --name-only 85d019354eb7e7479ab17dd6b2df0bf72ef1dd20..HEAD` is confined to release content (`package.json`, `CHANGELOG.md`, `conductor/product.md`, `conductor/archive/clarity-audit_20261110/comparison.md`) and Conductor track state/evidence. No runtime source, tests, dependencies, lockfile, workflows, deployment config, save storage, kid UI, audio or telemetry changed.

## Non-claims and human-only exceptions

- Manual iPad Safari / Android Chrome device verification is human-only and not claimed.
- The v1.0 3/3-child gate is unmet and not claimed.
- No clarity measurement was invented: all comparison cells remain `awaiting observation`.
- GHCR 403 is reported as unknown; no GHCR or deploy success is claimed.
- `v0.15.0` and older tags are immutable; no `v0.15.1` tag existed before merge.
- The failed `v0.15.0` tag workflow `44730179589` is unchanged; this release's post-merge tag workflow is a separate runbook step.
