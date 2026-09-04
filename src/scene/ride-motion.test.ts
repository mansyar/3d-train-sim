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
  // Flat test pieces: the natural step heights sit at grade.
  return { pieceId: 'p', from, to, entryHeight: 0, exitHeight: 0 };
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

describe('createRideMotion — riding the hill run carries the train up and over', () => {
  /** slope-up → hill → slope-down climbing south to north at (2,4) → (2,2). */
  function hillRunWorld(): { world: WorldStore; state: RideState } {
    const world = createWorldStore();
    expect(world.place('slope-up', { x: 2, y: 4 }, 0)).toBe('placed');
    expect(world.place('hill', { x: 2, y: 3 }, 0)).toBe('placed');
    expect(world.place('slope-down', { x: 2, y: 2 }, 0)).toBe('placed');
    const component = rideComponentsOf(world.pieces())[0];
    if (!component) throw new Error('the hill run must solve to one ride component');
    return { world, state: { ...component, direction: 1 } };
  }

  it('labors up the climb and breezes back down (wheels on the rails)', () => {
    const { world, state } = hillRunWorld();
    const run = startRide(world, state, 0);
    // The ride starts at the run's north dead end (the slope-down's low edge)
    // at grade.
    expect(run.engine.position.y).toBeCloseTo(0, 5);
    // Climb to the crest in small ticks, never stalling: every tick moves the
    // engine, but the climb takes clearly longer than one flat cell at full
    // chug (≈ 17 ticks of 0.1 s) — the hill labors.
    let climbTicks = 0;
    let lastX = run.engine.position.x;
    let lastZ = run.engine.position.z;
    for (; climbTicks < 200; climbTicks += 1) {
      run.motion.update(0.1);
      if (run.engine.position.y >= 1.05) break;
      const moved = Math.hypot(run.engine.position.x - lastX, run.engine.position.z - lastZ);
      expect(moved).toBeGreaterThan(0); // laboring, never stalled
      lastX = run.engine.position.x;
      lastZ = run.engine.position.z;
    }
    expect(run.engine.position.y).toBeCloseTo(1.1, 1);
    expect(climbTicks).toBeGreaterThan(19);
    // Ride on until the descent reads the breeze (≈ 1.25×), then all the way
    // home: the run still ends at grade at the far dead end.
    for (let i = 0; i < 60 && run.engine.position.y > 0.35; i += 1) {
      run.motion.update(0.1);
    }
    expect(run.motion.pace()).toBeCloseTo(1.25, 1);
    for (let i = 0; i < 300 && !run.paused.includes(true); i += 1) {
      run.motion.update(0.1);
    }
    expect(run.paused).toContain(true);
    expect(run.engine.position.y).toBeCloseTo(0, 1);
    run.motion.dispose();
  });

  it('eases a crest-into-plain-straight mismatch instead of popping', () => {
    const world = createWorldStore();
    // A hill with a plain straight south of it: the walk starts at the hill's
    // open north edge (the smaller cell), cruises the crest, then crosses the
    // crest-into-straight joint carrying full height — the disagreement case.
    expect(world.place('straight', { x: 3, y: 4 }, 0)).toBe('placed');
    expect(world.place('hill', { x: 3, y: 3 }, 0)).toBe('placed');
    const component = rideComponentsOf(world.pieces())[0];
    if (!component) throw new Error('the layout must solve to one ride component');
    const run = startRide(world, { ...component, direction: 1 }, 0);

    // Ride to just past the joint, mid-blend-window: clearly off the ground,
    // but not yet down at grade — an ease, never a pop.
    run.motion.update(4.22 / 2.2);
    const inWindow = run.engine.position.y;
    expect(inWindow).toBeGreaterThan(0.05);
    expect(inWindow).toBeLessThan(1.05);
    // Past the window the train is back at grade on the plain straight.
    run.motion.update(0.6);
    expect(run.engine.position.y).toBeCloseTo(0, 1);
    run.motion.dispose();
  });

  it('keeps flat worlds riding at grade through the same arithmetic', () => {
    const world = createWorldStore();
    expect(world.place('straight', { x: 2, y: 2 }, 0)).toBe('placed');
    const component = rideComponentsOf(world.pieces())[0];
    if (!component) throw new Error('the lone straight must solve to one ride component');
    const run = startRide(world, { ...component, direction: 1 }, 1);
    for (let i = 0; i < 6; i += 1) {
      run.motion.update(0.3);
      expect(run.engine.position.y).toBe(0);
      expect(run.followers[0]?.position.y).toBe(0);
    }
    run.motion.dispose();
  });
});

