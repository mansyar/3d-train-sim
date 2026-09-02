import { describe, expect, it } from 'vitest';
import { type RideComponent, selectRideComponents, solvePath, solveRidePaths } from './pathing';
import { endpointsFor } from './pieces';
import type { PieceType, PlacedPiece, Rotation } from './track-graph';

function piece(id: string, type: PieceType, x: number, y: number, rotation: Rotation): PlacedPiece {
  return { id, type, cell: { x, y }, rotation };
}

function placedOf(pieces: readonly PlacedPiece[], id: string): PlacedPiece {
  const found = pieces.find((p) => p.id === id);
  if (!found) throw new Error(`step references unknown piece ${id}`);
  return found;
}

const STEP_TO = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
} as const;

function neighbourOf(cell: { x: number; y: number }, edge: keyof typeof STEP_TO) {
  const delta = STEP_TO[edge];
  return { x: cell.x + delta.x, y: cell.y + delta.y };
}

describe('solvePath — closed loops', () => {
  it('traverses a 2×2 corner loop and closes back on the start', () => {
    const pieces = [
      piece('nw', 'corner', 0, 0, 90),
      piece('ne', 'corner', 1, 0, 180),
      piece('se', 'corner', 1, 1, 270),
      piece('sw', 'corner', 0, 1, 0),
    ];

    const path = solvePath(pieces);

    expect(path.closed).toBe(true);
    expect(path.steps.map((s) => s.pieceId)).toEqual(['nw', 'ne', 'se', 'sw']);

    for (const step of path.steps) {
      const placed = placedOf(pieces, step.pieceId);
      // from/to are exactly the piece's two real endpoints at its rotation.
      expect([step.from, step.to].sort()).toEqual(
        [...endpointsFor(placed.type, placed.rotation)].sort(),
      );
    }

    // Consecutive steps are physically connected: exiting one piece lands on
    // the cell whose piece the next step enters through.
    for (let i = 1; i < path.steps.length; i++) {
      const prev = path.steps[i - 1];
      const cur = path.steps[i];
      if (!prev || !cur) throw new Error('step missing from traversal');
      const prevPlaced = placedOf(pieces, prev.pieceId);
      const curPlaced = placedOf(pieces, cur.pieceId);
      expect(neighbourOf(prevPlaced.cell, prev.to)).toEqual(curPlaced.cell);
      expect(neighbourOf(curPlaced.cell, cur.from)).toEqual(prevPlaced.cell);
    }

    // The loop wraps: the last exit lands back on the first piece's cell.
    const first = path.steps[0];
    const last = path.steps[path.steps.length - 1];
    if (!first || !last) throw new Error('loop traversal incomplete');
    const firstPlaced = placedOf(pieces, first.pieceId);
    const lastPlaced = placedOf(pieces, last.pieceId);
    expect(neighbourOf(lastPlaced.cell, last.to)).toEqual(firstPlaced.cell);
    expect(neighbourOf(firstPlaced.cell, first.from)).toEqual(lastPlaced.cell);
  });

  it('traverses a loop with straight sides (8-piece rectangle)', () => {
    const pieces = [
      piece('nw', 'corner', 0, 0, 90),
      piece('top-1', 'straight', 1, 0, 90),
      piece('top-2', 'straight', 2, 0, 90),
      piece('ne', 'corner', 3, 0, 180),
      piece('se', 'corner', 3, 1, 270),
      piece('bottom-2', 'straight', 2, 1, 90),
      piece('bottom-1', 'straight', 1, 1, 90),
      piece('sw', 'corner', 0, 1, 0),
    ];

    const path = solvePath(pieces);

    expect(path.closed).toBe(true);
    expect(path.steps).toHaveLength(8);
    expect(new Set(path.steps.map((s) => s.pieceId))).toEqual(new Set(pieces.map((p) => p.id)));
  });

  it('is deterministic: same input, same traversal (start rule, not array luck)', () => {
    const pieces = [
      piece('nw', 'corner', 0, 0, 90),
      piece('ne', 'corner', 1, 0, 180),
      piece('se', 'corner', 1, 1, 270),
      piece('sw', 'corner', 0, 1, 0),
    ];

    const first = solvePath(pieces);
    expect(solvePath(pieces)).toEqual(first);

    // Placement order in the array must not change the chosen traversal.
    const reversed = solvePath([...pieces].reverse());
    expect(reversed).toEqual(first);
  });
});

