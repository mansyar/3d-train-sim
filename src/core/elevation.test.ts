import { describe, expect, it } from 'vitest';
import {
  easedHeightAt,
  HILL_BLEND_FRACTION,
  HILL_HEIGHT,
  heightAt,
  type RideSpan,
  rideHeightAt,
  stepHeights,
} from './elevation';
import { PIECE_TYPES, type PieceType, type Rotation } from './pieces';

const FLAT_TYPES = ['straight', 'corner', 'crossing', 'bridge', 'tunnel'] as const;

const span = (type: PieceType, rotation: Rotation, from: RideSpan['from']): RideSpan => ({
  type,
  rotation,
  from,
});

describe('HILL_HEIGHT', () => {
  it('calibrates to the kit rail line measured from the GLBs (crest ≈ 1.1)', () => {
    expect(HILL_HEIGHT).toBeCloseTo(1.1, 5);
  });
});

describe('heightAt — piecewise-linear profiles in the piece base frame', () => {
  it('climbs 0 → H across the cell for slope-up', () => {
    expect(heightAt('slope-up', 0)).toBeCloseTo(0, 6);
    expect(heightAt('slope-up', 0.5)).toBeCloseTo(HILL_HEIGHT / 2, 6);
    expect(heightAt('slope-up', 1)).toBeCloseTo(HILL_HEIGHT, 6);
  });

  it('cruises at constant H for hill', () => {
    expect(heightAt('hill', 0)).toBeCloseTo(HILL_HEIGHT, 6);
    expect(heightAt('hill', 0.5)).toBeCloseTo(HILL_HEIGHT, 6);
    expect(heightAt('hill', 1)).toBeCloseTo(HILL_HEIGHT, 6);
  });

  it('descends H → 0 across the cell for slope-down', () => {
    expect(heightAt('slope-down', 0)).toBeCloseTo(HILL_HEIGHT, 6);
    expect(heightAt('slope-down', 0.5)).toBeCloseTo(HILL_HEIGHT / 2, 6);
    expect(heightAt('slope-down', 1)).toBeCloseTo(0, 6);
  });

  it('rides every existing piece flat', () => {
    for (const type of FLAT_TYPES) {
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        expect(heightAt(type, t)).toBe(0);
      }
    }
  });

  it('is total: clamps progress outside [0, 1] to the profile ends', () => {
    expect(heightAt('slope-up', -0.5)).toBeCloseTo(0, 6);
    expect(heightAt('slope-up', 1.5)).toBeCloseTo(HILL_HEIGHT, 6);
    expect(heightAt('hill', -2)).toBeCloseTo(HILL_HEIGHT, 6);
    expect(heightAt('hill', 2)).toBeCloseTo(HILL_HEIGHT, 6);
    expect(heightAt('slope-down', -1)).toBeCloseTo(HILL_HEIGHT, 6);
    expect(heightAt('slope-down', 2)).toBeCloseTo(0, 6);
  });

  it('is linear between the ends, not eased (the blend rule eases instead)', () => {
    expect(heightAt('slope-up', 0.25)).toBeCloseTo(HILL_HEIGHT / 4, 6);
    expect(heightAt('slope-up', 0.75)).toBeCloseTo((HILL_HEIGHT * 3) / 4, 6);
  });
});

