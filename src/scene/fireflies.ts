import type { Scene } from 'three';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, PointsMaterial } from 'three';

/** A couple dozen fireflies — enough magic, negligible GPU cost. */
const FIREFLY_COUNT = 24;

/** Fireflies wander low over the meadow, near the tracks. */
const WANDER_RADIUS = 20;
const FLY_HEIGHT = 1.8;
const DRIFT_SPEED = 0.35;
/** Above this night factor the fireflies are out in force. */
const NIGHT_THRESHOLD = 0.35;

export interface Fireflies {
  /** Advance the wander and fade with the night factor (0 day → 1 night).
   *  Rain sends them home — no fireflies in a downpour. */
  update(dt: number, nightFactor: number, rainFactor?: number): void;
  dispose(): void;
}

/**
 * Night fireflies: a small fixed pool of glowing points drifting on slow
 * sine paths. Purely visual — opacity follows the pure night factor, so
 * they rise with dusk and vanish by mid-dawn.
 */
export function createFireflies(scene: Scene): Fireflies {
  const positions = new Float32Array(FIREFLY_COUNT * 3);
  const seeds = new Float32Array(FIREFLY_COUNT);
  for (let i = 0; i < FIREFLY_COUNT; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * WANDER_RADIUS * 2;
    positions[i * 3 + 1] = 0.5 + Math.random() * FLY_HEIGHT;
    positions[i * 3 + 2] = (Math.random() - 0.5) * WANDER_RADIUS * 2;
    seeds[i] = Math.random() * Math.PI * 2;
  }
  const geometry = new BufferGeometry();
  const attribute = new BufferAttribute(positions, 3);
  geometry.setAttribute('position', attribute);
  const material = new PointsMaterial({
    color: 0xffe28a,
    size: 0.35,
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.visible = false;
  scene.add(points);

  let phase = 0;

  return {
    update(dt, nightFactor, rainFactor = 0) {
      points.visible = nightFactor > NIGHT_THRESHOLD && rainFactor < 0.2;
      if (!points.visible) return;
      material.opacity = Math.min(1, (nightFactor - NIGHT_THRESHOLD) * 3) * 0.9;
      phase += dt * DRIFT_SPEED;
      for (let i = 0; i < FIREFLY_COUNT; i += 1) {
        const seed = seeds[i] ?? 0;
        // Slow figure-eight wander; each firefly keeps its own phase.
        positions[i * 3] = (positions[i * 3] ?? 0) + Math.sin(phase * 1.3 + seed) * 0.5 * dt;
        positions[i * 3 + 1] = 0.5 + FLY_HEIGHT * (0.5 + 0.5 * Math.sin(phase + seed));
        positions[i * 3 + 2] = (positions[i * 3 + 2] ?? 0) + Math.cos(phase + seed) * 0.5 * dt;
      }
      attribute.needsUpdate = true;
    },
    dispose() {
      scene.remove(points);
      geometry.dispose();
      material.dispose();
    },
  };
}
