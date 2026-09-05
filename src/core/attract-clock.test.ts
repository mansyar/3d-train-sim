import { describe, expect, it } from 'vitest';

import { type AttractEvent, createAttractClock } from './attract-clock';

interface Harness {
  clock: ReturnType<typeof createAttractClock>;
  events: AttractEvent[];
  advance(ms: number): void;
}

/**
 * Deterministic harness: a mutable fake clock and a scripted RNG so every
 * transition is reproducible without timers.
 */
function makeClock(
  thresholdMs: number,
  randomValues: number[],
  options: { reducedMotion?: boolean } = {},
): Harness {
  let now = 0;
  const events: AttractEvent[] = [];
  let randIndex = 0;
  const random = () => randomValues[Math.min(randIndex++, randomValues.length - 1)] ?? 0;
  const clock = createAttractClock(thresholdMs, {
    now: () => now,
    random,
    reducedMotion: options.reducedMotion ?? false,
  });
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

/** Pull the last event of a given kind out of the recorded stream. */
function lastOf(events: AttractEvent[], kind: AttractEvent['kind']): AttractEvent | undefined {
  return [...events].reverse().find((event) => event.kind === kind);
}

describe('createAttractClock', () => {
  it('starts active and stays inactive until the threshold elapses', () => {
    const { clock, events, advance } = makeClock(25_000, []);
    expect(clock.state).toBe('active');
    advance(24_999);
    expect(clock.state).toBe('active');
    expect(events).toHaveLength(0);
  });

  it('transitions to idle exactly at the threshold and emits a drift cue', () => {
    const { clock, events, advance } = makeClock(25_000, []);
    advance(25_000);
    expect(clock.state).toBe('idle');
    expect(lastOf(events, 'state')).toEqual({ kind: 'state', state: 'idle' });
    expect(lastOf(events, 'drift')).toEqual({ kind: 'drift' });
  });

  it('suppresses the drift cue under reduced motion', () => {
    const { clock, events, advance } = makeClock(25_000, [], { reducedMotion: true });
    advance(25_000);
    expect(clock.state).toBe('idle');
    expect(events.some((event) => event.kind === 'drift')).toBe(false);
  });

  it('does not chirp while active, even long after the threshold', () => {
    const { events, advance } = makeClock(25_000, [0]);
    advance(60_000);
    expect(events.some((event) => event.kind === 'chirp')).toBe(false);
  });

  it('notifyActivity resets the idle timer while active', () => {
    const { clock, events, advance } = makeClock(25_000, []);
    advance(24_999);
    clock.notifyActivity();
    advance(24_999);
    expect(clock.state).toBe('active');
    expect(events).toHaveLength(0);
    advance(1);
    expect(clock.state).toBe('idle');
  });

  it('activity while idle returns to active and cancels any pending chirp', () => {
    const { clock, events, advance } = makeClock(1_000, [0]); // 0 → first chirp delay = 15_000
    advance(1_000);
    expect(clock.state).toBe('idle');
    advance(14_000);
    expect(events.some((event) => event.kind === 'chirp')).toBe(false);

    clock.notifyActivity();
    expect(lastOf(events, 'state')).toEqual({ kind: 'state', state: 'active' });

    // Back to idle: the cancelled chirp does not replay from the old schedule.
    advance(1_000);
    expect(clock.state).toBe('idle');
    advance(14_999);
    expect(events.some((event) => event.kind === 'chirp')).toBe(false);
  });

  it('fires a quiet chirp 15 seconds after going idle when the RNG draws low', () => {
    const { events, advance } = makeClock(25_000, [0]);
    advance(25_000);
    advance(15_000);
    expect(lastOf(events, 'chirp')).toEqual({ kind: 'chirp', critter: 'oink-pig' });
  });

  it('maps the RNG to the full 15–45 second chirp window', () => {
    const { events, advance } = makeClock(25_000, [0.9999]);
    advance(25_000);
    advance(44_996);
    expect(events.some((event) => event.kind === 'chirp')).toBe(false);
    advance(1);
    expect(events.some((event) => event.kind === 'chirp')).toBe(true);
  });

  it('chooses the critter from the RNG draw', () => {
    const { events, advance } = makeClock(25_000, [0.9999]);
    advance(25_000);
    advance(44_997);
    expect(lastOf(events, 'chirp')).toEqual({ kind: 'chirp', critter: 'ribbit-frog' });
  });

  it('reschedules another chirp after one fires', () => {
    const { events, advance } = makeClock(25_000, [0, 0]);
    advance(25_000);
    advance(15_000);
    expect(events.filter((event) => event.kind === 'chirp')).toHaveLength(1);
    advance(15_000);
    expect(events.filter((event) => event.kind === 'chirp')).toHaveLength(2);
  });

  it('emits the drift cue only once per idle entry', () => {
    const { events, advance } = makeClock(25_000, []);
    advance(25_000);
    advance(60_000);
    expect(events.filter((event) => event.kind === 'drift')).toHaveLength(1);
  });

  it('unsubscribing drops a listener', () => {
    const { clock, advance } = makeClock(25_000, []);
    const extra: AttractEvent[] = [];
    const unsubscribe = clock.subscribe((event) => extra.push(event));
    unsubscribe();
    advance(25_000);
    expect(extra).toHaveLength(0);
  });
});
