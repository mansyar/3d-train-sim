/**
 * Pure helpers for the short crate arc between a station platform slot and a
 * wagon bed. The scene owns the meshes and the clock; this module only turns
 * elapsed time into a bounded, deterministic position. No Three.js, and no
 * allocation in the per-frame path — callers pass a scratch point to fill.
 *
 * The math is direction-independent: the same interpolation serves a load
 * (platform → wagon) and a delivery (wagon → platform); only the endpoints
 * change. Cancelling resolves the progress to the destination so a removed
 * station or a stopped ride never strands a crate between the two.
 */

/** One transfer is short — a gentle hand-off, not a journey (seconds). */
export const TRANSFER_DURATION_SECONDS = 0.5;

/** Peak lift at the arc midpoint, in world units — small enough to stay gentle. */
export const TRANSFER_LIFT = 0.3;

/** Plain 3D point shared with the scene's transforms; y is up. */
export interface TransferPoint {
  x: number;
  y: number;
  z: number;
}

/** Clamp to the arc's [0, 1] domain; both ends are inclusive. */
function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

/**
 * Bounded normalized progress in [0, 1] from elapsed seconds. Clamped at both
 * ends so a late frame or a negative delta cannot overshoot an endpoint, and
 * a non-positive duration means an instant hand-off.
 */
export function transferProgress(
  elapsedSeconds: number,
  durationSeconds: number = TRANSFER_DURATION_SECONDS,
): number {
  if (durationSeconds <= 0) return 1;
  return clamp01(elapsedSeconds / durationSeconds);
}

/**
 * The gentle arc's vertical shape: 0 at either endpoint, peaking at the
 * midpoint. A half sine is smooth and symmetric, so both directions share it.
 */
export function arcLift(progress: number): number {
  const p = clamp01(progress);
  // sin(PI) is a tiny non-zero float; snap the ends so the crate lands exactly
  // on an endpoint instead of hovering a hair above it.
  if (p === 0 || p === 1) return 0;
  return Math.sin(Math.PI * p);
}

/**
 * Fills `out` with the interpolated crate position: a straight horizontal
 * path from `from` to `to` with a small vertical lift peaking at the midpoint.
 * Writes in place and returns the same object, so the per-frame path allocates
 * nothing. Direction-independent — only the endpoints decide the direction.
 */
export function transferPoint(
  from: Readonly<TransferPoint>,
  to: Readonly<TransferPoint>,
  progress: number,
  out: TransferPoint,
): TransferPoint {
  const p = clamp01(progress);
  out.x = from.x + (to.x - from.x) * p;
  out.y = from.y + (to.y - from.y) * p + arcLift(p) * TRANSFER_LIFT;
  out.z = from.z + (to.z - from.z) * p;
  return out;
}

/**
 * Visible progress for a transfer. On cancel (station gone, ride stopped) the
 * crate snaps to its final state instead of freezing mid-arc, so no mesh is
 * left stranded between endpoints. Progress 1 is always the destination —
 * the wagon on a load, the platform slot on a delivery.
 */
export function resolveTransferProgress(progress: number, cancelled: boolean): number {
  return cancelled ? 1 : clamp01(progress);
}
