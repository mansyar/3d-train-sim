# Review: Toybox Clarity and Outside-Drag Removal

- **Track:** `toybox-clarity_20261119`
- **Type:** feature
- **Branch:** `feat/toybox-clarity_20261119`
- **Range:** `6d762f35363010f0abd6f360850fa060d414b6ad..1756655e7ac1d59c9982b08f2092883873a6ed0a`
- **Date:** `2026-11-18T23:18:36Z`
- **Verdict:** PASS

## Summary

Both rounds are complete. Round 1 found two non-blocking findings: AC-2 tab-switch page memory was implemented but not asserted, and several distinct pieces rendered byte-identical generated icons. Round 1 fix phase R1 resolved both within the declared Touches: the paging e2e now switches Nature → Rails and asserts the remembered dot and viewport slots; the generator deterministically differentiates colliding hulls, throws on any remaining icon collision, regenerates all 19 icons, and a unit test asserts per-tab icon uniqueness. No new correctness, a11y, privacy, or scope defect was found. Strict mode is satisfied with zero outstanding findings.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `pnpm test` | pass — 57 files, 1016 tests | primary final-HEAD run |
| coverage | `pnpm test:coverage` | pass — 97.07% stmts / 91.21% branches / 97.41% funcs / 98.87% lines | `verification/integrated.md` |
| lint | `pnpm exec biome check .` | pass — 199 files, no fixes or warnings | primary final-HEAD run |
| format | `pnpm exec biome check .` | pass — no fixes | primary final-HEAD run |
| typecheck | `pnpm exec tsc --noEmit` | pass | primary final-HEAD run |
| generator | `node scripts/generate-piece-icons.mjs --check` | pass — 19 silhouettes, no diff | primary final-HEAD run |
| build | `pnpm build` | pass — Vite 116 modules, PWA 178 precache entries | `verification/integrated.md` |
| e2e | `pnpm exec playwright test` | pass — 82 passed, 1 pre-existing `@ci` skip, 0 failed | `verification/integrated.md` |
| R1 targeted e2e | `pnpm exec playwright test e2e/toybox-clarity.spec.ts e2e/smoke.spec.ts e2e/a11y.spec.ts` | pass — 27 passed, 1 pre-existing `@ci` skip, 0 failed | `verification/phase-R1.md` |
| audit | `pnpm audit --audit-level=high` | pass — 1 low, 4 moderate below threshold | `verification/integrated.md` |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | `src/core/drawer.ts`, P1.T1 | `src/core/drawer.test.ts`, AC-1 | covered |
| FR-2 | `src/ui/toy-drawer.ts`, P2.T1 | `e2e/toybox-clarity.spec.ts`, AC-2/AC-3/AC-9 | covered |
| FR-3 | `src/ui/toy-drawer.ts`, P2.T1.4, R1.T1 | `e2e/toybox-clarity.spec.ts:143-146`, AC-2 | covered |
| FR-4 | `src/ui/toy-drag.ts`, `src/ui/app.ts`, P2.T2 | e2e toybox/smoke/undo, AC-4/AC-5/AC-6 | covered |
| FR-5 | `src/ui/toy-drag.ts`, `src/style.css`, P2.T2.3 | e2e toybox, AC-4 | covered |
| FR-6 | `src/ui/app.ts`, `src/style.css`, P2.T2.4 | e2e prod/smoke/ride-toybox-flow, AC-7 | covered |
| FR-7 | P1/P2 verification | `verification/integrated.md`, AC-8 | covered |
| FR-8 | generator + generated icons + `toy-icons.ts`, P1.T2, R1.T2 | generator check + per-tab uniqueness assertion, AC-10 | covered |
| NFR-1 | whole diff | integrated scope check | covered |
| NFR-2 | accessible dots, no kid reading | a11y sweep unmodified, AC-9 | covered |
| NFR-3 | tap/drag only, undo preserved | e2e smoke/undo | covered |
| NFR-4 | full verification matrix | `verification/integrated.md` | covered |
| NFR-5 | no disclosure/parent/viewport/catalog/release changes | diff scope | covered |
| NFR-6 | deterministic offline generator | `--check`, R1 collision guard and unit assertion | covered |
| AC-1 | P1.T1.3 | `drawer.test.ts` | covered |
| AC-2 | P2.T1, R1.T1 | `toybox-clarity.spec.ts` tab-switch assertion | covered |
| AC-3 | P2.T1.2 | `toybox-clarity.spec.ts:170-195` | covered |
| AC-4 | P2.T2.1/P2.T2.2 | e2e toybox/smoke/undo | covered |
| AC-5 | P2.T2.2 | `toybox-clarity.spec.ts:257-267` | covered |
| AC-6 | P2.T2.2 | `toybox-clarity.spec.ts:241-247` | covered |
| AC-7 | P2.T2.4 | e2e + source grep | covered |
| AC-8 | P2.T3 | `verification/integrated.md` | covered |
| AC-9 | P2.T1.1/P2.T3.2 | e2e dots + unmodified axe sweep | covered |
| AC-10 | P1.T2, R1.T2 | generator check + generated-icon unit assertion | covered |

## Findings

### Critical

<none>

### High

<none>

### Medium

F1 was found in round 1 and resolved in R1. No outstanding Medium findings.

### Low

F2 was found in round 1 and resolved in R1. No outstanding Low findings.

## Overrides

<none>

## Plan compliance

All three phases — Phase 1, Phase 2, and Phase R1 — are `verified`, with checkpoints `6fbbe35740af28388ba112b1050f8ddaf80f4838`, `475bbe0b1390c1020e9f2d3ec2ed9a44c9d3b938`, and `d110f58f7bac3127b1be5d3771e0ebba662830e1`. All 26 active task lines are `[x]`. One primary decision is recorded: `e2e/prod.spec.ts` was added to Phase 2 Touches because it asserted the old trash bin. R1 stayed within its five declared Touches.

## Out of scope

Station cargo visuals, richer sky, longer trains, new piece types, release workflow, manual device work, and any v1.0 audit gate claim. The one-child session remains informal qualitative feedback only.

## Debt

<none>

## Doc sync

updated — roadmap annotation was added pre-review; post-review sync confirms the shipped row, spec, plan, and evidence remain consistent and no further doc change is needed.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 1 | 1 | 0 |
| 2 | PASS | 0 | 0 | 0 | 0 | 2 |
