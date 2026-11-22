# Phase 1 Evidence — Release content and local matrix

- **Track:** `release-v0.15.1_20261123` — Release v0.15.1
- **Phase:** 1 — Release content and local matrix
- **Date:** 2026-11-23
- **Branch:** `chore/release-v0.15.1_20261123`
- **Base commit:** `61e600b88964de75b6f5bbf6cb1b0ee9c27eb631`
- **Head commit:** `23965a1` (release content `d803e75`/`601f178`/`75c9145`, primary-owned docs `23965a1`)
- **Result:** `verified` after one primary rework of the subagent's expected permission boundaries; the exact chained verification command exited 0 on final content. The original blocked report is retained below; `## Primary verification (authoritative)` is the final result.

## Scope guard

Only `package.json`, `CHANGELOG.md` and this evidence file were written by this
agent. No runtime source, test, config, workflow, dependency or lockfile file
was touched. `conductor/product.md` and
`conductor/archive/clarity-audit_20261110/comparison.md` are primary-owned;
this agent did not edit them. No clarity number, v1.0, image-registry, deploy,
manual-device or tag claim is made in this report.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static + unit | `pnpm check` | 0 | Biome checked 204 files clean; `tsc --noEmit` clean; Vitest 60 files / 1051 tests passed. |
| coverage | `pnpm test:coverage` | 0 | 60 files / 1051 tests passed; v8 gate met (statements 97.18%, branches 91.48%, functions 97.45%, lines 98.95% — all above the 80% floor). |
| build | `pnpm build` | 0 | Vite 8 production build succeeded; PWA `generateSW` produced 178 precache entries. |
| e2e shard 1 | `pnpm exec playwright test --shard=1/2` | 0 | 50 passed, 1 skipped (the `@ci` ambient frame-rate spec is skipped by suite config). |
| e2e shard 2 (isolated rerun) | `pnpm exec playwright test e2e/smoke.spec.ts:800 --project=phone` | 0 | 1 passed. Isolated rerun of the single phone spec that failed in the first shard-2 run. |
| e2e shard 2 | `pnpm exec playwright test --shard=2/2` | 1 → 0 | First run: 40 passed, 1 failed — phone WebKit `smoke.spec.ts:800` lost the page/browser at the mute-toggle click (`Target page, context or browser has been closed`), a contention-class flake with no functional assertion failing. After the isolated rerun passed, the full shard was rerun at the default 2 workers: 41 passed, 0 failed. |
| audit | `pnpm audit --audit-level=high` | denied | Permission layer rejected the shell command. Not run by this agent; primary must run it. |
| full chain | `pnpm check && pnpm test:coverage && pnpm build && pnpm exec playwright test --shard=1/2 && pnpm exec playwright test --shard=2/2 && pnpm audit --audit-level=high` | denied | Permission layer rejected the chained command. Per the brief, individual gates were run instead; primary must run the full chain. |

Pre-existing warnings observed, recorded without invention: Vite's
`configLoader: 'native'` extensionless-import warning in `vite.config.ts`, the
Vite >500 kB chunk-size advisory, and the WebKit `PCFSoftShadowMap` deprecation
console warnings. None failed a gate.

Retry accounting: one failed check (shard 2, first run) was rerun twice in
accordance with the documented `e2e/README.md` rerun convention and the
workflow retry policy — isolated spec, then the whole shard — and ended green.
No product investigation or source change was owed for this single
environmental trip.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | `package.json` is `0.15.1`; no dependency or lockfile diff. | Commit `d803e75` changes only the `version` field; `git diff -- package.json CHANGELOG.md` shows no dependency or `pnpm-lock.yaml` change. | verified |
| AC-2 | Changelog has empty `[Unreleased]`, dated v0.15.1 section with a plain-language entry, preserved v0.15.0 history, refreshed compare links. | Commit `601f178`: `[0.15.1] - 2026-11-23` / `### Changed` with the tablet-update reliability bullet; both v0.15.0 cargo and cloud bullets left intact; `[Unreleased]` → `v0.15.1...HEAD` and new `[0.15.1]` → `v0.15.0...v0.15.1`. | verified |
| AC-3 | `product.md` describes the deterministic gate, says cargo/sky shipped, has the three shipped rows, v1.0 gate / Phase 3 / anti-roadmap unchanged. | Primary commit `23965a1` applied the exact scoped edits; verified by `git diff` against `61e600b`. | verified (primary) |
| AC-4 | Comparison baseline labels v0.15.1; eight `awaiting observation` cells intact; no numbers invented. | Primary commit `23965a1`: 7 `v0.15.1` labels, 0 `v0.15.0` labels, exactly 8 `awaiting observation` cells. | verified (primary) |
| AC-5 | Biome, tsc, unit, coverage, build, Playwright (two shards) and audit all exit 0 on final content. | Primary re-ran the exact chained command: `FULL_MATRIX_EXIT=0`; audit exit 0 (1 low / 4 moderate, no high or critical). | verified (primary) |

