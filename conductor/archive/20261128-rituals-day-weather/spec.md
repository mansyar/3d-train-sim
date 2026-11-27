# A. Rituals — Deepen the Day/Weather Clock — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

The day/weather clock greets the child. Each of the five phases (dawn, morning,
noon, dusk, night) plays a short world-greeting — critters, light, and a tiny
synthesized motif — fired automatically when the clock settles into the phase.
No new buttons, no reading, no fail states: the existing sun/moon button and
drift keep driving, the world just answers back.

## Problem / Motivation

Today the clock is a backdrop: phases change, glows toggle, weather passes. A
toddler gets no hello back from the world, so the day/night cycle is scenery
rather than a relationship. Phase 3 asks for depth over breadth — Rituals is the
recommended first direction — and this track makes the clock a companion
without adding a single control a non-reader must learn. If unsolved, the clock
stays decorative and Phase 3 opens with a weaker, UI-heavier direction instead.

## Goals & Success Metrics

- **Goal:** every clock phase greets the child with a distinct, gentle,
  auto-played greeting.
- **Metric (no human observation):** unit tests pin the phase→greeting map; e2e
  proves each greeting appears with a clean console; per-phase screenshots plus
  an animated clip are committed as evidence. Ship when green.

## Scope

### In Scope

- Greetings for all five phases, auto-fired on phase settle (~1s after the last
  clock change).
- Approved bundle: dawn chorus-critters wake + chime; morning butterflies
  drift; noon full sun glow with liveliest critters; dusk windows warm +
  critters settle; night fireflies rise + headlight + one lullaby phrase.
- Two new ambient actor families: night fireflies, dawn/morning fliers (chorus
  critters, butterflies). Authoring approach (procedural vs checked-in recipe)
  decided in plan.
- One distinct synthesized motif per phase through the existing Howler path;
  night motif is a music-box lullaby phrase.
- Settle rule for sun/moon spam: only the resting phase greets; single voice,
  no stacking.
- Reduced-motion resting states for every greeting.

### Out of Scope

- New buttons, toys, gestures, or kid-facing UI surface of any kind.
- Changes to sun/moon behavior (preview, drift resume, persistence) —
  regression-guarded only.
- Expression liveries (RM-003), Shared Play (RM-004), longer trains (RM-005),
  new pieces/locos (RM-006/007).
- Save-format migration; new persisted state (greetings derive from phase +
  settle timer).
- Telemetry or any network use; human observation.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Entering a clock phase fires that phase's greeting once the phase settles (~1s with no further change) | must |
| FR-2 | Dawn greeting: chorus critters wake and flutter near the track + soft chime motif | must |
| FR-3 | Morning greeting: butterflies drift over the meadow + morning motif | must |
| FR-4 | Noon greeting: full sun glow, critters at liveliest (hop + chirp) + noon motif | must |
| FR-5 | Dusk greeting: house windows warm, critters settle + dusk motif | must |
| FR-6 | Night greeting: fireflies rise, headlight on, one lullaby phrase + night motif | must |
| FR-7 | Each phase has a distinct synthesized motif; night reuses a music-box lullaby phrase; zero downloads | must |
| FR-8 | Rapid sun/moon taps greet only the settled phase; at most one greeting voice at a time | must |
| FR-9 | Under reduced motion every greeting renders its resting state instantly with no animation | must |
| FR-10 | Existing sun/moon behavior (preview, drift resume, persisted phase, mute) is unchanged | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | 60 FPS on mid-spec tablets during any greeting; pooled actors, no per-frame allocation in the render loop |
| NFR-2 | No new runtime dependency, no download, no network call; full airplane-mode function |
| NFR-3 | Cold start stays <5 s; no meaningful precache growth |
| NFR-4 | Icon-only, no text, no new gestures; nothing the child does can trigger navigation, download, or dialog |
| NFR-5 | Logic-bearing code (phase→greeting map, settle timer) under TDD with the 80% `src/core` + `src/state` coverage gate |
| NFR-6 | Greeting systems join the documented frame-contract order with one reason each |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Unit tests pin the phase→greeting map for all five phases, including settle-vs-spam | FR-1, FR-8 |
| AC-2 | E2E enters each phase and the greeting is visible with a clean console | FR-2, FR-3, FR-4, FR-5, FR-6 |
| AC-3 | One browser screenshot per phase committed under `verification/` | Goals |
| AC-4 | One animated clip (GIF or video per plan-resolved tooling) of a greeting cycle committed | Goals |
| AC-5 | Rapid-tap e2e: spamming sun/moon plays exactly one greeting for the settled phase | FR-8 |
| AC-6 | Reduced-motion e2e: all greetings frozen at resting state | FR-9 |
| AC-7 | `pnpm check` green (biome, tsc, vitest incl. coverage gate) | NFR-5 |
| AC-8 | Full e2e matrix green incl. offline/prod profiles; no new dependency or network use | NFR-2, FR-10 |

## Edge Cases

- Sun/moon spam mid-greeting: in-flight greeting yields to the newest settled
  phase; no overlap.
- Boot straight into a phase (e.g. saved night): resting visuals, silent until
  the next transition (autoplay policy) — assumption, see below.
- `prefers-reduced-motion` toggled mid-greeting: freeze at current resting state
  immediately.
- First-visit audio lock (iOS): motifs route through the existing Howler unlock
  path; visual greeting never waits for audio.
- Actor counts capped and pooled (counts set in plan) to hold NFR-1.

## Dependencies

- **Tracks:** none
- **External:** none (three.js, Howler, Vitest, Playwright already in tree)

## Open Questions & Assumptions

- **Assumption:** no new persisted state; greetings derive purely from current
  phase + settle timer.
- **Assumption:** boot-into-phase is silent until the next transition (browser
  autoplay policy); visuals still rest correctly.
- **Assumption:** clip format (GIF vs video file) resolved in plan after checking
  container tooling; per-phase screenshots guaranteed regardless.
- **Open:** actor authoring (procedural vs checked-in Blender recipe) — decided
  in plan via a short spike capped by NFR-1/NFR-3.

## References

- `conductor/product.md` — Phase 3 (RM-002, recommended), Toddler Test,
  guardrails
- `conductor/roadmap.md` — RM-002 (P1, no dependencies)
- `conductor/archive/sun-moon_20260930/` — sun/moon button behavior and persisted
  `preferences.dayPhase`
- `conductor/archive/time-of-day-weather_*/` — clock, glows, weather baselines
- `conductor/archive/music-box_20260913/` — lullaby phrases available for reuse
- `conductor/workflow.md` — Verification Strategy and Workflow Config
  (`pnpm check`)
