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

/**
 * Loads the station-delivery crate that rides on a wagon (Blender-authored,
 * scripts/blender-station.py). Base at the origin so it sits on the wagon
 * bed when positioned at the measured cargo height.
 */
export function loadCrate(): Promise<Group> {
  const loader = new GLTFLoader();
  return loader.loadAsync('/assets/train-kit/crate.glb').then((gltf) => {
    const model = gltf.scene;
    model.scale.setScalar(1.5);
    enableCastShadows(model);
    return model;
  });
}