describe('createRideMotion — hill-grade pace keeps each locomotive’s tempo', () => {
  /** The hill run ridden south to north, with a per-kind motion. */
  function hillRunWorld(): { world: WorldStore; state: RideState } {
    const world = createWorldStore();
    expect(world.place('slope-up', { x: 2, y: 4 }, 0)).toBe('placed');
    expect(world.place('hill', { x: 2, y: 3 }, 0)).toBe('placed');
    expect(world.place('slope-down', { x: 2, y: 2 }, 0)).toBe('placed');
    const component = rideComponentsOf(world.pieces())[0];
    if (!component) throw new Error('the hill run must solve to one ride component');
    return { world, state: { ...component, direction: 1 } };
  }

  /** One flat cell: personality pace with no grade under the wheels. */
  function flatWorld(): { world: WorldStore; state: RideState } {
    const world = createWorldStore();
    expect(world.place('straight', { x: 2, y: 2 }, 0)).toBe('placed');
    const component = rideComponentsOf(world.pieces())[0];
    if (!component) throw new Error('the lone straight must solve to one ride component');
    return { world, state: { ...component, direction: 1 } };
  }

  /** Ticks until the engine first pauses at the dead end (cap 400). */
  function ticksToDeadEnd(motion: { update(dt: number): void }, paused: boolean[]): number {
    let ticks = 0;
    for (; ticks < 400; ticks += 1) {
      motion.update(0.1);
      if (paused.includes(true)) break;
    }
    return ticks;
  }

  it('rides flats at exactly the locomotive’s personality pace', () => {
    for (const [kind, expected] of [
      ['steam', 0.9],
      ['tram', 1.0],
      ['diesel', 1.2],
    ] as const) {
      const { world, state } = flatWorld();
      const run = startRide(world, state, 0);
      run.motion.setKind(kind);
      for (let i = 0; i < 8; i += 1) run.motion.update(0.1);
      expect(run.motion.pace()).toBeCloseTo(expected, 5);
      run.motion.dispose();
    }
  });

  it('defaults to tram pace — flat rides stay byte-identical', () => {
    const { world, state } = flatWorld();
    const run = startRide(world, state, 0);
    for (let i = 0; i < 8; i += 1) run.motion.update(0.1);
    expect(run.motion.pace()).toBe(1);
    run.motion.dispose();
  });

  it('gives each locomotive its own climb pace on the same hill', () => {
    for (const [kind, expected] of [
      ['steam', 0.585], // 0.9 × 0.65 — steady
      ['tram', 0.65], // 1.0 × 0.65 — middle
      ['diesel', 0.78], // 1.2 × 0.65 — zippy even uphill
    ] as const) {
      const { world, state } = hillRunWorld();
      const run = startRide(world, state, 0);
      run.motion.setKind(kind);
      // Eight ticks settles the ~0.5 s ease while still on the climb.
      for (let i = 0; i < 8; i += 1) run.motion.update(0.1);
      expect(run.engine.position.y).toBeGreaterThan(0.1); // still climbing
      expect(run.engine.position.y).toBeLessThan(1.0);
      expect(run.motion.pace()).toBeCloseTo(expected, 2);
      run.motion.dispose();
    }
  });

  it('races diesel to the dead end ahead of steam on the same run', () => {
    const rides = (['steam', 'diesel'] as const).map((kind) => {
      const { world, state } = hillRunWorld();
      const run = startRide(world, state, 0);
      run.motion.setKind(kind);
      return run;
    });
    const ticks = rides.map((run) => ticksToDeadEnd(run.motion, run.paused));
    expect(ticks[0]).toBeLessThan(400); // steam arrives — never stalls
    expect(ticks[1]).toBeLessThan(400); // diesel arrives too
    expect(ticks[1]).toBeLessThan(ticks[0] ?? 0); // ...clearly first
    for (const run of rides) run.motion.dispose();
  });

  it('eases pace shifts instead of jumping', () => {
    const { world, state } = hillRunWorld();
    const run = startRide(world, state, 0);
    let previous = run.motion.pace();
    let maxJump = 0;
    for (let i = 0; i < 400 && !run.paused.includes(true); i += 1) {
      run.motion.update(0.1);
      const current = run.motion.pace();
      expect(current).toBeGreaterThan(0); // never stalls, never reverses
      maxJump = Math.max(maxJump, Math.abs(current - previous));
      previous = current;
    }
    expect(run.paused).toContain(true);
    expect(maxJump).toBeLessThan(0.15); // a gentle shift, never a pop
    run.motion.dispose();
  });

  it('yields the descent boost to the station brake and docks exactly', () => {
    const { world, state } = hillRunWorld();
    // A station flanking the descent cell: the brake glide overlaps the
    // downhill, so the boost must yield while the train still docks.
    expect(world.placeScenery('station', { x: 3, y: 4 }, 0)).toBe('placed');
    const engine = new Object3D();
    const paused: boolean[] = [];
    const stops: string[] = [];
    const motion = createRideMotion(
      engine,
      world,
      () => state,
      (value) => paused.push(value),
      (stationId) => stops.push(stationId),
      [],
    );
    motion.begin(state);
    const segments = segmentsFor(world, state);
    for (let i = 0; i < 400 && stops.length === 0; i += 1) motion.update(0.1);
    // Docked: the ding-ding fired once, on the rails, mid-descent.
    expect(stops.length).toBe(1);
    expect(distanceToPath(segments, engine.position.x, engine.position.z)).toBeLessThan(0.02);
    expect(engine.position.y).toBeGreaterThan(0.1);
    expect(engine.position.y).toBeLessThan(1.0);
    // The chug softened through the brake, and the boost yielded toward the
    // gentle stop instead of riding at full 1.25×.
    expect(paused).toContain(true);
    expect(motion.pace()).toBeLessThan(1.25);
    // The 2 s rest ends and the little train rolls on downhill.
    for (let i = 0; i < 60 && !paused.includes(false); i += 1) motion.update(0.1);
    expect(paused).toContain(false);
    motion.dispose();
  });
});

