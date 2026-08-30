import type { Object3D } from 'three';
import { closestPointFraction, stationStopSteps } from '../core/station-stops';
import type { Edge } from '../core/track-graph';
import { type Cell, MEADOW_CELLS, neighbourOf } from '../core/track-graph';
import type { RideState } from '../state/ride';
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
/** How long the train rests at a station, ding-ding and all. */
const STATION_STOP_SECONDS = 2;
/**
 * Path distance covered while the ease pulls the train from full chug to a
 * standstill. Braking begins this far before a station so the glide reads as
 * gentle deceleration (spec FR4), never a freeze.
 */
const BRAKE_DISTANCE = (RIDE_SPEED * STOP_EASE_SECONDS) / 2;
/** Yaw offset aligning the Kenney locomotive's authored facing with travel. */
const MODEL_YAW_OFFSET = Math.PI;
/**
 * Path distance between couplers. The 1.5-scaled Kenney models run long —
 * engines ~3.6–3.9 units, wagons ~4.05 — so nose-to-tail couplers need a
 * good four units of rail plus a slack beat.
 */
const FOLLOWER_GAP = 4.2;

/**
 * Parked default pose: wagons rest in a straight line behind the engine's
 * tail (used before the first ride of a freshly selected train). Uses the
 * same coupler gap as the ride, so the little train looks identical at rest.
 */
export function parkFollowersBehind(engine: Object3D, followers: readonly Object3D[]): void {
  for (let i = 0; i < followers.length; i++) {
    const follower = followers[i];
    if (!follower) continue;
    const gap = FOLLOWER_GAP * (i + 1);
    // The authored front faces +Z at yaw 0 (see MODEL_YAW_OFFSET), so behind
    // is the front direction — (sin yaw, cos yaw) — negated.
    follower.position.set(
      engine.position.x - Math.sin(engine.rotation.y) * gap,
      0,
      engine.position.z - Math.cos(engine.rotation.y) * gap,
    );
    follower.rotation.y = engine.rotation.y;
  }
}

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
  /** Begin (or re-begin) following the given ride state. */
  begin(state: RideState): void;
  /** Advance the animation by dt seconds. Allocates nothing per frame. */
  update(dt: number): void;
  dispose(): void;
}

/**
 * Makes one locomotive follow one solved path: closed loops cycle forever,
 * open layouts ride to the dead end, pause a beat, and shuttle back. Mid-ride
 * edits ease the train to a gentle standstill right where it is — a toy left
 * on the track, never an error. One motion serves one train; multi-train
 * spawning lives in the scene layer, which drives `begin` per ride.
 */
