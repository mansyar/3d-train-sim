import type { Scene } from 'three';
import { AmbientLight, DirectionalLight, HemisphereLight } from 'three';
import { MEADOW_CELLS } from '../core/track-graph';
import { GROUND_SIZE } from './ground';

/** One meadow cell in world units (the grid spans the whole ground). */
const CELL_SIZE = GROUND_SIZE / MEADOW_CELLS;

/** Sun-light tuning for the toy-table look. The shadow frustum is confined
 * to the buildable meadow (MEADOW_CELLS × CELL_SIZE) so all 1024 texels land
 * on the play area, and the bias pair keeps chunky kit geometry free of
 * shadow acne without visibly detaching shadows (peter-panning). */
const SUN_POSITION = [24, 34, 16] as const;
const SHADOW_MAP_SIZE = 1024;
const SHADOW_BIAS = -0.0002;
const SHADOW_NORMAL_BIAS = 0.1;

/** Sunlit-playroom lighting: warm ambient, sky/warm-bounce fill, one shadowed sun. */
export function createLights(scene: Scene): () => void {
  const ambient = new AmbientLight(0xffeecf, 0.7);
  const fill = new HemisphereLight(0xbfe0ff, 0xffe2b0, 0.55);
  const sun = new DirectionalLight(0xfff6e6, 1.15);
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
  return () => {
    scene.remove(ambient, fill, sun);
    ambient.dispose();
    fill.dispose();
    sun.dispose();
  };
}
