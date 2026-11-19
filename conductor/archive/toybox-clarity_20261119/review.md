# Review: Toybox Clarity and Outside-Drag Removal

- **Track:** `toybox-clarity_20261119`
- **Type:** feature
- **Branch:** `feat/toybox-clarity_20261119`
- **Range:** `6d762f35363010f0abd6f360850fa060d414b6ad..1f8748f7aa499197d042c11eb2bcf04d0979bcb4`
- **Date:** `2026-11-19T02:58:06Z`
- **Verdict:** PASS

## Summary

Three review rounds are complete. Round 1 found two findings (AC-2 tab-switch page memory not asserted; colliding generated icons) and R1 resolved both. Round 2 confirmed those fixes. After the parent rejected geometry-derived silhouettes as unintuitive, the track was reopened for a user-directed requirement change: restore hand-authored SVG icons that read as the pieces and delete the generator pipeline. R2 restored the curated pre-track `PIECE_ICONS` byte-for-byte, removed `scripts/generate-piece-icons.mjs` and `src/ui/generated-piece-icons.ts`, adapted both icon test layers to the hand-authored source, and passed the full matrix. The round-3 reviewer found one Low doc inconsistency (a stale generator bullet in the spec In Scope list); that one-line fix was applied and confirmed. Zero findings remain, and strict mode is satisfied.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `pnpm test` | pass — 57 files, 1016 tests | primary final-HEAD run |
| coverage | `pnpm test:coverage` | pass — 97.07% stmts / 91.21% branches / 97.41% funcs / 98.87% lines | primary final-HEAD run |
| lint | `pnpm exec biome check .` | pass — 198 files, no fixes or warnings | primary final-HEAD run |
| format | `pnpm exec biome check .` | pass — no fixes | primary final-HEAD run |
| typecheck | `pnpm exec tsc --noEmit` | pass | primary final-HEAD run |
| build | `pnpm build` | pass — Vite 115 modules, PWA 178 precache entries | primary final-HEAD run |
| e2e | `pnpm exec playwright test` | pass — 84 passed, 1 pre-existing `@ci` skip, 0 failed | primary final-HEAD run |
| R2 targeted e2e | `pnpm exec playwright test e2e/toybox-clarity.spec.ts e2e/smoke.spec.ts e2e/a11y.spec.ts` | pass — 29 passed, 1 pre-existing `@ci` skip, 0 failed | `verification/phase-R2.md` |
| stale generator scan | `Select-String` over active `src`/`e2e` TS | pass — no `generate-piece-icons`, `generated-piece-icons`, `--check` references | `verification/phase-R2.md` |
| audit | `pnpm audit --audit-level=high` | pass — 1 low, 4 moderate below threshold | primary final-HEAD run |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | `src/core/drawer.ts`, P1.T1 | `src/core/drawer.test.ts`, AC-1 | covered |
| FR-2 | `src/ui/toy-drawer.ts`, P2.T1 | `e2e/toybox-clarity.spec.ts`, AC-2/AC-3/AC-9 | covered |
| FR-3 | `src/ui/toy-drawer.ts`, P2.T1.4, R1.T1 | `e2e/toybox-clarity.spec.ts:143-146`, AC-2 | covered |
| FR-4 | `src/ui/toy-drag.ts`, `src/ui/app.ts`, P2.T2 | e2e toybox/smoke/undo, AC-4/AC-5/AC-6 | covered |
| FR-5 | `src/ui/toy-drag.ts`, `src/style.css`, P2.T2.3 | e2e toybox, AC-4 | covered |
| FR-6 | `src/ui/app.ts`, `src/style.css`, P2.T2.4 | e2e prod/smoke/ride-toybox-flow, AC-7 | covered |
| FR-7 | P1/P2/R2 verification | `verification/integrated.md`, AC-8 | covered |
| FR-8 | R2.T1 — hand-authored `PIECE_ICONS` in `src/ui/toy-icons.ts` | unit + e2e icon suites, AC-10 | covered |
| NFR-1 | whole diff | integrated scope check | covered |
| NFR-2 | accessible dots, no kid reading | a11y sweep unmodified, AC-9 | covered |
| NFR-3 | tap/drag only, undo preserved | e2e smoke/undo | covered |
| NFR-4 | full verification matrix | primary final-HEAD run | covered |
| NFR-5 | no disclosure/parent/viewport/catalog/release changes | diff scope | covered |
| NFR-6 | R2.T2 — generator and generated module deleted | stale-reference scan, AC-10 | covered |
| AC-1 | P1.T1.3 | `drawer.test.ts` | covered |
| AC-2 | P2.T1, R1.T1 | `toybox-clarity.spec.ts` tab-switch assertion | covered |
| AC-3 | P2.T1.2 | `toybox-clarity.spec.ts` slot-press test | covered |
| AC-4 | P2.T2.1/P2.T2.2 | e2e toybox/smoke/undo | covered |
| AC-5 | P2.T2.2 | `toybox-clarity.spec.ts` new-toy-outside test | covered |
| AC-6 | P2.T2.2 | `toybox-clarity.spec.ts` return-inside cancellation test | covered |
| AC-7 | P2.T2.4 | e2e + source grep | covered |
| AC-8 | P2.T3, R2.T3 | `verification/integrated.md`, `verification/phase-R2.md` | covered |
| AC-9 | P2.T1.1/P2.T3.2 | e2e dots + unmodified axe sweep | covered |
| AC-10 | R2.T1/R2.T2 | hand-authored icon suites, no generator references | covered |

## Findings

### Critical

<none>

### High

<none>

### Medium

F1 was found in round 1 and resolved in R1. No outstanding Medium findings.

### Low

F2 was found in round 1 and resolved in R1. F1-R2 (stale generator bullet in `spec.md`) was found in round 3 and fixed in commit `1f8748f`; the reviewer confirmed resolution. No outstanding Low findings.

## Overrides

<none>

## Plan compliance

All four phases — Phase 1, Phase 2, Phase R1, and Phase R2 — are `verified`, with checkpoints `6fbbe35740af28388ba112b1050f8ddaf80f4838`, `475bbe0b1390c1020e9f2d3ec2ed9a44c9d3b938`, `d110f58f7bac3127b1be5d3771e0ebba662830e1`, and `081da87665f797a39c2a418a01689f30e6bc34eb`. All 32 active task lines are `[x]`. Primary decisions recorded: `e2e/prod.spec.ts` was added to Phase 2 Touches because it asserted the old trash bin; R2 was appended after the parent rejected geometry-derived icons; the spec In Scope bullet was corrected directly as a one-line primary-owned doc fix.

## Out of scope

Station cargo visuals, richer sky, longer trains, new piece types, release workflow, manual device work, dry-run release checks, and any v1.0 audit gate claim. The one-child session remains informal qualitative feedback only.

## Debt

<none>

## Doc sync

updated — roadmap annotation, hand-authored icon wording, and the piece/icon contract rule were added to `conductor/product.md`; post-review sync confirms spec, plan, metadata, registry, and evidence are internally consistent.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 1 | 1 | 0 |
| 2 | PASS | 0 | 0 | 0 | 0 | 2 |
| 3 | PASS WITH FINDINGS | 0 | 0 | 0 | 1 | 0 |
| 3 confirmation | PASS | 0 | 0 | 0 | 0 | 1 |