describe('solvePath — open layouts (zero dead ends, guaranteed ride)', () => {
  it('rides a two-piece straight line from one dead end to the other', () => {
    const pieces = [piece('a', 'straight', 0, 0, 90), piece('b', 'straight', 1, 0, 90)];

    const path = solvePath(pieces);

    expect(path.closed).toBe(false);
    expect(path.steps.map((s) => s.pieceId)).toEqual(['a', 'b']);
    // The ride starts at a dead end, entering through the piece's open end.
    expect(path.steps[0]).toEqual({
      pieceId: 'a',
      from: 'west',
      to: 'east',
      entryHeight: 0,
      exitHeight: 0,
    });
    expect(path.steps[1]).toEqual({
      pieceId: 'b',
      from: 'west',
      to: 'east',
      entryHeight: 0,
      exitHeight: 0,
    });
  });

  it('rides an L-shaped dead-end path through a corner', () => {
    const pieces = [
      piece('elbow-a', 'corner', 0, 0, 90), // east+south
      piece('mid', 'straight', 1, 0, 90), // east+west
      piece('elbow-b', 'corner', 2, 0, 180), // south+west
      piece('tail', 'straight', 2, 1, 0), // north+south
    ];

    const path = solvePath(pieces);

    expect(path.closed).toBe(false);
    expect(path.steps.map((s) => s.pieceId)).toEqual(['elbow-a', 'mid', 'elbow-b', 'tail']);
    // Enters the first piece through its unconnected open end (south).
    expect(path.steps[0]?.from).toBe('south');
    // Exits the last piece through its unconnected open end (south).
    expect(path.steps[3]?.to).toBe('south');
  });

  it('shuttles a single lone piece (one step, open)', () => {
    const pieces = [piece('lonely', 'corner', 3, 4, 0)];

    const path = solvePath(pieces);

    expect(path.closed).toBe(false);
    expect(path.steps).toEqual([
      { pieceId: 'lonely', from: 'north', to: 'east', entryHeight: 0, exitHeight: 0 },
    ]);
  });

  it('returns a no-op path for an empty meadow', () => {
    expect(solvePath([])).toEqual({ steps: [], closed: false });
  });

  it('rides the deterministic component when two separate tracks exist', () => {
    const pieces = [
      piece('far', 'corner', 5, 5, 0),
      piece('a', 'straight', 0, 0, 90),
      piece('b', 'straight', 1, 0, 90),
    ];

    const path = solvePath(pieces);

    // The component anchored at the smallest cell wins; the lone piece waits.
    expect(path.steps.map((s) => s.pieceId)).toEqual(['a', 'b']);
    expect(path.closed).toBe(false);
  });

  it('reverses direction through a dead-end spur (ride layer shuttles back)', () => {
    // Three-piece line with the smallest cell in the MIDDLE: the solver must
    // still start at a dead end, not at the smallest cell.
    const pieces = [
      piece('head', 'straight', 0, 0, 90),
      piece('mid', 'straight', 1, 0, 90),
      piece('tail', 'straight', 2, 0, 90),
    ];

    const path = solvePath(pieces);

    expect(path.closed).toBe(false);
    // Endpoints are head and tail; the tail sits on the smaller cell (0,0 is
    // head) — start must be a degree-1 endpoint riding inward, open end first.
    expect(path.steps[0]?.from).toBe('west');
    expect(path.steps[2]?.to).toBe('east');
    expect(path.steps.map((s) => s.pieceId)).toEqual(['head', 'mid', 'tail']);
  });
});

