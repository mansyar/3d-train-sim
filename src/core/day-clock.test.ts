import { describe, expect, it } from 'vitest';

import { type DayPhase, DAY_LENGTH_MS, createDayClock, phaseAtFraction } from './day-clock';

interface Harness {
  clock: ReturnType<typeof createDayClock>;
  events: { kind: 'phase'; phase: DayPhase }[];
  advance(ms: number): void;
}

/** Deterministic harness: a mutable fake clock, no timers. */
function makeClock(): Harness {
  let now = 0;
  const events: { kind: 'phase'; phase: DayPhase }[] = [];
  const clock = createDayClock({ now: () => now });
  clock.subscribe((event) => events.push(event));
  return {
    clock,
    events,
    advance(ms: number) {
      now += ms;
      clock.tick();
    },
  };
}

describe('phaseAtFraction', () => {
  it('maps each slice of the day to its phase', () => {
    // Phase slices of the day fraction: dawn [0,0.12), morning [0.12,0.45),
    // noon [0.45,0.60), dusk [0.60,0.72), night [0.72,1).
    expect(phaseAtFraction(0)).toBe('dawn');
    expect(phaseAtFraction(0.119)).toBe('dawn');
    expect(phaseAtFraction(0.12)).toBe('morning');
    expect(phaseAtFraction(0.449)).toBe('morning');
    expect(phaseAtFraction(0.45)).toBe('noon');
    expect(phaseAtFraction(0.599)).toBe('noon');
    expect(phaseAtFraction(0.6)).toBe('dusk');
    expect(phaseAtFraction(0.719)).toBe('dusk');
    expect(phaseAtFraction(0.72)).toBe('night');
    expect(phaseAtFraction(0.999)).toBe('night');
  });

  it('wraps a full-day fraction back to dawn', () => {
    expect(phaseAtFraction(1)).toBe('dawn');
    expect(phaseAtFraction(2.5)).toBe('noon');
  });
});

describe('createDayClock', () => {
  it('starts at mid-morning: morning phase at fraction 0.25', () => {
    const { clock } = makeClock();
    expect(clock.phase).toBe('morning');
    expect(clock.fraction).toBeCloseTo(0.25, 6);
  });

  it('is deterministic: same elapsed time, same sky position', () => {
    const a = makeClock();
    const b = makeClock();
    a.advance(DAY_LENGTH_MS * 0.1);
    b.advance(DAY_LENGTH_MS * 0.1);
    expect(a.clock.phase).toBe(b.clock.phase);
    expect(a.clock.fraction).toBeCloseTo(b.clock.fraction, 6);
  });

  it('advances through dusk and night as the day fraction crosses their boundaries', () => {
    const { clock, events, advance } = makeClock();
    // Mid-morning 0.25 -> dusk boundary 0.60: 0.35 of a day.
    advance(DAY_LENGTH_MS * 0.35);
    expect(clock.phase).toBe('dusk');
    // Dusk -> night boundary 0.72: 0.12 of a day.
    advance(DAY_LENGTH_MS * 0.12);
    expect(clock.phase).toBe('night');
    // One phase event per crossing, carrying the new phase.
    expect(events).toEqual([
      { kind: 'phase', phase: 'dusk' },
      { kind: 'phase', phase: 'night' },
    ]);
  });

  it('does not emit while drifting inside a phase', () => {
    const { clock, events, advance } = makeClock();
    advance(DAY_LENGTH_MS * 0.05); // 0.25 -> 0.30, still morning.
    expect(clock.phase).toBe('morning');
    expect(events).toHaveLength(0);
  });

  it('wraps the full cycle: one day later it is mid-morning again', () => {
    const { clock, advance } = makeClock();
    advance(DAY_LENGTH_MS);
    expect(clock.phase).toBe('morning');
    expect(clock.fraction).toBeCloseTo(0.25, 6);
  });
});
