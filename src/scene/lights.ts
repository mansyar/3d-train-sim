import type { Scene } from 'three';
import { AmbientLight, DirectionalLight } from 'three';

/** Soft toy-table lighting: warm ambient + one key light with soft shadows. */
export function createLights(scene: Scene): () => void {
  const ambient = new AmbientLight(0xfff4e0, 0.7);
  const key = new DirectionalLight(0xffffff, 1.1);
  key.position.set(5, 10, 4);
  scene.add(ambient, key);
  return () => {
    scene.remove(ambient, key);
    ambient.dispose();
    key.dispose();
  };
}
