/**
 * Day-greeting actors — tiny, procedurally authored fliers that belong to the
 * scene, not to the save schema. No GLB, no network fetch, no Workbox precache
 * growth (NFR-3): every family is one preallocated geometry/material pair with
 * a hard fixed cap (NFR-1). `update()` only rewrites transforms and opacity on
 * the frame path — no allocation, no object creation, no async load.
 *
 * Positions use deterministic hashes instead of `Math.random` so a screenshot
 * of a greeting is reproducible across runs and across the device profiles.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DynamicDrawUsage,
  PointLight,
  Points,
  PointsMaterial,
  type Scene,
  Sprite,
  SpriteMaterial,
} from 'three';

/** Dawn chorus: a small cloud of wake-up flutterers around the rails. */
export const CHORUS_CAP = 20;
/** Morning butterflies: two wing vertices each, drifting over the meadow. */
export const BUTTERFLY_CAP = 14;

/** Stable 0..1 hash from an index and a salt — deterministic by construction. */
function hash01(index: number, salt: number): number {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43_758.5453;
  return value - Math.floor(value);
}

export interface DayFlier {
  /** Advance the flock. `level` fades it, `liveliness` scales its motion. */
  update(dt: number, level: number, liveliness: number): void;
  /** How many vertices are currently on stage (e2e witness, NFR-1 cap check). */
  visibleCount(): number;
  dispose(): void;
}

