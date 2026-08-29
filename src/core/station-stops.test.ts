import { describe, expect, it } from 'vitest';
import { stationStopSteps } from './station-stops';
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

    expect(stops).toEqual([{ stepIndex: 3, stationId: 's1' }]);
  });

  it('counts a diagonal touch (8-neighbourhood)', () => {
    // (2,1) touches step 1 (1,0) diagonally and step 2 (1,1) edgewise;
    // the first touch in path order wins.
    const stops = stationStopSteps(LOOP_CELLS, [{ id: 's1', cell: { x: 2, y: 1 } }]);

    expect(stops).toEqual([{ stepIndex: 1, stationId: 's1' }]);
  });

  it('counts a station on the track cell itself (defensive)', () => {
    const stops = stationStopSteps(LOOP_CELLS, [{ id: 's1', cell: { x: 1, y: 0 } }]);

    expect(stops).toEqual([{ stepIndex: 1, stationId: 's1' }]);
  });

  it('ignores stations that do not touch the path', () => {
    const stops = stationStopSteps(LOOP_CELLS, [{ id: 's1', cell: { x: 3, y: 3 } }]);

    expect(stops).toEqual([]);
  });

  it('lists multiple stations in path order', () => {
    const stops = stationStopSteps(LOOP_CELLS, [
      { id: 's2', cell: { x: 2, y: 1 } }, // first touch: step 1
      { id: 's1', cell: { x: 0, y: 2 } }, // touches steps 2 (diag) and 3 (edge)
    ]);

    expect(stops).toEqual([
      { stepIndex: 1, stationId: 's2' },
      { stepIndex: 2, stationId: 's1' },
    ]);
  });

  it('lets one station stop the train only once (first touching step wins)', () => {
    // (0,2) touches step 2 (1,1) diagonally and step 3 (0,1) edgewise;
    // the earlier step wins — the train stops at the first pass.
    const stops = stationStopSteps(LOOP_CELLS, [{ id: 's1', cell: { x: 0, y: 2 } }]);

    expect(stops).toEqual([{ stepIndex: 2, stationId: 's1' }]);
  });

  it('keeps two stations that share one step as two stops on the same step', () => {
    const stops = stationStopSteps(LOOP_CELLS, [
      { id: 's1', cell: { x: 2, y: 0 } }, // touches step 1
      { id: 's2', cell: { x: 2, y: 1 } }, // first touch: step 1 (diagonal)
    ]);

    expect(stops).toEqual([
      { stepIndex: 1, stationId: 's1' },
      { stepIndex: 1, stationId: 's2' },
    ]);
  });

  it('handles a single-step path (lone piece)', () => {
    const stops = stationStopSteps([{ x: 5, y: 5 }], [{ id: 's1', cell: { x: 5, y: 6 } }]);

    expect(stops).toEqual([{ stepIndex: 0, stationId: 's1' }]);
  });
});
