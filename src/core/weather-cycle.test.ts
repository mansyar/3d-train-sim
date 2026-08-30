import { describe, expect, it } from 'vitest';

import {
  createWeatherClock,
  intensityOf,
  lerpIntensity,
  nextWeather,
  WEATHER_ORDER,
  type Weather,
} from './weather-cycle';

interface Harness {
  clock: ReturnType<typeof createWeatherClock>;
  events: { from: Weather; kind: 'weather'; to: Weather }[];
  advance(ms: number): void;
}

/**
 * Deterministic harness: a mutable fake clock plus a scripted RNG (every draw
 * returns the given value, so holds/fades sit exactly where we point them).
 */
function makeClock(randomValue = 0): Harness {
  let now = 0;
  const events: { from: Weather; kind: 'weather'; to: Weather }[] = [];
  const clock = createWeatherClock({
    now: () => now,
    random: () => randomValue,
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

describe('nextWeather', () => {
  it('drifts clear → cloudy → rain → snow and wraps back to clear', () => {
    expect(WEATHER_ORDER).toEqual(['clear', 'cloudy', 'rain', 'snow']);
    expect(nextWeather('clear')).toBe('cloudy');
    expect(nextWeather('cloudy')).toBe('rain');
    expect(nextWeather('rain')).toBe('snow');
    expect(nextWeather('snow')).toBe('clear');
  });
});

describe('intensityOf', () => {
  it('maps each weather to particle/cloud intensities for the scene', () => {
    expect(intensityOf('clear')).toEqual({ cloud: 0.1, rain: 0, snow: 0 });
    expect(intensityOf('cloudy')).toEqual({ cloud: 0.7, rain: 0, snow: 0 });
    expect(intensityOf('rain')).toEqual({ cloud: 1, rain: 1, snow: 0 });
    expect(intensityOf('snow')).toEqual({ cloud: 0.6, rain: 0, snow: 1 });
  });
});

describe('lerpIntensity', () => {
  it('blends two intensity sets by t', () => {
    const a = { cloud: 0.1, rain: 0, snow: 0 };
    const b = { cloud: 1, rain: 1, snow: 0 };
    expect(lerpIntensity(a, b, 0)).toEqual(a);
    expect(lerpIntensity(a, b, 0.5)).toEqual({ cloud: 0.55, rain: 0.5, snow: 0 });
    expect(lerpIntensity(a, b, 1)).toEqual(b);
  });
});

describe('createWeatherClock', () => {
  it('starts clear and settled, with no events', () => {
    const { clock, events } = makeClock();
    expect(clock.weather).toBe('clear');
    expect(clock.blend).toBeNull();
    expect(events).toHaveLength(0);
  });

  it('holds 30 s (min) then begins a soft fade to cloudy, emitting once', () => {
    const { clock, events, advance } = makeClock();
    advance(29_999);
    expect(clock.weather).toBe('clear');
    expect(clock.blend).toBeNull();
    advance(1); // Hold ends at exactly 30 s with random() = 0.
    expect(clock.blend).toEqual({ from: 'clear', t: 0, to: 'cloudy' });
    expect(events).toEqual([{ from: 'clear', kind: 'weather', to: 'cloudy' }]);
  });

  it('reports blend progress mid-fade and settles with the new weather', () => {
    const { clock, advance } = makeClock();
    advance(30_000); // Fade begins (5 s with random() = 0).
    advance(2_500); // Halfway through the fade.
    expect(clock.blend).toEqual({ from: 'clear', t: 0.5, to: 'cloudy' });
    advance(2_500); // Fade completes at 35 s.
    expect(clock.weather).toBe('cloudy');
    expect(clock.blend).toBeNull();
  });

  it('uses the full ramp ranges: random 0.5 gives a 6.5 s fade', () => {
    const { clock, advance } = makeClock(0.5);
    // Hold: 30_000 + 0.5 * 15_000 = 37.5 s, then fade 5_000 + 0.5 * 3_000.
    advance(37_500);
    expect(clock.blend).toEqual({ from: 'clear', t: 0, to: 'cloudy' });
    advance(6_500);
    expect(clock.weather).toBe('cloudy');
    expect(clock.blend).toBeNull();
  });

  it('walks the whole order and wraps: snow drifts back to clear', () => {
    const { clock, advance } = makeClock();
    // With random() = 0 each cycle is a 30 s hold + 5 s fade, fed as frame
    // steps: one tick ends the hold (fade starts), the next settles it.
    for (const expected of ['cloudy', 'rain', 'snow', 'clear'] as const) {
      advance(30_000);
      advance(5_000);
      expect(clock.weather).toBe(expected);
    }
  });
});
