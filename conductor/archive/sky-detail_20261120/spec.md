# Sky Detail — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

A visual-only deepening of the existing day/weather sky: two gently drifting
cloud layers with weather-linked cover, readable at toddler scale. It is Phase 2
polish on an already-shipped system, not a Phase 3 roadmap start.

## Problem / Motivation

The sky already has a gradient, sun/moon discs and a few flat cloud sprites, but
an informal parent note calls sky detail lacking. Today's single cloud layer
barely changes between clear and stormy weather, so weather feels less alive. If
unaddressed, this stays unmeasured feedback; this track fixes only the visual
continuity, not the measurement gap.

## Goals & Success Metrics

- **Goal:** layered, slowly drifting clouds that visibly follow the weather bed
  without new controls, assets or audio.
- **Metric:** automated dev/e2e witnesses for layer count, drift and weather
  response, plus a green full matrix. No child measurements or v1.0 claim.

## Scope

### In Scope

- Two parallax cloud layers (near/far) reusing the existing procedural puff
  texture and fixed sprite pools.
- Slow drift with wrap; near layer slightly faster than far.
- Cloud cover follows the existing `WeatherIntensity.cloud` bed, including soft
  cross-fades and the quality guardrail scale.
- Reduced motion: drift frozen, static layered clouds still visible.
- Pure allocation-free helper(s), unit tests, dev/e2e witnesses, full
  verification matrix.

### Out of Scope

- Thunder, lightning, flashes, new/changed audio, rain or snow particle redesign.
- New downloaded/generated image assets, dependencies, storage keys, save/schema
  changes, telemetry, accounts, network calls.
- Any kid-UI control, text, gesture, or camera/zoom change.
- New piece types, locomotives, train length, cargo changes, clarity
  measurements, v1.0 claims, Phase 3 work.
- The `conductor/product.md:115` v0.14.1 wording fix — explicitly deferred to
  the follow-up release track.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Render two distinct cloud layers (near/far) with readable depth, reusing the existing puff texture and fixed sprite pools; no new downloads. | must |
| FR-2 | Cloud cover follows the live weather bed: more visible puffs/opacity in cloudy/rain, fewer in clear, moderate in snow; cross-fades stay soft. | must |
| FR-3 | Clouds drift slowly and wrap inside the sky arc; the near layer moves slightly faster than the far layer (parallax). | must |
| FR-4 | Under reduced motion, drift is frozen and static layered clouds remain visible; weather/day repaint still works. | must |
| FR-5 | Frame path is allocation-free: no per-frame mesh/texture/material creation; positions and opacities update in place on preallocated pools. | must |
| FR-6 | Dev/e2e witnesses expose layer count, drift state/relative speed, and weather-linked cover; existing sky/weather/day e2e stays green. | must |
| FR-7 | Visual-only diff: no save schema/key, UI, audio, telemetry or dependency changes; sun/moon and weather clock contracts unchanged. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No new runtime network requests, identifiers or third-party scripts; offline behavior intact. |
| NFR-2 | Gentle motion only — no flashes, shakes or startling sound; toddler guidelines honored. |
| NFR-3 | 60 FPS target; fixed pools; no per-frame allocation; perf and axe gates stay green. |
| NFR-4 | Full matrix green: Biome, tsc, unit, 80% coverage, build, Playwright tablet/phone/prod, axe, perf budget. |
| NFR-5 | Diff confined to sky/weather scene + pure helper/tests + Conductor state; no release-document edits here. |
| NFR-6 | Reduced motion honored; axe clean in all four states. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Unit/e2e witness proves exactly two cloud layers with distinct depth and drift speed. | FR-1 |
| AC-2 | Witness shows cover rising for cloudy/rain and falling for clear, through a soft cross-fade. | FR-2 |
| AC-3 | Witness shows drift over frames, near faster than far, with wrapping that stays inside the arc. | FR-3 |
| AC-4 | Reduced-motion context shows static layered clouds, zero drift, and working weather repaint. | FR-4 |
| AC-5 | Static check/test proves no per-frame allocation or new meshes after boot; perf-budget e2e green. | FR-5, NFR-3 |
| AC-6 | Witnesses expose count/drift/cover; existing sun-moon, weather, a11y and perf specs remain green. | FR-6 |
| AC-7 | No diff in `package.json`, lockfile, save/preferences, UI, audio, clarity artifacts or `product.md`; comparison stays 8× `awaiting observation`; no v1.0 claim. | FR-7, NFR-5 |
| AC-8 | Full matrix passes incl. coverage, build, tablet/phone/prod Playwright, axe and perf; manual device remains human-only. | NFR-4, NFR-6 |

## Edge Cases

- Reduced motion freezes drift but keeps the layered static frame.
- Weather cross-fade begins or ends mid-drift; cover eases, never pops.
- Clear weather still shows a few puffs; snow is moderate, never a whiteout.
- Day phase jump (sun/moon button) tints clouds without a flash.
- Quality guardrail halves the weather bed; clouds stay readable.
- Reload restores day phase only; clouds derive from weather clock, no saved
  progress.
- Tablet/phone parity; `dispose()` removes all cloud meshes and releases owned
  resources.

## Dependencies

- **Tracks:** none. A follow-up release track depends on this one, not vice versa.
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** "sky detail" means the informal, unmeasured parent note; no
  clarity numbers are inferred.
- **Assumption:** the existing procedural puff texture is reused; no new image
  asset is needed.
- **Assumption:** manual tablet check stays human-only; the follow-up release
  handles it per your earlier choice.
- **Assumption:** the v1.0 gate remains unclaimed; Phase 3 is not started by this
  track.

## References

- `conductor/product.md` (day/weather history line 62; feedback line 114;
  roadmap framing lines 124–138)
- `conductor/archive/clarity-audit_20261110/report.md`, `comparison.md`
- `conductor/product-guidelines.md`
- `src/scene/sky-dome.ts`, `src/scene/weather-particles.ts`,
  `src/scene/day-ambience.ts`, `src/core/weather-cycle.ts`,
  `src/core/sky-palette.ts`
- `e2e/sun-moon.spec.ts`
