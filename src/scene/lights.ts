import type { Scene } from 'three';
import { AmbientLight, Color, DirectionalLight, HemisphereLight } from 'three';
import { MEADOW_CELLS } from '../core/track-graph';
import { GROUND_SIZE } from './ground';

/** One meadow cell in world units (the grid spans the whole ground). */
const CELL_SIZE = GROUND_SIZE / MEADOW_CELLS;

/** Sun-light tuning for the toy-table look. The shadow frustum is confined
 * to the buildable meadow (MEADOW_CELLS × CELL_SIZE) so all 1024 texels land
 * on the play area, and the bias pair keeps chunky kit geometry free of
 * shadow acne without visibly detaching shadows (peter-panning). */
export const SHADOW_MAP_SIZE = 1024;
const SUN_POSITION = [24, 34, 16] as const;
const SHADOW_BIAS = -0.0002;
const SHADOW_NORMAL_BIAS = 0.1;

/** Sunlit-playroom lighting: warm ambient, sky/warm-bounce fill, one shadowed sun.
 *  Lights lerp between day and night presets so the meadow dims into cozy
 *  twilight (never near-black) and brightens again by mid-dawn. */
const DAY = {
  ambientColor: 0xffeecf,
  ambientIntensity: 0.7,
  fillSky: 0xbfe0ff,
  fillGround: 0xffe2b0,
  fillIntensity: 0.55,
  sunColor: 0xfff6e6,
  sunIntensity: 1.15,
};
const NIGHT = {
  ambientColor: 0x8a9bc8,
  ambientIntensity: 0.3,
  fillSky: 0x2a3560,
  fillGround: 0x1c2438,
  fillIntensity: 0.28,
  sunColor: 0xa8c0e8,
  sunIntensity: 0.25,
};

export interface MeadowLights {
  /** Blend toward the night presets; 0 = full day, 1 = deep night. */
  update(nightFactor: number): void;
  /** The shadowed sun — the quality applier trims its shadow maps. */
  readonly sun: DirectionalLight;
  dispose(): void;
}

export function createLights(scene: Scene): MeadowLights {
  const ambient = new AmbientLight(DAY.ambientColor, DAY.ambientIntensity);
  const fill = new HemisphereLight(DAY.fillSky, DAY.fillGround, DAY.fillIntensity);
  const sun = new DirectionalLight(DAY.sunColor, DAY.sunIntensity);
  sun.position.set(...SUN_POSITION);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  const half = (MEADOW_CELLS * CELL_SIZE) / 2;
  sun.shadow.camera.left = -half;
  sun.shadow.camera.right = half;
  sun.shadow.camera.top = half;
  sun.shadow.camera.bottom = -half;
  sun.shadow.camera.near = 8;
  sun.shadow.camera.far = 110;
  sun.shadow.bias = SHADOW_BIAS;
  sun.shadow.normalBias = SHADOW_NORMAL_BIAS;
  scene.add(ambient, fill, sun);
  // Preset colors hoisted for per-frame lerping — no per-frame allocation.
  const ambientDay = new Color(DAY.ambientColor);
  const ambientNight = new Color(NIGHT.ambientColor);
  const fillSkyDay = new Color(DAY.fillSky);
  const fillSkyNight = new Color(NIGHT.fillSky);
  const fillGroundDay = new Color(DAY.fillGround);
  const fillGroundNight = new Color(NIGHT.fillGround);
  const sunDay = new Color(DAY.sunColor);
  const sunNight = new Color(NIGHT.sunColor);
  return {
    update(nightFactor: number): void {
      ambient.color.lerpColors(ambientDay, ambientNight, nightFactor);
      ambient.intensity =
        DAY.ambientIntensity + (NIGHT.ambientIntensity - DAY.ambientIntensity) * nightFactor;
      fill.color.lerpColors(fillSkyDay, fillSkyNight, nightFactor);
      fill.groundColor.lerpColors(fillGroundDay, fillGroundNight, nightFactor);
      fill.intensity = DAY.fillIntensity + (NIGHT.fillIntensity - DAY.fillIntensity) * nightFactor;
      sun.color.lerpColors(sunDay, sunNight, nightFactor);
      sun.intensity = DAY.sunIntensity + (NIGHT.sunIntensity - DAY.sunIntensity) * nightFactor;
    },
    get sun() {
      return sun;
    },
    dispose() {
      scene.remove(ambient, fill, sun);
      ambient.dispose();
      fill.dispose();
      sun.dispose();
    },
  };
}
