import { describe, expect, it } from 'vitest';

import { celestialAt, nightFactorAt, skyColorsAt } from './sky-palette';

describe('skyColorsAt', () => {
  it('returns the exact keyframe palette at each phase center', () => {
    // Phase centers from day-clock bounds: dawn 0.06, morning 0.285,
    // noon 0.525, dusk 0.66, night 0.86.
    expect(skyColorsAt(0.06)).toEqual({ top: 0x6f8fc9, horizon: 0xffcf9c });
    expect(skyColorsAt(0.285)).toEqual({ top: 0x87c5fb, horizon: 0xe8f6ff });
    expect(skyColorsAt(0.525)).toEqual({ top: 0x64b5f6, horizon: 0xf2fbff });
    expect(skyColorsAt(0.66)).toEqual({ top: 0x4a5a94, horizon: 0xff9e6d });
    expect(skyColorsAt(0.86)).toEqual({ top: 0x131c40, horizon: 0x27335e });
  });

  it('blends halfway between neighboring keyframes', () => {
    // Halfway between morning (0.285) and noon (0.525) centers.
    const mid = skyColorsAt((0.285 + 0.525) / 2);
    const morningTop = 0x87c5fb;
    const noonTop = 0x64b5f6;
    // Red channel: (0x87 + 0x64) / 2 = 117.5 → rounds to 118.
    expect((mid.top >> 16) & 0xff).toBe(Math.round(((morningTop >> 16) + (noonTop >> 16)) / 2));
    // Green channel: (0xc5 + 0xb5) / 2 = 0xbd.
    expect((mid.top >> 8) & 0xff).toBe((((morningTop >> 8) & 0xff) + ((noonTop >> 8) & 0xff)) >> 1);
  });

  it('wraps the palette: late night blends toward dawn', () => {
    // Halfway between night (0.86) and dawn (1.06 → wraps to 0.06).
    const blended = skyColorsAt(0.96);
    // Red channel halfway between night top 0x13 and dawn top 0x6f.
    expect((blended.top >> 16) & 0xff).toBe((0x13 + 0x6f) >> 1);
  });
});

describe('nightFactorAt', () => {
  it('is 0 through the day, 1 through the night, with dusk/dawn ramps', () => {
    // Day: fully lit from mid-morning until dusk begins (0.55).
    expect(nightFactorAt(0.3)).toBe(0);
    expect(nightFactorAt(0.15)).toBe(0);
    // Dusk ramp 0.55→0.75: halfway through dusk it is half night.
    expect(nightFactorAt(0.65)).toBeCloseTo(0.5, 5);
    expect(nightFactorAt(0.75)).toBe(1);
    // Night plateau and the dawn ramp back down (0→0.15).
    expect(nightFactorAt(0.86)).toBe(1);
    expect(nightFactorAt(0.075)).toBeCloseTo(0.5, 5);
    expect(nightFactorAt(0.2)).toBe(0);
  });
});

describe('celestialAt', () => {
  it('has the sun up only across dawn→dusk, peaking mid-day', () => {
    expect(celestialAt(0.86).sun).toBe(0); // Night: sun below the horizon.
    expect(celestialAt(0.36).sun).toBeCloseTo(1, 5); // Mid-arc: sun overhead.
    expect(celestialAt(0.06).sun).toBeCloseTo(Math.sin((Math.PI * 0.06) / 0.72), 5);
  });

  it('has the moon up only across night, peaking mid-night', () => {
    expect(celestialAt(0.36).moon).toBe(0); // Day: moon below the horizon.
    expect(celestialAt(0.86).moon).toBeCloseTo(1, 5); // Mid-arc: moon overhead.
    expect(celestialAt(0).moon).toBe(0); // Dawn: moon set.
    expect(celestialAt(0.999).moon).toBeGreaterThan(0); // Just before sunrise.
  });
});
