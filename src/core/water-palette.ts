import type { SkyColors } from './sky-palette';

/**
 * The river's toy-water color: a pure function of the live sky gradient and
 * the settled-snow amount, exactly the way `sky-palette` feeds the dome.
 *
 * Unfrozen water is a deep toy-water blue pulled toward the sky — dawn and
 * dusk drag their ember horizon across the surface, noon reads clear blue,
 * night settles to dark navy. As snow settles the surface pales to ice;
 * when the snow melts, the exact unfrozen color returns.
 */

/** The unfrozen water body — a clear, slightly deep toy blue. */
const WATER_BLUE = 0x3f8fd2;
/** Settled ice — near the meadow's snow white, with a cold blue whisper. */
const ICE = 0xdfeef2;

/** How strongly the surface leans toward the water body color (vs the sky). */
const BODY_BIAS = 0.55;
/** How far toward full ice the surface pales at snow 1 (a whisper of water
 * remains beneath the frost). */
const ICE_BIAS = 0.92;

/** Sky blend weight for the mirror: mostly horizon, a lift of zenith. */
const HORIZON_BIAS = 0.55;

const channels = (hex: number): [number, number, number] => [
  (hex >> 16) & 0xff,
  (hex >> 8) & 0xff,
  hex & 0xff,
];

const mixHex = (a: number, b: number, t: number): number => {
  const ca = channels(a);
  const cb = channels(b);
  const mix = (i: 0 | 1 | 2): number => ca[i] + (cb[i] - ca[i]) * t;
  return (Math.round(mix(0)) << 16) | (Math.round(mix(1)) << 8) | Math.round(mix(2));
};

const clamp01 = (value: number): number => (value < 0 ? 0 : value > 1 ? 1 : value);

/**
 * The river surface color (hex 0xRRGGBB) for this sky gradient and snow
 * intensity. Pure and deterministic; no allocation.
 */
export function waterColorAt(sky: SkyColors, snow: number): number {
  const mirror = mixHex(sky.horizon, sky.top, HORIZON_BIAS);
  const body = mixHex(mirror, WATER_BLUE, BODY_BIAS);
  return mixHex(body, ICE, clamp01(snow) * ICE_BIAS);
}
