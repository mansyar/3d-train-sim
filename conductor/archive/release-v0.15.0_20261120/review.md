# Review: Release v0.15.0

- **Track:** `release-v0.15.0_20261120`
- **Type:** Chore
- **Branch:** `chore/release-v0.15.0_20261120`
- **Range:** `e13f6528bbc91f3bc75f04a1eaecfa800da6a572..59b741a1cf2ace29a1124a21d8a130b9cca9f9ec`
- **Date:** 2026-11-20T11:00:00Z
- **Verdict:** PASS (one Low accuracy finding corrected in post-review sync; no behavior change)

## Summary

Release content is minimal and exact: version-only bump, curated parent-facing CHANGELOG, one restored `product.md:115` phrase, and clarity-baseline relabeling with all eight `awaiting observation` cells intact. The user-authorized R1 cargo e2e fix is allocation-free, DEV-exposed for reading only, and preserves crate timing, reduced-motion, confetti, persistence and `transferWitness()` shape. Dry-run evidence is honest: two original cargo-arc failures, one later perf-floor flake and the final two consecutive green runs are all disclosed. There are no Critical, High or Medium findings. FR-7/AC-7/AC-8 are partial only because tag creation, tag push and tag-workflow watch are post-merge gates, not defects.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| Lint/format | `pnpm exec biome check .` | pass — 204 files clean | `verification/integrated.md` |
| Typing | `pnpm exec tsc --noEmit` | pass | `verification/integrated.md` |
| Unit | `pnpm test` | pass — 60 files / 1051 tests | `verification/integrated.md` |
| Coverage | `pnpm test:coverage` | pass — 97.18/91.48/97.45/98.95 | `verification/integrated.md` |
| Build | `pnpm build` | pass — 117 modules, PWA generated | `verification/integrated.md` |
| E2E local | sharded full matrix | pass — 50 + 41, 1 pre-existing `@ci` skip | `verification/integrated.md` |
| Audit | `pnpm audit --audit-level=high` | pass — 1 low / 4 moderate, no high/critical | `verification/integrated.md` |
| Cargo stability | `pnpm exec playwright test e2e/cargo.spec.ts --repeat-each=5` | pass — 30/30 | `verification/phase-R1.md` |
| Dry runs | `gh workflow run release.yml ... --field dry_run=true` | pass — final runs `44715407918`, `44717739869`, both green, deploy skipped | `verification/phase-3.md` |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 / AC-1 | P1.T1 | `verification/phase-1.md` | covered |
| FR-2 / AC-2 | P1.T2 | `verification/phase-1.md` | covered |
| FR-3 / AC-3 | P1.T3 | `verification/phase-1.md` | covered |
| FR-4 / AC-4 | P1.T4 | `verification/phase-1.md` | covered |
| FR-5 / AC-5 | P1.T5, P1.T6 | `verification/integrated.md` | covered |
| FR-6 / AC-6 | Phase 2, Phase 3, R1 | `verification/phase-2.md`, `verification/phase-3.md` | covered |
| FR-7 / AC-7 | P3.T2 | `verification/phase-3.md` | partial — post-merge by design |
| NFR-1, NFR-2 | Phase 1, R1 | diff inspection, `verification/phase-3.md` | covered |
| NFR-3 | P1.T4 | `verification/phase-1.md` | covered |
| NFR-4 | Phase 2, Phase 3 | `verification/phase-2.md`, `verification/phase-3.md` | covered |
| NFR-5 | P1.T5 | `verification/integrated.md` | covered |
| NFR-6 / AC-8 | P3.T2 | `verification/phase-3.md` | covered with human-only exception |

## Findings

### Critical

`<none>`

### High

`<none>`

### Medium

`<none>`

### Low

**F1 — trace gating wording.** `src/scene/rig-cargo.ts` records the bounded trace unconditionally; only its read API is DEV-gated (`SceneHandle.cargoTransferTrace()` via `window.__tinyTracksScene`). Evidence repeatedly called the trace itself "DEV-only". The record path is allocation-free and has no player-facing or telemetry effect, so this did not block. Fixed in post-review sync by reworded code comments, `spec.md`, `plan.md`, `verification/phase-2.md`, `verification/phase-3.md` and `verification/integrated.md` to "DEV-gated reader" / "DEV-exposed read". No behavior changed.

## Overrides

`<none — F1 was Low and was corrected rather than deferred.>`

## Plan compliance

Phase 1, R1, Phase 2 and Phase 3 are all verified; all 31 tasks are complete. Checkpoints: `4f9d9a3`, `2945aea`, `30f4676`, `eae4cae`. No task was marked complete without evidence. The post-review wording correction is documented as a doc-sync change, not a new implementation phase.

## Out of scope

Pre-existing Vite `configLoader`, `THREE.WebGLShadowMap` and >500 kB warnings were left alone. Manual iPad Safari/Android Chrome checks remain a human-only exception; the v1.0 3/3-child gate is unmet and unclaimed. Comparison cells remain `awaiting observation`; no clarity number was invented. No tag, GHCR push or deploy occurred before merge.

## Debt

`<none>`

## Doc sync

`complete` — release docs were curated in Phase 1; no product-guideline or tech-stack contract change was needed. F1 wording corrections were applied in post-review sync. `product.md` and clarity comparison are already final for this release.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 1 | 1 (F1 corrected in post-review sync) |