/** Dawn chorus critters — fixed ring around the track, hovering and fluttering. */
export function createChorusCritters(scene: Scene): DayFlier {
  const positions = new Float32Array(CHORUS_CAP * 3);
  const bases = new Float32Array(CHORUS_CAP * 3);
  const phases = new Float32Array(CHORUS_CAP);
  const speeds = new Float32Array(CHORUS_CAP);
  const colors = new Float32Array(CHORUS_CAP * 3);
  const palette = [new Color(0xfff1a8), new Color(0xbdf7c4), new Color(0xffd5e6)];

  for (let index = 0; index < CHORUS_CAP; index += 1) {
    const angle = hash01(index, 1) * Math.PI * 2;
    const radius = 2.5 + hash01(index, 2) * 6.5;
    const offset = index * 3;
    bases[offset] = Math.cos(angle) * radius;
    bases[offset + 1] = 0.55 + hash01(index, 3) * 1.5;
    bases[offset + 2] = Math.sin(angle) * radius;
    phases[index] = hash01(index, 4) * Math.PI * 2;
    speeds[index] = 2.2 + hash01(index, 5) * 2.6;
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
  positionAttribute.setUsage(DynamicDrawUsage); // Rewritten each frame.
  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  const material = new PointsMaterial({
    size: 1.05,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false; // The flock lives inside the overview frustum.
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
      material.opacity = Math.min(1, level * 0.95);
      time += dt;
      for (let index = 0; index < CHORUS_CAP; index += 1) {
        const offset = index * 3;
        const phase = phases[index] ?? 0;
        const speed = (speeds[index] ?? 1) * liveliness;
        const flutter = Math.sin(time * speed + phase);
        positions[offset] = (bases[offset] ?? 0) + flutter * 0.5 * liveliness;
        positions[offset + 1] =
          (bases[offset + 1] ?? 0) + Math.sin(time * speed * 1.7 + phase) * 0.38 * liveliness;
        positions[offset + 2] =
          (bases[offset + 2] ?? 0) + Math.cos(time * speed * 0.8 + phase) * 0.45;
      }
      positionAttribute.needsUpdate = true;
    },
    visibleCount: () => (visible ? CHORUS_CAP : 0),
    dispose() {
      scene.remove(points);
      geometry.dispose();
      material.dispose();
    },
  };
}

/** Morning butterflies — paired wing vertices, wandering the wide meadow. */
export function createButterflies(scene: Scene): DayFlier {
  const vertexCount = BUTTERFLY_CAP * 2;
  const positions = new Float32Array(vertexCount * 3);
  const centers = new Float32Array(BUTTERFLY_CAP * 3);
  const phases = new Float32Array(BUTTERFLY_CAP);
  const colors = new Float32Array(vertexCount * 3);
  const palette = [new Color(0xffd166), new Color(0xff9ec4), new Color(0xfff0f5)];

  for (let index = 0; index < BUTTERFLY_CAP; index += 1) {
    const offset = index * 3;
    centers[offset] = (hash01(index, 11) * 2 - 1) * 19;
    centers[offset + 1] = 2.4 + hash01(index, 12) * 3;
    centers[offset + 2] = (hash01(index, 13) * 2 - 1) * 19;
    phases[index] = hash01(index, 14) * Math.PI * 2;
    const tint = palette[index % palette.length] ?? palette[0];
    for (let wing = 0; wing < 2; wing += 1) {
      const vertex = (index * 2 + wing) * 3;
      if (tint) {
        colors[vertex] = tint.r;
        colors[vertex + 1] = tint.g;
        colors[vertex + 2] = tint.b;
      }
    }
  }

  const geometry = new BufferGeometry();
  const positionAttribute = new BufferAttribute(positions, 3);
  positionAttribute.setUsage(DynamicDrawUsage);
  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  const material = new PointsMaterial({
    size: 0.95,
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
      material.opacity = Math.min(1, level * 0.95);
      time += dt;
      for (let index = 0; index < BUTTERFLY_CAP; index += 1) {
        const offset = index * 3;
        const phase = phases[index] ?? 0;
        const centerX = (centers[offset] ?? 0) + Math.sin(time * 0.18 + phase) * 1.8;
        const centerY = (centers[offset + 1] ?? 0) + Math.sin(time * 0.6 + phase) * 0.4;
        const centerZ = (centers[offset + 2] ?? 0) + Math.cos(time * 0.14 + phase) * 1.8;
        const wing = 0.14 + Math.max(0, Math.sin(time * 7 * liveliness + phase)) * 0.26;
        for (let side = 0; side < 2; side += 1) {
          const vertex = (index * 2 + side) * 3;
          positions[vertex] = centerX + (side === 0 ? -wing : wing);
          positions[vertex + 1] = centerY;
          positions[vertex + 2] = centerZ;
        }
      }
      positionAttribute.needsUpdate = true;
    },
    visibleCount: () => (visible ? vertexCount : 0),
    dispose() {
      scene.remove(points);
      geometry.dispose();
      material.dispose();
    },
  };
}

/** Radial-gradient sprite used for the noon halo — generated, never fetched. */
function glowTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,248,202,0.95)');
  gradient.addColorStop(0.4, 'rgba(255,223,140,0.42)');
  gradient.addColorStop(1, 'rgba(255,223,140,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new CanvasTexture(canvas);
}

export interface NoonGlow {
  update(level: number): void;
  level(): number;
  dispose(): void;
}

/**
 * Noon's "full sun" moment: an additive halo above the meadow plus a separate
 * warm fill light. The day ambience repaints `lights.sun` every frame, so the
 * extra light is deliberately owned here — it is the only way the greeting can
 * brighten the scene without fighting the clock's paint.
 */
export function createNoonGlow(scene: Scene): NoonGlow {
  const texture = glowTexture();
  const material = new SpriteMaterial({
    map: texture,
    color: 0xfff2bd,
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const sprite = new Sprite(material);
  sprite.position.set(0, 20, -4);
  sprite.scale.set(18, 18, 1);
  sprite.visible = false;
  scene.add(sprite);

  const light = new PointLight(0xfff0c0, 0, 46);
  light.position.set(0, 14, 0);
  scene.add(light);

  let current = 0;
  return {
    update(level) {
      current = level;
      const on = level > 0.001;
      sprite.visible = texture !== null && on;
      if (sprite.visible) material.opacity = Math.min(1, level) * 0.85;
      light.intensity = on ? level * 22 : 0;
    },
    level: () => current,
    dispose() {
      scene.remove(sprite, light);
      material.dispose();
      texture?.dispose();
    },
  };
}
