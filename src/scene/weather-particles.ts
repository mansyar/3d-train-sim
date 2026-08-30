import type { Scene } from 'three';
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Points,
  PointsMaterial,
  Sprite,
  SpriteMaterial,
} from 'three';
import type { WeatherIntensity } from '../core/weather-cycle';

/** Particle budgets — instanced points, tiny for tablet GPUs (spec NFR). */
const RAIN_COUNT = 600;
const SNOW_COUNT = 400;
const CLOUD_COUNT = 6;

/** The storm box: particles live above the 60-unit meadow and wrap around. */
const FIELD = 34;
const FIELD_TOP = 32;

const RAIN_SPEED = 19; // Units per second — a driving shower.
const SNOW_SPEED = 2.2; // A lazy flurry.
const CLOUD_DRIFT = 0.55;

let cloudTexture: CanvasTexture | null = null;

/** Soft white puff texture, drawn once and shared by every cloud sprite. */
function puffTexture(): CanvasTexture {
  if (cloudTexture) return cloudTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Three overlapping radial blobs read as a puffy cloud at toy scale.
    for (const [x, y, r] of [
      [40, 40, 24],
      [64, 30, 28],
      [88, 40, 24],
    ] as const) {
      const gradient = ctx.createRadialGradient(x, y, 2, x, y, r);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 64);
    }
  }
  cloudTexture = new CanvasTexture(canvas);
  return cloudTexture;
}

export interface WeatherParticles {
  /** Advance drift/fall and fade toward the requested intensities. */
  update(dt: number, intensity: WeatherIntensity): void;
  dispose(): void;
}

/**
 * Rain streaks, snowflakes, and drifting cloud puffs. Everything is a fixed
 * pool with in-place position updates (zero per-frame allocation) and
 * opacity-driven intensity, so weather cross-fades stay soft.
 */
export function createWeatherParticles(scene: Scene): WeatherParticles {
  const makePoints = (
    count: number,
    color: number,
    size: number,
    opacity: number,
  ): {
    points: Points;
    positions: Float32Array;
    attribute: BufferAttribute;
    material: PointsMaterial;
  } => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * FIELD * 2;
      positions[i * 3 + 1] = Math.random() * FIELD_TOP;
      positions[i * 3 + 2] = (Math.random() - 0.5) * FIELD * 2;
    }
    const geometry = new BufferGeometry();
    const attribute = new BufferAttribute(positions, 3);
    geometry.setAttribute('position', attribute);
    const material = new PointsMaterial({
      color,
      size,
      transparent: true,
      opacity,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const points = new Points(geometry, material);
    points.visible = false;
    points.frustumCulled = false; // The box always wraps the camera.
    scene.add(points);
    return { points, positions, attribute, material };
  };

  const rain = makePoints(RAIN_COUNT, 0x9fc4e8, 0.16, 0.55);
  const snow = makePoints(SNOW_COUNT, 0xffffff, 0.28, 0.9);

  const cloudMaterial = new SpriteMaterial({
    map: puffTexture(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const clouds: Sprite[] = [];
  for (let i = 0; i < CLOUD_COUNT; i += 1) {
    const cloud = new Sprite(cloudMaterial);
    cloud.position.set(
      (Math.random() - 0.5) * FIELD * 1.6,
      17 + Math.random() * 9,
      (Math.random() - 0.5) * FIELD * 1.6,
    );
    cloud.scale.set(9 + Math.random() * 6, 4.5 + Math.random() * 2.5, 1);
    scene.add(cloud);
    clouds.push(cloud);
  }

  /** Current smoothed intensities — cross-fades chase the targets softly. */
  const current = { rain: 0, snow: 0, cloud: 0.1 };
  /** Snowflake sway phase — slow sine drift, no allocation. */
  let swayPhase = 0;

  const fall = (
    positions: Float32Array,
    count: number,
    speed: number,
    dt: number,
    sway = 0,
  ): void => {
    for (let i = 0; i < count; i += 1) {
      let y = (positions[i * 3 + 1] ?? 0) - speed * dt;
      if (y < 0) {
        y += FIELD_TOP; // Recycle at the top of the storm box.
        positions[i * 3] = (Math.random() - 0.5) * FIELD * 2;
        positions[i * 3 + 2] = (Math.random() - 0.5) * FIELD * 2;
      }
      if (sway > 0) {
        positions[i * 3] = (positions[i * 3] ?? 0) + Math.sin(swayPhase + i * 1.7) * sway * dt;
      }
      positions[i * 3 + 1] = y;
    }
  };

  return {
    update(dt, intensity) {
      // Ease toward targets — soft transitions, never abrupt switches.
      const ease = Math.min(1, dt * 1.5);
      current.rain += (intensity.rain - current.rain) * ease;
      current.snow += (intensity.snow - current.snow) * ease;
      current.cloud += (intensity.cloud - current.cloud) * ease;

      rain.points.visible = current.rain > 0.02;
      if (rain.points.visible) {
        rain.material.opacity = 0.55 * current.rain;
        fall(rain.positions, RAIN_COUNT, RAIN_SPEED, dt);
        rain.attribute.needsUpdate = true;
      }

      snow.points.visible = current.snow > 0.02;
      if (snow.points.visible) {
        snow.material.opacity = 0.9 * current.snow;
        swayPhase += dt * 2;
        fall(snow.positions, SNOW_COUNT, SNOW_SPEED, dt, 0.7);
        snow.attribute.needsUpdate = true;
      }

      cloudMaterial.opacity = 0.75 * current.cloud;
      for (const cloud of clouds) {
        cloud.position.x += CLOUD_DRIFT * dt;
        if (cloud.position.x > FIELD * 0.9) cloud.position.x = -FIELD * 0.9;
      }
    },
    dispose() {
      scene.remove(rain.points, snow.points);
      rain.points.geometry.dispose();
      rain.material.dispose();
      snow.points.geometry.dispose();
      snow.material.dispose();
      for (const cloud of clouds) scene.remove(cloud);
      cloudMaterial.dispose();
      cloudTexture?.dispose();
      cloudTexture = null;
    },
  };
}