describe('rideHeightAt — direction- and rotation-aware natural profile', () => {
  it('climbs when slope-up is entered from its low edge at yaw 0 (south)', () => {
    expect(rideHeightAt(span('slope-up', 0, 'south'), 0)).toBeCloseTo(0, 6);
    expect(rideHeightAt(span('slope-up', 0, 'south'), 1)).toBeCloseTo(HILL_HEIGHT, 6);
  });

  it('descends when slope-up is entered from its high edge (reversed riding)', () => {
    expect(rideHeightAt(span('slope-up', 0, 'north'), 0)).toBeCloseTo(HILL_HEIGHT, 6);
    expect(rideHeightAt(span('slope-up', 0, 'north'), 1)).toBeCloseTo(0, 6);
  });

  it('rotates the climb with the piece: low edge advances clockwise per 90° yaw', () => {
    // yaw 90: base south edge faces west; yaw 180: north; yaw 270: east.
    expect(rideHeightAt(span('slope-up', 90, 'west'), 0)).toBeCloseTo(0, 6);
    expect(rideHeightAt(span('slope-up', 90, 'east'), 0)).toBeCloseTo(HILL_HEIGHT, 6);
    expect(rideHeightAt(span('slope-up', 180, 'north'), 0)).toBeCloseTo(0, 6);
    expect(rideHeightAt(span('slope-up', 180, 'south'), 0)).toBeCloseTo(HILL_HEIGHT, 6);
    expect(rideHeightAt(span('slope-up', 270, 'east'), 0)).toBeCloseTo(0, 6);
    expect(rideHeightAt(span('slope-up', 270, 'west'), 0)).toBeCloseTo(HILL_HEIGHT, 6);
  });

  it('rides the hill crest at H in both directions at every rotation', () => {
    for (const rotation of [0, 90, 180, 270] as const) {
      for (const from of ['north', 'east', 'south', 'west'] as const) {
        for (const t of [0, 0.5, 1]) {
          expect(rideHeightAt(span('hill', rotation, from), t)).toBeCloseTo(HILL_HEIGHT, 6);
        }
      }
    }
  });

  it('mirrors slope-down: high edge first at yaw 0 (south), low edge on exit', () => {
    expect(rideHeightAt(span('slope-down', 0, 'south'), 0)).toBeCloseTo(HILL_HEIGHT, 6);
    expect(rideHeightAt(span('slope-down', 0, 'south'), 1)).toBeCloseTo(0, 6);
    expect(rideHeightAt(span('slope-down', 0, 'north'), 0)).toBeCloseTo(0, 6);
    expect(rideHeightAt(span('slope-down', 0, 'north'), 1)).toBeCloseTo(HILL_HEIGHT, 6);
  });

  it('keeps every existing piece flat at every rotation and entry edge', () => {
    for (const type of FLAT_TYPES) {
      for (const rotation of [0, 90, 180, 270] as const) {
        for (const from of ['north', 'south'] as const) {
          for (const t of [0, 0.5, 1]) {
            expect(rideHeightAt(span(type, rotation, from), t)).toBe(0);
          }
        }
      }
    }
  });
});

describe('stepHeights — entry/exit heights of one ridden step', () => {
  it('annotates a forward slope-up climb from grade to the crest', () => {
    const heights = stepHeights(span('slope-up', 0, 'south'));
    expect(heights.entry).toBeCloseTo(0, 6);
    expect(heights.exit).toBeCloseTo(HILL_HEIGHT, 6);
  });

  it('annotates a hill step at H on both ends', () => {
    const heights = stepHeights(span('hill', 90, 'west'));
    expect(heights.entry).toBeCloseTo(HILL_HEIGHT, 6);
    expect(heights.exit).toBeCloseTo(HILL_HEIGHT, 6);
  });

  it('annotates a reversed slope descent (shuttling off a dead end)', () => {
    const heights = stepHeights(span('slope-down', 0, 'north'));
    expect(heights.entry).toBeCloseTo(0, 6);
    expect(heights.exit).toBeCloseTo(HILL_HEIGHT, 6);
  });

  it('keeps flat steps at 0 on both ends', () => {
    const heights = stepHeights(span('straight', 0, 'south'));
    expect(heights.entry).toBe(0);
    expect(heights.exit).toBe(0);
  });
});

