import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import type { PathStep } from '../core/pathing';
import { rideComponentsOf } from '../core/pathing';
import type { Edge, PlacedPiece } from '../core/track-graph';
import { MEADOW_CELLS } from '../core/track-graph';
import type { RideState } from '../state/ride';
import type { WorldStore } from '../state/world';
import { createWorldStore } from '../state/world';
import { GROUND_SIZE } from './ground';
import { createRideMotion, segmentForStep } from './ride-motion';

const CELL_SIZE = GROUND_SIZE / MEADOW_CELLS;

/** A placed piece at (x, y) with the given rotation (defaults 0). */
function piece(
  type: PlacedPiece['type'],
  x: number,
  y: number,
  rotation: PlacedPiece['rotation'] = 0,
): PlacedPiece {
  return { id: 'p', type, cell: { x, y }, rotation };
}

function step(from: Edge, to: Edge): PathStep {
  return { pieceId: 'p', from, to };
}

/** The cell-centre of (8, 8) — the river runs through the middle columns. */
const CENTER = {
  x: -GROUND_SIZE / 2 + 8.5 * CELL_SIZE,
  z: -GROUND_SIZE / 2 + 8.5 * CELL_SIZE,
};

describe('segmentForStep — the bridge rides exactly like the straight it mirrors', () => {
  it('rides a north–south bridge as a straight line, not a corner arc', () => {
    const segment = segmentForStep(piece('bridge', 8, 8), step('north', 'south'));

    expect(segment.kind).toBe('line');
    expect(segment.length).toBe(CELL_SIZE);
    expect(segment.ax).toBeCloseTo(CENTER.x);
    expect(segment.az).toBeCloseTo(CENTER.z - CELL_SIZE / 2); // north edge midpoint
    expect(segment.bx).toBeCloseTo(CENTER.x);
    expect(segment.bz).toBeCloseTo(CENTER.z + CELL_SIZE / 2); // south edge midpoint
  });

  it('rides an east–west bridge (rotation 90) as a straight line too', () => {
    const segment = segmentForStep(piece('bridge', 8, 8, 90), step('east', 'west'));

    expect(segment.kind).toBe('line');
    expect(segment.length).toBe(CELL_SIZE);
    expect(segment.ax).toBeCloseTo(CENTER.x + CELL_SIZE / 2); // east edge midpoint
    expect(segment.az).toBeCloseTo(CENTER.z);
    expect(segment.bx).toBeCloseTo(CENTER.x - CELL_SIZE / 2); // west edge midpoint
    expect(segment.bz).toBeCloseTo(CENTER.z);
  });

  it('still rides corners on their quarter-arc pivot', () => {
    const segment = segmentForStep(piece('corner', 8, 8), step('north', 'east'));

    expect(segment.kind).toBe('arc');
    expect(segment.r).toBeCloseTo(CELL_SIZE / 2);
  });

  it('keeps straights and crossings on straight lines', () => {
    expect(segmentForStep(piece('straight', 8, 8), step('north', 'south')).kind).toBe('line');
    expect(segmentForStep(piece('crossing', 8, 8), step('north', 'south')).kind).toBe('line');
  });
});

/** A path segment as returned by `segmentForStep`. */
type Segment = ReturnType<typeof segmentForStep>;

/** Distance from (x, z) to one segment: lines project exactly, arcs sample 64 points. */
function distanceToSegment(segment: Segment, x: number, z: number): number {
  if (segment.kind === 'line') {
    const dx = segment.bx - segment.ax;
    const dz = segment.bz - segment.az;
    const t = Math.min(
      1,
      Math.max(0, ((x - segment.ax) * dx + (z - segment.az) * dz) / (dx * dx + dz * dz)),
    );
    return Math.hypot(x - (segment.ax + dx * t), z - (segment.az + dz * t));
  }
  let best = Infinity;
  for (let i = 0; i <= 512; i += 1) {
    const angle = segment.a0 + (segment.sweep * i) / 512;
    best = Math.min(
      best,
      Math.hypot(
        x - (segment.cx + Math.cos(angle) * segment.r),
        z - (segment.cz + Math.sin(angle) * segment.r),
      ),
    );
  }
  return best;
}