export function createRideMotion(
  model: Object3D,
  world: WorldStore,
  /** This train's live ride state — null while parked or between rides. */
  getState: () => RideState | null,
  onPausedChange?: (paused: boolean) => void,
  onStationStop?: (stationId: string) => void,
  followers: readonly Object3D[] = [],
): RideMotion {
  let segments: Segment[] = [];
  let total = 0;
  /** Forward distance along the path, always in [0, total]. */
  let distance = 0;
  let travelDirection: 1 | -1 = 1;
  let pauseTimer = 0;
  /** Station stops on this ride, as path distances (built once per ride). */
  let stops: { at: number; stationId: string }[] = [];
  /** Indices into `stops` still owed on this pass — re-armed each lap/leg. */
  const armed = new Set<number>();
  /** > 0 while the train rests at a station; counts down in update(). */
  let stationStopTimer = 0;
  /** Path distance the train coasts toward while braking for a station. */
  let brakeTarget: number | null = null;
  /** The station the brake in progress serves; announced when the train rests. */
  let pendingStationId: string | null = null;
  /** Eases 0 (parked) ⇄ 1 (riding) so stops and starts stay gentle. */
  let speedScale = 0;

  /** Reports dead-end pauses upward so the chug softens with the motion. */
  let paused = false;
  const setPaused = (next: boolean): void => {
    if (next === paused) return;
    paused = next;
    onPausedChange?.(next);
  };

  function edgeMidpoint(cell: { x: number; y: number }, edge: Edge): { x: number; z: number } {
    const a = cellToWorld(cell);
    const b = cellToWorld(neighbourOf(cell, edge));
    return { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
  }

  function beginRide(state: RideState): void {
    const byId = new Map(world.pieces().map((piece) => [piece.id, piece]));
    segments = [];
    const cells: Cell[] = [];
    for (const step of state.path.steps) {
      const piece = byId.get(step.pieceId);
      if (!piece) continue; // Stale step — re-solves on the next start.
      cells.push(piece.cell);
      const entry = edgeMidpoint(piece.cell, step.from);
      const exit = edgeMidpoint(piece.cell, step.to);
      // Straights and crossings ride a line through the cell; only corners
      // pivot on a quarter-arc.
      if (piece.type === 'straight' || piece.type === 'crossing') {
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
    // The stations standing beside the rails become pause points: the point
    // on the rails closest to each station, so the train rests AT the station
    // rather than at the entry to its cell (spec FR4).
    const stopSteps = stationStopSteps(
      cells,
      world.scenery().filter((item) => item.kind === 'station'),
    );
    stops = stopSteps.map((stop) => {
      let at = 0;
      for (let i = 0; i < stop.stepIndex; i++) at += segments[i]?.length ?? 0;
      const segment = segments[stop.stepIndex];
      if (segment) at += closestPointFraction(segment, cellToWorld(stop.cell)) * segment.length;
      return { at, stationId: stop.stationId };
    });
    armed.clear();
    for (let i = 0; i < stops.length; i++) armed.add(i);
    distance = 0;
    travelDirection = state.direction;
    pauseTimer = 0;
    stationStopTimer = 0;
    brakeTarget = null;
    pendingStationId = null;
    setPaused(false); // A fresh ride always rolls at full voice.
    speedScale = 1; // ▶ starts the chug immediately.
    poseTrain(0);
  }

  /**
   * Begins braking for the first owed station whose brake point lies in the
   * distance window just crossed (travel order: low → high, inclusive). The
   * train then coasts the last stretch and comes to rest at the station cell.
   * Stations sharing the stop cell (flanking one step) are served together.
   */
  function brakeForStopsInWindow(low: number, high: number): boolean {
    if (brakeTarget !== null || stationStopTimer > 0) return false;
    let chosen: { at: number; stationId: string } | null = null;
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      if (!stop || !armed.has(i)) continue;
      // Brake early enough to glide to a halt exactly at the station cell,
      // whichever way the train is travelling.
      const raw = travelDirection === 1 ? stop.at - BRAKE_DISTANCE : stop.at + BRAKE_DISTANCE;
      const point = Math.min(Math.max(raw, 0), total);
      if (point < low || point > high) continue;
      armed.delete(i);
      if (!chosen) chosen = stop;
      else if (Math.abs(stop.at - chosen.at) > 0.01) armed.add(i); // Its own stop later.
    }
    if (!chosen) return false;
    brakeTarget = chosen.at;
    pendingStationId = chosen.stationId;
    setPaused(true); // The chug softens while the train slows.
    return true;
  }

  /** A fresh pass owes every stop again (loop lap or shuttle leg). */
  function armAll(): void {
    for (let i = 0; i < stops.length; i++) armed.add(i);
  }

  /** Write the pose for forward-path distance `d` into `target`. */
  function poseAt(d: number, target: Object3D = model, faceTravel = true): void {
    const first = segments[0];
    if (!first) return;
    // Coupled wagons can hang past a short path's ends. The overhang runs
    // straight along the end tangent — like a real train overhanging the
    // last rail — instead of snapping onto the engine.
    const clamped = Math.min(Math.max(d, 0), total);
    const over = d - clamped;
    let remaining = clamped;
    let segment = first;
    for (const candidate of segments) {
      if (remaining <= candidate.length) {
        segment = candidate;
        break;
      }
      remaining -= candidate.length;
    }

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
    // Shuttling back reverses the facing, not the position. Trailing wagons
    // never flip — only the engine turns around; wagons keep their course.
    if (faceTravel) {
      tangentX *= travelDirection;
      tangentZ *= travelDirection;
    }

    if (over !== 0) {
      // Straight overhang past the path ends, along the local tangent.
      x += tangentX * over;
      z += tangentZ * over;
    }

    target.position.set(x, 0, z);
    // The locomotive's forward is -Z at yaw 0 (plus the kit's authored offset).
    target.rotation.y = Math.atan2(-tangentX, -tangentZ) + MODEL_YAW_OFFSET;
  }

  /**
   * Writes every trailing wagon's pose at its coupler distance behind the
   * locomotive. Wagons sit at fixed path distances behind the engine — in
   * path order, whatever the travel direction — so shuttling back never
   * teleports them through the engine, and short layouts let them overhang
   * the path ends instead of piling onto it. Wagons never flip their
   * course; only the engine turns around (faceTravel false). Allocates
   * nothing per frame.
   */
  function poseFollowers(): void {
    for (let i = 0; i < followers.length; i++) {
      const follower = followers[i];
      if (!follower) continue;
      poseAt(distance - (i + 1) * FOLLOWER_GAP, follower, false);
    }
  }

  /** One pose write for the whole little train: engine plus wagons. */
  function poseTrain(d: number): void {
    poseAt(d);
    poseFollowers();
  }

  return {
    /** Begins (or re-begins) following the given ride state. */
    begin(state: RideState): void {
      beginRide(state);
    },

    update(dt: number) {
      if (total <= 0) return;
      const stopping = stationStopTimer > 0;
      const active = getState() !== null;
      const targetScale = active && !stopping ? 1 : 0;
      if (speedScale !== targetScale) {
        const step = dt / STOP_EASE_SECONDS;
        const gap = targetScale - speedScale;
        speedScale += Math.sign(gap) * Math.min(step, Math.abs(gap));
      }

      if (stopping) {
        // The pause counts down at a standstill; the ease that follows lets
        // the train roll out gently when it ends.
        stationStopTimer -= dt;
        if (stationStopTimer <= 0) {
          stationStopTimer = 0;
          setPaused(false); // Rolling again — the chug returns to full tempo.
        }
        return; // No wheel-turn while the station pause counts down.
      }

      if (brakeTarget !== null) {
        // Braking for a station: the ease above pulls the speed down while
        // the train coasts the last stretch to the station cell (spec FR4).
        distance += travelDirection * RIDE_SPEED * speedScale * dt;
        const arrived = travelDirection === 1 ? distance >= brakeTarget : distance <= brakeTarget;
        if (arrived || speedScale <= 0) {
          const stationId = pendingStationId;
          distance = brakeTarget;
          brakeTarget = null;
          pendingStationId = null;
          poseTrain(distance);
          if (getState() !== null) {
            stationStopTimer = STATION_STOP_SECONDS;
            if (stationId) onStationStop?.(stationId); // Ding-ding from rest.
          }
          return;
        }
        return poseTrain(distance);
      }

      if (speedScale <= 0) return; // Parked — the train rests where it stopped.

      if (pauseTimer > 0) {
        pauseTimer -= dt;
        if (pauseTimer <= 0) {
          travelDirection = travelDirection === 1 ? -1 : 1;
          setPaused(false); // Rolling again — the chug returns to full tempo.
        }
        return;
      }

      const prev = distance;
      distance += travelDirection * RIDE_SPEED * speedScale * dt;
      if (travelDirection === 1) {
        if (distance >= total) {
          if (getState()?.path.closed) {
            // Closed loops finish the lap, then roll on from the top.
            if (brakeForStopsInWindow(prev, total)) return poseTrain(distance);
            distance %= total;
            armAll();
            if (brakeForStopsInWindow(0, distance)) return poseTrain(distance);
          } else {
            distance = total;
            if (brakeForStopsInWindow(prev, total)) return poseTrain(distance);
            pauseTimer = END_PAUSE_SECONDS; // Dead end: pause, then shuttle back.
            setPaused(true);
            armAll(); // The way back owes every station again.
          }
        } else if (brakeForStopsInWindow(prev, distance)) {
          return poseTrain(distance);
        }
      } else if (distance <= 0) {
        distance = 0;
        if (brakeForStopsInWindow(0, prev)) return poseTrain(distance);
        pauseTimer = END_PAUSE_SECONDS; // Back home: pause, then roll out again.
        setPaused(true);
        armAll(); // The way out owes every station again.
      } else if (brakeForStopsInWindow(distance, prev)) {
        return poseTrain(distance);
      }
      poseTrain(distance);
    },

    dispose() {
      setPaused(false); // End-of-motion report: nothing stays softened.
      segments = [];
      total = 0;
      stops = [];
      armed.clear();
      stationStopTimer = 0;
      brakeTarget = null;
      pendingStationId = null;
    },
  };
}
