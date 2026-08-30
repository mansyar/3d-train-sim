/**
 * Weather machine — drifts the meadow between clear, cloudy, rain and snow.
 *
 * Pure logic (no DOM, no timers, no three.js): the caller feeds time via
 * `tick()` and reads `weather`/`blend`; the scene and audio layers lerp
 * particles, sky tint and ambience volume from those. Transitions are always
 * soft cross-fades — never an abrupt switch (no fail states, no surprises).
 */

export type Weather = 'clear' | 'cloudy' | 'rain' | 'snow';

/** Fixed drift order — each weather has exactly one successor, wrapping. */
export const WEATHER_ORDER: readonly Weather[] = ['clear', 'cloudy', 'rain', 'snow'];

/** Smallest/largest cross-fade (ms) between weathers. */
const FADE_MIN_MS = 5_000;
const FADE_MAX_MS = 8_000;

/** Smallest/largest settled period (ms) before the next drift begins. */
const HOLD_MIN_MS = 30_000;
const HOLD_MAX_MS = 45_000;

/** One step along the fixed drift order, wrapping snow → clear. */
export function nextWeather(weather: Weather): Weather {
  const index = WEATHER_ORDER.indexOf(weather);
  const next = index + 1;
  // Unreachable fallback — the wrap keeps the index in range — but
  // noUncheckedIndexedAccess cannot prove the element non-undefined.
  return WEATHER_ORDER[next >= WEATHER_ORDER.length ? 0 : next] ?? weather;
}

/** Scene intensities a weather implies: falling rain, falling snow, cloud cover. */
export interface WeatherIntensity {
  rain: number;
  snow: number;
  cloud: number;
}

const INTENSITY: Record<Weather, WeatherIntensity> = {
  clear: { rain: 0, snow: 0, cloud: 0.1 }, // A lone lazy cloud keeps the sky alive.
  cloudy: { rain: 0, snow: 0, cloud: 0.7 },
  rain: { rain: 1, snow: 0, cloud: 1 },
  snow: { rain: 0, snow: 1, cloud: 0.6 },
};

export function intensityOf(weather: Weather): WeatherIntensity {
  return INTENSITY[weather];
}

/** Blend two intensity sets — drives soft weather cross-fades.
 *  Pass `out` to reuse an object in hot loops (the scene's frame path). */
export function lerpIntensity(
  a: WeatherIntensity,
  b: WeatherIntensity,
  t: number,
  out?: WeatherIntensity,
): WeatherIntensity {
  const result = out ?? { rain: 0, snow: 0, cloud: 0 };
  result.rain = a.rain + (b.rain - a.rain) * t;
  result.snow = a.snow + (b.snow - a.snow) * t;
  result.cloud = a.cloud + (b.cloud - a.cloud) * t;
  return result;
}

/** A cross-fade in progress: lerp scene state from `from` to `to` by `t`. */
export interface WeatherBlend {
  from: Weather;
  to: Weather;
  /** 0..1 progress through the fade. */
  t: number;
}

export interface WeatherClock {
  readonly weather: Weather;
  /** Null while settled; otherwise the active cross-fade. */
  readonly blend: WeatherBlend | null;
  /** Advance the machine — call once per animation frame. */
  tick(): void;
  /** Subscribe to fade starts; returns an unsubscribe function. */
  subscribe(listener: (event: { kind: 'weather'; from: Weather; to: Weather }) => void): () => void;
}

export function createWeatherClock(options: {
  now: () => number;
  /** RNG provider returning [0, 1) — defaults to Math.random. */
  random?: () => number;
}): WeatherClock {
  const random = options.random ?? Math.random;

  let weather: Weather = 'clear';
  let blend: WeatherBlend | null = null;
  let fadeStartAt = 0;
  let fadeMs = 0;
  let nextChangeAt = drawHoldEnd(options.now());
  const listeners = new Set<(event: { kind: 'weather'; from: Weather; to: Weather }) => void>();

  function drawHoldEnd(now: number): number {
    return now + HOLD_MIN_MS + random() * (HOLD_MAX_MS - HOLD_MIN_MS);
  }

  function beginFade(now: number): void {
    const to = nextWeather(weather);
    blend = { from: weather, to, t: 0 };
    fadeStartAt = now;
    fadeMs = FADE_MIN_MS + random() * (FADE_MAX_MS - FADE_MIN_MS);
    for (const listener of listeners) listener({ kind: 'weather', from: weather, to });
  }

  return {
    get weather() {
      return weather;
    },
    get blend() {
      return blend;
    },
    tick() {
      const now = options.now();
      if (blend === null) {
        if (now >= nextChangeAt) beginFade(now);
        return;
      }
      const t = (now - fadeStartAt) / fadeMs;
      if (t >= 1) {
        weather = blend.to;
        blend = null;
        nextChangeAt = drawHoldEnd(now);
        return;
      }
      // Mutate in place — the frame path must not allocate (spec NFR).
      blend.t = Math.max(t, 0);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
