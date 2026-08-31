# Spec — Wagon Teleport at the Lap Wrap (Bridge After Curve)

**Track ID:** `wagon-teleport-lap-wrap_20260831` · **Type:** Bug (scene ride
motion) · **Branch:** `track/wagon-teleport-lap-wrap`

## Overview

When a train crosses from a curve onto a bridge — the point where its closed
loop's ride path starts and laps — a trailing wagon visibly teleports off the
rails over the surrounding terrain (observed over the frozen river's bank),
then snaps back onto the track a few seconds later ("catches up"). Crossing a
bridge fed by a straight shows no visible artifact.

**Root cause (diagnosed 2026-08-31):** two compounding defects in
`src/scene/ride-motion.ts`:

1. **Followers don't wrap around closed loops.** `poseFollowers` poses wagon
   *i* at raw path distance `distance - (i + 1) * FOLLOWER_GAP`
   (ride-motion.ts:352). Every lap, the engine's distance wraps via
   `distance %= total` (ride-motion.ts:457); immediately after, each wagon's
   distance is negative. `poseAt` handles negative distance with the
   end-overhang path — designed for wagons hanging past the last rail on
   *short open layouts* — clamping the wagon to the path **start** and
   extending it in a straight line beyond the path's beginning. On a closed
   loop the wagon belongs on the *previous lap's tail*, so this is a teleport
   from the rails to a point off the built track.

2. **The overhang tangent is unnormalized for line segments.** The line branch
   sets `tangentX = bx - ax` (magnitude = segment length ≈ 3.75 world units —
   GROUND_SIZE 60 / MEADOW_CELLS 16), while the arc branch produces a unit
   tangent. Overhang displacement is therefore `|over| × 3.75` — up to ~15.75
   units for the first wagon and ~31.5 for the second, instead of the intended
   4.2/8.4 coupler distances. This exaggerates the closed-loop teleport *and*
   corrupts the legitimate dead-end overhang on open layouts (wagons fly ~4
   cells past the last rail).

The bridge is exonerated: it rides exactly like the straight it mirrors
(`segmentForStep`, pinned by tests), and tangent continuity at the
curve→bridge boundary is exact. The artifact's *visibility* varies with
layout geometry (the wrap point sits where the component's smallest cell key
lands; a straight feeder keeps the overhang line roughly on the rails), but
the defect fires on every closed loop, every lap.

## Functional Requirements

1. **FR1 — Closed-loop follower wrap.** On closed paths, each follower's path
   distance wraps into `[0, total)` so a wagon behind the lap start rides the
   previous lap's tail. At any engine distance — including right after the
   wrap — every follower's position lies **on the path**. Wagons keep their
   existing course semantics: no flipping, facing from the local tangent
   (`faceTravel = false`).
2. **FR2 — Normalized overhang tangent.** The end-overhang extends along the
   **unit** end tangent for both segment kinds. Displacement magnitude equals
   the true coupler distance (`|over|`), for lines and arcs alike.
3. **FR3 — Dead-end pose (open layouts).** When the train rests at a dead
   end, wagons hang past the last rail along the end tangent at ~1 coupler
   gap per wagon (the intended "real train overhanging the end of the line"
   look, now at true length). No bunching onto the engine, no multi-cell
   overshoot.
4. **FR4 — No behavior change elsewhere.** Engine posing, shuttle reversing
   at dead ends, station braking/stops, parked pose
   (`parkFollowersBehind`), and straight→bridge continuity are unchanged.
   Open layouts keep the pause-then-shuttle cycle; closed loops keep
   `distance %= total` for the engine.
5. **FR5 — Fix scope.** Confined to `src/scene/ride-motion.ts` and
   `src/scene/ride-motion.test.ts`. No core/state/UI/save changes; no
   constant retuning (`FOLLOWER_GAP` stays 4.2).

## Acceptance Criteria

- **AC1 (reported scenario):** On a closed loop containing a corner feeding a
  bridge, at engine distances spanning the lap wrap (0 … FOLLOWER_GAP ×
  follower count), every follower position computed by the motion lies on the
  path — never on an off-rail straight extension.
- **AC2 (overhang length):** On a short open path at the dead end, each
  follower rests within ~one coupler gap past the path end along the end
  tangent (not the 3.75× overshoot).
- **AC3 (no regressions):** Existing `ride-motion.test.ts` suites stay green;
  adjacent behaviors listed in FR4 are pinned by characterization tests.

## Out of Scope

- Retuning `FOLLOWER_GAP` or wagon visual spacing.
- Changes to `parkFollowersBehind` (parked pose uses engine yaw, not path).
- Core pathing (`src/core/pathing.ts`), save/migration, rendering, UI.
- The loop's lap-wrap point location (smallest-cell anchoring stays as is).
