import { describe, expect, it } from 'vitest';
import { HILL_HEIGHT } from './elevation';
import {
  easePaceRamp,
  gradePaceFactor,
  livePaceFactor,
  PACE_CLIMB_FACTOR,
  PACE_DESCENT_FACTOR,
  PACE_EASE_SECONDS,
  personalityPace,
} from './pace';

describe('gradePaceFactor — Moderate hill feel, flat-identical', () => {
  it('rides flat track at exactly 1.0 (byte-identical timing)', () => {
    expect(gradePaceFactor(0, 0)).toBe(1);
    expect(gradePaceFactor(HILL_HEIGHT, HILL_HEIGHT)).toBe(1);
  });

  it('labors a full climb 35% slower', () => {
    expect(gradePaceFactor(0, HILL_HEIGHT)).toBeCloseTo(PACE_CLIMB_FACTOR, 6);
    expect(gradePaceFactor(0, HILL_HEIGHT)).toBeCloseTo(0.65, 6);
  });

  it('breezes a full descent 25% faster', () => {
    expect(gradePaceFactor(HILL_HEIGHT, 0)).toBeCloseTo(PACE_DESCENT_FACTOR, 6);
    expect(gradePaceFactor(HILL_HEIGHT, 0)).toBeCloseTo(1.25, 6);
  });

  it('scales partial grades linearly (auto-blend joints stay gentle)', () => {
    expect(gradePaceFactor(0, HILL_HEIGHT / 2)).toBeCloseTo(0.825, 6);
    expect(gradePaceFactor(HILL_HEIGHT, HILL_HEIGHT / 2)).toBeCloseTo(1.125, 6);
  });

  it('treats the same slope symmetrically reversed (shuttle back mirrors)', () => {
    const climb = gradePaceFactor(0, HILL_HEIGHT);
    const descent = gradePaceFactor(HILL_HEIGHT, 0);
    expect(climb).toBeLessThan(1);
    expect(descent).toBeGreaterThan(1);
    expect(gradePaceFactor(0.3, 0.9)).toBeLessThan(1);
    expect(gradePaceFactor(0.9, 0.3)).toBeGreaterThan(1);
  });

  it('clamps beyond-crest deltas and never stalls', () => {
    expect(gradePaceFactor(0, HILL_HEIGHT * 3)).toBeCloseTo(PACE_CLIMB_FACTOR, 6);
    expect(gradePaceFactor(HILL_HEIGHT * 3, 0)).toBeCloseTo(PACE_DESCENT_FACTOR, 6);
    expect(gradePaceFactor(0, HILL_HEIGHT * 3)).toBeGreaterThanOrEqual(0.5);
  });

  it('is total over finite heights', () => {
    for (const entry of [-2, -1, 0, 0.5, HILL_HEIGHT, 3]) {
      for (const exit of [-2, -1, 0, 0.5, HILL_HEIGHT, 3]) {
        expect(Number.isFinite(gradePaceFactor(entry, exit))).toBe(true);
      }
    }
  });
});

describe('personalityPace — Wide spread per loco', () => {
  it('gives steam 0.9x, tram 1.0x, diesel 1.2x', () => {
    expect(personalityPace('steam')).toBeCloseTo(0.9, 6);
    expect(personalityPace('tram')).toBeCloseTo(1.0, 6);
    expect(personalityPace('diesel')).toBeCloseTo(1.2, 6);
  });

  it('keeps diesel clearly zippier than steam on the same flat oval', () => {
    expect(personalityPace('diesel')).toBeGreaterThan(personalityPace('tram'));
    expect(personalityPace('tram')).toBeGreaterThan(personalityPace('steam'));
  });

  it('gives the new fleet engines their own personalities', () => {
    expect(personalityPace('express')).toBeCloseTo(1.05, 6);
    expect(personalityPace('freight')).toBeCloseTo(0.85, 6);
    expect(personalityPace('bullet')).toBeCloseTo(1.3, 6);
  });

  it('spreads the six-engine fleet from steady freight to zippy bullet', () => {
    expect(personalityPace('freight')).toBeLessThan(personalityPace('steam'));
    expect(personalityPace('bullet')).toBeGreaterThan(personalityPace('diesel'));
  });
});

describe('livePaceFactor — personality × grade', () => {
  it('is personality alone on the flat', () => {
    expect(livePaceFactor('steam', 0, 0)).toBeCloseTo(0.9, 6);
    expect(livePaceFactor('tram', 0, 0)).toBeCloseTo(1.0, 6);
    expect(livePaceFactor('diesel', 0, 0)).toBeCloseTo(1.2, 6);
  });

  it('multiplies on hills (diesel climbs faster than steam climbs)', () => {
    const steamClimb = livePaceFactor('steam', 0, HILL_HEIGHT);
    const dieselClimb = livePaceFactor('diesel', 0, HILL_HEIGHT);
    expect(steamClimb).toBeCloseTo(0.9 * 0.65, 6);
    expect(dieselClimb).toBeCloseTo(1.2 * 0.65, 6);
    expect(dieselClimb).toBeGreaterThan(steamClimb);
  });
});

describe('easePaceRamp — ~0.5s gentle ramp, never a jump', () => {
  it('holds the start at progress <= 0 and lands on target at 1', () => {
    expect(easePaceRamp(1, 0.65, 0)).toBe(1);
    expect(easePaceRamp(1, 0.65, -1)).toBe(1);
    expect(easePaceRamp(1, 0.65, 1)).toBe(0.65);
    expect(easePaceRamp(1, 0.65, 2)).toBe(0.65);
  });

  it('eases monotonically between start and target', () => {
    const quarter = easePaceRamp(1, 0.65, 0.25);
    const half = easePaceRamp(1, 0.65, 0.5);
    expect(quarter).toBeLessThan(1);
    expect(quarter).toBeGreaterThan(half);
    expect(half).toBeGreaterThan(0.65);
  });

  it('eases upward identically (descent boost never pops)', () => {
    const half = easePaceRamp(1, 1.25, 0.5);
    expect(half).toBeGreaterThan(1);
    expect(half).toBeLessThan(1.25);
  });

  it('advances a 0.5 s scene ramp to exactly settled (the PACE_EASE_SECONDS contract)', () => {
    // Five 0.1 s ticks complete the ramp — the motion lands exactly.
    expect(easePaceRamp(1, 0.65, 5 * (0.1 / PACE_EASE_SECONDS))).toBe(0.65);
  });
});
