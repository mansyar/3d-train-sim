/**
 * Hill elevation profiles — pure core, no three.js.
 *
 * The hill run rides above the flat rail plane: `slope-up` climbs 0 → H,
 * `hill` cruises the crest at H, `slope-down` descends H → 0 (H calibrated
 * to the Kenney kit rail line, measured from the GLBs ≈ 1.1 units). Every
 * other catalog piece is flat. Rotation and riding direction stay out of the
 * base profiles: `heightAt` is defined in the piece's own base frame, and the
 * ride-frame helpers below map world-oriented steps onto it.
 */

import type { Edge, PieceType, Rotation } from './pieces';

/** Hill crest height above the flat rail plane (kit rail line, from the GLBs). */
export const HILL_HEIGHT = 1.1;

/**
 * The auto-blend window: where a step's natural entry height disagrees with
 * the height the train carries in, the disagreement eases away over this
 * bounded fraction of the step (of its ride progress), never popping.
 */
export const HILL_BLEND_FRACTION = 0.25;

/** Agreement threshold below which two joint heights need no easing. */
const HEIGHT_EPSILON = 1e-6;

/**
 * Height above the flat rail plane at base-frame progress t: t = 0 is the
 * piece's south edge at yaw 0, t = 1 its north edge (world north = −z).
 * Piecewise-linear and total — t outside [0, 1] clamps to the profile ends,
 * and every non-hill piece rides flat.
 */
export function heightAt(type: PieceType, t: number): number {
  const progress = Math.min(1, Math.max(0, t));
  switch (type) {
    case 'slope-up':
      return HILL_HEIGHT * progress;
    case 'hill':
      return HILL_HEIGHT;
    case 'slope-down':
      return HILL_HEIGHT * (1 - progress);
    default:
      return 0;
  }
}

/** One ridden crossing of a piece: its type, yaw, and the entry edge. */
export interface RideSpan {
  type: PieceType;
  rotation: Rotation;
  from: Edge;
}

const COMPASS: readonly Edge[] = ['north', 'east', 'south', 'west'];

/**
 * The piece's low edge in world orientation — where its base-frame progress
 * starts. Yaw labels advance one compass step clockwise per 90°, so the base
 * south edge (the climb foot) rotates with the piece.
 */
function lowEdgeOf(rotation: Rotation): Edge {
  return COMPASS[(2 + rotation / 90) % 4] as Edge;
}

/** True when the step rides the piece against its base frame (high edge first). */
export function isReversedSpan(span: RideSpan): boolean {
  return span.from !== lowEdgeOf(span.rotation);
}

/**
 * Natural height at ride progress t (0 = entry edge, 1 = exit edge) of a
 * ridden step. Reversed riding samples the base profile mirrored, so a slope
 * climbed forward is descended identically when shuttled back.
 */
export function rideHeightAt(span: RideSpan, t: number): number {
  const baseT = isReversedSpan(span) ? 1 - t : t;
  return heightAt(span.type, baseT);
}

/** The entry and exit heights of one ridden step. */
export function stepHeights(span: RideSpan): { entry: number; exit: number } {
  return { entry: rideHeightAt(span, 0), exit: rideHeightAt(span, 1) };
}

/** Gentle s-curve (smoothstep) — motion eases in and out, per the guidelines. */
function smoothstep(u: number): number {
  return u * u * (3 - 2 * u);
}

/**
 * The gentle auto-blend: the height the train rides at t of a step, easing
 * from the height it carries in (`prevExitHeight`) onto the step's natural
 * profile. Agreeing joints ride the natural profile untouched; disagreeing
 * ones blend over the bounded window's start — never a pop, never a float,
 * never a failure. Pure and total.
 */
export function easedHeightAt(prevExitHeight: number, span: RideSpan, t: number): number {
  const natural = rideHeightAt(span, t);
  if (Math.abs(prevExitHeight - rideHeightAt(span, 0)) < HEIGHT_EPSILON) return natural;
  if (t >= HILL_BLEND_FRACTION) return natural;
  const u = smoothstep(t / HILL_BLEND_FRACTION);
  return prevExitHeight + (natural - prevExitHeight) * u;
}
