import type { Scene } from 'three';
import { Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';

/** The "table surface" the toy world sits on — soft play-mat green. */
export const GROUND_SIZE = 60;

/** The "table surface" the toy world sits on — soft play-mat green. */
export function createGround(scene: Scene): () => void {
  const geometry = new PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
  const material = new MeshStandardMaterial({ color: 0x8fce8f });
  const ground = new Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  return () => {
    scene.remove(ground);
    geometry.dispose();
    material.dispose();
  };
}