describe('segmentForStep — the switch rides its chosen road', () => {
  it('rides the through-road (south to north) as a straight line', () => {
    const segment = segmentForStep(piece('switch', 8, 8), step('south', 'north'));

    expect(segment.kind).toBe('line');
    expect(segment.length).toBe(CELL_SIZE);
  });

  it('rides the diverging branch (south to east) on the SE-pivot quarter-arc', () => {
    const segment = segmentForStep(piece('switch', 8, 8), step('south', 'east'));

    // The authored GLB's diverging road is exactly this arc: pivot on the
    // cell's south-east corner, radius half a cell — kit corner geometry.
    expect(segment.kind).toBe('arc');
    expect(segment.r).toBeCloseTo(CELL_SIZE / 2);
    expect(segment.cx).toBeCloseTo(CENTER.x + CELL_SIZE / 2);
    expect(segment.cz).toBeCloseTo(CENTER.z + CELL_SIZE / 2);
  });

  it('rides a north-to-east diverge on the NE-pivot arc at rotation 180', () => {
    // Rotated 180°, the switch's stem faces north and its diverge branch
    // east: stem north (entering) to branch east stays an arc.
    const segment = segmentForStep(piece('switch', 8, 8, 180), step('north', 'east'));

    expect(segment.kind).toBe('arc');
    expect(segment.cx).toBeCloseTo(CENTER.x + CELL_SIZE / 2);
    expect(segment.cz).toBeCloseTo(CENTER.z - CELL_SIZE / 2);
  });
});

