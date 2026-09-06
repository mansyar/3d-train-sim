# Contributing to Tiny Tracks

Thanks for helping build a toy for little engineers! This guide gets
you oriented; the deep source of truth is the [`conductor/`](conductor/index.md)
folder — start with [`conductor/workflow.md`](conductor/workflow.md).

## Dev setup

- **Node ≥ 24** and **pnpm 11** (`corepack` or `npm i -g pnpm`)
- `pnpm install`
- `pnpm dev` — Vite dev server
- Node 24 LTS on Windows/macOS/Linux; a tablet or browser touch
  emulation for manual checks

## Quality gates

Before committing, run the full gate suite:

```bash
pnpm check                      # biome + tsc --noEmit + vitest
pnpm exec playwright test       # e2e smoke (boots the app, places pieces)
```

CI runs the same gates on every PR. See the Windows note in
`conductor/workflow.md` if `CI=true` prefixes misbehave under pnpm.

## The conductor workflow

Work is organized into **tracks** — short-lived branches, one concern
each, registered in [`conductor/tracks.md`](conductor/tracks.md):

1. A track gets a folder under `conductor/tracks/<track-id>/` with a
   `spec.md` (what & why), `plan.md` (phased tasks), and `metadata.json`
2. Tasks execute phase by phase per
   [`conductor/workflow.md`](conductor/workflow.md) — the plan is the
   source of truth
3. Completed tracks archive to `conductor/archive/` and the registry
   row moves with them

Branches follow `track/<track-id>` off `main`, merged back when the
track completes.

## Testing policy

**Test-Driven Development for logic-bearing code only** — everything in
`src/core/` and `src/state/` (algorithms, state machines, persistence)
gets failing tests first, aiming at >80% coverage. Scene wiring, DOM
glue, and audio triggers (`src/scene/`, `src/ui/`, `src/audio/`) are
covered by Playwright smoke tests and manual tablet verification
instead. Details in `conductor/workflow.md`.

## Commits & branches

```
<type>(<scope>): <description>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore` —
e.g. `feat(core): Add grid snap resolution for track pieces`. Keep
branches small; one track per branch.

## 3D assets

Original pieces (tunnel, station, hills, switches, crossing gate,
barge, delight toys) are **not hand-sculpted**: each has a
deterministic, checked-in Blender recipe in
[`scripts/`](scripts/) that rebuilds and exports the GLB in any Blender
session. The authoring rules — mount measurements, node-name
contracts, export flags — live in
[`conductor/tech-stack.md`](conductor/tech-stack.md). Kit assets come
from the Kenney Train Kit (CC0).

## The privacy bar

Nothing leaves the device. No analytics, no error-tracking services, no
network calls at runtime — for a toddler product this is non-negotiable
(see `conductor/product-guidelines.md`). If your change would add one,
stop and discuss first.
