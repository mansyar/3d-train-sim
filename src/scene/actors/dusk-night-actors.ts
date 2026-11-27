/**
 * Dusk/night-greeting actors — small procedurally authored families that join
 * the fixed night ambience for a short, distinct moment. Like the day fliers,
 * every family is one preallocated geometry/material pair with a hard fixed cap
 * (NFR-1); `update()` only rewrites transforms and opacity on the frame path —
 * no allocation, no object creation, no async load (NFR-2/NFR-3).
 *
 * Positions use deterministic hashes instead of `Math.random`, so a greeting
 * screenshot is reproducible across runs and across the device profiles.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Points,
  PointsMaterial,
  type Scene,
} from 'three';

/** Dusk: the last critters over the rails, settling as the light fades. */
export const SETTLING_CRITTER_CAP = 16;
/** Night: a rising surge on top of the clock's ambient fireflies. */
export const RISING_FIREFLY_CAP = 24;

/** Stable 0..1 hash from an index and a salt — deterministic by construction. */
function hash01(index: number, salt: number): number {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43_758.5453;
  return value - Math.floor(value);
}

export interface DuskCritters {
  /**
   * Advance the flock. `level` fades it; `liveliness` 1→0 lowers the critters
   * from a flutter onto the meadow (the settle). `dt` 0 renders a frozen pose.
   */
  update(dt: number, level: number, liveliness: number): void;
  /** Vertices currently on stage (e2e witness, NFR-1 cap check). */
  visibleCount(): number;
  dispose(): void;
}