/** Distance from (x, z) to the whole path polyline. */
function distanceToPath(segments: readonly Segment[], x: number, z: number): number {
  let best = Infinity;
  for (const segment of segments) {
    best = Math.min(best, distanceToSegment(segment, x, z));
  }
  return best;
}

function segmentsFor(world: WorldStore, state: RideState): Segment[] {
  const byId = new Map(world.pieces().map((p) => [p.id, p] as const));
  return state.path.steps.flatMap((s) => {
    const piece = byId.get(s.pieceId);
    return piece ? [segmentForStep(piece, s)] : [];
  });
}

interface RideRun {
  engine: Object3D;
  followers: Object3D[];
  motion: ReturnType<typeof createRideMotion>;
  /** Every value ever passed to `onPausedChange`, in order. */
  paused: boolean[];
}

function startRide(world: WorldStore, state: RideState, followerCount: number): RideRun {
  const engine = new Object3D();
  const followers = Array.from({ length: followerCount }, () => new Object3D());
  const paused: boolean[] = [];
  const motion = createRideMotion(
    engine,
    world,
    () => state,
    (value) => paused.push(value),
    undefined,
    followers,
  );
  motion.begin(state);
  return { engine, followers, motion, paused };
}

describe('createRideMotion — the little train rides the solved path', () => {
  /**
   * A closed 24-piece loop where a curve feeds a bridge over the river — the
   * reported layout. The loop's smallest cell key lands on the south-side
   * bridge (10, 10), so the lap wrap sits right at the bridge entry.
   */
  function bridgeLoopWorld(): { world: WorldStore; state: RideState } {
    const world = createWorldStore();
    for (const x of [5, 9, 10, 11]) {
      expect(world.place('straight', { x, y: 6 }, 90)).toBe('placed');
    }
    for (const x of [6, 7, 8]) {
      expect(world.place('bridge', { x, y: 6 }, 90)).toBe('placed');
    }
    for (const y of [7, 8, 9]) {
      expect(world.place('straight', { x: 4, y }, 0)).toBe('placed');
      expect(world.place('straight', { x: 12, y }, 0)).toBe('placed');
    }
    for (const x of [5, 6, 7, 8]) {
      expect(world.place('straight', { x, y: 10 }, 90)).toBe('placed');
    }
    for (const x of [9, 10, 11]) {
      expect(world.place('bridge', { x, y: 10 }, 90)).toBe('placed');
    }
    expect(world.place('corner', { x: 4, y: 6 }, 90)).toBe('placed');
    expect(world.place('corner', { x: 12, y: 6 }, 180)).toBe('placed');
    expect(world.place('corner', { x: 4, y: 10 }, 0)).toBe('placed');
    expect(world.place('corner', { x: 12, y: 10 }, 270)).toBe('placed');

    const component = rideComponentsOf(world.pieces())[0];
    if (!component) throw new Error('the loop must solve to one ride component');
    expect(component.path.closed).toBe(true); // one loop — the wrap matters
    return { world, state: { ...component, direction: 1 } };
  }

  /**
   * A single lone straight: a one-cell open path. Total length 3.75 is less
   * than the 4.2 coupler gap, so every wagon overhangs the dead end.
   */
  function loneStraightWorld(): { world: WorldStore; state: RideState } {
    const world = createWorldStore();
    expect(world.place('straight', { x: 2, y: 2 }, 0)).toBe('placed');
    const component = rideComponentsOf(world.pieces())[0];
    if (!component) throw new Error('the lone straight must solve to one ride component');
    return { world, state: { ...component, direction: 1 } };
  }

  it('keeps the engine on the rails across the lap wrap', () => {
    const { world, state } = bridgeLoopWorld();
    const run = startRide(world, state, 0);
    const segments = segmentsFor(world, state);
    // Two full laps of ~87 units at 1.1 units per frame.
    for (let i = 0; i < 170; i += 1) {
      run.motion.update(0.5);
      expect(distanceToPath(segments, run.engine.position.x, run.engine.position.z)).toBeLessThan(
        0.02,
      );
    }
    run.motion.dispose();
  });

  it('keeps both wagons on the rails across the lap wrap', () => {
    const { world, state } = bridgeLoopWorld();
    const run = startRide(world, state, 2);
    const segments = segmentsFor(world, state);
    // The wrap window: every frame while the engine is within two coupler
    // gaps past the path start, the trailing wagons must already sit on the
    // previous lap's tail — on the rails, never on an off-rail extension.
    for (let i = 0; i < 170; i += 1) {
      run.motion.update(0.5);
      for (const wagon of run.followers) {
        expect(distanceToPath(segments, wagon.position.x, wagon.position.z)).toBeLessThan(0.02);
      }
    }
    run.motion.dispose();
  });

  it('overhangs the dead end collinear with the end tangent at the pause', () => {
    const { world, state } = loneStraightWorld();
    const run = startRide(world, state, 2);
    const segments = segmentsFor(world, state);
    const first = segments[0];
    if (!first) throw new Error('the lone straight must solve to one segment');
    // Ride to the dead end — the engine stops, wagons overhang past the start.
    for (let i = 0; i < 20 && !run.paused.includes(true); i += 1) {
      run.motion.update(0.5);
    }
    expect(run.paused).toContain(true);
    for (const wagon of run.followers) {
      // Straight past the path start along the end tangent — never sideways.
      expect(Math.abs(wagon.position.x - first.ax)).toBeLessThan(0.02);
      expect(wagon.position.z).toBeLessThan(first.az); // past the start
    }
    run.motion.dispose();
  });

  it('overhangs the dead end by the true coupler distance, not one cell per unit', () => {
    const { world, state } = loneStraightWorld();
    const run = startRide(world, state, 2);
    const segments = segmentsFor(world, state);
    const first = segments[0];
    if (!first) throw new Error('the lone straight must solve to one segment');
    for (let i = 0; i < 20 && !run.paused.includes(true); i += 1) {
      run.motion.update(0.5);
    }
    expect(run.paused).toContain(true);
    // Coupler distance is world units: 4.2 per wagon. The engine rests at
    // the path end (3.75), so wagon 0 hangs 0.45 past the start and wagon 1
    // 4.65 — not 0.45 × 3.75 and 4.65 × 3.75.
    const overhangs = [4.2 - 3.75, 2 * 4.2 - 3.75];
    for (const [i, expected] of overhangs.entries()) {
      const wagon = run.followers[i];
      if (!wagon) throw new Error('missing follower wagon');
      expect(Math.abs(wagon.position.x - first.ax)).toBeLessThan(0.02);
      expect(first.az - wagon.position.z).toBeCloseTo(expected, 1);
    }
    run.motion.dispose();
  });

  it('keeps the wagon course when the engine shuttles back from the dead end', () => {
    const { world, state } = loneStraightWorld();
    const run = startRide(world, state, 2);
    for (let i = 0; i < 20 && !run.paused.includes(true); i += 1) {
      run.motion.update(0.5);
    }
    // Ride through the 0.9 s pause; the engine turns around and heads back.
    for (let i = 0; i < 10; i += 1) {
      run.motion.update(0.5);
    }
    for (const wagon of run.followers) {
      // Wagons never flip — their facing is untouched by the reversal.
      const yaw = ((wagon.rotation.y % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      expect(Math.min(yaw, 2 * Math.PI - yaw)).toBeLessThan(0.1); // still southward
    }
    run.motion.dispose();
  });
});