describe('solvePath — crossing (straight-through only)', () => {
  it('rides a plus layout straight through: enter west, exit east', () => {
    const pieces = [
      piece('w', 'straight', 0, 0, 90), // east edge meets crossing west
      piece('x', 'crossing', 1, 0, 0),
      piece('e', 'straight', 2, 0, 90), // west edge meets crossing east
      piece('n', 'straight', 1, -1, 0), // south edge meets crossing north
      piece('s', 'straight', 1, 1, 0), // north edge meets crossing south
    ];

    const path = solvePath(pieces);

    expect(path.closed).toBe(false);
    // Dead ends sort to the west arm (cell '0,0'), so the ride starts there.
    expect(path.steps.map((s) => s.pieceId)).toEqual(['w', 'x', 'e']);
    expect(path.steps[1]).toEqual({
      pieceId: 'x',
      from: 'west',
      to: 'east',
      entryHeight: 0,
      exitHeight: 0,
    });
  });

  it('exits opposite when entering from the north (deterministic start picks the north arm)', () => {
    // No west arm: the north arm holds the smallest cell, so the solver
    // starts there and enters the crossing through its north edge.
    const pieces = [
      piece('n', 'straight', 1, 0, 0),
      piece('x', 'crossing', 1, 1, 0),
      piece('e', 'straight', 2, 1, 90),
      piece('s', 'straight', 1, 2, 0),
    ];

    const path = solvePath(pieces);

    expect(path.closed).toBe(false);
    expect(path.steps.map((s) => s.pieceId)).toEqual(['n', 'x', 's']);
    expect(path.steps[1]).toEqual({
      pieceId: 'x',
      from: 'north',
      to: 'south',
      entryHeight: 0,
      exitHeight: 0,
    });
  });

  it('treats an unconnected crossing edge as a dead end (pause + shuttle back)', () => {
    // A lone spur into a crossing: the south exit is unconnected, so the
    // ride ends there — the ride layer pauses and shuttles back.
    const pieces = [piece('n', 'straight', 1, 0, 0), piece('x', 'crossing', 1, 1, 0)];

    const path = solvePath(pieces);

    expect(path.closed).toBe(false);
    expect(path.steps).toEqual([
      { pieceId: 'n', from: 'north', to: 'south', entryHeight: 0, exitHeight: 0 },
      { pieceId: 'x', from: 'north', to: 'south', entryHeight: 0, exitHeight: 0 },
    ]);
  });

  it('shuttles a lone crossing west-to-east (opposite, never an arbitrary end)', () => {
    const pieces = [piece('x', 'crossing', 2, 2, 0)];

    const path = solvePath(pieces);

    expect(path.closed).toBe(false);
    // With four open ends the solver enters through the lowest-key open end
    // (west) — the exit MUST be the opposite edge, not just "another end".
    expect(path.steps).toEqual([
      { pieceId: 'x', from: 'west', to: 'east', entryHeight: 0, exitHeight: 0 },
    ]);
  });
});