/** Dusk critters — a fixed ring that flutters, then settles low as it dims. */
export function createSettlingCritters(scene: Scene): DuskCritters {
  const positions = new Float32Array(SETTLING_CRITTER_CAP * 3);
  const bases = new Float32Array(SETTLING_CRITTER_CAP * 3);
  const phases = new Float32Array(SETTLING_CRITTER_CAP);
  const speeds = new Float32Array(SETTLING_CRITTER_CAP);
  const colors = new Float32Array(SETTLING_CRITTER_CAP * 3);
  const palette = [new Color(0xffc978), new Color(0xc8e8a0), new Color(0xf7b9d0)];

  for (let index = 0; index < SETTLING_CRITTER_CAP; index += 1) {
    const angle = hash01(index, 21) * Math.PI * 2;
    const radius = 3 + hash01(index, 22) * 7;
    const offset = index * 3;
    bases[offset] = Math.cos(angle) * radius;
    bases[offset + 1] = 0.8 + hash01(index, 23) * 1.2;
    bases[offset + 2] = Math.sin(angle) * radius;
    phases[index] = hash01(index, 24) * Math.PI * 2;
    speeds[index] = 1.4 + hash01(index, 25) * 1.6;
    const tint = palette[index % palette.length] ?? palette[0];
    if (tint) {
      colors[offset] = tint.r;
      colors[offset + 1] = tint.g;
      colors[offset + 2] = tint.b;
    }
  }
  positions.set(bases);

  const geometry = new BufferGeometry();
  const positionAttribute = new BufferAttribute(positions, 3);
  positionAttribute.setUsage(DynamicDrawUsage);
  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  const material = new PointsMaterial({
    size: 0.85,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.visible = false;
  scene.add(points);

  let time = 0;
  let visible = false;

  return {
    update(dt, level, liveliness) {
      if (level <= 0.001) {
        points.visible = false;
        visible = false;
        return;
      }
      visible = true;
      points.visible = true;
      material.opacity = Math.min(1, level * 0.9);
      time += dt;
      for (let index = 0; index < SETTLING_CRITTER_CAP; index += 1) {
        const offset = index * 3;
        const phase = phases[index] ?? 0;
        const speed = (speeds[index] ?? 1) * Math.max(0, liveliness);
        const flutter = Math.sin(time * speed + phase) * 0.4 * liveliness;
        // Settling pulls each critter down toward the meadow and stills it.
        positions[offset] = (bases[offset] ?? 0) + flutter;
        positions[offset + 1] =
          0.28 + ((bases[offset + 1] ?? 0) - 0.28) * liveliness + Math.abs(flutter) * 0.3;
        positions[offset + 2] =
          (bases[offset + 2] ?? 0) + Math.cos(time * speed + phase) * 0.25 * liveliness;
      }
      positionAttribute.needsUpdate = true;
    },
    visibleCount: () => (visible ? SETTLING_CRITTER_CAP : 0),
    dispose() {
      scene.remove(points);
      geometry.dispose();
      material.dispose();
    },
  };
}

export interface NightFireflies {
  /**
   * Advance the surge. `level` fades it; `rise` 0→1 lifts the pool off the
   * meadow into its night hover. `dt` 0 renders a frozen pose.
   */
  update(dt: number, level: number, rise: number): void;
  /** Vertices currently on stage (e2e witness, NFR-1 cap check). */
  visibleCount(): number;
  dispose(): void;
}

/**
 * Rising night fireflies — a fixed pool that climbs from the grass on slow
 * figure-eight paths. Additive points mirror `scene/fireflies.ts`; this is the
 * greeting's own surge, owned here so the stage can freeze it under RM.
 */
export function createRisingFireflies(scene: Scene): NightFireflies {
  const positions = new Float32Array(RISING_FIREFLY_CAP * 3);
  const bases = new Float32Array(RISING_FIREFLY_CAP * 3);
  const phases = new Float32Array(RISING_FIREFLY_CAP);
  const colors = new Float32Array(RISING_FIREFLY_CAP * 3);
  const palette = [new Color(0xffe28a), new Color(0xfff2b0), new Color(0xd8ffa8)];

  for (let index = 0; index < RISING_FIREFLY_CAP; index += 1) {
    const angle = hash01(index, 31) * Math.PI * 2;
    const radius = 2 + hash01(index, 32) * 14;
    const offset = index * 3;
    bases[offset] = Math.cos(angle) * radius;
    bases[offset + 1] = 0.4 + hash01(index, 33) * 1.1;
    bases[offset + 2] = Math.sin(angle) * radius;
    phases[index] = hash01(index, 34) * Math.PI * 2;
    const tint = palette[index % palette.length] ?? palette[0];
    if (tint) {
      colors[offset] = tint.r;
      colors[offset + 1] = tint.g;
      colors[offset + 2] = tint.b;
    }
  }

  const geometry = new BufferGeometry();
  const positionAttribute = new BufferAttribute(positions, 3);
  positionAttribute.setUsage(DynamicDrawUsage);
  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  const material = new PointsMaterial({
    size: 0.42,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.visible = false;
  scene.add(points);

  let time = 0;
  let visible = false;

  return {
    update(dt, level, rise) {
      if (level <= 0.001) {
        points.visible = false;
        visible = false;
        return;
      }
      visible = true;
      points.visible = true;
      material.opacity = Math.min(1, level * 0.95);
      time += dt;
      for (let index = 0; index < RISING_FIREFLY_CAP; index += 1) {
        const offset = index * 3;
        const phase = phases[index] ?? 0;
        const hover = Math.sin(time * 0.9 + phase);
        positions[offset] = (bases[offset] ?? 0) + Math.sin(time * 0.35 + phase) * 0.6 * rise;
        // `rise` lifts from the grass (0.15) to the night hover height.
        positions[offset + 1] = 0.15 + ((bases[offset + 1] ?? 0) + hover * 0.35) * rise;
        positions[offset + 2] =
          (bases[offset + 2] ?? 0) + Math.cos(time * 0.35 + phase) * 0.6 * rise;
      }
      positionAttribute.needsUpdate = true;
    },
    visibleCount: () => (visible ? RISING_FIREFLY_CAP : 0),
    dispose() {
      scene.remove(points);
      geometry.dispose();
      material.dispose();
    },
  };
}