describe('segmentForStep — the mirror switch rides its chosen road', () => {
  it('rides the through-road (south to north) as a straight line', () => {
    const segment = segmentForStep(piece('switch-mirror', 8, 8), step('south', 'north'));

    expect(segment.kind).toBe('line');
    expect(segment.length).toBe(CELL_SIZE);
  });

  it('rides the diverging branch (south to west) on the SW-pivot quarter-arc', () => {
    const segment = segmentForStep(piece('switch-mirror', 8, 8), step('south', 'west'));

    // The mirrored GLB's diverging road is the x-mirror of the right
    // switch's arc: pivot on the cell's south-west corner, radius half a
    // cell — kit corner geometry flipped onto the west leg.
    expect(segment.kind).toBe('arc');
    expect(segment.r).toBeCloseTo(CELL_SIZE / 2);
    expect(segment.cx).toBeCloseTo(CENTER.x - CELL_SIZE / 2);
    expect(segment.cz).toBeCloseTo(CENTER.z + CELL_SIZE / 2);
  });

  it('rides a north-to-west diverge on the NW-pivot arc at rotation 180', () => {
    // Rotated 180°, the mirror's stem faces north and its diverge branch
    // west: stem north (entering) to branch west stays an arc.
    const segment = segmentForStep(piece('switch-mirror', 8, 8, 180), step('north', 'west'));

    expect(segment.kind).toBe('arc');
    expect(segment.cx).toBeCloseTo(CENTER.x - CELL_SIZE / 2);
    expect(segment.cz).toBeCloseTo(CENTER.z - CELL_SIZE / 2);
  });
});

describe('createRideMotion — riding the Y layout alternates through the switch', () => {
  /**
   * The solver-test Y: a dead-end line north of the switch, a dead-end line
   * south of its stem, and the diverging branch opening at the switch's east
   * edge. The solved ride is a closed choreography cycle that bounces the
   * train between the dead ends and takes the diverge every other pass.
   */
  function yLayoutWorld(): { world: WorldStore; state: RideState } {
    const world = createWorldStore();
    expect(world.place('straight', { x: 2, y: 1 }, 0)).toBe('placed');
    expect(world.place('switch', { x: 2, y: 2 }, 0)).toBe('placed');
    expect(world.place('straight', { x: 2, y: 3 }, 0)).toBe('placed');
    const component = rideComponentsOf(world.pieces())[0];
    if (!component) throw new Error('the Y layout must solve to one ride component');
    expect(component.path.closed).toBe(true);
    return { world, state: { ...component, direction: 1 } };
  }

  /** The cell-centre of the switch at (2, 2) — dry land, off the river. */
  const SW = {
    x: -GROUND_SIZE / 2 + 2.5 * CELL_SIZE,
    z: -GROUND_SIZE / 2 + 2.5 * CELL_SIZE,
  };

  it('stays on the rails through both branches, reversals included', () => {
    const { world, state } = yLayoutWorld();
    const run = startRide(world, state, 1);
    const segments = segmentsFor(world, state);
    const wagon = run.followers[0];
    if (!wagon) throw new Error('missing follower wagon');
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    let pausedAtRest = false;
    for (let i = 0; i < 90; i += 1) {
      run.motion.update(0.5);
      // Every pose — engine and wagon — sits on the solved cycle, including
      // across the in-place dead-end reversals.
      expect(distanceToPath(segments, run.engine.position.x, run.engine.position.z)).toBeLessThan(
        0.02,
      );
      expect(distanceToPath(segments, wagon.position.x, wagon.position.z)).toBeLessThan(0.03);
      maxX = Math.max(maxX, run.engine.position.x);
      minZ = Math.min(minZ, run.engine.position.z);
      maxZ = Math.max(maxZ, run.engine.position.z);
      pausedAtRest = pausedAtRest || run.paused.includes(true);
    }
    // The straight branch rode north of the switch, the stem line south,
    // and the diverging branch curved out to the switch's east edge.
    expect(minZ).toBeLessThan(SW.z - CELL_SIZE / 2 + 0.1);
    expect(maxZ).toBeGreaterThan(SW.z + CELL_SIZE / 2 - 0.1);
    expect(maxX).toBeGreaterThan(SW.x + CELL_SIZE / 2 - 0.1);
    expect(pausedAtRest).toBe(true); // turnarounds rest the train, like dead ends
    run.motion.dispose();
  });

  it('announces the road each pass, alternating exits, without chatter', () => {
    const { world, state } = yLayoutWorld();
    const engine = new Object3D();
    const roads: { pieceId: string; exit: Edge }[] = [];
    const motion = createRideMotion(
      engine,
      world,
      () => state,
      undefined,
      undefined,
      [],
      undefined,
      undefined,
      (pieceId, exit) => roads.push({ pieceId, exit }),
    );
    motion.begin(state);
    for (let i = 0; i < 90; i += 1) motion.update(0.5);
    // Both roads get announced, and the train alternates between them —
    // never repeating an announcement back to back (no per-frame chatter).
    const exits = roads.map((r) => r.exit);
    expect(exits).toContain('north');
    expect(exits).toContain('east');
    for (let i = 1; i < roads.length; i += 1) {
      const prev = roads[i - 1];
      const cur = roads[i];
      if (prev && cur) {
        expect(cur.exit).not.toBe(prev.exit);
      }
    }
    motion.dispose();
  });
});

