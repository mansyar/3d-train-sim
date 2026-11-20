import { describe, expect, it } from 'vitest';
import {
  ARC_SPAN,
  CLOUD_LAYERS,
  type CloudCover,
  type CloudIntensity,
  COVER_MAX,
  COVER_MIN,
  cloudCover,
  type LayerOffset,
  layerOffset,
  SNOW_COVER_CAP,
} from './cloud-layers';
import type { WeatherIntensity } from './weather-cycle';

describe('cloud layer descriptors', () => {
  it('exposes exactly two layers with distinct depth and drift speed', () => {
    expect(CLOUD_LAYERS).toHaveLength(2);
    const [far, near] = CLOUD_LAYERS;
    expect(far.name).toBe('far');
    expect(near.name).toBe('near');
    expect(far.depth).not.toBe(near.depth);
    expect(far.speed).not.toBe(near.speed);
    expect(near.depth).toBeGreaterThan(far.depth);
    expect(near.speed).toBeGreaterThan(far.speed);
  });

  it('keeps both drifts gentle — a full arc lap takes minutes', () => {
    for (const layer of CLOUD_LAYERS) {
      expect(layer.speed).toBeGreaterThan(0);
      expect(ARC_SPAN / layer.speed).toBeGreaterThanOrEqual(60);
    }
  });
});

describe('cloudCover', () => {
  it('rises monotonically with cloud intensity and stays clamped', () => {
    expect(cloudCover({ cloud: 0, snow: 0 }).cover).toBe(COVER_MIN);
    let previous = -Infinity;
    for (let i = 0; i <= 100; i += 1) {
      const cover = cloudCover({ cloud: i / 100, snow: 0 }).cover;
      expect(cover).toBeGreaterThanOrEqual(previous);
      expect(cover).toBeGreaterThanOrEqual(COVER_MIN);
      expect(cover).toBeLessThanOrEqual(COVER_MAX);
      previous = cover;
    }
    expect(previous).toBe(COVER_MAX);
  });

  it('clamps out-of-range weather input', () => {
    expect(cloudCover({ cloud: -5, snow: 0 }).cover).toBe(COVER_MIN);
    expect(cloudCover({ cloud: 5, snow: 0 }).cover).toBe(COVER_MAX);
    expect(cloudCover({ cloud: 5, snow: 5 }).cover).toBe(SNOW_COVER_CAP);
  });

  it('caps snow at a moderate cover and cross-fades the cap softly', () => {
    const rainy = cloudCover({ cloud: 1, snow: 0 }).cover;
    const snowing = cloudCover({ cloud: 1, snow: 1 }).cover;
    expect(snowing).toBe(SNOW_COVER_CAP);
    expect(snowing).toBeLessThan(rainy);
    expect(cloudCover({ cloud: 0.6, snow: 1 }).cover).toBe(SNOW_COVER_CAP);

    let previous = Infinity;
    for (let i = 0; i <= 10; i += 1) {
      const cover = cloudCover({ cloud: 1, snow: i / 10 }).cover;
      expect(cover).toBeLessThanOrEqual(previous);
      previous = cover;
    }
    expect(previous).toBe(SNOW_COVER_CAP);
  });

  it('accepts the live WeatherIntensity bed without an import in the helper', () => {
    const live: WeatherIntensity = { rain: 1, snow: 0, cloud: 1 };
    expect(cloudCover(live).cover).toBe(COVER_MAX);
  });

  it('preserves scratch identity across repeated calls (no per-frame allocation)', () => {
    const scratch: CloudCover = { cover: -1 };
    const seen = new Set<CloudCover>();
    for (let i = 0; i < 1000; i += 1) {
      const out = cloudCover({ cloud: (i % 100) / 100, snow: 0 }, scratch);
      expect(out).toBe(scratch);
      seen.add(out);
    }
    expect(seen.size).toBe(1);
  });

  it('creates a fresh result when no scratch is supplied', () => {
    const a: CloudIntensity = { cloud: 0.5, snow: 0 };
    const first = cloudCover(a);
    const second = cloudCover(a);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });
});

describe('layerOffset', () => {
  it('advances by speed × dt and is deterministic', () => {
    expect(layerOffset(0, 1, 0.01).offset).toBeCloseTo(0.01, 10);
    expect(layerOffset(0, 1, 0.01).offset).toBe(layerOffset(0, 1, 0.01).offset);
  });

  it('drifts the near layer faster than the far layer over the same frames', () => {
    const [far, near] = CLOUD_LAYERS;
    const farScratch: LayerOffset = { offset: 0 };
    const nearScratch: LayerOffset = { offset: 0 };
    for (let frame = 0; frame < 600; frame += 1) {
      layerOffset(farScratch.offset, 1 / 60, far.speed, farScratch);
      layerOffset(nearScratch.offset, 1 / 60, near.speed, nearScratch);
    }
    expect(nearScratch.offset).toBeGreaterThan(farScratch.offset);
  });

  it('wraps inside the arc and stays non-negative', () => {
    expect(layerOffset(0.95, 10, 0.01).offset).toBeCloseTo(0.05, 10);
    for (const speed of [1, 2, 5, 100]) {
      const offset = layerOffset(0.2, 1000, speed).offset;
      expect(offset).toBeGreaterThanOrEqual(0);
      expect(offset).toBeLessThan(ARC_SPAN);
    }
    expect(layerOffset(-0.25, 0, 0).offset).toBeCloseTo(0.75, 10);
  });

  it('preserves scratch identity across repeated calls (no per-frame allocation)', () => {
    const scratch: LayerOffset = { offset: -1 };
    const seen = new Set<LayerOffset>();
    for (let i = 0; i < 1000; i += 1) {
      const out = layerOffset(i / 1000, 1 / 60, 0.01, scratch);
      expect(out).toBe(scratch);
      seen.add(out);
    }
    expect(seen.size).toBe(1);
  });

  it('creates a fresh result when no scratch is supplied', () => {
    const first = layerOffset(0.5, 1, 0.01);
    const second = layerOffset(0.5, 1, 0.01);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });
});
