import { describe, expect, it } from 'vitest';
import { endpointsFor, type Rotation } from './pieces';
import { nextBranch, routeSwitch } from './switches';

const ALL_ROTATIONS: Rotation[] = [0, 90, 180, 270];

describe('nextBranch', () => {
  it('starts on the straight branch — the first stem pass rides straight through', () => {
    expect(nextBranch(0)).toBe('straight');
  });

  it('alternates: diverge after one stem pass, straight again after two', () => {
    expect(nextBranch(1)).toBe('diverge');
    expect(nextBranch(2)).toBe('straight');
    expect(nextBranch(3)).toBe('diverge');
    expect(nextBranch(47)).toBe('diverge');
  });
});

describe('routeSwitch', () => {
  it('routes the first stem pass into the straight branch and advances the counter', () => {
    expect(routeSwitch(0, 0, 'south')).toEqual({ exit: 'north', counter: 1 });
  });

  it('routes the next stem pass into the diverging branch', () => {
    expect(routeSwitch(1, 0, 'south')).toEqual({ exit: 'east', counter: 0 });
  });

  it('keeps alternating on later stem passes (wraparound, counters stay 0|1)', () => {
    const first = routeSwitch(0, 0, 'south');
    const second = routeSwitch(first.counter, 0, 'south');
    const third = routeSwitch(second.counter, 0, 'south');
    expect([first.exit, second.exit, third.exit]).toEqual(['north', 'east', 'north']);
    expect(second.counter).toBe(0);
  });

  it('merges a straight-branch entry through the stem without advancing the counter', () => {
    expect(routeSwitch(0, 0, 'north')).toEqual({ exit: 'south', counter: 0 });
    expect(routeSwitch(1, 0, 'north')).toEqual({ exit: 'south', counter: 1 });
  });

  it('merges a diverging-branch entry through the stem without advancing the counter', () => {
    expect(routeSwitch(0, 0, 'east')).toEqual({ exit: 'south', counter: 0 });
    expect(routeSwitch(1, 0, 'east')).toEqual({ exit: 'south', counter: 1 });
  });

  it('rotates the whole Y with the piece — stem, straight, and diverge follow', () => {
    // 90°: stem west, straight branch east, diverging branch south.
    expect(routeSwitch(0, 90, 'west')).toEqual({ exit: 'east', counter: 1 });
    expect(routeSwitch(1, 90, 'west')).toEqual({ exit: 'south', counter: 0 });
    expect(routeSwitch(0, 90, 'east')).toEqual({ exit: 'west', counter: 0 });
    expect(routeSwitch(1, 90, 'south')).toEqual({ exit: 'west', counter: 1 });
    // 180°: stem north, straight branch south, diverging branch west.
    expect(routeSwitch(0, 180, 'north')).toEqual({ exit: 'south', counter: 1 });
    expect(routeSwitch(1, 180, 'north')).toEqual({ exit: 'west', counter: 0 });
    // 270°: stem east, straight branch west, diverging branch north.
    expect(routeSwitch(0, 270, 'east')).toEqual({ exit: 'west', counter: 1 });
    expect(routeSwitch(1, 270, 'east')).toEqual({ exit: 'north', counter: 0 });
  });

  it('stays total and self-consistent: every entry at every rotation exits by a different open end with a 0|1 counter', () => {
    for (const rotation of ALL_ROTATIONS) {
      const ends = endpointsFor('switch', rotation);
      for (const from of ends) {
        for (const counter of [0, 1]) {
          const routed = routeSwitch(counter, rotation, from);
          expect(ends).toContain(routed.exit);
          expect(routed.exit).not.toBe(from);
          expect([0, 1]).toContain(routed.counter);
        }
      }
    }
  });
});

describe('routeSwitch — mirror handedness', () => {
  it('takes the straight branch first and the west diverge next, advancing the counter', () => {
    expect(routeSwitch(0, 0, 'south', 'switch-mirror')).toEqual({ exit: 'north', counter: 1 });
    expect(routeSwitch(1, 0, 'south', 'switch-mirror')).toEqual({ exit: 'west', counter: 0 });
  });

  it('merges both mirror branches through the stem without advancing the counter', () => {
    expect(routeSwitch(0, 0, 'north', 'switch-mirror')).toEqual({ exit: 'south', counter: 0 });
    expect(routeSwitch(1, 0, 'north', 'switch-mirror')).toEqual({ exit: 'south', counter: 1 });
    expect(routeSwitch(0, 0, 'west', 'switch-mirror')).toEqual({ exit: 'south', counter: 0 });
    expect(routeSwitch(1, 0, 'west', 'switch-mirror')).toEqual({ exit: 'south', counter: 1 });
  });

  it('rotates the mirrored Y with the piece — stem, straight, and west diverge follow', () => {
    // 90°: stem west, straight east, diverge north.
    expect(routeSwitch(0, 90, 'west', 'switch-mirror')).toEqual({ exit: 'east', counter: 1 });
    expect(routeSwitch(1, 90, 'west', 'switch-mirror')).toEqual({ exit: 'north', counter: 0 });
    // 180°: stem north, straight south, diverge east.
    expect(routeSwitch(0, 180, 'north', 'switch-mirror')).toEqual({ exit: 'south', counter: 1 });
    expect(routeSwitch(1, 180, 'north', 'switch-mirror')).toEqual({ exit: 'east', counter: 0 });
    // 270°: stem east, straight west, diverge south.
    expect(routeSwitch(0, 270, 'east', 'switch-mirror')).toEqual({ exit: 'west', counter: 1 });
    expect(routeSwitch(1, 270, 'east', 'switch-mirror')).toEqual({ exit: 'south', counter: 0 });
  });

  it('stays total and self-consistent for the mirror at every rotation', () => {
    for (const rotation of ALL_ROTATIONS) {
      const ends = endpointsFor('switch-mirror', rotation);
      for (const from of ends) {
        for (const counter of [0, 1]) {
          const routed = routeSwitch(counter, rotation, from, 'switch-mirror');
          expect(ends).toContain(routed.exit);
          expect(routed.exit).not.toBe(from);
          expect([0, 1]).toContain(routed.counter);
        }
      }
    }
  });
});
