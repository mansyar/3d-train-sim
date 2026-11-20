import type { Scene } from 'three';
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Points,
  PointsMaterial,
  Sprite,
  SpriteMaterial,
} from 'three';
import {
  ARC_SPAN,
  CLOUD_LAYERS,
  type CloudCover,
  type CloudLayerName,
  cloudCover,
  type LayerOffset,
  layerOffset,
} from '../core/cloud-layers';
import type { WeatherIntensity } from '../core/weather-cycle';

/** Particle budgets — instanced points, tiny for tablet GPUs (spec NFR). */
const RAIN_COUNT = 600;
const SNOW_COUNT = 400;
/** Fixed puffs per layer; six total, split into one far and one near pool. */
const CLOUD_COUNT_PER_LAYER = 3;

/** The storm box: particles live above the 60-unit meadow and wrap around. */
const FIELD = 34;
const FIELD_TOP = 32;

const RAIN_SPEED = 19; // Units per second — a driving shower.
const SNOW_SPEED = 2.2; // A lazy flurry.

/** Half-width of the cloud arc in world units; puffs wrap at ± this value. */
const CLOUD_ARC_HALF = FIELD * 0.9;
const CLOUD_ARC_WIDTH = CLOUD_ARC_HALF * 2;

/** Day/night cloud tints — a soft moonlit blue at night, never a flash. */
const CLOUD_DAY_TINT = new Color(0xffffff);
const CLOUD_NIGHT_TINT = new Color(0x9fb1cf);

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

/** One descriptor's live sprite pool — built once at boot, updated in place. */
interface CloudPool {
  readonly name: CloudLayerName;
  readonly depth: number;
  readonly speed: number;
  readonly material: SpriteMaterial;
  readonly sprites: Sprite[];
  /** Fixed normalized slots spread across the arc, one per sprite. */
  readonly slots: number[];
  /** Live normalized drift for this layer, advanced by `layerOffset`. */
  offset: number;
}

export interface CloudLayerWitness {
  name: CloudLayerName;
  depth: number;
  speed: number;
}

/** Live cloud state exposed on the DEV scene handle for e2e. */
export interface CloudWitness {
  /** Exactly two descriptors, far then near. */
  layers: CloudLayerWitness[];
  /** Visible-puff fraction/opacity from the Phase 1 helper. */
  cover: number;
  /** Normalized arc offset per layer, far then near. */
  offsets: [number, number];
  /** False under reduced motion (drift is frozen). */
  drifting: boolean;
  /** Total visible puffs across both layers. */
  visible: number;
}

export interface WeatherParticles {
  /** Advance drift/fall and fade toward the requested intensities. */
  update(dt: number, intensity: WeatherIntensity, night: number): void;
  /** Reused witness object; probe time only, never on the frame path. */
  cloudLayers(): CloudWitness | null;
  dispose(): void;
}

/**
 * Rain streaks, snowflakes, and two drifting cloud pools. Everything is a
 * fixed pool with in-place position updates (zero per-frame allocation) and
 * opacity-driven intensity, so weather cross-fades stay soft.
 */
