# Phase 1 Verification — Pure transfer timing and data-contract guard

- **Track:** station-cargo-clarity_20261120 — Station Cargo Clarity
- **Phase:** 1 — Pure transfer timing and data-contract guard
- **Date:** 2026-11-20
- **Branch:** `feat/station-cargo-clarity_20261120`
- **Base commit:** `38fd5615969079590873058191ccb8f64745fabc`
- **Head commit at verification:** `6e102df4033a61f2e29b770174a5f9c30a3fa49c`
  (`33745cf` test-first commit → `6e102df` implementation commit; this report is
  committed in a later docs commit after verification.)
- **Result:** verified

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| TDD red — unit | `pnpm test` | 1 | Expected failure: `Cannot find module './cargo-transfer'`; import-graph guard also flagged the unresolved edge. No implementation existed yet. |
| TDD green — unit | `pnpm test` | 1 | First implementation run: 2 `arcLift` endpoint assertions failed on `sin(PI)` float residue (~1.22e-16). |
| TDD green — unit (fixed) | `pnpm test` | 0 | After snapping `arcLift` ends to exact 0: 58 files / 1029 tests passed. |
| Static | `pnpm exec biome check .` (via `pnpm check`) | 0 | 200 files checked, no fixes applied. |
| Types | `pnpm exec tsc --noEmit` (via `pnpm check`) | 0 | No type errors; frozen union annotations compile. |
| Unit | `pnpm test` (via `pnpm check`) | 0 | 58 files / 1029 tests passed. |
| Coverage | `pnpm test:coverage` | 0 | 58 files / 1029 tests passed. Statements 97.16%, branches 91.44%, functions 97.44%, lines 98.94% — all above the 80% gate. `src/core/cargo-transfer.ts` has no uncovered lines (absent from the uncovered-lines table). |
| Verification | `pnpm check && pnpm test:coverage` | 0 | Exact brief command; all layers green. |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-3 / AC-1 | Deterministic, bounded, monotonic 0→1 progress; arc starts at the platform endpoint, ends at the wagon endpoint, with deterministic midpoints and a short gentle lift. | `transferProgress` (clamped, monotonic frame loop, instant-duration path) and `transferPoint` (endpoint, midpoint, `TRANSFER_LIFT < 1`) tests in `src/core/cargo-transfer.test.ts`; implementation uses `clamp01` + half-sine. | verified |
| FR-3 / NFR-1 | Direction-independent interpolation and no per-frame allocation; pure core TS with no scene/three dependency. | Load vs delivery midpoint tests assert identical geometry and equal lift; `transferPoint` writes through the caller's `out` object and returns the same reference across 21 calls. Module has zero imports. Import-graph guard passed. | verified |
| FR-5 / AC-5 | Cancel-and-snap on interruption so no crate is stranded mid-arc; cargo data/save semantics unchanged. | `resolveTransferProgress` returns exactly 1 when cancelled, and `transferPoint` lands exactly on the destination for both directions; P1.T2 tests assert `CargoLoad`, `CargoAction`, `actionAtStop`, `loadAfterAction`, `deliveredCountAfter`, `MAX_DELIVERED_CRATES = 8`, and the minimal/full persisted snapshot key sets. No save/key/telemetry/dependency file changed. | verified |
| NFR-3 | 80% statements/branches/functions/lines on `src/core` + `src/state`. | Coverage summary 97.16 / 91.44 / 97.44 / 98.94; new module fully covered. | verified |

## Evidence paths

- `src/core/cargo-transfer.ts` — new pure helper (progress, arc lift, in-place point interpolation, cancel resolution).
- `src/core/cargo-transfer.test.ts` — 13 new tests: helper behavior (red→green) and the frozen cargo/save contract guards.
- `conductor/tracks/station-cargo-clarity_20261120/verification/phase-1.md` — this report.
- Coverage output: console only from `pnpm test:coverage` (no redirect/artifact written).

## Deviations

None.

## Notes

- TDD sequence honored: the failing test file was committed first (`33745cf`), then the implementation (`6e102df`).
- One green-phase fix: `arcLift` now returns exactly 0 at both ends instead of `Math.sin(PI)`'s tiny float residue, so crates land exactly on endpoints.
- The Vite config emits a pre-existing `configLoader: 'native'` warning about an extensionless import in `vite.config.ts`. Unrelated to this phase and outside Touches; left unchanged.
- No scene, UI, e2e, save, telemetry or dependency files were touched. Phase 2 will consume the helper in the renderer; the e2e orphan-mesh assertion belongs to that phase.

## Primary verification

- **Command:** `pnpm check && pnpm test:coverage` (run by the primary agent from the repo root)
- **Exit code:** 0
- **Result:** pass. Biome checked 200 files with no fixes; `tsc --noEmit` clean; unit run 58 files / 1029 tests passed; coverage 97.16% statements / 91.44% branches / 97.44% functions / 98.94% lines — all above the 80% gate.
- **Tree/diff check:** `git status --porcelain` clean apart from the untracked `conductor/runs/` housekeeping dir; `git diff --name-only 38fd561..HEAD` = exactly the three Touches files, no unreported files.
- **Squash guard:** commit range `33745cf`, `6e102df`, `d79dace` matches the report's `commits`; no merge or user commits.