describe('solvePath — crossing re-entry (loops through one crossing twice)', () => {
  it('closes a fully-connected loop that passes the same crossing twice per lap', () => {
    // A pretzel: the lap crosses `cx` north→south and later west→east. Every
    // piece end is connected — a closed layout, so the ride must loop forever
    // (product rule: zero dead ends). The walk must re-enter the ridden
    // crossing instead of stopping at its edge.
    const pieces = [
      piece('a', 'corner', 0, 1, 90), // east+south
      piece('b', 'straight', 1, 1, 90), // east+west
      piece('n', 'corner', 2, 1, 180), // south+west
      piece('cx', 'crossing', 2, 2, 0),
      piece('s23', 'corner', 2, 3, 270), // west+north
      piece('e13', 'corner', 1, 3, 0), // north+east
      piece('w', 'corner', 1, 2, 90), // east+south
      piece('e', 'straight', 3, 2, 90), // east+west
      piece('c42', 'corner', 4, 2, 180), // south+west
      piece('s43', 'straight', 4, 3, 0), // north+south
      piece('c44', 'corner', 4, 4, 270), // west+north
      piece('s34', 'straight', 3, 4, 90), // east+west
      piece('s24', 'straight', 2, 4, 90), // east+west
      piece('s14', 'straight', 1, 4, 90), // east+west
      piece('c04', 'corner', 0, 4, 0), // north+east
      piece('s03', 'straight', 0, 3, 0), // north+south
      piece('s02', 'straight', 0, 2, 0), // north+south
    ];

    const path = solvePath(pieces);

    expect(path.closed).toBe(true);
    // The full lap: 17 pieces with the crossing ridden twice.
    expect(path.steps).toHaveLength(18);
    expect(path.steps.filter((s) => s.pieceId === 'cx')).toEqual([
      { pieceId: 'cx', from: 'north', to: 'south', entryHeight: 0, exitHeight: 0 },
      { pieceId: 'cx', from: 'west', to: 'east', entryHeight: 0, exitHeight: 0 },
    ]);

    // Consecutive steps are physically connected, and the lap wraps: the
    // last exit lands back on the first piece's entry cell.
    for (let i = 1; i < path.steps.length; i++) {
      const prev = path.steps[i - 1];
      const cur = path.steps[i];
      if (!prev || !cur) throw new Error('step missing from traversal');
      const prevPlaced = placedOf(pieces, prev.pieceId);
      const curPlaced = placedOf(pieces, cur.pieceId);
      expect(neighbourOf(prevPlaced.cell, prev.to)).toEqual(curPlaced.cell);
      expect(neighbourOf(curPlaced.cell, cur.from)).toEqual(prevPlaced.cell);
    }
    const first = path.steps[0];
    const last = path.steps[path.steps.length - 1];
    if (!first || !last) throw new Error('loop traversal incomplete');
    const firstPlaced = placedOf(pieces, first.pieceId);
    const lastPlaced = placedOf(pieces, last.pieceId);
    expect(neighbourOf(lastPlaced.cell, last.to)).toEqual(firstPlaced.cell);
    expect(neighbourOf(firstPlaced.cell, first.from)).toEqual(lastPlaced.cell);

    // Deterministic: same layout, same lap.
    expect(solvePath(pieces)).toEqual(path);
  });

  // The spliced-crossing oval reused by both guard tests: a closed oval
  // (12 pieces) whose only junction is the crossing `cx`, entered west.
  const ovalPieces = [
    piece('w', 'straight', 1, 2, 90), // east edge meets crossing west
    piece('cx', 'crossing', 2, 2, 0),
    piece('e', 'straight', 3, 2, 90), // west edge meets crossing east
    piece('a0', 'corner', 0, 2, 90), // east+south
    piece('s1', 'straight', 0, 3, 0), // north+south
    piece('a1', 'corner', 0, 4, 0), // north+east
    piece('s2', 'straight', 1, 4, 90), // east+west
    piece('s3', 'straight', 2, 4, 90), // east+west
    piece('s4', 'straight', 3, 4, 90), // east+west
    piece('a2', 'corner', 4, 4, 270), // west+north
    piece('s5', 'straight', 4, 3, 0), // north+south
    piece('a3', 'corner', 4, 2, 180), // south+west
  ];

  it('still closes when a crossing is spliced into a simple oval (one pass per lap)', () => {
    const pieces = ovalPieces;

    const path = solvePath(pieces);

    expect(path.closed).toBe(true);
    expect(path.steps).toHaveLength(12);
    expect(path.steps.filter((s) => s.pieceId === 'cx')).toEqual([
      { pieceId: 'cx', from: 'west', to: 'east', entryHeight: 0, exitHeight: 0 },
    ]);
  });

  it('shuttles a closed loop with a dangling spur through the crossing (open layout)', () => {
    const pieces = [
      ...ovalPieces,
      piece('spur', 'straight', 2, 1, 0), // south edge meets crossing north
      piece('tip', 'straight', 2, 0, 0), // open north end - the dead end
    ];

    const path = solvePath(pieces);

    expect(path.closed).toBe(false);
    // Starts at the spur's dead end, rides through the crossing, and stops
    // at the crossing's open south face (the ride layer shuttles back).
    expect(path.steps.map((s) => s.pieceId)).toEqual(['tip', 'spur', 'cx']);
    expect(path.steps[2]).toEqual({
      pieceId: 'cx',
      from: 'north',
      to: 'south',
      entryHeight: 0,
      exitHeight: 0,
    });
  });
});

