# Phase 1 Verification — Classifier and preference data layer

- **Track:** `install-onboarding_20261111` — Install Onboarding
- **Phase:** 1 — Classifier and preference data layer
- **Date:** 2026-11-18
- **Branch:** `feat/install-onboarding_20261111`
- **Base commit:** `e9fa0aeed0ca56b40d12bb9f0290f8349ef28169`
- **Head commit (at verification):** `3930a467f0d202039446d5f226725df0f80d5b6c`
- **Result:** verified

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Lint + format + types + unit | `pnpm check` | 0 | Biome clean across 194 files; `tsc --noEmit` clean; 57 test files / 1009 unit tests passed. |
| Coverage | `pnpm test:coverage` | 0 | 57 files / 1009 tests passed. Statements 97.05%, branches 91.19%, functions 97.39%, lines 98.86% — all above the 80% gate. |
| Full verification | `pnpm check && pnpm test:coverage` | 0 | Both stages green; no failures, no warnings other than the pre-existing Vite native-config notice. |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-1 | Classify installed vs browser from injectable `display-mode: standalone` and `navigator.standalone`; tolerate missing APIs. | `src/core/install-mode.ts` (`isInstalled`, `createInstallModeDetector`) and `src/core/install-mode.test.ts` (7 classifier cases). | verified |
| NFR-1 | Pure logic: no DOM/Three.js coupling and no browser global captured at module load. | `src/core/install-mode.ts` reads only injected signals; probe wiring deferred to the UI layer. | verified |
| NFR-2 | Runtime media-query changes are observable without a reload. | `src/core/install-mode.test.ts` detector tests: change flips classification, unchanged events ignored, shared listener detach/reattach. | verified |
| FR-6 | Persist install-hint dismissal in `DevicePreferences`, minimal snapshots, malformed/missing values default to false. | `src/core/save.ts` (`installHintDismissed?: boolean`, serialized only when true, ignored when malformed) and `src/core/save.test.ts` (`install-hint dismissal preference`). | verified |
| FR-5 | Dismissal rides the existing full-snapshot save path; no new storage keys or partial writes. | `src/state/persistence.ts` (`watchInstallHintPersistence`, `snapshotOf` threading) and `src/state/persistence.test.ts` ("carries the dismissal into world, mute, and day-phase saves"). | verified |
| AC-1 | Unit coverage of standalone media, legacy flag, both false, missing APIs, and runtime media-query change. | `src/core/install-mode.test.ts` — all listed combinations asserted. | verified |
| AC-6 | A rejected snapshot save leaves the dismissal resolved, throws nothing, and the toy stays interactive. | `src/state/persistence.test.ts` — "treats a rejected save as non-fatal and leaves the dismissal resolved". | verified |

## Evidence paths

- `src/core/install-mode.ts`
- `src/core/install-mode.test.ts`
- `src/core/save.ts`
- `src/core/save.test.ts`
- `src/state/persistence.ts`
- `src/state/persistence.test.ts`

## Deviations

None. All changes stayed within the phase Touches.

## Notes

- New parameters (`serializeWorld` 9th arg, `snapshotOf` 4th arg, and trailing accessors on the three existing watchers) all have defaults, so existing callers in `src/main.ts` and `src/core/portable.ts` compile and behave unchanged.
- `deserializePreferences` omits `installHintDismissed` when it is not explicitly `true`, preserving existing exact-equality assertions; consumers read it as `=== true` for a default-false boolean.
- `src/main.ts` (browser probe construction and watcher wiring) is intentionally left for Phase 2, which owns the UI.
- Two exploratory shell attempts at a targeted test run were denied by the permission policy; verification was performed with the single allowed command, `pnpm check && pnpm test:coverage`, which passed on the final run. Three verification runs total: two found and fixed formatting/expectation issues, the third passed.

## Primary verification

- **Command:** `pnpm check && pnpm test:coverage`
- **Exit code:** 0
- **Result:** pass. Biome checked 194 files with no fixes; `tsc --noEmit` clean; 57 test files / 1009 unit tests passed; coverage 97.05% statements, 91.19% branches, 97.39% functions, 98.86% lines — all above the 80% gate. Working tree clean; changed files in `e9fa0ae..HEAD` match the phase Touches plus this evidence file; commits `ece9021`, `3930a46`, `576035e` match the subagent report with no extras. AC-1 and AC-6 confirmed in `src/core/install-mode.test.ts` and `src/state/persistence.test.ts`.
