import type { DirectionalLight, WebGLRenderer } from 'three';
import type { QualityLevel } from '../core/perf-monitor';

/** L1 clamps the render resolution to this pixel ratio (from up to 2). */
export const QUALITY_L1_MAX_PIXEL_RATIO = 1.5;
/** L2 pins the render resolution to exactly 1.0. */
export const QUALITY_L2_PIXEL_RATIO = 1;
/** L2 halves the weather particle intensity (opacity-eased, so it fades). */
export const QUALITY_L2_WEATHER_SCALE = 0.5;
/** Seconds for a shadow fade — long enough to read as dusk, not a switch. */
export const QUALITY_SHADOW_FADE_SECONDS = 1;

export interface QualityApplierOptions {
  renderer: WebGLRenderer;
  /** The shadow-casting sun whose shadow maps the levels trim. */
  shadowLight: DirectionalLight;
  /** The pixel ratio the app booted with (L0 must reproduce it exactly). */
  basePixelRatio: number;
  /** The shadow map size the app booted with (L0 must reproduce it exactly). */
  baseShadowMapSize: number;
}

export interface QualityApplier {
  /** Idempotently apply a quality level to the live scene. */
  apply(level: QualityLevel): void;
  /** Per-frame tick easing the shadow fade (no-op once settled). */
  update(dtSeconds: number): void;
  /** Multiplier for weather particle intensity: 1, or 0.5 at L2. */
  readonly weatherScale: number;
  /** The currently applied level (debug overlay + tests). */
  readonly level: QualityLevel;
}

/**
 * Applies a quality level to the live renderer, sun shadows, and weather
 * bed. Transitions lean on each subsystem's own smoothing — pixel ratio
 * changes only resample the same image, weather scaling rides the particle
 * system's opacity easing, and shadows fade via `shadow.intensity` before
 * `castShadow` flips off — so a level change never reads as a pop.
 */
export function createQualityApplier(options: QualityApplierOptions): QualityApplier {
  const { renderer, shadowLight } = options;
  const fadePerSecond = 1 / QUALITY_SHADOW_FADE_SECONDS;
  let level: QualityLevel = 0;
  let appliedLevel: QualityLevel = 0;
  /** Current shadow strength — eased toward the level's target by update(). */
  let shadowStrength = 1;

  const setShadowMapSize = (size: number): void => {
    if (shadowLight.shadow.mapSize.x === size) return;
    shadowLight.shadow.mapSize.set(size, size);
    // Dropping the map size only takes effect after freeing the old target.
    shadowLight.shadow.map?.dispose();
    shadowLight.shadow.map = null;
  };

  return {
    apply(next) {
      level = next;
      if (next === appliedLevel) return;
      appliedLevel = next;
      if (next === 0) {
        renderer.setPixelRatio(options.basePixelRatio);
        setShadowMapSize(options.baseShadowMapSize);
        // Shadows return immediately (fading in) — flipping castShadow on
        // with strength 0 keeps the comeback soft.
        shadowLight.castShadow = true;
      } else if (next === 1) {
        renderer.setPixelRatio(Math.min(options.basePixelRatio, QUALITY_L1_MAX_PIXEL_RATIO));
        setShadowMapSize(options.baseShadowMapSize / 2);
        shadowLight.castShadow = true;
      } else {
        renderer.setPixelRatio(QUALITY_L2_PIXEL_RATIO);
        // castShadow flips off only after the fade completes (update()).
      }
    },

    update(dtSeconds) {
      const target = level === 2 ? 0 : 1;
      if (shadowStrength === target) return;
      const step = fadePerSecond * dtSeconds;
      shadowStrength =
        shadowStrength < target
          ? Math.min(shadowStrength + step, target)
          : Math.max(shadowStrength - step, target);
      shadowLight.shadow.intensity = shadowStrength;
      // Only after the shadow has fully faded does the cast cost go away.
      if (level === 2 && shadowStrength === 0) shadowLight.castShadow = false;
    },

    get weatherScale() {
      return level === 2 ? QUALITY_L2_WEATHER_SCALE : 1;
    },

    get level() {
      return level;
    },
  };
}