## Evidence paths

- `conductor/tracks/release-v0.15.1_20261123/verification/phase-1.md` (this report)
- Task commits: `d803e75` (version bump), `601f178` (changelog)

## Deviations

None. All files written by this agent are within `Touches`.

## Blockers

1. **Exact chained verification command — permission denied.**
   - Command: `pnpm check && pnpm test:coverage && pnpm build && pnpm exec playwright test --shard=1/2 && pnpm exec playwright test --shard=2/2 && pnpm audit --audit-level=high`
   - Needed to prove FR-5 / AC-5 on final release content in one chain.
   - Expected: every gate exits 0. Primary must run this command; this agent ran the individual gates instead and did not retry the denied command.
2. **Audit gate — permission denied.**
   - Command: `pnpm audit --audit-level=high`
   - Needed as the final configured release gate (NFR-5).
   - Expected: exit 0 with no high or critical advisory. Primary must run it.
3. **P1.T3 — product-drift edits (primary-owned).**
   - `conductor/product.md`: replace the `perf-budget_20261111` row's shipped clause beginning `**Shipped 2026-11-18** — dev-only interactive mark` through the end of that cell with shipped wording for the deterministic frame-contract gate: interactive mark `<= 5000 ms` stays hard, the wall-clock `2.5 ticks/s` floor was removed by `perf-floor-stability_20261120` (#89), and the hard gate now checks documented system order and one tick per observed animation frame; leave all other cells untouched.
   - `conductor/product.md`: in the `toybox-clarity_20261119` row change the trailing clause to `station cargo and sky detail shipped in v0.15.0; longer trains remain a future idea from informal parent feedback, with no measured-gate claim`.
   - `conductor/product.md`: add shipped rows after `switch-e2e-stability_20261119` for `station-cargo-clarity_20261120`, `sky-detail_20261120` and `perf-floor-stability_20261120`, each shipped with PR #86 / #87 / #89 respectively and no clarity numbers or v1.0 claim.
4. **P1.T4 — clarity baseline labels (primary-owned).**
   - `conductor/archive/clarity-audit_20261110/comparison.md`: relabel every `v0.15.0` occurrence to `v0.15.1`, keeping all eight `awaiting observation` cells unchanged.

## Notes

- Working-tree edits to `conductor/product.md` and
  `conductor/archive/clarity-audit_20261110/comparison.md` were observed during
  this run. They were made by the primary agent, not by this phase agent, and
  are intentionally left uncommitted and unvalidated here. AC-3 and AC-4 remain
  reported as blocked for that reason.
- The deterministic frame-contract gate and cargo/cloud behaviour were exercised
  by the green Playwright shards (`frame-contract`, `perf-budget`, `cargo` and
  `sky-detail` specs all passed). This is a gate result only; no clarity or
  device observation is claimed.
- `verification/integrated.md` is intentionally not written in this phase; it
  is assembled after all phases (P1.T6.2).

## Primary verification (authoritative)

The three subagent blockers were permission boundaries, not defects. The primary
committed the two owned docs as `23965a1` and re-ran the exact chained command
on final content:

`pnpm check && pnpm test:coverage && pnpm build && pnpm exec playwright test --shard=1/2 && pnpm exec playwright test --shard=2/2 && pnpm audit --audit-level=high`

`FULL_MATRIX_EXIT=0`. Biome checked 204 files clean; `tsc --noEmit` clean;
Vitest 60 files / 1051 tests passed; coverage 97.18% statements / 91.48%
branches / 97.45% functions / 98.95% lines, all above the 80% gate; Vite build
succeeded (117 modules, 819.02 kB bundle, PWA 178 precache entries); Playwright
shard 1/2 passed 50 with 1 pre-existing `@ci` skip (`e2e/smoke.spec.ts:960`);
shard 2/2 passed 41 across tablet/phone/prod; audit exited 0 with 5 advisories
(1 low, 4 moderate, no high or critical). The deterministic perf gate logged
`12 systems over 30 observed frames` and both negative proofs threw their
expected messages. The cargo/cloud/frame-contract specs all passed.

Scope guard: `git diff --name-only 61e600b..HEAD` is exactly `package.json`,
`CHANGELOG.md`, `conductor/product.md`,
`conductor/archive/clarity-audit_20261110/comparison.md`, and this evidence
file. No runtime source, e2e/unit test, config, workflow, dependency or
lockfile change. Working tree is clean apart from gitignored `.conductor/`.

Squash guard: commits after the phase base are `d803e75`, `601f178`,
`75c9145`, `23965a1`, plus the primary evidence append; no merge or user
commits. Pre-existing Vite `configLoader: 'native'`, `>500 kB` chunk and
WebGLShadowMap warnings were left untouched. No clarity number, v1.0 claim,
manual-device claim, image-registry claim, deploy claim or tag was created.
