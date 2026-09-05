# Spec: Locomotive Fleet Expansion

## Overview

Grow the selectable locomotive fleet from 3 to 6 engines, one new face per
family, using already-vendored Kenney train-kit GLBs. Each new engine gets its
own personality (pace), reuses existing whistle profiles, and slots into every
existing system (ride, camera cycling, wagon workshop, save) via the existing
`TrainKind` catalog — no new UI patterns, no save migration.

## Functional Requirements

1. **Catalog (`core/trains.ts`):** add 3 stable new kinds to `TRAIN_KINDS`:
   - `express` — `train-locomotive-b.glb` (classic steamer variant)
   - `freight` — `train-diesel-box-a.glb` (boxy freight diesel)
   - `bullet` — `train-electric-bullet-a.glb` (sleek electric bullet)

   Each with: `modelUrl`, chunky inline SVG icon (48×48 toy palette, brown
   outline, matching existing style), `aria` label, and `whistle` reusing
   existing profiles (`whistle-steam` / `whistle-diesel` / `whistle-tram`
   respectively).
2. **Pace personalities (`core/pace.ts`):** new `PERSONALITY_PACE` entries —
   `express` brisk but steadier than steam, `freight` slow-and-steady,
   `bullet` quickest of the fleet.
3. **Steam puffs (`scene/steam-puff-emitter.ts`):** new `FALLBACK_OFFSETS`
   entries tuned per model's chimney/roof position (all engines puff — playful
   consistency).
4. **Wagon workshop:** new kinds get the default wagon preset; per-train
   consist choices work for all 6 engines.
5. **Picker UI (`ui/app.ts`):** locomotive buttons remain identical chunky
   icon buttons, now in a horizontally scrollable row (CSS-only; touch-friendly,
   no pagination, no text).
6. **Persistence (`core/save.ts`):** additive — `isTrainKind()` widens
   automatically; old saves (v1/v2/v3) stay valid with zero version bump. New
   kinds only appear in saves once chosen.

## Non-Functional Requirements

- 60 FPS guardrail: extra GLB templates handled consistently with the existing
  lazy template Map in `init-scene.ts` (only the selected engine's model is
  materialized).
- Icon-only UI (no reading), mute-respecting audio, reduced-motion respected.
- Unit tests per Workflow TDD for logic-bearing code; e2e coverage of the
  6-engine picker.

## Acceptance Criteria

- [ ] All 6 engines selectable in the picker; each rides any layout correctly
- [ ] Each new engine has a visibly distinct pace personality on the hills
- [ ] Selected engine persists across reload; old save snapshots still load
- [ ] Picker scrolls horizontally on a ≥360px phone viewport; buttons stay
      ≥64px touch targets
- [ ] Wagon workshop offers presets per engine; choices persist
- [ ] `pnpm check` green; new/updated Vitest suites + one Playwright spec pass

## Out of Scope

- New audio files (whistles reuse existing profiles)
- New wagon/cargo mechanics, ride counts beyond the 4-ride cap
- Selection of remaining unused GLBs (diesel-b/c, subway/city/square families,
  passenger cars) — future track