describe('createRideMotion — riding the mirrored Y alternates through the mirror switch', () => {
  /**
   * The x-mirror of the solver-test Y: the same dead-end lines north and
   * south of the stem, with the diverging branch opening at the mirror's
   * west edge. The solved ride bounces between the dead ends and takes
   * the west diverge every other pass.
   */
  function mirroredYLayoutWorld(): { world: WorldStore; state: RideState } {
    const world = createWorldStore();
    expect(world.place('straight', { x: 2, y: 1 }, 0)).toBe('placed');
    expect(world.place('switch-mirror', { x: 2, y: 2 }, 0)).toBe('placed');
    expect(world.place('straight', { x: 2, y: 3 }, 0)).toBe('placed');
    const component = rideComponentsOf(world.pieces())[0];
    if (!component) throw new Error('the mirrored Y layout must solve to one ride component');
    expect(component.path.closed).toBe(true);
    return { world, state: { ...component, direction: 1 } };
  }

  /** The cell-centre of the mirror switch at (2, 2) — dry land, off the river. */
  const SW = {
    x: -GROUND_SIZE / 2 + 2.5 * CELL_SIZE,
    z: -GROUND_SIZE / 2 + 2.5 * CELL_SIZE,
  };

  it('stays on the rails through both branches, reversals included', () => {
    const { world, state } = mirroredYLayoutWorld();
    const run = startRide(world, state, 1);
    const segments = segmentsFor(world, state);
    const wagon = run.followers[0];
    if (!wagon) throw new Error('missing follower wagon');
    let minX = Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    let pausedAtRest = false;
    for (let i = 0; i < 90; i += 1) {
      run.motion.update(0.5);
      // Every pose — engine and wagon — sits on the solved cycle, including
      // across the in-place dead-end reversals.
      expect(distanceToPath(segments, run.engine.position.x, run.engine.position.z)).toBeLessThan(
        0.02,
      );
      expect(distanceToPath(segments, wagon.position.x, wagon.position.z)).toBeLessThan(0.03);
      minX = Math.min(minX, run.engine.position.x);
      minZ = Math.min(minZ, run.engine.position.z);
      maxZ = Math.max(maxZ, run.engine.position.z);
      pausedAtRest = pausedAtRest || run.paused.includes(true);
    }
    // The straight branch rode north of the switch, the stem line south,
    // and the diverging branch curved out to the switch's west edge.
    expect(minZ).toBeLessThan(SW.z - CELL_SIZE / 2 + 0.1);
    expect(maxZ).toBeGreaterThan(SW.z + CELL_SIZE / 2 - 0.1);
    expect(minX).toBeLessThan(SW.x - CELL_SIZE / 2 + 0.1);
    expect(pausedAtRest).toBe(true); // turnarounds rest the train, like dead ends
    run.motion.dispose();
  });

  it('announces the road each pass, alternating exits, without chatter', () => {
    const { world, state } = mirroredYLayoutWorld();
    const engine = new Object3D();
    const roads: { pieceId: string; exit: Edge }[] = [];
    const motion = createRideMotion(
      engine,
      world,
      () => state,
      undefined,
      undefined,
      [],
      undefined,
      undefined,
      (pieceId, exit) => roads.push({ pieceId, exit }),
    );
    motion.begin(state);
    for (let i = 0; i < 90; i += 1) motion.update(0.5);
    // Both roads get announced, and the train alternates between them —
    // never repeating an announcement back to back (no per-frame chatter).
    const exits = roads.map((r) => r.exit);
    expect(exits).toContain('north');
    expect(exits).toContain('west');
    for (let i = 1; i < roads.length; i += 1) {
      const prev = roads[i - 1];
      const cur = roads[i];
      if (prev && cur) {
        expect(cur.exit).not.toBe(prev.exit);
      }
    }
    motion.dispose();
  });
});

