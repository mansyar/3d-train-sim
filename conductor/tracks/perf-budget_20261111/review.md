# Review: Performance Budget

- **Track:** `perf-budget_20261111`
- **Type:** Feature
- **Branch:** `feat/perf-budget_20261111`
- **Range:** `6496b35aa7e7a37b6ff45ba45876a74a9703c3fa..5f44b4415a5a09fb95e3cd7dd437a2c71eb0b351`
- **Date:** 2026-11-18T10:07:53Z
- **Verdict:** PASS

## Summary

The diff cleanly implements all six FRs, five NFRs, and nine ACs: a dev-only
`performance.mark('tiny-tracks-interactive')` on the boot-ready path plus two
tablet-only `@ci` specs that assert the 5000 ms interactive budget and a
calibrated 15 ticks/s frame floor, with both negative paths proven. No
production, player-facing, dependency, telemetry, storage, or threshold change
is present. All configured checks pass; the dev mark is absent from the built
output.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `pnpm test` | pass | 57 files / 1009 tests |
| coverage | `pnpm test:coverage` | pass | 97.05% stmts / 91.19% branches / 97.39% funcs / 98.86% lines |
| lint | `pnpm exec biome check .` | pass | 197 files, no fixes |
| typecheck | `pnpm exec tsc --noEmit` | pass | clean |
| build | `pnpm build` | pass | Vite + PWA service worker, 178 precache entries |
| e2e | `CI=1 pnpm exec playwright test --workers=1` | pass | 73 passed, 0 failed on final code head `f5cfb9e`; mark 982 ms, ticks 24.09/21.99/25.92 |
| audit | `pnpm audit --audit-level=high` | pass | 1 ignored high = the single dated `GHSA-fc5q-39xc-vjpf` exception |
| production mark | `grep -R -n "tiny-tracks-interactive" dist` | pass | exit 1, no matches |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1, P1.T1.1, P1.T1.2 | `src/main.ts` DEV block; dist grep; observe spec | covered |
| FR-2 | P1.T2, P1.T2.1 | `e2e/perf-budget-observe.spec.ts`, `e2e/perf-budget.spec.ts`, tablet-only config | covered |
| FR-3 | P1.T2, P1.T2.2 | tick sampling via `scene.frameSystems()` in both specs | covered |
| FR-4 | P2.T1, P2.T1.1, P2.T1.2 | phase-1 samples, phase-2 derivation, floor constant | covered |
| FR-5 | P2.T2, P2.T3 | live assertion plus two pure negative-proof tests | covered |
| FR-6 | P1.T3, P2.T4 | 3-file diff, dist grep, integrated scope check | covered |
| NFR-1 | P1.T3.2, P2.T4.1 | `verification/integrated.md` full matrix | covered |
| NFR-2 | P1.T1.2, P1.T3.1 | diff inspection; no network/storage/UA/telemetry | covered |
| NFR-3 | P1.T3.1, P2.T4.2 | diff inspection; no kid-UI/parent-gate/viewport/a11y change | covered |
| NFR-4 | P2.T4.2 | spec and evidence explicitly keep manual-device frame-rate human-only | covered |
| NFR-5 | P1.T2.2, P2.T1.1 | raw samples, derivation, JSON attachments | covered |
| AC-1 | P1.T2.1 | dev mark observed once, startTime ≤ 5000 ms | covered |
| AC-2 | P1.T1.1, P1.T1.2 | dist grep finds no mark | covered |
| AC-3 | P1.T2, P2.T2 | three `@ci` tests, tablet-only | covered |
| AC-4 | P1.T2.2, P2.T1.1, P2.T1.2 | six-sample calibration with min/headroom recorded | covered |
| AC-5 | P2.T3.2 | low-tick negative proof throws exact message | covered |
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

<none>

## Overrides

<none>

## Plan compliance

Two phases, 21/21 tasks `[x]`, both Status `verified`, both with Result,
Checkpoint, and Evidence. P1 checkpoint `4f5eb3a7aee92d179134bbedf89252a073f6fca3`;
P2 checkpoint `6ba1ffe5e116924eafb8f65bb5c12e2e9965c62d`. Final diff stays
within the union of the phases' Touches plus Conductor state; no Review Fixes
phase was needed. No task was silently dropped.

## Out of scope

Manual-device touch feel, audio unlock, and real-device frame rate remain
human-only per NFR-4/AC-9. No dependency upgrades, threshold changes beyond the
approved 15 ticks/s floor, config edits, or player-facing changes were made.

## Debt

No findings were deferred. Load sensitivity of the two-worker local e2e runs is
documented in `verification/integrated.md` and will be carried into the PR risks;
GitHub Actions CI remains the authority for the FPS floor, and a lower CI sample
triggers a fix round rather than a waiver.

## Doc sync

`updated` — pre-review sync added the shipped annotation to `conductor/product.md`;
post-review sync confirmed no further doc change is needed.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS | 0 | 0 | 0 | 0 | n/a |
