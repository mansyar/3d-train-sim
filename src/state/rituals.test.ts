import { describe, expect, it } from 'vitest';

import { DAY_PHASES } from '../core/day-clock';
import {
  createRitualDirector,
  type Greeting,
  type GreetingEvent,
  greetingForPhase,
  PHASE_GREETINGS,
  SETTLE_MS,
} from './rituals';

/** Collect every fired greeting without depending on wall-clock time. */
function harness() {
  const director = createRitualDirector();
  const events: GreetingEvent[] = [];
  director.subscribe((event) => events.push(event));
  return { director, events };
}

describe('greetingForPhase', () => {
  it('pins one distinct greeting for each of the five phases', () => {
    expect(DAY_PHASES.map(greetingForPhase)).toEqual([
      'dawn-chorus',
      'morning-butterflies',
      'noon-full-sun',
      'dusk-windows',
      'night-fireflies',
    ]);
  });

  it('the map covers exactly the five settled phases', () => {
    expect(Object.keys(PHASE_GREETINGS).sort()).toEqual([...DAY_PHASES].sort());
  });
});

describe('createRitualDirector — settle', () => {
  it('stays silent until the phase has settled for a full window', () => {
    const { director, events } = harness();
    director.observe('dawn');
    director.tick(SETTLE_MS - 1);
    expect(events).toEqual([]);
    expect(director.pendingPhase).toBe('dawn');
    director.tick(1);
    expect(events).toEqual([{ kind: 'greeting', phase: 'dawn', greeting: 'dawn-chorus' }]);
    expect(director.pendingPhase).toBeNull();
  });

  it('fires the mapped greeting for every settled phase', () => {
    for (const phase of DAY_PHASES) {
      const { director, events } = harness();
      director.observe(phase);
      director.tick(SETTLE_MS);
      expect(events).toEqual([{ kind: 'greeting', phase, greeting: PHASE_GREETINGS[phase] }]);
      expect(director.activeGreeting).toBe(PHASE_GREETINGS[phase]);
    }
  });

  it('does nothing without a phase transition', () => {
    const { director, events } = harness();
    director.tick(SETTLE_MS * 10);
    expect(events).toEqual([]);
    expect(director.pendingPhase).toBeNull();
    expect(director.activeGreeting).toBeNull();
  });

  it('spamming phases greets only the resting phase, once', () => {
    // FR-8: rapid sun/moon taps. Every tap restarts the window; only the last
    // phase survives the quiet and fires a single greeting.
    const { director, events } = harness();
    for (const phase of ['dawn', 'noon', 'dusk', 'night', 'morning'] as const) {
      director.observe(phase);
      director.tick(300);
      expect(events).toEqual([]);
    }
    expect(director.pendingPhase).toBe('morning');
    director.tick(SETTLE_MS);
    expect(events).toEqual([
      { kind: 'greeting', phase: 'morning', greeting: 'morning-butterflies' },
    ]);
    // No stacking: a long quiet after the fire produces no second voice.
    director.tick(SETTLE_MS * 5);
    expect(events).toHaveLength(1);
  });

  it('an in-flight greeting yields to the newest change, never overlapping', () => {
    const { director, events } = harness();
    director.observe('dawn');
    director.tick(SETTLE_MS);
    expect(director.activeGreeting).toBe('dawn-chorus');

    // A new tap mid-greeting: the old voice yields immediately, before any
    // new settle, so two greetings can never sound at once.
    director.observe('night');
    expect(director.activeGreeting).toBeNull();
    expect(events).toHaveLength(1);

    director.observe('dusk');
    director.tick(SETTLE_MS);
    expect(events).toEqual([
      { kind: 'greeting', phase: 'dawn', greeting: 'dawn-chorus' },
      { kind: 'greeting', phase: 'dusk', greeting: 'dusk-windows' },
    ]);
  });

  it('releasing the voice frees it without firing another greeting', () => {
    const { director, events } = harness();
    director.observe('noon');
    director.tick(SETTLE_MS);
    expect(director.activeGreeting).toBe('noon-full-sun');
    director.release();
    expect(director.activeGreeting).toBeNull();
    expect(events).toHaveLength(1);
  });

  it('unsubscribing stops delivery', () => {
    const director = createRitualDirector();
    const seen: Greeting[] = [];
    const off = director.subscribe((event) => seen.push(event.greeting));
    director.observe('night');
    director.tick(SETTLE_MS);
    expect(seen).toEqual(['night-fireflies']);
    off();
    director.observe('dawn');
    director.tick(SETTLE_MS);
    expect(seen).toEqual(['night-fireflies']);
  });
});
