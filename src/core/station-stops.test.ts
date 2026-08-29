import { describe, expect, it } from 'vitest';
import { closestPointFraction, type PathSegmentGeom, stationStopSteps } from './station-stops';
import type { Cell } from './track-graph';

/**
 * A 4-step closed loop. Path order:
 *   step 0: (0,0) → step 1: (1,0) → step 2: (1,1) → step 3: (0,1)
 */
const LOOP_CELLS: Cell[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

describe('stationStopSteps', () => {
  it('returns no stops when the meadow has no stations', () => {
    expect(stationStopSteps(LOOP_CELLS, [])).toEqual([]);
  });

  it('stops at the step whose cell the station sits on', () => {
    const stops = stationStopSteps(LOOP_CELLS, [{ id: 's1', cell: { x: 0, y: 1 } }]);

    expect(stops).toEqual([{ stepIndex: 3, stationId: 's1', cell: { x: 0, y: 1 } }]);
  });

  it('prefers the closer (edge-touching) step over a diagonal touch', () => {
    // (2,1) touches step 1 (1,0) diagonally and step 2 (1,1) edgewise.
    const stops = stationStopSteps(LOOP_CELLS, [{ id: 's1', cell: { x: 2, y: 1 } }]);

    expect(stops).toEqual([{ stepIndex: 2, stationId: 's1', cell: { x: 2, y: 1 } }]);
  });

  it('counts a station on the track cell itself (defensive)', () => {
    const stops = stationStopSteps(LOOP_CELLS, [{ id: 's1', cell: { x: 1, y: 0 } }]);

    expect(stops).toEqual([{ stepIndex: 1, stationId: 's1', cell: { x: 1, y: 0 } }]);
  });

  it('ignores stations that do not touch the path', () => {
    const stops = stationStopSteps(LOOP_CELLS, [{ id: 's1', cell: { x: 3, y: 3 } }]);

    expect(stops).toEqual([]);
  });

  it('lists multiple stations in path order', () => {
    const stops = stationStopSteps(LOOP_CELLS, [
      { id: 's2', cell: { x: 2, y: 1 } }, // closest touch: step 2
      { id: 's1', cell: { x: 0, y: 2 } }, // closest touch: step 3
    ]);

    expect(stops).toEqual([
      { stepIndex: 2, stationId: 's2', cell: { x: 2, y: 1 } },
      { stepIndex: 3, stationId: 's1', cell: { x: 0, y: 2 } },
    ]);
  });

  it('lets one station stop the train only once (closest cell wins)', () => {
    // (0,2) touches step 2 (1,1) diagonally and step 3 (0,1) edgewise.
    const stops = stationStopSteps(LOOP_CELLS, [{ id: 's1', cell: { x: 0, y: 2 } }]);

    expect(stops).toEqual([{ stepIndex: 3, stationId: 's1', cell: { x: 0, y: 2 } }]);
  });

  it('keeps two stations that share one step as two stops on the same step', () => {
    const stops = stationStopSteps(LOOP_CELLS, [
      { id: 's1', cell: { x: 2, y: 0 } }, // touches step 1
      { id: 's2', cell: { x: 2, y: -1 } }, // touches step 1 too
    ]);

    expect(stops).toEqual([
      { stepIndex: 1, stationId: 's1', cell: { x: 2, y: 0 } },
      { stepIndex: 1, stationId: 's2', cell: { x: 2, y: -1 } },
    ]);
  });

  it('handles a single-step path (lone piece)', () => {
    const stops = stationStopSteps([{ x: 5, y: 5 }], [{ id: 's1', cell: { x: 5, y: 6 } }]);

    expect(stops).toEqual([{ stepIndex: 0, stationId: 's1', cell: { x: 5, y: 6 } }]);
  });
});

describe('closestPointFraction', () => {
  const line: PathSegmentGeom = {
    kind: 'line',
    ax: 0,
    az: 0,
    bx: 10,
    bz: 0,
    cx: 0,
    cz: 0,
    r: 0,
    a0: 0,
    sweep: 0,
  };

  it('projects a station beside the middle onto the midpoint', () => {
    expect(closestPointFraction(line, { x: 5, z: 3 })).toBe(0.5);
  });

  it('clamps a station past the ends to the segment ends', () => {
    expect(closestPointFraction(line, { x: -2, z: 0 })).toBe(0);
    expect(closestPointFraction(line, { x: 12, z: 0 })).toBe(1);
  });

  it('returns 0 for a degenerate zero-length line', () => {
    const degenerate: PathSegmentGeom = { ...line, bx: 0, bz: 0 };
    expect(closestPointFraction(degenerate, { x: 1, z: 1 })).toBe(0);
  });

  it('places a station on the arc bisector at the arc midpoint', () => {
    const arc: PathSegmentGeom = {
      kind: 'arc',
      ax: 2,
      az: 0,
      bx: 0,
      bz: 2,
      cx: 0,
      cz: 0,
      r: 2,
      a0: 0,
      sweep: Math.PI / 2,
    };
    expect(closestPointFraction(arc, { x: 2, z: 2 })).toBeCloseTo(0.5);
  });

  it('clamps a station outside the swept span to the nearer arc end', () => {
    const arc: PathSegmentGeom = {
      kind: 'arc',
      ax: 2,
      az: 0,
      bx: 0,
      bz: 2,
      cx: 0,
      cz: 0,
      r: 2,
      a0: 0,
      sweep: Math.PI / 2,
    };
    expect(closestPointFraction(arc, { x: -2, z: 0 })).toBe(1);
    expect(closestPointFraction(arc, { x: 2, z: -2 })).toBe(0);
  });
});
