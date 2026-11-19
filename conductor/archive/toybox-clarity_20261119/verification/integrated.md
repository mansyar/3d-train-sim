# Integrated Verification — Toybox Clarity and Outside-Drag Removal

- **Track:** `toybox-clarity_20261119`
- **Branch:** `feat/toybox-clarity_20261119`
- **Head:** `1f8748f7aa499197d042c11eb2bcf04d0979bcb4`
- **Verified at:** `2026-11-19T02:58:06Z`
- **Result:** pass

The full configured verification strategy was re-run on the final code state after Phase R2 (`03a7ef09e3dc5013d11faf3d9f683f5440e36ed8`). Commit `1f8748f` changed only `spec.md` to remove a stale generator bullet; no code or test changed after the matrix run. The whole chain exited `0`.

## Commands

| Layer | Command | Result |
| --- | --- | --- |
| static | `pnpm exec biome check .` | Pass — 198 files checked, no fixes |
| static | `pnpm exec tsc --noEmit` | Pass — clean typecheck |
| unit | `pnpm test` | Pass — 57 files, 1016 tests |
| coverage | `pnpm test:coverage` | Pass — 57 files, 1016 tests; Statements 97.07%, Branches 91.21%, Functions 97.41%, Lines 98.87% (above the 80% gate on `src/core` + `src/state`) |
| build | `pnpm build` | Pass — Vite 115 modules; `dist/assets/index-DkqaZaVv.js` 814.58 kB / gzip 216.01 kB; PWA v1.3.0 with 178 precache entries |
| e2e | `pnpm exec playwright test` | Pass — 85 tests run, 84 passed, 1 pre-existing `@ci` skip, 0 failed in 9.8 min across tablet, phone, and prod |
| audit | `pnpm audit --audit-level=high` | Pass — 5 vulnerabilities (1 low, 4 moderate); no high findings outstanding |

## Scope check

- Phase 1 checkpoint: `6fbbe35740af28388ba112b1050f8ddaf80f4838` — pure paged drawer model.
- Phase 2 checkpoint: `475bbe0b1390c1020e9f2d3ec2ed9a44c9d3b938` — paged drawer UI, page dots/swipe, outside-board removal, and trash removal.
- Review-fix R1 checkpoint: `d110f58f7bac3127b1be5d3771e0ebba662830e1` — F1 tab-switch page-memory assertion and F2 same-tab icon uniqueness guard.
- Review-fix R2 checkpoint: `081da87665f797a39c2a418a01689f30e6bc34eb` — restored hand-authored `PIECE_ICONS`, deleted the generator script and generated module, and adapted icon tests to the committed source text.
- `e2e/a11y.spec.ts` was not modified; its four-state axe sweep passed in the full run.
- No telemetry, network calls, new storage keys, save-format changes, parent-gate changes, disclosure changes, or viewport/`user-scalable` changes.
- No generator, generated icon module, baked PNG, runtime WebGL renderer, or new dependency remains; a scan over active `src`/`e2e` TypeScript found no `generate-piece-icons`, `generated-piece-icons`, or `--check` references.
- Manual iPad Safari / Android Chrome feel remains human-only and was not claimed as agent-verified.

## Notes

Performance budgets from the prior track remained green in this run: interactive mark 1517 ms; observation samples 17.90/14.44/17.99 ticks/s; hard-gate samples 14.79/14.61/17.68 ticks/s against floor 2.5; both negative proofs emitted their expected messages (`interactive mark startTime 5001 ms exceeds 5000 ms budget`, `frame ticks/second 2.4 below floor 2.5`).

Pre-existing warnings only: Vite `configLoader: 'native'` notice, >500 kB chunk notice, and THREE `PCFSoftShadowMap` deprecation logs.
