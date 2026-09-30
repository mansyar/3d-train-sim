# Specification: Sun & Moon — Child-Controlled Time of Day

## Overview

Toddlers can already watch the meadow's day drift by (150 s cycle in
`src/core/day-clock.ts`), but they can't touch it. This track adds one
icon-only **sun/moon slot to the toybox rail** (next to 🔊): each tap moves
the sky to the **next phase** — a direct, delightful cause-and-effect. The
automatic drift keeps running from the new position, and the chosen time of
day **persists** in preferences so the world comes back exactly as it was
left.

## Functional Requirements

1. **Rail slot** — a new icon-only button in the toybox rail (`src/ui/app.ts`
   + `toy-icons.ts` SVG), ≥64px target, aria-labeled, no text. Visible in
   ride mode, behaving like the mute slot.
2. **Tap = next phase** — each tap advances the day clock to the next phase
   in its existing sequence (`src/core/day-clock.ts`: dawn → morning → noon
   → dusk → night → dawn…). The **icon always shows the phase a tap will
   bring** (moon at day, sun at night), so what you see is what you get.
3. **Instant feedback** — icon swap + scale-bounce within <100 ms; the sky
   repaint goes through the existing `day-ambience.ts` repaint pipeline (no
   new tweening; reduced-motion trivially safe).
4. **Drift continues** — the automatic 150 s clock keeps advancing after a
   tap; the child repositions the clock, it doesn't pause the world.
5. **Persistence** — the last-set phase is stored in `WorldSnapshot.preferences`
   alongside `muted` (**additive, optional field** — snapshot version stays
   3). Old saves without the field open at the default mid-morning start,
   exactly as today. Save/load via the existing change-gated persistence
   watcher pattern (`src/state/persistence.ts`).
6. **Reuse night logic** — window glows, portal glow, headlight, fireflies,
   music box, and critter voices keep working through the existing
   phase-driven repaints; no special-casing.
7. **Weather independence** — the weather cycle is untouched; snow may fall
   on a noon sky as today.

## Non-Functional Requirements

- 60 FPS unchanged: no per-frame allocations; phase set + repaint are
  event-driven
- No fail states; tapping is always reversible (tap again); nothing
  destructive
- Privacy: nothing new leaves the device
- TDD for the logic-bearing parts: day-clock phase stepping + save
  round-trip of the new preference field

## Acceptance Criteria

- [ ] Rail shows the sun/moon slot; tapping cycles dawn → … → night → dawn
      with instant icon feedback
- [ ] Icon always previews the *next* phase
- [ ] Sky, water, lights, and toys all follow the tapped phase via existing
      pipelines
- [ ] Reloading restores the tapped phase; a pre-feature save still loads
      (defaults to mid-morning)
- [ ] The clock resumes drifting after a tap
- [ ] `pnpm check` clean; new e2e smoke spec passes on tablet/phone
      profiles; zero console errors

## Out of Scope

- Pausing/pinning the day clock; two separate sun/moon buttons; sky-object
  tapping
- Weather↔time coupling; new night audio rules; parent-gating the control
- Any new sky visuals or phase names beyond what `day-clock.ts` already
  defines
