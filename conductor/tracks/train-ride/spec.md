# Specification — Train Ride (Autonomous Locomotive)

**Track ID:** `train-ride`
**Type:** Feature

## Overview

The heart of Tiny Tracks: press ▶ and the locomotive chugs around the layout the
child built. This track turns the static Kenney locomotive into a moving train
with a gentle follow-camera — the "cause and effect" moment the product exists
for. Pure path logic lives in `src/core/pathing.ts` (as `tech-stack.md` already
anticipates), motion glue in `src/scene/`, and a minimal ▶/⏹ trigger in
`src/ui/`.

## Functional Requirements

1. **Path solver — `src/core/pathing.ts` (pure, TDD, no three.js imports):**
   - Input: the world's pieces (`track-graph.ts` supplies connectivity).
   - Output: an ordered traversal (piece + entry/exit edges) the train follows.
   - **Closed loops** → train circles continuously.
   - **Open layouts (dead ends)** → train pauses briefly and **reverses
     direction** — never stuck, honoring "infinite layouts, zero dead ends."
   - **Single piece** → shuttles back and forth across it.
   - Deterministic; total for every non-empty layout — no failure results.
2. **Ride state — `src/state/`:** minimal `idle ⇄ riding` state machine;
   constant, gentle speed; ride stops gently (train halts, camera eases back)
   if the layout is edited mid-ride.
3. **Train motion — `src/scene/`:** locomotive interpolates position + yaw
   along the path's piece geometry at 60 FPS; no per-frame allocations.
4. **Go/Stop trigger — `src/ui/`:** chunky (≥64px) icon-only ▶/⏹ button; dims
   gently when the meadow is empty (no error text — icon-only UI rule).
5. **Follow camera — `src/scene/`:** camera softly trails the locomotive during
   the ride; eases back to the overview position on stop. `prefers-reduced-motion`
   honored.

## Non-Functional Requirements

- >80% unit coverage on `pathing.ts` (logic-bearing); motion/camera verified by
  smoke + manual checks
- 60 FPS on mid-spec tablets; zero runtime network calls; no fail states, no text

## Acceptance Criteria

- ▶ with ≥1 piece starts the train; ⏹ stops it and the camera returns to overview
- Loop layout → continuous circling; open layout → reverses at ends; 1 piece → shuttle
- Empty meadow → ▶ dimmed; editing mid-ride → gentle stop
- Playwright smoke extended: place pieces → press ▶ → train moves, console
  clean, localhost-only
- Full gate suite green (`pnpm check` + Playwright)

## Out of Scope

Whistle/audio (own track), full control panel, multiple trains, track switches,
elevation, autosave, scenery.