describe('createRideMotion — riding under the hill reports tunnel coverage', () => {
  /**
   * A three-cell open line: straight → tunnel → straight, ridden south. The
   * tunnel is the middle segment — entered 3.75 units along the path.
   */
  function tunnelLineWorld(): { world: WorldStore; state: RideState } {
    const world = createWorldStore();
    expect(world.place('straight', { x: 2, y: 2 }, 0)).toBe('placed');
    expect(world.place('tunnel', { x: 2, y: 3 }, 0)).toBe('placed');
    expect(world.place('straight', { x: 2, y: 4 }, 0)).toBe('placed');
    const component = rideComponentsOf(world.pieces())[0];
    if (!component) throw new Error('the line must solve to one ride component');
    return { world, state: { ...component, direction: 1 } };
  }

  it('announces entering and leaving the tunnel run, once per change', () => {
    const { world, state } = tunnelLineWorld();
    const engine = new Object3D();
    const inside: boolean[] = [];
    const motion = createRideMotion(
      engine,
      world,
      () => state,
      undefined,
      undefined,
      [],
      (value) => inside.push(value),
    );
    motion.begin(state);
    expect(inside).toEqual([]); // the ride starts in the open — no news yet

    for (let i = 0; i < 9; i += 1) motion.update(0.5); // roll most of the line
    // The engine crosses into the tunnel cell and back out — exactly two
    // announcements, no per-frame chatter. (The ride stops short of the dead
    // end, so the shuttle return can't re-enter the tunnel.)
    expect(inside).toEqual([true, false]);
    motion.dispose();
  });

  it('reports open air again when the motion ends', () => {
    const { world, state } = tunnelLineWorld();
    const engine = new Object3D();
    const inside: boolean[] = [];
    const motion = createRideMotion(
      engine,
      world,
      () => state,
      undefined,
      undefined,
      [],
      (value) => inside.push(value),
    );
    motion.begin(state);
    for (let i = 0; i < 5; i += 1) motion.update(0.5); // roll into the tunnel
    expect(inside).toEqual([true]);
    motion.dispose();
    expect(inside).toEqual([true, false]);
  });
});
