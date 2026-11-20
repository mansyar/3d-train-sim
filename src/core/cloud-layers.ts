/**
 * Cloud-layer math — the pure half of the sky's two-layer cloud detail.
 *
 * No imports, no three.js, no clock and no globals: the scene feeds the live
 * weather bed and frame deltas in, and applies the returned numbers to its
 * fixed sprite pools. Callers pass an `out` scratch object on the frame path so
 * drifts and cover updates write in place without allocation.
 */

/** The two cloud layers, ordered far → near. */
export type CloudLayerName = 'far' | 'near';

export interface CloudLayerDescriptor {
  readonly name: CloudLayerName;
  /** Depth ordering: larger sits closer to the viewer (more parallax). */
  readonly depth: number;
  /** Drift speed in arc-fractions per second. */
  readonly speed: number;
}

/** Far layer: slow, distant puffs — a full arc lap takes ~4 minutes. */
export const FAR_CLOUD_LAYER: CloudLayerDescriptor = {
  name: 'far',
  depth: 0.35,
  speed: 0.004,
};

/** Near layer: closer and slightly quicker — a full arc lap takes ~100 s. */
export const NEAR_CLOUD_LAYER: CloudLayerDescriptor = {
  name: 'near',
  depth: 0.7,
  speed: 0.01,
};

/** Exactly two layers; the near one is both deeper and faster for parallax. */
export const CLOUD_LAYERS: readonly [CloudLayerDescriptor, CloudLayerDescriptor] = [
  FAR_CLOUD_LAYER,
  NEAR_CLOUD_LAYER,
];

/** One cloud's journey around the sky arc is the normalized span [0, 1). */
export const ARC_SPAN = 1;

/** Few puffs remain in clear weather, so the sky is never empty. */
export const COVER_MIN = 0.12;
/** Even rain stays readable — the sky never becomes a solid sheet. */
export const COVER_MAX = 0.9;
/** Snow is capped here so a snowstorm stays a gentle scene, not a whiteout. */
export const SNOW_COVER_CAP = 0.55;

/** The slice of the weather bed this helper reads (structurally satisfied by
 *  `WeatherIntensity`, so this module stays dependency-free). */
export interface CloudIntensity {
  cloud: number;
  snow: number;
}

export interface CloudCover {
  /** Visible-puff fraction / opacity, in [COVER_MIN, COVER_MAX]. */
  cover: number;
}

export interface LayerOffset {
  /** Position along the arc, in [0, ARC_SPAN). */
  offset: number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Map the live cloud intensity to a readable cover value, monotone in cloud,
 * clamped, and softly capped while snow dominates so it never whiteouts. The
 * snow cap eases with `snow`, so a cross-fade never pops.
 *
 * Pass `out` on the frame path to reuse an object; the same object is returned.
 */
export function cloudCover(intensity: CloudIntensity, out?: CloudCover): CloudCover {
  const base = COVER_MIN + (COVER_MAX - COVER_MIN) * clamp01(intensity.cloud);
  const cap = COVER_MAX + (SNOW_COVER_CAP - COVER_MAX) * clamp01(intensity.snow);
  const result = out ?? { cover: 0 };
  result.cover = Math.min(base, cap);
  return result;
}

/**
 * Advance a layer along the arc by `speed * dt`, wrapping back to the far side
 * so clouds re-enter gently instead of disappearing at the edge. The caller
 * supplies the layer's speed, so the near layer advances farther than the far
 * layer over the same frames.
 *
 * Pass `out` on the frame path to reuse an object; the same object is returned.
 */
export function layerOffset(
  currentOffset: number,
  dt: number,
  speed: number,
  out?: LayerOffset,
): LayerOffset {
  const next = currentOffset + dt * speed;
  const result = out ?? { offset: 0 };
  result.offset = ((next % ARC_SPAN) + ARC_SPAN) % ARC_SPAN;
  return result;
}