describe('easedHeightAt — the gentle auto-blend at disagreeing joints', () => {
  it('returns the natural profile untouched when the joint heights agree', () => {
    const plain: RideSpan = { type: 'slope-up', rotation: 0, from: 'south' };
    for (const t of [0, 0.1, 0.25, 0.5, 0.9, 1]) {
      expect(easedHeightAt(0, plain, t)).toBeCloseTo(rideHeightAt(plain, t), 6);
    }
    const reversed: RideSpan = { type: 'slope-down', rotation: 0, from: 'north' };
    for (const t of [0, 0.25, 0.5, 1]) {
      expect(easedHeightAt(0, reversed, t)).toBeCloseTo(rideHeightAt(reversed, t), 6);
    }
  });

  it('starts a disagreeing step exactly at the previous exit height — never a pop', () => {
    // Hill crest into a plain straight: the train enters at H, the straight
    // rides at 0 — the eased height must start at H.
    const straight: RideSpan = { type: 'straight', rotation: 0, from: 'south' };
    expect(easedHeightAt(HILL_HEIGHT, straight, 0)).toBeCloseTo(HILL_HEIGHT, 6);
  });

  it('eases a hill-into-straight disagreement over a bounded window', () => {
    const straight: RideSpan = { type: 'straight', rotation: 0, from: 'south' };
    const start = easedHeightAt(HILL_HEIGHT, straight, 0);
    const quarter = easedHeightAt(HILL_HEIGHT, straight, HILL_BLEND_FRACTION / 2);
    const blended = easedHeightAt(HILL_HEIGHT, straight, HILL_BLEND_FRACTION);
    const tail = easedHeightAt(HILL_HEIGHT, straight, HILL_BLEND_FRACTION + 0.1);
    expect(start).toBeCloseTo(HILL_HEIGHT, 6);
    // Halfway through the window the height has genuinely eased part-way down.
    expect(quarter).toBeGreaterThan(0);
    expect(quarter).toBeLessThan(start);
    // The window closes exactly on the natural profile.
    expect(blended).toBeCloseTo(0, 6);
    expect(tail).toBeCloseTo(0, 6);
  });

  it('eases slope-into-slope disagreements (the second ramp restarts at grade)', () => {
    const secondRamp: RideSpan = { type: 'slope-up', rotation: 0, from: 'south' };
    expect(easedHeightAt(HILL_HEIGHT, secondRamp, 0)).toBeCloseTo(HILL_HEIGHT, 6);
    expect(easedHeightAt(HILL_HEIGHT, secondRamp, HILL_BLEND_FRACTION)).toBeCloseTo(
      rideHeightAt(secondRamp, HILL_BLEND_FRACTION),
      6,
    );
    expect(easedHeightAt(HILL_HEIGHT, secondRamp, 1)).toBeCloseTo(HILL_HEIGHT, 6);
  });

  it('eases a lone slope at a dead end when the ride reverses onto it', () => {
    // The train sits at the crest and shuttles back down: the reversed entry
    // matches its resting height, so no ease distorts the descent.
    const shuttle: RideSpan = { type: 'slope-up', rotation: 0, from: 'north' };
    for (const t of [0, 0.25, 0.5, 1]) {
      expect(easedHeightAt(HILL_HEIGHT, shuttle, t)).toBeCloseTo(rideHeightAt(shuttle, t), 6);
    }
  });

  it('eases reversed disagreements identically (direction-symmetric rule)', () => {
    // Entering a plain straight reversed while carrying crest height.
    const straight: RideSpan = { type: 'straight', rotation: 180, from: 'north' };
    expect(easedHeightAt(HILL_HEIGHT, straight, 0)).toBeCloseTo(HILL_HEIGHT, 6);
    expect(easedHeightAt(HILL_HEIGHT, straight, HILL_BLEND_FRACTION)).toBeCloseTo(0, 6);
  });

  it('treats near-agreeing heights as agreeing (float-safe)', () => {
    const straight: RideSpan = { type: 'straight', rotation: 0, from: 'south' };
    expect(easedHeightAt(0.0000001, straight, 0.5)).toBeCloseTo(0, 6);
  });

  it('never rises above both the carried height and the natural profile (no float)', () => {
    const ramp: RideSpan = { type: 'slope-up', rotation: 0, from: 'south' };
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const eased = easedHeightAt(HILL_HEIGHT, ramp, t);
      const natural = rideHeightAt(ramp, t);
      expect(eased).toBeLessThanOrEqual(Math.max(HILL_HEIGHT, natural) + 1e-9);
      expect(eased).toBeGreaterThanOrEqual(Math.min(natural, HILL_HEIGHT) - 1e-9);
    }
  });
});

describe('elevation module purity', () => {
  it('covers the whole catalog without throwing (total functions)', () => {
    for (const type of PIECE_TYPES) {
      for (const t of [-1, 0, 0.5, 1, 2]) {
        expect(Number.isFinite(heightAt(type, t))).toBe(true);
        expect(Number.isFinite(rideHeightAt(span(type, 90, 'west'), t))).toBe(true);
        expect(Number.isFinite(easedHeightAt(0.5, span(type, 90, 'west'), t))).toBe(true);
      }
    }
  });
});
