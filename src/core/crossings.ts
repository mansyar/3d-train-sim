/**
 * Railway crossing proximity — pure core, no three.js.
 *
 * One gate state machine per placed `crossing-gate` piece, driven by the
 * trains' positions in cell space (the cell occupies [x, x+1) × [y, y+1),
 * so the gate's centre sits at (x + 0.5, y + 0.5)). The scene advances each
 * gate once per frame with the trains' current positions and `dt`, then
 * poses the barrier arms, lantern, and bell from the returned phase — the
 * gates themselves are scene dressing, never saved, never routed around.
 *
 * Hysteresis keeps the gate honest and unflappable:
 * - From idle, any train inside the WARNING distance starts the swing shut.
 * - While down (closing or active), the gate holds while ANY train remains
 *   inside the WARNING distance — the last train out governs, so two trains
 *   on one line never flap the gate.
 * - Once lifting, only a train re-entering the (smaller) EXIT distance
 *   snaps the swing back down.
 *
 * Pure and total: no allocations beyond the returned motion, deterministic
 * under any input order, and clamped against negative `dt`.
 */

import type { Cell } from './track-graph';

/** The four poses of one crossing's barriers. */
export type CrossingPhase = 'idle' | 'closing' | 'active' | 'lifting';

/** Where one crossing's animation stands this frame. */
export interface CrossingMotion {
  phase: CrossingPhase;
  /**
   * Progress within the phase's swing, 0..1. `closing` eases 0 → 1 (arms
   * descending); `active` holds at 1 (arms down); `lifting` eases 0 → 1
   * (arms rising); `idle` rests at 0.
   */
  progress: number;
}

/** Cells: from idle, any train nearer than this starts the gates closing. */
export const CROSSING_WARNING_DISTANCE = 2.25;
/** Cells: while down, the gate holds for ANY train inside this distance. */
export const CROSSING_HOLD_DISTANCE = 2.25;
/** Cells: a rising gate snaps back down inside this guard. */
export const CROSSING_EXIT_DISTANCE = 1.25;
/** Cells: a train this close is ON the crossing — arms fully down. */
export const CROSSING_OCCUPY_DISTANCE = 0.75;
/** Seconds the barrier arms take to swing shut. */
export const CROSSING_CLOSE_SECONDS = 0.6;
/** Seconds the arms take to lift — a touch unhurried, a gentle release. */
export const CROSSING_LIFT_SECONDS = 0.8;

/** A resting gate: arms up, lantern dark, bell silent. */
export function idleCrossing(): CrossingMotion {
  return { phase: 'idle', progress: 0 };
}

/** Euclidean cell-space distance from one train to the crossing's centre. */
function distanceTo(crossing: Cell, train: { x: number; y: number }): number {
  const dx = train.x - (crossing.x + 0.5);
  const dy = train.y - (crossing.y + 0.5);
  return Math.hypot(dx, dy);
}

/**
 * Advance one crossing's motion by `dt` under the trains' current cell-space
 * positions. Deterministic and total; each crossing is advanced with its own
 * cell, so any number of gates run independently. When `out` is given it is
 * overwritten and returned — the per-frame scene loop reuses one motion per
 * crossing instead of allocating (and may pass the same object as `prev`:
 * every branch reads `prev` before writing `out`).
 */
export function advanceCrossing(
  prev: CrossingMotion,
  crossing: Cell,
  trains: readonly { x: number; y: number }[],
  dt: number,
  out?: CrossingMotion,
): CrossingMotion {
  const next = out ?? { phase: 'idle' as CrossingPhase, progress: 0 };
  const step = Math.max(0, dt);
  let nearest = Number.POSITIVE_INFINITY;
  for (const train of trains) {
    const d = distanceTo(crossing, train);
    if (d < nearest) nearest = d;
  }

  if (prev.phase === 'idle' || prev.phase === 'lifting') {
    // Up or rising: a train inside the exit guard re-closes a rising gate;
    // from idle the warning distance starts the swing.
    const trigger = prev.phase === 'idle' ? CROSSING_WARNING_DISTANCE : CROSSING_EXIT_DISTANCE;
    if (nearest <= trigger) {
      next.phase = 'closing';
      next.progress = 0;
      return next;
    }
    if (prev.phase === 'lifting') {
      const progress = prev.progress + step / CROSSING_LIFT_SECONDS;
      next.phase = progress >= 1 ? 'idle' : 'lifting';
      next.progress = progress >= 1 ? 0 : progress;
      return next;
    }
    next.phase = 'idle';
    next.progress = 0;
    return next;
  }

  // Gates down (closing or active): they hold while any train remains inside
  // the hold distance — the last train out governs, so a queue of trains
  // never flaps the gate.
  if (nearest > CROSSING_HOLD_DISTANCE) {
    next.phase = 'lifting';
    next.progress = 0;
    return next;
  }
  if (nearest <= CROSSING_OCCUPY_DISTANCE) {
    next.phase = 'active';
    next.progress = 1;
    return next;
  }
  next.phase = 'closing';
  next.progress = Math.min(1, prev.progress + step / CROSSING_CLOSE_SECONDS);
  if (prev.phase !== 'closing') {
    next.phase = 'active';
    next.progress = 1;
  }
  return next;
}
