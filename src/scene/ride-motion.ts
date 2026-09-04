import type { Object3D } from 'three';
import { easedHeightAt, type RideSpan } from '../core/elevation';
import type { PathStep } from '../core/pathing';
import { closestPointFraction, stationStopSteps } from '../core/station-stops';
import { isSwitchPiece } from '../core/switches';
import type { Edge } from '../core/track-graph';
import { type Cell, MEADOW_CELLS, neighbourOf, type PlacedPiece } from '../core/track-graph';
import { tunnelFlagsForPath } from '../core/tunnels';
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
  /**
   * Begin (or re-begin) following the given ride state. A train already on
   * the rails rolls on from `startNear` — the path point nearest where it
   * sits; without it the ride starts at the path's beginning.
   */
  begin(state: RideState, startNear?: { x: number; z: number }): void;
  /** Re-target a swapped locomotive model, snapping it to the train's pose. */
  setModel(next: Object3D): void;
  /** Advance the animation by dt seconds. Allocates nothing per frame. */
  update(dt: number): void;
  dispose(): void;
}

/** The world midpoint of `cell`'s `edge` — where one leg of the ride starts/ends. */
function edgeMidpoint(cell: Cell, edge: Edge): { x: number; z: number } {
  const a = cellToWorld(cell);
  const b = cellToWorld(neighbourOf(cell, edge));
  return { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
}

/** The edge opposite each compass edge — a switch leg is straight exactly then. */
const OPPOSITE_OF: Record<Edge, Edge> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
};

/**
 * The world path one ride step takes through its piece: either a straight run
 * or a quarter-arc pivoting on the cell centre (matching how the corner
 * models are anchored). Pure — built once per ride start, never per frame.
 */
