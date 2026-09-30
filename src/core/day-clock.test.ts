import { describe, expect, it } from 'vitest';

import {
  createDayClock,
  DAY_LENGTH_MS,
  DAY_PHASES,
  type DayPhase,
  nextPhase,
  phaseAtFraction,
} from './day-clock';

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

describe('nextPhase', () => {
  it('maps every phase to the one that follows, wrapping night to dawn', () => {
    expect(DAY_PHASES.map((phase) => nextPhase(phase))).toEqual([
      'morning',
      'noon',
      'dusk',
      'night',
      'dawn',
    ]);
  });
});

describe('phase jumps', () => {
  it('walks the day one phase per jump and wraps back to morning', () => {
    const { clock } = makeClock();
    expect(clock.phase).toBe('morning');
    clock.advancePhase();
    expect(clock.phase).toBe('noon');
    clock.advancePhase();
    expect(clock.phase).toBe('dusk');
    clock.advancePhase();
    expect(clock.phase).toBe('night');
    clock.advancePhase();
    expect(clock.phase).toBe('dawn');
    clock.advancePhase();
    expect(clock.phase).toBe('morning');
  });

  it('lands mid-phase, where the mood reads at its clearest', () => {
    // The sky palette's keyframes sit at phase centers, so a jump must land
    // there too — landing on a boundary would show the *outgoing* mood's
    // colors (night used to repaint a maroon ember sky).
    const { clock } = makeClock();
    clock.advancePhase();
    expect(clock.phase).toBe('noon');
    expect(clock.fraction).toBeCloseTo(0.525, 6);
  });

  it('lands every phase on its own center', () => {
    // Noon [0.45,0.6) → 0.525, dusk [0.6,0.72) → 0.66, night [0.72,1) → 0.86.
    const { clock } = makeClock();
    const centers: [string, number][] = [];
    for (let jump = 0; jump < 5; jump += 1) {
      clock.advancePhase();
      centers.push([clock.phase, clock.fraction]);
    }
    expect(centers).toEqual([
      ['noon', expect.closeTo(0.525, 6)],
      ['dusk', expect.closeTo(0.66, 6)],
      ['night', expect.closeTo(0.86, 6)],
      ['dawn', expect.closeTo(0.06, 6)],
      ['morning', expect.closeTo(0.285, 6)],
    ]);
  });

  it('emits exactly one phase event per jump', () => {
    const { clock, events } = makeClock();
    clock.advancePhase();
    clock.advancePhase();
    expect(events).toEqual([
      { kind: 'phase', phase: 'noon' },
      { kind: 'phase', phase: 'dusk' },
    ]);
  });

  it('keeps drifting forward from the new position after a jump', () => {
    const { clock, advance } = makeClock();
    clock.advancePhase(); // noon, fraction 0.525 — noon ends at 0.6
    advance(DAY_LENGTH_MS * 0.05);
    expect(clock.phase).toBe('noon');
    expect(clock.fraction).toBeCloseTo(0.575, 6);
  });

  it('restores a phase directly, and stays quiet when it is already there', () => {
    const { clock, events } = makeClock();
    clock.setPhase('dusk');
    expect(clock.phase).toBe('dusk');
    expect(events).toEqual([{ kind: 'phase', phase: 'dusk' }]);
    clock.setPhase('dusk');
    expect(events).toHaveLength(1);
  });
});