describe('solvePath — steps carry heights', () => {
  it('annotates a hill run: climb, crest cruise, descent (natural per-piece heights)', () => {
    // slope-up climbs south→north at yaw 0; the run spans (2,3) → (2,2) → (2,1).
    const pieces = [
      piece('up', 'slope-up', 2, 3, 0),
      piece('crest', 'hill', 2, 2, 0),
      piece('down', 'slope-down', 2, 1, 0),
    ];

    const path = solvePath(pieces);

    expect(path.closed).toBe(false);
    // The deterministic walk starts at the smallest-cell dead end — the
    // slope-down's north edge — and rides the run in reverse.
    expect(path.steps.map((s) => s.pieceId)).toEqual(['down', 'crest', 'up']);
    expect(path.steps[0]).toEqual({
      pieceId: 'down',
      from: 'north',
      to: 'south',
      entryHeight: 0,
      exitHeight: 1.1,
    });
    expect(path.steps[1]).toEqual({
      pieceId: 'crest',
      from: 'north',
      to: 'south',
      entryHeight: 1.1,
      exitHeight: 1.1,
    });
    expect(path.steps[2]).toEqual({
      pieceId: 'up',
      from: 'north',
      to: 'south',
      entryHeight: 1.1,
      exitHeight: 0,
    });
  });

  it('rides the hill crest at height in both directions around a loop', () => {
    const pieces = [
      piece('nw', 'corner', 0, 0, 90),
      piece('top', 'hill', 1, 0, 90),
      piece('ne', 'corner', 2, 0, 180),
      piece('se', 'corner', 2, 1, 270),
      piece('bottom', 'hill', 1, 1, 90),
      piece('sw', 'corner', 0, 1, 0),
    ];

    const path = solvePath(pieces);

    expect(path.closed).toBe(true);
    const hillSteps = path.steps.filter((s) => s.pieceId === 'top' || s.pieceId === 'bottom');
    for (const step of hillSteps) {
      expect(step.entryHeight).toBeCloseTo(1.1, 6);
      expect(step.exitHeight).toBeCloseTo(1.1, 6);
    }
    // Corners stay at grade.
    const cornerSteps = path.steps.filter((s) => s.pieceId !== 'top' && s.pieceId !== 'bottom');
    for (const step of cornerSteps) {
      expect(step.entryHeight).toBe(0);
      expect(step.exitHeight).toBe(0);
    }
  });

  it('annotates a lone slope dead end with its climb (shuttle brings it back down)', () => {
    const pieces = [piece('ramp', 'slope-up', 4, 4, 0)];

    const path = solvePath(pieces);

    // The walk enters through the lower-key open end — the north edge — so
    // the step rides the slope reversed: crest first, grade on exit.
    expect(path.steps[0]).toEqual({
      pieceId: 'ramp',
      from: 'north',
      to: 'south',
      entryHeight: 1.1,
      exitHeight: 0,
    });
  });

  it('keeps connectivity, ranking, and shuttling untouched by heights', () => {
    // The same layout as the two-piece line test, with the straights swapped
    // for hills: same traversal shape, only the heights differ.
    const pieces = [piece('a', 'hill', 0, 0, 90), piece('b', 'hill', 1, 0, 90)];

    const path = solvePath(pieces);

    expect(path.closed).toBe(false);
    expect(path.steps.map((s) => s.pieceId)).toEqual(['a', 'b']);
    expect(path.steps[0]?.from).toBe('west');
    for (const step of path.steps) {
      expect(step.entryHeight).toBeCloseTo(1.1, 6);
      expect(step.exitHeight).toBeCloseTo(1.1, 6);
    }
  });
});

