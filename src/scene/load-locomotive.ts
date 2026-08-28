import type { Group } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { type TrainKind, trainModelUrl } from '../core/trains';

/** Loads one catalog locomotive from the local asset bundle. */
export function loadLocomotive(kind: TrainKind = 'steam'): Promise<Group> {
  const loader = new GLTFLoader();
  return loader.loadAsync(trainModelUrl(kind)).then((gltf) => {
    const model = gltf.scene;
    model.scale.setScalar(1.5);
    return model;
  });
}
