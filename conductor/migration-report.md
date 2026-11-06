# Conductor Migration Report

- **Date:** 2026-11-06T23:47:00Z
- **From:** Conductor 1.x
- **To:** Conductor 2.0
- **Mode:** Upgrade in place

## Context

- **Preserved:** `product.md`, `tech-stack.md`, `product-guidelines.md` — not rewritten.
- **Regenerated:** `workflow.md` with a filled `## Workflow Config` block and a
  project-specific `## Verification Strategy`.
- **Index:** `index.md` merged in place; version marker added, a `## Tracks`
  section and a `## Capabilities` section added. Existing links preserved.
- **Scaffolding:** `tracks.md` and `tracks/` already existed; `.conductor/` added
  to `.gitignore` for runtime evidence and backups.
- **Agents:** `conductor-phase` and `conductor-reviewer` installed under
  `.opencode/agents/` with project command allowlists.
- **Coverage gate:** promoted from prose to enforcement — `vite.config.ts`
  thresholds (80% statements/branches/functions/lines on `src/core` +
  `src/state`) and the CI Vitest job now runs `pnpm test:coverage`.
  Baseline at migration: **97.17% statements, 90.87% branches, 99.39% lines**.

## Tracks

There are **no active tracks** in `conductor/tracks/`. All 59 tracks are under
`conductor/archive/` and are historical. No legacy track is blocked, because
none is runnable.

| Group | Tracks | Missing v2 metadata | Plan v2 | Spec v2 | Recommended action |
| --- | --- | --- | --- | --- | --- |
| Completed and archived (status `done`/`complete`/`archived`) | 49 tracks, see registry | `priority`, `depends_on`, `progress`, `review_verdict`, `doc_sync`, `pr_*`, `legacy`, `migrated_*` | no | no | Keep as historical |
| **Inconsistent archived status** | `oops-proof-building_20260903` (in progress), `river-life-expansion_20260905` (in progress), `soft-shadows-light-tuning` (in progress), `switches-branches_20260903` (in progress), `tunnels_20260831` (in progress), `perf-guardrails_20260830` (new), `railway-crossing-gate_20260905` (new), `release-v0.3.0_20260830` (new), `river-bridge_20260830` (new), `starter-railway_20260903` (new), `steam-puffs_20260830` (new) | same | no | no | Historical. Shipped per `product.md`/registry. Status field is stale; do not reactivate. |

### Active legacy track

None.

### Completed legacy track

All archived tracks. They keep their original spec and plan. Recreate one with
`conductor-new-track` only if the new review/evidence trail is wanted for a
future change; the old folder remains the historical record.

### Legacy worktrees

`.conductor/worktrees/` does not exist. Nothing to prune.

### Reverted or abandoned legacy track

None flagged `[-]` in the registry.

## Open Questions & Assumptions

- **Assumption:** Archived tracks do not need v2 `metadata.json` fields. They are
  not read by `conductor-implement`, `conductor-review`, or phase revert. If one
  is ever revived, it must be recreated with `conductor-new-track`.
- **Assumption:** The eleven stale archived statuses (`new`, `in progress`) are
  bookkeeping drift, not unfinished work. `product.md` marks every corresponding
  feature as shipped, and `tracks.md` lists them as done.
- **Open question:** The registry table lists 35 tracks while the archive holds
  59. The remainder are named in the prose block below the table. Decide whether
  to unify these into one table or keep the split.

## Limits

- Legacy tracks are blocked by `conductor-implement`, `conductor-review`, and
  phase revert until they are recreated or manually repaired.
- Old specs and plans were not rewritten automatically.
- When a track is repaired, remove `legacy: true` from its metadata and update
  the spec/plan to the v2 contract.
- The pre-migration directory is backed up at
  `.conductor/backups/conductor-v1-20261106-234551/` (local, not committed).
- v2 runs sequentially in the current worktree and creates no worktrees.
