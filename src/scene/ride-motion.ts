import type { Object3D } from 'three';
import type { Edge } from '../core/track-graph';
import { MEADOW_CELLS, neighbourOf } from '../core/track-graph';
import type { RideController, RideState } from '../state/ride';
import type { WorldStore } from '../state/world';
import { GROUND_SIZE } from './ground';
import { cellToWorld } from './track-renderer';

const CELL_SIZE = GROUND_SIZE / MEADOW_CELLS;

/** Gentle chug speed in world units per second (one cell ≈ 3.75 units). */
const RIDE_SPEED = 2.2;
/** A toddler-visible beat at a dead end before the shuttle reverses. */
const END_PAUSE_SECONDS = 0.9;
/** How long a mid-ride stop eases down to a standstill. */
const STOP_EASE_SECONDS = 0.6;
/** Yaw offset aligning the Kenney locomotive's authored facing with travel. */
const MODEL_YAW_OFFSET = Math.PI;

/**
 * One leg of the ride between two cell-edge midpoints: either a straight run
 * or a quarter-arc pivoting on the cell centre (matching how the corner
 * models are anchored). Built once per ride start — never per frame.
 */
interface Segment {
  kind: 'line' | 'arc';
  ax: number;
  az: number;
  bx: number;
  bz: number;
  cx: number;
  cz: number;
  r: number;
  a0: number;
  sweep: number;
  length: number;
}

export interface RideMotion {
  /** Advance the animation by dt seconds. Allocates nothing per frame. */
  update(dt: number): void;
  dispose(): void;
}

/**
 * Makes the locomotive follow the solved path: closed loops cycle forever,
 * open layouts ride to the dead end, pause a beat, and shuttle back. Mid-ride
 * edits ease the train to a gentle standstill right where it is — a toy left
 * on the track, never an error.
 */
export function createRideMotion(
  model: Object3D,
  world: WorldStore,
  ride: RideController,
): RideMotion {
  let segments: Segment[] = [];
  let total = 0;
  /** Forward distance along the path, always in [0, total]. */
  let distance = 0;
  let travelDirection: 1 | -1 = 1;
  let pauseTimer = 0;
  /** Eases 0 (parked) ⇄ 1 (riding) so stops and starts stay gentle. */
  let speedScale = 0;
  let unsubscribe: (() => void) | null = ride.subscribe((mode, state) => {
    if (mode === 'riding' && state) beginRide(state);
    // Idle keeps the last pose — update() eases speedScale to 0 in place.
  });

  function edgeMidpoint(cell: { x: number; y: number }, edge: Edge): { x: number; z: number } {
    const a = cellToWorld(cell);
    const b = cellToWorld(neighbourOf(cell, edge));
    return { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
  }

  function beginRide(state: RideState): void {
    const byId = new Map(world.pieces().map((piece) => [piece.id, piece]));
    segments = [];
    for (const step of state.path.steps) {
      const piece = byId.get(step.pieceId);
      if (!piece) continue; // Stale step — re-solves on the next start.
      const entry = edgeMidpoint(piece.cell, step.from);
      const exit = edgeMidpoint(piece.cell, step.to);
      if (piece.type === 'straight') {
        segments.push({
          kind: 'line',
          ax: entry.x,
          az: entry.z,
          bx: exit.x,
          bz: exit.z,
          cx: 0,
          cz: 0,
          r: 0,
          a0: 0,
          sweep: 0,
          length: Math.hypot(exit.x - entry.x, exit.z - entry.z),
        });
      } else {
        // The corner model's arc pivots on the cell corner shared by its two
        // open edges; its ends sit on the edge midpoints, tangent-
        // perpendicular to each edge (collinear with the straights' rails).
        const a = cellToWorld(piece.cell);
        const half = CELL_SIZE / 2;
        const center = {
          x: a.x + (step.from === 'east' || step.to === 'east' ? half : -half),
          z: a.z + (step.from === 'south' || step.to === 'south' ? half : -half),
        };
        const a0 = Math.atan2(entry.z - center.z, entry.x - center.x);
        const a1 = Math.atan2(exit.z - center.z, exit.x - center.x);
        let sweep = a1 - a0;
        while (sweep > Math.PI) sweep -= 2 * Math.PI;
        while (sweep < -Math.PI) sweep += 2 * Math.PI;
        segments.push({
          kind: 'arc',
          ax: entry.x,
          az: entry.z,
          bx: exit.x,
          bz: exit.z,
          cx: center.x,
          cz: center.z,
          r: CELL_SIZE / 2,
          a0,
          sweep,
          length: Math.abs(sweep) * (CELL_SIZE / 2),
        });
      }
    }
    total = 0;
    for (const segment of segments) total += segment.length;
    distance = 0;
    travelDirection = state.direction;
    pauseTimer = 0;
    speedScale = 1; // ▶ starts the chug immediately.
    poseAt(0);
  }

  /** Write the pose for forward-path distance `d` into the model. */
  function poseAt(d: number): void {
    let remaining = d;
    let segment = segments[0];
    for (const candidate of segments) {
      if (remaining < candidate.length) {
        segment = candidate;
        break;
      }
      remaining -= candidate.length;
    }
    if (!segment) return;

    const u = segment.length > 0 ? remaining / segment.length : 0;
    let x: number;
    let z: number;
    let tangentX: number;
    let tangentZ: number;
    if (segment.kind === 'line') {
      x = segment.ax + (segment.bx - segment.ax) * u;
      z = segment.az + (segment.bz - segment.az) * u;
      tangentX = segment.bx - segment.ax;
      tangentZ = segment.bz - segment.az;
    } else {
      const angle = segment.a0 + segment.sweep * u;
      x = segment.cx + Math.cos(angle) * segment.r;
      z = segment.cz + Math.sin(angle) * segment.r;
      // Tangent of (cos, sin) rotated by the sweep direction.
      tangentX = -Math.sin(angle) * Math.sign(segment.sweep);
      tangentZ = Math.cos(angle) * Math.sign(segment.sweep);
    }
    // Shuttling back reverses the facing, not the position.
    tangentX *= travelDirection;
    tangentZ *= travelDirection;

    model.position.set(x, 0, z);
    // The locomotive's forward is -Z at yaw 0 (plus the kit's authored offset).
    model.rotation.y = Math.atan2(-tangentX, -tangentZ) + MODEL_YAW_OFFSET;
  }

  return {
    update(dt: number) {
      if (total <= 0) return;
      const targetScale = ride.mode() === 'riding' ? 1 : 0;
      if (speedScale !== targetScale) {
        const step = dt / STOP_EASE_SECONDS;
        const gap = targetScale - speedScale;
        speedScale += Math.sign(gap) * Math.min(step, Math.abs(gap));
      }
      if (speedScale <= 0) return; // Parked — the train rests where it stopped.

      if (pauseTimer > 0) {
        pauseTimer -= dt;
        if (pauseTimer <= 0) travelDirection = travelDirection === 1 ? -1 : 1;
        return;
      }

      distance += travelDirection * RIDE_SPEED * speedScale * dt;
      if (distance >= total) {
        if (ride.mode() === 'riding' && ride.ride()?.path.closed) {
          distance %= total; // Closed loops chug on forever.
        } else {
          distance = total;
          pauseTimer = END_PAUSE_SECONDS; // Dead end: pause, then shuttle back.
        }
      } else if (distance <= 0) {
        distance = 0;
        if (travelDirection === -1) pauseTimer = END_PAUSE_SECONDS;
      }
      poseAt(distance);
    },

    dispose() {
      unsubscribe?.();
      unsubscribe = null;
      segments = [];
      total = 0;
    },
  };
}
