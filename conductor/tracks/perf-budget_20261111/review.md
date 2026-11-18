# Review: Performance Budget

- **Track:** `perf-budget_20261111`
- **Type:** Feature
- **Branch:** `feat/perf-budget_20261111`
- **Range:** `6496b35aa7e7a37b6ff45ba45876a74a9703c3fa..7e82b7d` (R1 delta `9fb2bb9f3ae1453cc69d5c3489c62d43ec6f2f78..4729935185ab252a8c027ac2f798882f1cfcb97b`)
- **Date:** 2026-11-18T10:34:28Z
- **Verdict:** PASS

## Summary

The diff implements all six FRs, five NFRs, and nine ACs: a dev-only
`performance.mark('tiny-tracks-interactive')` on the boot-ready path plus two
tablet-only `@ci` specs that assert the 5000 ms interactive budget and a
calibrated frame-tick floor, with both negative paths proven. The initial local
floor of 15 ticks/s failed authoritative GitHub CI at 2.65 ticks/s; review-fix
round 1 recalibrated it to **2.5 ticks/s** from six CI samples and updated the
low-tick negative proof to 2.4. No production, player-facing, dependency,
telemetry, storage, or config change is present; the dev mark is absent from
the built output.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `pnpm test` | pass | 57 files / 1009 tests |
| coverage | `pnpm test:coverage` | pass | 97.05% stmts / 91.19% branches / 97.39% funcs / 98.86% lines |
| lint | `pnpm exec biome check .` | pass | 197 files, no fixes |
| typecheck | `pnpm exec tsc --noEmit` | pass | clean |
| build | `pnpm build` | pass | Vite + PWA service worker, 178 precache entries |
| e2e (full suite) | `CI=1 pnpm exec playwright test --workers=1` | pass | 73 passed, 0 failed on unchanged source head `f5cfb9e`; mark 982 ms |
| e2e (R1 recheck) | `CI=1 pnpm check && pnpm build && pnpm exec playwright test e2e/perf-budget.spec.ts e2e/frame-contract.spec.ts` | pass | 4 passed on `4729935`; floor 2.5, local ticks 27.60/28.34/32.11, both negative proofs log exact messages |
| audit | `pnpm audit --audit-level=high` | pass | 1 ignored high = the single dated `GHSA-fc5q-39xc-vjpf` exception |
| production mark | `grep -R -n "tiny-tracks-interactive" dist` | pass | exit 1, no matches |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1, P1.T1.1, P1.T1.2 | `src/main.ts` DEV block; dist grep; observe spec | covered |
| FR-2 | P1.T2, P1.T2.1, P2.T2.1 | `e2e/perf-budget-observe.spec.ts`, `e2e/perf-budget.spec.ts`, tablet-only config | covered |
| FR-3 | P1.T2, P1.T2.2 | tick sampling via `scene.frameSystems()` in both specs | covered |
| FR-4 | P2.T1, P2.T1.1, P2.T1.2, R1.T1 | phase-1 samples, R1 CI samples, floor constant 2.5 | covered |
| FR-5 | P2.T2, P2.T3, R1.T1.1 | live assertion plus two pure negative-proof tests | covered |
| FR-6 | P1.T3, P2.T4 | 3-file diff, dist grep, integrated scope check | covered |
| NFR-1 | P1.T3.2, P2.T4.1 | `verification/integrated.md` full matrix | covered |
| NFR-2 | P1.T1.2, P1.T3.1 | diff inspection; no network/storage/UA/telemetry | covered |
| NFR-3 | P1.T3.1, P2.T4.2 | diff inspection; no kid-UI/parent-gate/viewport/a11y change | covered |
| NFR-4 | P2.T4.2 | spec and evidence explicitly keep manual-device frame-rate human-only | covered |
| NFR-5 | P1.T2.2, P2.T1.1, R1.T1 | raw samples, derivation, JSON attachments, R1 evidence | covered |
| AC-1 | P1.T2.1 | dev mark observed once, startTime ≤ 5000 ms | covered |
| AC-2 | P1.T1.1, P1.T1.2 | dist grep finds no mark | covered |
| AC-3 | P1.T2, P2.T2 | three `@ci` tests, tablet-only | covered |
| AC-4 | P1.T2.2, P2.T1.1, P2.T1.2, R1.T1 | six CI samples, σ 0.0457, `min−2σ 2.5586 → 2.5`, headroom 0.15 | covered |
| AC-5 | P2.T3.2, R1.T1.1 | low-tick negative proof 2.4 < 2.5 throws exact message | covered |
| AC-6 | P2.T3.1 | late-mark negative proof throws exact message | covered |
| AC-7 | P1.T3.2, P2.T4.1 | final full matrix green | covered |
| AC-8 | P1.T3.1, P2.T4.2 | diff confined to dev mark + two new specs | covered |
| AC-9 | P2.T4.2 | manual-device feel remains human-only | covered |

## Findings

### Critical

<none>

### High

<none>

### Medium

<none>

### Low

F1 — stale pre-squash commit hashes in `verification/phase-R1.md` (lines 11–12,
220–221), flagged in round 2 and **fixed** in the same round by replacing them
with reachable checkpoint `4729935` and docs commit `fc8d97e`. Requirement:
NFR-5. No open findings.

## Overrides

<none>

## Plan compliance

Three phases, 23/23 tasks `[x]`, all Status `verified`, each with Result,
Checkpoint, and Evidence. P1 `4f5eb3a7aee92d179134bbedf89252a073f6fca3`;
P2 `6ba1ffe5e116924eafb8f65bb5c12e2e9965c62d`;
R1 `4729935185ab252a8c027ac2f798882f1cfcb97b`. Final diff stays within the
union of the phases' Touches plus Conductor state. No task was silently
dropped.

## Out of scope

Manual-device touch feel, audio unlock, and real-device frame rate remain
human-only per NFR-4/AC-9. No dependency upgrades, config edits, player-facing
changes, or threshold changes beyond the CI-approved 2.5 ticks/s floor were
made. The GitHub runner's shard-2 apt browser-install failure is infrastructure
and is documented, not fixed here.

## Debt

No findings were deferred. Load sensitivity of the two-worker local e2e runs
and the authoritative GitHub CI calibration are documented in
`verification/integrated.md` and carried into the PR risks; a lower CI sample
triggers another fix round rather than a waiver.

## Doc sync

`updated` — pre-review sync added the shipped annotation to `conductor/product.md`;
post-fix sync updated it to the 2.5 ticks/s CI-derived floor and refreshed
`verification/integrated.md`. Post-review sync confirmed no further doc change
is needed.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS | 0 | 0 | 0 | 0 | n/a |
| 2 | PASS | 0 | 0 | 0 | 1 | F1 |