describe('solveRidePaths — one path per connected component', () => {
  /** Reuse the physical-connectivity checks: every hop lands on a real piece. */
  function expectPathRides(pieces: readonly PlacedPiece[], path: ReturnType<typeof solvePath>) {
    for (let i = 1; i < path.steps.length; i++) {
      const prev = path.steps[i - 1];
      const cur = path.steps[i];
      if (!prev || !cur) throw new Error('step missing from traversal');
      const prevPlaced = placedOf(pieces, prev.pieceId);
      const curPlaced = placedOf(pieces, cur.pieceId);
      expect(neighbourOf(prevPlaced.cell, prev.to)).toEqual(curPlaced.cell);
      expect(neighbourOf(curPlaced.cell, cur.from)).toEqual(prevPlaced.cell);
    }
  }

  const loopA = [
    piece('a-nw', 'corner', 0, 0, 90),
    piece('a-ne', 'corner', 1, 0, 180),
    piece('a-se', 'corner', 1, 1, 270),
    piece('a-sw', 'corner', 0, 1, 0),
  ];
  const loopB = [
    piece('b-nw', 'corner', 5, 5, 90),
    piece('b-ne', 'corner', 6, 5, 180),
    piece('b-se', 'corner', 6, 6, 270),
    piece('b-sw', 'corner', 5, 6, 0),
  ];

  it('returns [] for an empty meadow', () => {
    expect(solveRidePaths([])).toEqual([]);
  });

  it('returns the same path as solvePath when the world is one component', () => {
    const pieces = [
      piece('nw', 'corner', 0, 0, 90),
      piece('top-1', 'straight', 1, 0, 90),
      piece('top-2', 'straight', 2, 0, 90),
      piece('ne', 'corner', 3, 0, 180),
      piece('se', 'corner', 3, 1, 270),
      piece('bottom-2', 'straight', 2, 1, 90),
      piece('bottom-1', 'straight', 1, 1, 90),
      piece('sw', 'corner', 0, 1, 0),
    ];

    const paths = solveRidePaths(pieces);

    expect(paths).toEqual([solvePath(pieces)]);
    expect(paths[0]?.closed).toBe(true);
  });

  it('yields two closed paths for two disjoint loops, in smallest-cell order', () => {
    const pieces = [...loopB, ...loopA];

    const paths = solveRidePaths(pieces);

    expect(paths).toHaveLength(2);
    expect(paths.map((p) => p.closed)).toEqual([true, true]);
    // A rides first (its smallest cell anchors the smaller key), B second —
    // never array order: loopB was listed first.
    expect(paths[0]?.steps.every((s) => s.pieceId.startsWith('a-'))).toBe(true);
    expect(paths[1]?.steps.every((s) => s.pieceId.startsWith('b-'))).toBe(true);
    for (const path of paths) expectPathRides(pieces, path);
  });

  it('is deterministic: input order never changes the returned paths', () => {
    const pieces = [...loopB, ...loopA];
    expect(solveRidePaths([...pieces].reverse())).toEqual(solveRidePaths(pieces));
  });

  it('pairs a closed loop with an open path when a second track is a dead-end line', () => {
    const pieces = [
      ...loopA,
      piece('line-1', 'straight', 4, 0, 90),
      piece('line-2', 'straight', 5, 0, 90),
    ];

    const paths = solveRidePaths(pieces);

    expect(paths).toHaveLength(2);
    expect(paths.map((p) => p.closed)).toEqual([true, false]);
    // The line rides from its west dead end eastward.
    expect(paths[1]?.steps).toEqual([
      { pieceId: 'line-1', from: 'west', to: 'east', entryHeight: 0, exitHeight: 0 },
      { pieceId: 'line-2', from: 'west', to: 'east', entryHeight: 0, exitHeight: 0 },
    ]);
  });

  it('gives a lone piece its own open shuttle path', () => {
    const pieces = [...loopA, piece('lonely', 'corner', 6, 6, 0)];

    const paths = solveRidePaths(pieces);

    expect(paths).toHaveLength(2);
    expect(paths[1]?.steps).toEqual([
      { pieceId: 'lonely', from: 'north', to: 'east', entryHeight: 0, exitHeight: 0 },
    ]);
    expect(paths[1]?.closed).toBe(false);
  });

  it('keeps a crossing with an unridden side branch as one straight-through path', () => {
    // Documented limitation, unchanged: the crossing's north/south branch
    // belongs to the same component, so the whole thing is one ride that
    // passes straight through the crossing.
    const pieces = [
      piece('w', 'straight', 0, 0, 90),
      piece('x', 'crossing', 1, 0, 0),
      piece('e', 'straight', 2, 0, 90),
      piece('n', 'straight', 1, -1, 0),
      piece('s', 'straight', 1, 1, 0),
    ];

    const paths = solveRidePaths(pieces);

    expect(paths).toHaveLength(1);
    expect(paths[0]?.closed).toBe(false);
    expect(paths[0]?.steps.map((s) => s.pieceId)).toEqual(['w', 'x', 'e']);
    expect(paths[0]?.steps[1]).toEqual({
      pieceId: 'x',
      from: 'west',
      to: 'east',
      entryHeight: 0,
      exitHeight: 0,
    });
  });
});

