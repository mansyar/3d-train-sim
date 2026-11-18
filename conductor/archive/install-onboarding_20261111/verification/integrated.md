# Integrated Verification — Install Onboarding

- **Track:** `install-onboarding_20261111` — Install Onboarding
- **Branch:** `feat/install-onboarding_20261111`
- **Date:** 2026-11-18
- **Result:** pass
- **Scope:** full configured verification strategy on the complete track branch (not a single phase)

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Lint + format | `pnpm exec biome check .` | 0 | 195 files checked, no fixes applied. |
| Typecheck | `pnpm exec tsc --noEmit` | 0 | Clean. |
| Unit | `pnpm test` | 0 | 57 test files / 1009 tests passed. |
| Coverage | `pnpm test:coverage` | 0 | 57 files / 1009 tests passed; statements 97.05%, branches 91.19%, functions 97.39%, lines 98.86% — all above the 80% gate on `src/core` + `src/state`. |
| Build | `pnpm build` | 0 | Vite production build + PWA service worker generated. |
| E2E | `pnpm exec playwright test` | 0 | 68 passed, 1 skipped (`@ci` ambient-frame test), across tablet, phone and prod profiles; includes the new install-onboarding spec and the unmodified four-state axe sweep. |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | Unit coverage of standalone media, legacy flag, both false, missing APIs, runtime change | `src/core/install-mode.test.ts` | covered |
| AC-2 | Standalone emulation renders no hint element | `e2e/install-onboarding.spec.ts` — 3/3 browser tests passed | covered |
| AC-3 | No hint before hold; icon + iOS instruction after hold | `e2e/install-onboarding.spec.ts` | covered |
| AC-4 | Hint nested in `.preset-tray`; kid shell unchanged | `e2e/install-onboarding.spec.ts` normalized non-tray DOM signature | covered |
| AC-5 | Dismiss → reload → hidden; reset → hint returns | `e2e/install-onboarding.spec.ts` (green after one authorized rework) | covered |
| AC-6 | Rejected save is non-fatal | `src/state/persistence.test.ts` | covered |

## Notes

- The only warnings are pre-existing: Vite native-config loader notice, a chunk-size advisory, and Three.js `PCFSoftShadowMap` deprecation. The `@ci` ambient-frame test was skipped by the suite's existing configuration.
- One rework was required in Phase 3: the boot-rendered hint's dismiss button was not wired and its visible text `OK` failed axe's `label-content-name-mismatch`. Both were fixed minimally in `src/ui/parent-gate.ts` and re-verified; no axe rule was disabled.
- No telemetry, new storage keys, UA sniffing, `beforeinstallprompt`, or viewport-policy change was introduced.
