import { findParkSpot } from '../core/park-spot';
import { rideComponentsOf, selectRideComponents } from '../core/pathing';
import type { PlacedPiece } from '../core/track-graph';
import { stepEntryPose } from './ride-motion';
import { cellToWorld } from './track-renderer';

/** A world-space resting pose: the pre-ride opener and its loading crate. */
export interface ParkPose {
  x: number;
  y: number;
  z: number;
  /** Authored-facing yaw, aligned with the ride's travel direction on rails. */
  yaw: number;
}

/**
 * The pose the pre-ride opener waits at: the entry edge of the largest
 * ride's dry nearest-to-heart step — the ride ▶ adopts first, so the train
 * rolls on with no snap — or the centre of the nearest dry cell when the
 * world has no track. Null only when a rails spot cannot be resolved from
 * the walk (callers keep the authored origin).
 */
export function parkPoseFor(pieces: readonly PlacedPiece[]): ParkPose | null {
  const spot = findParkSpot(pieces);
  if (spot.kind === 'land') {
    const at = cellToWorld(spot.cell);
    return { x: at.x, y: 0, z: at.z, yaw: 0 };
  }
  const piece = pieces.find((candidate) => candidate.id === spot.pieceId);
  const [ride] = selectRideComponents(rideComponentsOf(pieces), 1);
  const step = ride?.path.steps.find((candidate) => candidate.pieceId === spot.pieceId);
  if (!piece || !step) return null;
  const pose = stepEntryPose(piece, step);
  return { x: pose.x, y: pose.y, z: pose.z, yaw: pose.yaw };
}
