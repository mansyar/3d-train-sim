import { describe, expect, it } from 'vitest';
import {
  advanceCrossing,
  CROSSING_CLOSE_SECONDS,
  CROSSING_EXIT_DISTANCE,
  CROSSING_LIFT_SECONDS,
  CROSSING_OCCUPY_DISTANCE,
  CROSSING_WARNING_DISTANCE,
  type CrossingMotion,
  idleCrossing,
} from './crossings';

/** The gate under test sits at cell (8, 8); trains ride the x = 8.5 column. */
const GATE = { x: 8, y: 8 };
const trainAt = (y: number): { x: number; y: number } => ({ x: 8.5, y });

describe('crossing constants', () => {
  it('orders the hysteresis ladder: occupy < exit < warning', () => {
    expect(CROSSING_OCCUPY_DISTANCE).toBeLessThan(CROSSING_EXIT_DISTANCE);
    expect(CROSSING_EXIT_DISTANCE).toBeLessThan(CROSSING_WARNING_DISTANCE);
  });

  it('eases the swing: closing is brisk, lifting a touch unhurried, both gentle', () => {
    expect(CROSSING_CLOSE_SECONDS).toBeGreaterThan(0);
    expect(CROSSING_LIFT_SECONDS).toBeGreaterThanOrEqual(CROSSING_CLOSE_SECONDS);
  });
});

describe('advanceCrossing', () => {
  it('ignores trains beyond the warning distance', () => {
    const farY = 8.5 + CROSSING_WARNING_DISTANCE + 0.25;
    expect(advanceCrossing(idleCrossing(), GATE, [{ x: 8.5, y: farY }], 1 / 60)).toEqual({
      phase: 'idle',
      progress: 0,
    });
  });

  it('stays idle with no trains around', () => {
    const state = advanceCrossing(idleCrossing(), GATE, [], 1 / 60);
    expect(state).toEqual({ phase: 'idle', progress: 0 });
    expect(advanceCrossing(state, GATE, [trainAt(14)], 1 / 60)).toEqual({
      phase: 'idle',
      progress: 0,
    });
  });

  it('starts closing when a train enters the warning distance', () => {
    const state = advanceCrossing(idleCrossing(), GATE, [trainAt(10.5)], 1 / 60); // 2.0 cells away
    expect(state.phase).toBe('closing');
    expect(state.progress).toBe(0);
  });

  it('eases the swing shut over the closing seconds, clamped at the closed pose', () => {
    let state: CrossingMotion = advanceCrossing(idleCrossing(), GATE, [trainAt(10.5)], 1 / 60);
    for (let i = 0; i < 90; i++) state = advanceCrossing(state, GATE, [trainAt(10)], 1 / 60);
    expect(state.phase).toBe('closing');
    expect(state.progress).toBe(1);
  });

  it('reads active once the train reaches the tile', () => {
    let state: CrossingMotion = advanceCrossing(idleCrossing(), GATE, [trainAt(10.5)], 1 / 60);
    state = advanceCrossing(state, GATE, [trainAt(9.2)], 1 / 60); // 0.7 cells away
    expect(state).toEqual({ phase: 'active', progress: 1 });
  });

  it('holds the gates down after the train passes, until it clears the hold distance', () => {
    let state: CrossingMotion = advanceCrossing(idleCrossing(), GATE, [trainAt(10.5)], 1 / 60);
    state = advanceCrossing(state, GATE, [trainAt(8.8)], 1 / 60); // on the tile
    expect(state.phase).toBe('active');
    // The train recedes but is still inside the hold distance.
    state = advanceCrossing(state, GATE, [trainAt(7)], 1 / 60); // 1.5 cells away
    expect(state).toEqual({ phase: 'active', progress: 1 });
    // Clear of the hold distance: the gates swing up.
    expect(advanceCrossing(state, GATE, [trainAt(6)], 1 / 60).phase).toBe('lifting'); // 2.5 away
  });

  it('does not flap with two trains: the gate waits for the last one to clear', () => {
    let state: CrossingMotion = advanceCrossing(idleCrossing(), GATE, [trainAt(9.5)], 1 / 60);
    state = advanceCrossing(state, GATE, [trainAt(8.7)], 1 / 60); // A on the tile
    expect(state.phase).toBe('active');
    // A recedes clear while B approaches close on the other side.
    state = advanceCrossing(state, GATE, [trainAt(6), trainAt(9.6)], 1 / 60);
    expect(state.phase).not.toBe('lifting');
    // B rolls through and every train clears the hold distance.
    expect(advanceCrossing(state, GATE, [trainAt(11), trainAt(5)], 1 / 60).phase).toBe('lifting');
  });

  it('swings back down from mid-lift when a train re-enters the exit distance', () => {
    let state: CrossingMotion = advanceCrossing(idleCrossing(), GATE, [trainAt(9)], 1 / 60);
    state = advanceCrossing(state, GATE, [trainAt(5)], 1 / 60); // clear → lifting
    expect(state.phase).toBe('lifting');
    state = advanceCrossing(state, GATE, [trainAt(9.4)], 1 / 60); // 0.9 away, inside exit
    expect(state).toEqual({ phase: 'closing', progress: 0 });
  });

  it('finishes the lift into idle', () => {
    let state: CrossingMotion = advanceCrossing(idleCrossing(), GATE, [trainAt(9)], 1 / 60);
    state = advanceCrossing(state, GATE, [trainAt(5)], 1 / 60); // lifting
    for (let i = 0; i < 120; i++) state = advanceCrossing(state, GATE, [], 1 / 60); // 2s, alone
    expect(state).toEqual({ phase: 'idle', progress: 0 });
  });

  it('runs two crossings independently', () => {
    const other = { x: 2, y: 2 };
    const nearGate = advanceCrossing(idleCrossing(), GATE, [trainAt(9)], 1 / 60);
    const farGate = advanceCrossing(idleCrossing(), other, [trainAt(9)], 1 / 60);
    expect(nearGate.phase).toBe('closing');
    expect(farGate.phase).toBe('idle');
  });

  it('holds steady under a whole fleet (four trains, one on the tile)', () => {
    let state: CrossingMotion = advanceCrossing(idleCrossing(), GATE, [trainAt(9.2)], 1 / 60);
    for (let i = 0; i < 30; i++) {
      state = advanceCrossing(
        state,
        GATE,
        [trainAt(9.2), trainAt(12), trainAt(13), trainAt(14)],
        1 / 60,
      );
      expect(state.phase === 'closing' || state.phase === 'active').toBe(true);
    }
  });
});
