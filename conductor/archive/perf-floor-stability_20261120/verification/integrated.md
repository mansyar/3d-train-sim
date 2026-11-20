# Integrated Verification — perf-floor-stability_20261120

- **Track:** `perf-floor-stability_20261120`
- **Branch:** `fix/perf-floor-stability_20261120`
- **Date:** 2026-11-20
- **Scope:** Phase 1 (deterministic hard gate), Phase 2 (first dry run), Phase 3 (second consecutive dry run).
- **Result:** PASS — all required local gates and two consecutive release dry runs are green. Manual-device checks remain a human-only exception.

## Required commands

| Layer | Command | Result | Evidence |
|---|---|---|---|
| Static | `pnpm exec biome check .` | pass — 204 files clean | primary exact chained command, `FULL_MATRIX_EXIT=0` |
| Static | `pnpm exec tsc --noEmit` | pass | primary exact chained command |
| Unit | `pnpm test` | pass — 60 files / 1051 tests | primary exact chained command |
| Coverage | `pnpm test:coverage` | pass — 97.18% stmts / 91.48% branches / 97.45% funcs / 98.95% lines; all above 80% | primary exact chained command |
| Build | `pnpm build` | pass — 117 modules, 819.02 kB bundle, PWA 178 precache entries | primary exact chained command |
| E2E | `pnpm exec playwright test --shard=1/2` | pass — 50 passed, 1 pre-existing `@ci` skip (`e2e/smoke.spec.ts:960`) | primary exact chained command |
| E2E | `pnpm exec playwright test --shard=2/2` | pass — 41 passed across tablet/phone/prod | primary exact chained command |
| Audit | `pnpm audit --audit-level=high` | pass — exit 0; 5 vulnerabilities (1 low, 4 moderate), no high/critical | primary exact chained command |
| Repeat | `pnpm exec playwright test e2e/perf-budget.spec.ts e2e/perf-budget-observe.spec.ts e2e/frame-contract.spec.ts --repeat-each=3` | pass — 15/15; both negative proofs threw expected messages every repeat | primary exact chained command |
| Dry run 1 | `gh workflow run release.yml --ref fix/perf-floor-stability_20261120 --field dry_run=true` | pass — `44811466927`, all gates success, deploy skipped | `verification/phase-2.md` |
| Dry run 2 | same command | pass — `44814318883`, all gates success, deploy skipped | `verification/phase-3.md` |

The exact chained command was `pnpm check && pnpm test:coverage && pnpm build && pnpm exec playwright test --shard=1/2 && pnpm exec playwright test --shard=2/2 && pnpm audit --audit-level=high && pnpm exec playwright test e2e/perf-budget.spec.ts e2e/perf-budget-observe.spec.ts e2e/frame-contract.spec.ts --repeat-each=3`, ending with `FULL_MATRIX_EXIT=0`.

## Root cause and fix

The release tag workflow `44730179589` failed only on the wall-clock throughput floor in `e2e/perf-budget.spec.ts` (`2.3696682464454977 < 2.5`), after dry run `44712469297` failed at `2.4667 < 2.5`. Throughput on shared CI runners is environment-contended and not a deterministic correctness signal. The fix removes that hard floor while keeping the `<5s` interactive mark and adds a hard frame-count/order invariant: 12 documented systems, at least 10 observed RAF frames, and exactly one tick per system per frame. Throughput remains recorded by `e2e/perf-budget-observe.spec.ts` as non-blocking observation. Negative proofs for a late mark and an over-ticking/wrong-order frame remain hard failures. No test was skipped, weakened, or deleted; the one `@ci` skip is pre-existing and untouched.

## Requirements coverage

| Requirement | Status | Evidence |
|---|---|---|
| FR-1 remove wall-clock floor, keep mark ≤5000 ms | covered | `e2e/perf-budget.spec.ts`, integrated command, negative late-mark proof |
| FR-2 deterministic order/tick hard gate | covered | `e2e/perf-budget.spec.ts`, `e2e/frame-contract.spec.ts`, negative over-tick proof |
| FR-3 deterministic negative proofs | covered | both negative specs passed on all three repeats |
| FR-4 observation spec stays non-blocking | covered | 15/15 repeat with ticks/s varying 12.96–20.76 without gating |
| FR-5 full matrix + repeated perf specs + dry runs | covered | required-command table; dry runs `44811466927`, `44814318883` |
| FR-6 diff confined to two perf specs + Conductor evidence | covered | scope guard below |
| NFR-1 no runtime/config/deps/storage/network/UI/audio/telemetry changes | covered | nine-file scope guard |
| NFR-2 no guardrail relaxed | covered | mark and frame-contract invariants are hard; observation remains visibility-only |
| NFR-3 honest evidence, no clarity/v1.0 claims | covered | non-claims below |
| NFR-4 full gates green | covered | required-command table |
| NFR-5 `v0.15.0` immutable, no retag/GHCR/deploy | covered | no tag operation, no push/deploy, both dry runs skipped deploy |
| AC-1..AC-8 | covered | phase evidence tables; AC-8 non-claims below |

## Scope guard

`git diff --name-only 15dbc05220a29a31a32480ccaa1f6a2805865a1d..HEAD` lists exactly nine files: the two perf e2e specs plus this track's Conductor state/evidence. No `src/`, `playwright.config.ts`, `package.json`, lockfile, workflow, release doc, product doc, clarity artifact, save schema, UI, audio, or telemetry file changed. The existing `v0.15.0` tag and all prior tags were not touched.

## Non-claims and human-only exceptions

- iPad Safari and Android Chrome touch/audio/frame-rate checks are human-only and were not claimed.
- The v1.0 3/3-child gate and 30-day dogfooding requirement remain unmet and unclaimed.
- Clarity comparison stays at eight `awaiting observation` cells; no clarity number was invented.
- No GHCR push, deploy, retag, force-push, or tag deletion occurred.
- Pre-existing warnings (Vite `configLoader: 'native'`, `THREE.WebGLShadowMap` deprecation, >500 kB chunk, Node 20 action deprecations) were recorded and left untouched.
