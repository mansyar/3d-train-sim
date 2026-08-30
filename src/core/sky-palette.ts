/**
 * Sky palette & celestial math — turns the day fraction into colors and
 * sun/moon elevations.
 *
 * Pure logic (no DOM, no three.js): the scene layer feeds the numbers into
 * shader uniforms and positions. Deterministic by construction, so the
 * toddler's sky is reproducible in tests.
 */

export interface SkyColors {
  /** Zenith color (hex 0xRRGGBB). */
  top: number;
  /** Horizon color (hex 0xRRGGBB). */
  horizon: number;
}

/** Elevation of each body, 0 (below horizon) to 1 (overhead). */
export interface Celestial {
  sun: number;
  moon: number;
}

/** Phase centers mirror day-clock's PHASE_BOUNDS midpoints. */
interface SkyKeyframe {
  at: number;
  top: number;
  horizon: number;
}

const KEYFRAMES: readonly SkyKeyframe[] = [
  { at: 0.06, top: 0x6f8fc9, horizon: 0xffcf9c }, // dawn — peach horizon
  { at: 0.285, top: 0x87c5fb, horizon: 0xe8f6ff }, // morning — bright playroom sky
  { at: 0.525, top: 0x64b5f6, horizon: 0xf2fbff }, // noon — clearest blue
  { at: 0.66, top: 0x4a5a94, horizon: 0xff9e6d }, // dusk — ember horizon
  { at: 0.86, top: 0x131c40, horizon: 0x27335e }, // night — deep blue, never black
];

function channels(hex: number): [number, number, number] {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

function pack(r: number, g: number, b: number): number {
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

function mixHex(a: number, b: number, t: number): number {
  const ca = channels(a);
  const cb = channels(b);
  return pack(
    ca[0] + (cb[0] - ca[0]) * t,
    ca[1] + (cb[1] - ca[1]) * t,
    ca[2] + (cb[2] - ca[2]) * t,
  );
}

/** Blend the phase keyframes (cyclically) into a sky gradient for a fraction. */
export function skyColorsAt(fraction: number): SkyColors {
  const t = fraction - Math.floor(fraction);
  // Find the pair of neighboring keyframe centers this fraction sits between;
  // the wrap pair (night → dawn) is handled by comparing against +1.
  for (let i = 0; i < KEYFRAMES.length; i += 1) {
    const current = KEYFRAMES[i];
    if (!current) continue;
    const next = KEYFRAMES[(i + 1) % KEYFRAMES.length];
    if (!next) continue;
    const start = current.at;
    const end = i + 1 === KEYFRAMES.length ? next.at + 1 : next.at;
    if (t >= start && t < end) {
      const k = (t - start) / (end - start);
      return {
        top: mixHex(current.top, next.top, k),
        horizon: mixHex(current.horizon, next.horizon, k),
      };
    }
  }
  // Unreachable — the slices cover [0, 1) — but noUncheckedIndexedAccess
  // cannot prove it, and the caller needs a color regardless.
  return { top: KEYFRAMES[1]?.top ?? 0x87c5fb, horizon: KEYFRAMES[1]?.horizon ?? 0xe8f6ff };
}

/** The sun owns dawn→dusk (fraction 0→0.72), the moon owns the night span. */
const SUNRISE = 0;
const SUNSET = 0.72;

export function celestialAt(fraction: number): Celestial {
  const t = fraction - Math.floor(fraction);
  const sun = t < SUNSET ? Math.sin((Math.PI * (t - SUNRISE)) / (SUNSET - SUNRISE)) : 0;
  const nightSpan = 1 - SUNSET;
  const moon = t >= SUNSET ? Math.sin((Math.PI * (t - SUNSET)) / nightSpan) : 0;
  return { sun: Math.max(sun, 0), moon: Math.max(moon, 0) };
}

/** Night weight 0 (full day) to 1 (deep night) — drives lights and glows. */
const DUSK_START = 0.55;
const NIGHT_START = 0.75;
const DAWN_END = 0.15;

export function nightFactorAt(fraction: number): number {
  const t = fraction - Math.floor(fraction);
  if (t < DAWN_END) return 1 - t / DAWN_END; // Dawn: fade the stars out.
  if (t < DUSK_START) return 0; // Full day.
  if (t < NIGHT_START) return (t - DUSK_START) / (NIGHT_START - DUSK_START); // Dusk.
  return 1; // Night plateau.
}
