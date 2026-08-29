import type { Group } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { type WagonSlot, wagonModelUrl } from '../core/wagons';
import { enableCastShadows } from './shadows';

/** Loads one catalog cargo wagon from the local asset bundle. */
export function loadWagon(slot: WagonSlot): Promise<Group> {
  const loader = new GLTFLoader();
  return loader.loadAsync(wagonModelUrl(slot)).then((gltf) => {
    const model = gltf.scene;
    model.scale.setScalar(1.5);
    // Wagons cast; cached-template clones inherit the flag.
    enableCastShadows(model);
    return model;
  });
}
