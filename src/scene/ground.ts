import type { Scene } from 'three';
import { Color, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';

/** The "table surface" the toy world sits on — soft play-mat green. */
export const GROUND_SIZE = 60;

/** Summer green and settled-snow white for the weather lerp. */
const GRASS = new Color(0x8fce8f);
const SNOW_WHITE = new Color(0xf0f5ee);

export interface Ground {
  /** Cover the meadow in snow: 0 = summer green, 1 = fully settled white. */
  setSnow(amount: number): void;
  dispose(): void;
}

/** The "table surface" the toy world sits on — soft play-mat green. */
export function createGround(scene: Scene): Ground {
  const geometry = new PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
  const material = new MeshStandardMaterial({ color: GRASS.clone() });
  const ground = new Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  // The play mat catches every toy's soft shadow (lights.ts sun).
  ground.receiveShadow = true;
  scene.add(ground);
  return {
    setSnow(amount: number): void {
      material.color.lerpColors(GRASS, SNOW_WHITE, Math.min(1, Math.max(amount, 0)));
    },
    dispose(): void {
      scene.remove(ground);
      geometry.dispose();
      material.dispose();
    },
  };
}