export function segmentForStep(piece: PlacedPiece, step: PathStep): Segment {
  const entry = edgeMidpoint(piece.cell, step.from);
  const exit = edgeMidpoint(piece.cell, step.to);
  // Corners always curve; a switch curves exactly when its chosen road
  // leaves by an adjacent edge (the diverging branch) — the authored GLB's
  // diverging road is the kit corner's own quarter-arc, so the ride pivots
  // the cell corner shared by the two edges, tangent-perpendicular to both.
  if (
    (piece.type === 'corner' || isSwitchPiece(piece.type)) &&
    step.to !== OPPOSITE_OF[step.from]
  ) {
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
    return {
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
    };
  }
  // Straights, crossings, and bridges ride a line through the cell — the
  // bridge mirrors exactly the straight it spans (see pieces.ts).
  return {
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
  };
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
  /** Announces the engine entering/leaving a tunnel run (chug duck, echo). */
  onTunnelChange?: (inside: boolean) => void,
  /** Announces the station cargo duty at each stop (load ⇄ deliver). */
  onStationCargo?: (stationId: string) => void,
  /** Announces which road a switch just set as the engine reaches its cell. */
  onSwitchRoad?: (pieceId: string, exit: Edge) => void,
): RideMotion {
  let segments: Segment[] = [];
  let total = 0;
  /** Closed loops cycle; open paths clamp their followers with overhang. */
  let closed = false;
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

  /**
   * Tunnel coverage per segment (built once per ride from the pure path
   * flags), announced only on change — the chug duck listens for under-hill
   * moments, never per-frame chatter.
   */
  let tunnelSteps: boolean[] = [];
  let insideTunnel = false;
  const setInsideTunnel = (next: boolean): void => {
    if (next === insideTunnel) return;
    insideTunnel = next;
    onTunnelChange?.(next);
  };

  /**
   * Per-segment elevation data (built once per ride): the ride span each
   * step crosses (plus its mirror for shuttling back), and the height the
   * train carries into each end — so disagreeing joints ease gently via the
   * core blend rule instead of popping (spec FR4). Flat worlds stay at 0
   * through the same arithmetic — one code path, no hill branching.
   */
  let spans: RideSpan[] = [];
  let reverseSpans: RideSpan[] = [];
  let forwardEntry: number[] = [];
  let backwardEntry: number[] = [];

  /**
   * Switch choreography (built once per ride): the road each segment's step
   * takes through a switch piece (null elsewhere), announced event-driven as
   * the engine reaches the cell; and the path distances where the cycle's
   * dead-end reversals park the train for a beat — the turnaround pauses.
   * A switch cycle is always closed, so the seam itself may be a turnaround.
   */
  let switchRoads: ({ pieceId: string; exit: Edge } | null)[] = [];
  let turnarounds: number[] = [];
  let turnaroundIndex = 0;
  let wrapTurnaround = false;
  let pauseFlipsDirection = true;
  let pauseResumesAtZero = false;
  let lastRoadKey = '';

  function beginRide(state: RideState): void {
    const byId = new Map(world.pieces().map((piece) => [piece.id, piece]));
    const flags = tunnelFlagsForPath(world.pieces(), state.path);
    segments = [];
    tunnelSteps = [];
    const kept: { piece: PlacedPiece; step: PathStep }[] = [];
    const cells: Cell[] = [];
    let stepIndex = 0;
    for (const step of state.path.steps) {
      const piece = byId.get(step.pieceId);
      if (!piece) {
        stepIndex += 1;
        continue; // Stale step — re-solves on the next start.
      }
      kept.push({ piece, step });
      cells.push(piece.cell);
      segments.push(segmentForStep(piece, step));
      tunnelSteps.push(flags[stepIndex] === true);
      stepIndex += 1;
    }
    // Elevation bookkeeping: what each segment's ride span is, and the height
    // the train carries into each end of it (the neighbour's natural exit —
    // the blend rule's window always lands on the natural profile, so eased
    // exits need no extra state).
    spans = [];
    reverseSpans = [];
    forwardEntry = [];
    backwardEntry = [];
    const last = kept.length - 1;
    for (let i = 0; i <= last; i++) {
      const cur = kept[i];
      if (!cur) continue;
      const prev = kept[i - 1];
      const next = kept[i + 1];
      spans.push({ type: cur.piece.type, rotation: cur.piece.rotation, from: cur.step.from });
      reverseSpans.push({
        type: cur.piece.type,
        rotation: cur.piece.rotation,
        from: cur.step.to,
      });
      forwardEntry.push(
        prev
          ? prev.step.exitHeight
          : last > 0 && state.path.closed
            ? (kept[last]?.step.exitHeight ?? 0)
            : cur.step.entryHeight,
      );
      backwardEntry.push(next ? next.step.entryHeight : cur.step.exitHeight);
    }
    total = 0;
    for (const segment of segments) total += segment.length;
    closed = state.path.closed;
    // Switch choreography: per-segment road announcements, and the turnaround
    // pauses where a step re-enters the piece it just left (the solved cycle
    // bounces at dead ends exactly where the ride layer's shuttle would).
    switchRoads = [];
    turnarounds = [];
    wrapTurnaround = false;
    turnaroundIndex = 0;
    pauseFlipsDirection = true;
    pauseResumesAtZero = false;
    lastRoadKey = '';
    let travelled = 0;
    for (let i = 0; i < kept.length; i++) {
      const cur = kept[i];
      if (!cur) continue;
      switchRoads.push(
        isSwitchPiece(cur.piece.type) ? { pieceId: cur.piece.id, exit: cur.step.to } : null,
      );
      const prev = kept[i - 1];
      if (
        prev &&
        cur.step.pieceId === prev.step.pieceId &&
        cur.step.from === prev.step.to &&
        cur.step.to === prev.step.from
      ) {
        turnarounds.push(travelled); // the boundary before this re-entry
      }
      travelled += segments[i]?.length ?? 0;
    }
    if (
      kept.length > 1 &&
      kept[0]?.step.pieceId === kept[kept.length - 1]?.step.pieceId &&
      kept[0]?.step.from === kept[kept.length - 1]?.step.to
    ) {
      wrapTurnaround = true; // the cycle's seam is itself a dead-end bounce
    }
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

  /** The locomotive the motion poses — swapped in place on kind changes. */
  let activeModel = model;

  /** The world point on `segment` at fraction `u` of its length. */
  function segmentPoint(segment: Segment, u: number): { x: number; z: number } {
    if (segment.kind === 'line') {
      return {
        x: segment.ax + (segment.bx - segment.ax) * u,
        z: segment.az + (segment.bz - segment.az) * u,
      };
    }
    const angle = segment.a0 + segment.sweep * u;
    return {
      x: segment.cx + Math.cos(angle) * segment.r,
      z: segment.cz + Math.sin(angle) * segment.r,
    };
  }

  /** Write the pose for forward-path distance `d` into `target`; returns the
   * segment index the pose landed on (-1 for overhang past the path ends). */
  function poseAt(d: number, target: Object3D = activeModel, faceTravel = true): number {
    const first = segments[0];
    if (!first) return -1;
    // Coupled wagons can hang past a short path's ends. The overhang runs
    // straight along the end tangent — like a real train overhanging the
    // last rail — instead of snapping onto the engine.
    const clamped = Math.min(Math.max(d, 0), total);
    const over = d - clamped;
    let remaining = clamped;
    let segment = first;
    let segmentIndex = 0;
    let index = 0;
    for (const candidate of segments) {
      if (remaining <= candidate.length) {
        segment = candidate;
        segmentIndex = index;
        break;
      }
      remaining -= candidate.length;
      index += 1;
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
      // Straight overhang past the path ends, along the unit local tangent
      // — `over` is a world distance, so the raw line delta (one cell per
      // unit) must be normalized first. The arc tangent is already unit.
      const tangentLen = Math.hypot(tangentX, tangentZ) || 1;
      x += (tangentX / tangentLen) * over;
      z += (tangentZ / tangentLen) * over;
    }

    // Ride height: the natural profile along the segment, eased onto from the
    // height carried across the entry edge — disagreeing joints blend gently
    // over the core rule's bounded window, in both travel directions (spec
    // FR4/FR5). Overhangs past the path ends hold the end height (level rails
    // beyond the last sleeper).
    const span = spans[segmentIndex];
    let y = 0;
    if (span) {
      const forward = travelDirection === 1;
      const entry = forward ? forwardEntry[segmentIndex] : backwardEntry[segmentIndex];
      const eff = forward ? span : reverseSpans[segmentIndex];
      if (entry !== undefined && eff) {
        y = easedHeightAt(entry, eff, forward ? u : 1 - u);
      }
    }

    target.position.set(x, y, z);
    // The locomotive's forward is -Z at yaw 0 (plus the kit's authored offset).
    target.rotation.y = Math.atan2(-tangentX, -tangentZ) + MODEL_YAW_OFFSET;
    return segmentIndex;
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
      let d = distance - (i + 1) * FOLLOWER_GAP;
      // On a closed loop the coupler distance reaches around the wrap: a
      // wagon behind the lap start rides the previous lap's tail segments,
      // exactly as a real train rounds a circuit. Open paths keep the
      // clamp-and-overhang semantics for their dead ends.
      if (closed) d = ((d % total) + total) % total;
      poseAt(d, follower, false);
    }
  }

  /**
   * True when the forward step from `prev` to `distance` reaches the next
   * turnaround in the solved cycle; parks the train there for the dead-end
   * beat and returns the clamp distance (the caller writes the pose). Never
   * fires while shuttling back — switch cycles are closed and only ridden
   * forward.
   */
  function turnaroundWithin(prev: number, distance: number): number | null {
    while (
      turnaroundIndex < turnarounds.length &&
      (turnarounds[turnaroundIndex] ?? 0) <= prev + 1e-6
    ) {
      turnaroundIndex += 1; // already behind us (a resumed ride starts mid-cycle)
    }
    const at = turnarounds[turnaroundIndex];
    if (at === undefined || at > distance) return null;
    turnaroundIndex += 1;
    distance = at;
    pauseTimer = END_PAUSE_SECONDS;
    pauseFlipsDirection = false; // the cycle continues onward after the beat
    setPaused(true);
    armAll(); // the next leg owes every station again
    return distance;
  }

  /** One pose write for the whole little train: engine plus wagons. */
  function poseTrain(d: number): void {
    const segmentIndex = poseAt(d);
    // An overhang past the path ends keeps its last under/over-hill verdict.
    if (segmentIndex >= 0) setInsideTunnel(tunnelSteps[segmentIndex] === true);
    // The road the engine just reached a switch by — announced once per
    // change, never per frame (the blade-flip listener is scene-side).
    const road = segmentIndex >= 0 ? (switchRoads[segmentIndex] ?? null) : null;
    const roadKey = road ? `${road.pieceId}|${road.exit}` : '';
    if (roadKey !== lastRoadKey) {
      lastRoadKey = roadKey;
      if (road) onSwitchRoad?.(road.pieceId, road.exit);
    }
    poseFollowers();
  }

  return {
    /**
     * Begins (or re-begins) following the given ride state. A train already
     * on the rails rolls on from `startNear` — the path point nearest where
     * it sits; without it the ride starts at the path's beginning.
     */
    begin(state: RideState, startNear?: { x: number; z: number }): void {
      beginRide(state);
      if (!startNear || total <= 0) return;
      // Sample each segment for the path point nearest where the train sits,
      // and roll on from there — a reused parked train never teleports.
      let best = 0;
      let bestDist = Infinity;
      let travelled = 0;
      for (const segment of segments) {
        for (const u of [0, 0.25, 0.5, 0.75, 1]) {
          const point = segmentPoint(segment, u);
          const d = (point.x - startNear.x) ** 2 + (point.z - startNear.z) ** 2;
          if (d < bestDist) {
            bestDist = d;
            best = Math.min(travelled + u * segment.length, total);
          }
        }
        travelled += segment.length;
      }
      distance = best;
      poseTrain(distance);
    },

    /** Re-targets a swapped locomotive; it snaps to the train's live pose. */
    setModel(next: Object3D): void {
      activeModel = next;
      if (total > 0) poseTrain(distance);
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
        const prev = distance;
        distance += travelDirection * RIDE_SPEED * speedScale * dt;
        if (travelDirection === 1) {
          const at = turnaroundWithin(prev, distance);
          if (at !== null) {
            // The turnaround comes first: drop the brake, park, and let the
            // next leg owe the station again (it was re-armed by the pause).
            distance = at;
            brakeTarget = null;
            pendingStationId = null;
            return poseTrain(distance);
          }
        }
        const arrived = travelDirection === 1 ? distance >= brakeTarget : distance <= brakeTarget;
        if (arrived || speedScale <= 0) {
          const stationId = pendingStationId;
          distance = brakeTarget;
          brakeTarget = null;
          pendingStationId = null;
          poseTrain(distance);
          if (getState() !== null) {
            stationStopTimer = STATION_STOP_SECONDS;
            if (stationId) {
              onStationStop?.(stationId); // Ding-ding from rest.
              onStationCargo?.(stationId); // Wagons load or deliver here.
            }
          }
          return;
        }
        return poseTrain(distance);
      }

      if (speedScale <= 0) return; // Parked — the train rests where it stopped.

      if (pauseTimer > 0) {
        pauseTimer -= dt;
        if (pauseTimer <= 0) {
          if (pauseFlipsDirection) travelDirection = travelDirection === 1 ? -1 : 1;
          if (pauseResumesAtZero) {
            // A switch cycle whose seam is a dead-end bounce: resume from
            // the top of the cycle, not by flipping travel direction.
            distance = 0;
            pauseResumesAtZero = false;
            turnaroundIndex = 0;
          }
          pauseFlipsDirection = true;
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
            if (wrapTurnaround) {
              // The seam bounces: park at the top, then restart the cycle.
              distance = total;
              if (brakeForStopsInWindow(prev, total)) return poseTrain(distance);
              pauseTimer = END_PAUSE_SECONDS;
              pauseFlipsDirection = false;
              pauseResumesAtZero = true;
              setPaused(true);
              armAll();
              return poseTrain(distance);
            }
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
        } else if (turnaroundWithin(prev, distance) !== null) {
          return poseTrain(distance);
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
      setInsideTunnel(false); // ...and nothing stays under the hill.
      segments = [];
      total = 0;
      stops = [];
      tunnelSteps = [];
      spans = [];
      reverseSpans = [];
      forwardEntry = [];
      backwardEntry = [];
      armed.clear();
      stationStopTimer = 0;
      brakeTarget = null;
      pendingStationId = null;
    },
  };
}
