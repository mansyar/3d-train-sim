# Integrated Verification — Release v0.15.0

- **Track:** `release-v0.15.0_20261120`
- **Branch:** `chore/release-v0.15.0_20261120`
- **Base:** `main` @ `e13f6528bbc91f3bc75f04a1eaecfa800da6a572`
- **Date:** 2026-11-20
- **Result:** PASS — pre-merge gates complete; post-merge tag and tag-workflow gates pending by design. Manual device and v1.0 child gates not claimed.

## Required commands

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| Static | `pnpm exec biome check .` | exit 0, 204 files clean | `verification/phase-1.md` |
| Typing | `pnpm exec tsc --noEmit` | exit 0 | `verification/phase-1.md` |
| Unit | `pnpm test` | exit 0, 60 files / 1051 tests | `verification/phase-1.md`, `verification/phase-R1.md` |
| Coverage | `pnpm test:coverage` | exit 0, 97.18% statements / 91.48% branches / 97.45% functions / 98.95% lines (all above 80%) | `verification/phase-1.md` |
| Build | `pnpm build` | exit 0, 117 modules, PWA service worker generated | `verification/phase-1.md`, `verification/phase-R1.md` |
| E2E (local full matrix) | `pnpm exec playwright test --shard=1/2`, `--shard=2/2` | 50 passed + 1 pre-existing `@ci` skip, 41 passed; 0 failures | `verification/phase-1.md` |
| Audit | `pnpm audit --audit-level=high` | exit 0, `1 low | 4 moderate`, no high/critical | `verification/phase-1.md` |
| Dry run 1 (final) | `gh workflow run release.yml --ref chore/release-v0.15.0_20261120 --field dry_run=true` | run `44715407918`, all four gates success, deploy skipped | `verification/phase-3.md` |
| Dry run 2 (final) | same command | run `44717739869`, all four gates success, deploy skipped | `verification/phase-3.md` |

The exact chained Phase 1 command was re-run by the primary on the final release content with `FULL_MATRIX_EXIT=0`. Phase R1's exact command was re-run by the primary with all four stages exit 0: `pnpm check`, `pnpm build`, `pnpm exec playwright test e2e/cargo.spec.ts --repeat-each=5` (30/30), and companion sky/a11y/perf specs (8/8). Only pre-existing warnings appeared: Vite `configLoader: 'native'` extensionless import at `vite.config.ts:6:36`, `THREE.WebGLShadowMap: PCFSoftShadowMap` deprecation, and a >500 kB chunk notice.

## Origin of the two dry-run failures and the R1 fix

The first two dry runs (`44698232311`, `44700234497`) failed the e2e gate on the pre-existing cargo-arc test: the test's own RAF sampler captured too few samples or stopped before landing under CI load. Release content cannot affect crate motion; the primary's sharded local matrix passed. The user then explicitly said "fix it on this track", which is recorded as a scope override in `spec.md` and implemented as Phase R1: a bounded, preallocated trace records every cargo transfer sample in the app, and the DEV-gated `SceneHandle.cargoTransferTrace()` exposes it, and the cargo e2e asserts from that trace. No crate timing, reduced-motion behavior, confetti, persistence, `transferWitness()` shape or player-facing behavior changed.

After R1, a third dry run (`44709418739`) passed, a fourth (`44712469297`) failed on a separate perf-floor CI-load flake (`2.4667 < 2.5` ticks/s) with all functional tests green, and the final two runs (`44715407918`, `44717739869`) passed consecutively. No test was weakened or deleted.

## Requirements coverage

| ID | Status | Evidence |
| --- | --- | --- |
| FR-1 / AC-1 | PASS — `package.json:3` reads `0.15.0`; no dependency or lockfile change | `verification/phase-1.md` |
| FR-2 / AC-2 | PASS — empty `[Unreleased]`, dated `[0.15.0]` cargo + cloud entries, refreshed compare links | `verification/phase-1.md` |
| FR-3 / AC-3 | PASS — `conductor/product.md:115` restored to shipped wording; only that bold phrase changed | `verification/phase-1.md` |
| FR-4 / AC-4 | PASS — `comparison.md` retargeted to v0.15.0; all eight values remain `awaiting observation` | `verification/phase-1.md` |
| FR-5 / AC-5 | PASS — full local matrix green; audit gate passes with no high/critical findings | `verification/phase-1.md` |
| FR-6 / AC-6 | PASS — final two consecutive dry runs green; image build succeeds, GHCR push and deploy skipped | `verification/phase-2.md`, `verification/phase-3.md` |
| FR-7 / AC-7 | PRE-MERGE PASS; post-merge tag and tag-workflow gates pending by design | `verification/phase-3.md` |
| NFR-1 / NFR-2 | PASS — no runtime, save, telemetry, UI, audio, dependency or workflow change in release content; R1 change is an always-recorded, allocation-free trace read only by the DEV scene handle, plus e2e | `verification/phase-3.md` scope guard |
| NFR-3 | PASS — no clarity numbers, no v1.0 claim, comparison still eight `awaiting observation` cells | `verification/phase-1.md`, `verification/phase-3.md` |
| NFR-4 | PASS — no tag overwrite or force-push; GHCR 403 rule recorded as unknown | `verification/phase-3.md` |
| NFR-5 | PASS — all configured commands exit 0, coverage above 80% | required-commands table |
| NFR-6 / AC-8 | PASS with human-only exception — manual iPad Safari / Android Chrome checks not performed, v1.0 gate not claimed | `verification/phase-3.md` |

## Non-claims and post-merge ownership

- No `v0.15.0` tag exists at this point: `git tag --list v0.15.0` empty; latest tag `v0.14.1`.
- No GHCR push, Coolify deploy or production verification occurred during dry runs.
- After squash merge, the primary must create an annotated `v0.15.0` tag at the squash commit, push it without a second confirmation (failing if the tag already exists), and watch the tag-triggered release workflow. A GHCR 403 is reported as unknown.
- Manual device checks remain a human-only exception; the v1.0 3/3-child gate is unmet and unclaimed.