describe('selectRideComponents — rank and cap concurrent rides', () => {
  const component = (id: string, size: number, anchor: string): RideComponent => ({
    pieceIds: Array.from({ length: size }, (_, i) => `${id}-${i}`),
    path: { steps: [], closed: false },
    anchor,
  });

  it('returns [] for an empty meadow', () => {
    expect(selectRideComponents([])).toEqual([]);
  });

  it('selects all components when there are at most cap of them', () => {
    const components = [
      component('a', 3, '0,0'),
      component('b', 5, '4,0'),
      component('c', 1, '7,7'),
    ];

    expect(selectRideComponents(components)).toEqual([
      component('b', 5, '4,0'),
      component('a', 3, '0,0'),
      component('c', 1, '7,7'),
    ]);
  });

  it('ranks by most pieces first, cell-key tiebreak for equal sizes', () => {
    const components = [
      component('tie-small', 4, '9,9'),
      component('big', 8, '5,5'),
      component('tie-small-anchor', 4, '0,0'),
      component('tiny', 2, '1,1'),
    ];

    const selected = selectRideComponents(components);

    expect(selected.map((c) => c.anchor)).toEqual(['5,5', '0,0', '9,9', '1,1']);
  });

  it('caps concurrent rides at 4 by default, keeping the top-ranked', () => {
    const components = [
      component('one', 1, '0,0'),
      component('two', 2, '1,0'),
      component('three', 3, '2,0'),
      component('four', 4, '3,0'),
      component('five', 5, '4,0'),
      component('six', 6, '5,0'),
    ];

    const selected = selectRideComponents(components);

    expect(selected).toHaveLength(4);
    expect(selected.map((c) => c.anchor)).toEqual(['5,0', '4,0', '3,0', '2,0']);
  });

  it('honours an explicit cap', () => {
    const components = [
      component('a', 1, '0,0'),
      component('b', 2, '1,0'),
      component('c', 3, '2,0'),
    ];

    expect(selectRideComponents(components, 2).map((c) => c.anchor)).toEqual(['2,0', '1,0']);
  });

  it('is deterministic under any input order', () => {
    const components = [
      component('a', 3, '0,0'),
      component('b', 5, '4,0'),
      component('c', 5, '2,0'),
      component('d', 2, '7,7'),
    ];

    const selected = selectRideComponents(components);
    for (const shuffled of [
      [...components].reverse(),
      [...components.slice(2), ...components.slice(0, 2)],
      [...components].sort((a, b) => b.anchor.localeCompare(a.anchor)),
    ]) {
      expect(selectRideComponents(shuffled)).toEqual(selected);
    }
  });
});
