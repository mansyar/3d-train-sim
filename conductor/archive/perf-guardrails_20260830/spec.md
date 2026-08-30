# Spec: Performance Guardrails

**Track ID:** `perf-guardrails_20260830` · **Type:** Feature · **Branch:** `track/perf-guardrails_20260830`

## Overview

v0.3.0 raised the visual ceiling (weather particles, soft shadows,
multi-train rides, night headlight beams) and CI already had to lower the
ambient FPS floor. This track adds an invisible self-tuning layer: a
per-frame FPS probe feeding a quality-tier controller that gently trims
the heaviest effects when frame rate sags on mid-spec tablets — defending
the "60 FPS on mid tablets" success criterion with no visible UI, no fail
states, no toddler-visible popping.

## Functional Requirements

1. **FPS probe (core, pure, TDD)** — new `src/core/perf-monitor.ts`:
   - Preallocated ring buffer of frame deltas — **zero per-frame
     allocations** (hard rule from the workflow self-review checklist).
   - Rolling verdict over a ~4 s window: `healthy` / `strained` /
     `critical`, thresholds as named constants.
   - Hidden-tab safety: accepts a paused flag (fed from the existing
     `visibility-controller.ts`) so background throttling never counts as
     device strain; the paused gap must not poison the next verdict.
2. **Quality controller (core, pure, TDD)** — same module:
   - Maps sustained verdicts to levels with toddler-gentle rules:
     degrade after sustained strain; recover only after sustained health
     (slower than degrading); cooldown between level changes so nothing
     flaps; never skip levels upward.
   - Levels: **L0** full quality (current look) → **L1** render scale
     clamped + shadow map halved → **L2** pixel ratio 1.0, shadows off,
     weather particles halved. Emits a callback only on level change.
3. **Scene applier (non-logic)** — `src/scene/quality-applier.ts`:
   applies a level to the live renderer, shadow-casting lights, and the
   existing weather-particle emitter. Transitions smooth; never a visible
   pop.
4. **Wiring** — init-scene frame loop feeds the probe; debug HUD only
   behind `?perf=debug` (tiny DOM overlay with fps + level). No settings,
   no user-facing UI.
5. **Privacy** — entirely on-device; no network, no persisted perf data.

## Non-Functional Requirements

- Zero per-frame allocations in the probe path.
- Reduced-motion and mute behaviors untouched.
- No regressions to existing vitest suites and Playwright specs.

## Acceptance Criteria

- Unit tests cover probe verdicts, hidden-tab pause, degradation,
  cooldown, and recovery (>80% coverage on new core modules).
- On a mid-spec tablet (or Chrome CPU throttling ~6×) with a heavy scene —
  4 trains, rain, night — the app stays playable; forced strain steps
  quality down gently and recovers after load eases.
- `?perf=debug` shows live fps + level; without it, nothing is visible.
- `pnpm check` + all Playwright suites stay green.

## Out of Scope

- No user-facing quality settings; no analytics or telemetry.
- No geometry LOD / asset diet / bundle-size work (candidate for a
  separate track).
- No changes to e2e FPS floor assertions (only revisited if this track
  makes them flakier).