export function createWeatherParticles(scene: Scene, reducedMotion: boolean): WeatherParticles {
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

  // One shared texture, two materials: distinct opacity per layer, no new
  // downloads and no per-frame material creation (FR-1, FR-5).
  const texture = puffTexture();
  const pools: CloudPool[] = CLOUD_LAYERS.map((descriptor, layerIndex) => {
    const material = new SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const sprites: Sprite[] = [];
    const slots: number[] = [];
    // Deeper puffs read slightly larger; the near pool is phase-shifted half a
    // slot so the two layers never line up into one flat sheet.
    const sizeScale = 0.8 + descriptor.depth * 0.4;
    for (let i = 0; i < CLOUD_COUNT_PER_LAYER; i += 1) {
      const sprite = new Sprite(material);
      const slot = ((i + layerIndex * 0.5) / CLOUD_COUNT_PER_LAYER) % 1;
      slots.push(slot);
      sprite.position.set(
        -CLOUD_ARC_HALF + slot * CLOUD_ARC_WIDTH,
        17 + Math.random() * 9,
        (Math.random() - 0.5) * FIELD * 1.6,
      );
      sprite.scale.set(
        (9 + Math.random() * 6) * sizeScale,
        (4.5 + Math.random() * 2.5) * sizeScale,
        1,
      );
      scene.add(sprite);
      sprites.push(sprite);
    }
    return {
      name: descriptor.name,
      depth: descriptor.depth,
      speed: descriptor.speed,
      material,
      sprites,
      slots,
      offset: 0,
    };
  });

  /** Current smoothed intensities — cross-fades chase the targets softly. */
  const current = { rain: 0, snow: 0, cloud: 0.1 };
  /** Snowflake sway phase — slow sine drift, no allocation. */
  let swayPhase = 0;

  /** Scratch for the frame path — the helpers write into these in place. */
  const coverScratch: CloudCover = { cover: 0 };
  const offsetScratch: LayerOffset = { offset: 0 };
  const tintScratch = new Color();

  /** Preallocated e2e witness; updated in place, returned by reference. */
  const witness: CloudWitness = {
    layers: pools.map((pool) => ({ name: pool.name, depth: pool.depth, speed: pool.speed })),
    cover: 0,
    offsets: [0, 0],
    drifting: !reducedMotion,
    visible: 0,
  };

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
    update(dt, intensity, night) {
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

      // Cover follows the live (eased) weather bed; the snow cap keeps a
      // snowstorm gentle. One scratch write, no allocation (FR-2, FR-5).
      cloudCover(current, coverScratch);
      const cover = coverScratch.cover;

      // Day repaint tints both pools in place. The night factor changes
      // continuously (or on a tap), so there is no transient flash state.
      tintScratch.copy(CLOUD_DAY_TINT).lerp(CLOUD_NIGHT_TINT, Math.min(1, Math.max(0, night)));

      // More cover → more visible puffs, never none. Clear keeps one per layer.
      const visiblePerLayer = Math.max(1, Math.round(cover * CLOUD_COUNT_PER_LAYER));
      let visible = 0;
      for (let index = 0; index < pools.length; index += 1) {
        const pool = pools[index];
        if (!pool) continue;
        pool.material.color.copy(tintScratch);
        pool.material.opacity = (0.35 + pool.depth * 0.7) * cover;

        // Reduced motion freezes drift but never hides the static layers.
        if (!reducedMotion) {
          layerOffset(pool.offset, dt, pool.speed, offsetScratch);
          pool.offset = offsetScratch.offset;
        }

        for (let i = 0; i < pool.sprites.length; i += 1) {
          const sprite = pool.sprites[i];
          const slot = pool.slots[i];
          if (!sprite || slot === undefined) continue;
          const arcFraction = ((slot + pool.offset) % ARC_SPAN) / ARC_SPAN;
          sprite.position.x = -CLOUD_ARC_HALF + arcFraction * CLOUD_ARC_WIDTH;
          sprite.visible = i < visiblePerLayer;
          if (sprite.visible) visible += 1;
        }
      }

      witness.cover = cover;
      witness.offsets[0] = pools[0]?.offset ?? 0;
      witness.offsets[1] = pools[1]?.offset ?? 0;
      witness.visible = visible;
    },
    cloudLayers() {
      return witness;
    },
    dispose() {
      scene.remove(rain.points, snow.points);
      rain.points.geometry.dispose();
      rain.material.dispose();
      snow.points.geometry.dispose();
      snow.material.dispose();
      for (const pool of pools) {
        for (const cloud of pool.sprites) scene.remove(cloud);
        pool.material.dispose();
      }
      cloudTexture?.dispose();
      cloudTexture = null;
    },
  };
}
