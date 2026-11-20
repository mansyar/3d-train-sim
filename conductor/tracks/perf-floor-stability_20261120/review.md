# Review: Perf Floor Stability

- **Track:** `perf-floor-stability_20261120`
- **Type:** Bug
- **Branch:** `fix/perf-floor-stability_20261120`
- **Range:** `15dbc05220a29a31a32480ccaa1f6a2805865a1d..aa8b5ba`
- **Date:** 2026-11-20T21:10:00Z
- **Verdict:** `PASS WITH FINDINGS` — one Low comment-accuracy finding; no Critical or High.

## Summary

The wall-clock throughput hard gate is fully removed and replaced by a deterministic frame-count/order gate mirroring the established `frame-contract.spec.ts` witness. The interactive mark remains a hard <=5000 ms gate, negative proofs fail closed, the observation spec changed only its comment, and scope is confined to the two perf e2e specs plus Conductor files. All requirements are covered and all configured checks are green. One Low finding (F1) is a factually inaccurate comment introduced by this diff; strict mode requires fixing it in R1 rather than deferring it.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `pnpm test` | pass — 60 files / 1051 tests | `verification/phase-1.md`, `verification/integrated.md` |
| coverage | `pnpm test:coverage` | pass — 97.18 / 91.48 / 97.45 / 98.95% | `verification/integrated.md` |
| lint | `pnpm exec biome check .` | pass — 204 files clean | `verification/integrated.md` |
| typecheck | `pnpm exec tsc --noEmit` | pass | `verification/integrated.md` |
| build | `pnpm build` | pass — 117 modules, 819.02 kB, PWA 178 | `verification/integrated.md` |
| e2e | sharded Playwright | pass — 50 + 1 pre-existing skip, 41 | `verification/integrated.md` |
| audit | `pnpm audit --audit-level=high` | pass — 1 low / 4 moderate, no high/critical | `verification/integrated.md` |
| repeat | perf specs `--repeat-each=3` | pass — 15/15, negative proofs fail closed | `verification/phase-1.md` |
| dry run | `gh workflow run release.yml --ref fix/perf-floor-stability_20261120 --field dry_run=true` | pass ×2 — `44811466927`, `44814318883`; deploy skipped | `verification/phase-2.md`, `verification/phase-3.md` |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1 | `e2e/perf-budget.spec.ts`, late-mark negative proof, repeated perf 15/15 | covered |
| FR-2 | P1.T2 | order/tick-delta assertions, 30 sampled frames, `e2e/frame-contract.spec.ts` | covered |
| FR-3 | P1.T3 | late-mark and over-tick negative proofs on all repeats | covered |
| FR-4 | P1.T4 | comment-only observe-spec diff, three non-blocking samples retained | covered |
| FR-5 | P1.T5, P2.T1–T2, P3.T1 | full local matrix and two green dry runs | covered |
| FR-6 | P1.T6, P3.T3 | scope guards in all four evidence files | covered |
| NFR-1 | P1.T1–T2 | scope guard: no runtime/config/deps/storage/network/UI/audio/telemetry changes | covered |
| NFR-2 | P1.T1–T2 | mark and frame-contract assertions stay hard; observation visibility-only | covered |
| NFR-3 | P1.T6, P3.T3 | honest non-claims; manual device human-only | covered |
| NFR-4 | P1.T5 | full required-command chain exit 0 | covered |
| NFR-5 | P2.T2, P3.T2 | `v0.15.0` unchanged; no GHCR push/deploy; deploy step skipped | covered |
| AC-1 | P1.T1 | no wall-clock floor; mark guard and negative proof | covered |
| AC-2 | P1.T2 | 12-system order and delta === frames over 30 frames | covered |
| AC-3 | P1.T3 | both negative proofs threw expected messages | covered |
| AC-4 | P1.T4 | observation spec comment accurate; three samples retained | covered (F1 pertains to the hard-gate spec comment) |
| AC-5 | P1.T6 | scope guard in phase-1.md and integrated.md | covered |
| AC-6 | P1.T5 | full matrix green, no test skipped/weakened/deleted | covered |
| AC-7 | P2, P3 | consecutive green dry runs `44811466927`, `44814318883` | covered |
| AC-8 | P3.T3 | non-claims and tag immutability recorded | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- <none>

### Low

- **F1 — Inaccurate RAF-callback comment**
  - **File:** `e2e/perf-budget.spec.ts:14-15`
  - **What:** The top-level comment says both tick reads happen "inside the same RAF callback", but the before snapshot is read in the first callback and the after snapshot in the 31st. They occur at the same point within two different RAF callbacks.
  - **Why:** The wording is factually inaccurate and differs from the accurate wording in `e2e/frame-contract.spec.ts:20-21`; the general style guide requires comments to be accurate and informative.
  - **Fix:** Reword to "Both tick reads happen at the same point within their RAF callbacks, so where the scene loop sits in the callback queue cannot bias the delta."
  - **Requirement:** FR-2
  - **Test gap:** none — documentation-only.

## Overrides

- <none — strict mode; F1 is scheduled for R1.>

## Plan compliance

All four planned sections (Phase 1, Phase 2, Phase 3, plus the initial failed-tag context) are accounted for. Phase 1 has 20/20 tasks complete with checkpoint `d1b46fd`; Phase 2 has 8/8 with checkpoint `219a98f`; Phase 3 has 9/9 with checkpoint `63a444f`; metadata totals 37/37 tasks and 3/3 phases. No task was silently dropped or marked complete without verification. The final diff stays within the union of phase Touches plus Conductor state.

## Out of scope

Pre-existing warnings (Vite `configLoader: 'native'`, `THREE.WebGLShadowMap` deprecation, >500 kB bundle, Node 20 action deprecations) are not introduced by this diff. The failed `v0.15.0` tag workflow and perf-floor dry run remain in history; this track does not retag, mutate GHCR, deploy, or claim a manual device check. No clarity measurement or v1.0 child gate is claimed.

## Debt

- <none>

## Doc sync

`pending` — no product, tech-stack, product-guideline, CHANGELOG, clarity, or release-document contract changed; post-review sync will confirm `none`.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 1 | 0 (R1 scheduled) |
