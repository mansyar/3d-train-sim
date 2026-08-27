import type { Group } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const LOCOMOTIVE_URL = '/assets/train-kit/train-locomotive-a.glb';

/** Loads the Kenney locomotive. Resolves with the model root ready for the scene. */
export function loadLocomotive(): Promise<Group> {
  const loader = new GLTFLoader();
  return loader.loadAsync(LOCOMOTIVE_URL).then((gltf) => {
    const model = gltf.scene;
    model.scale.setScalar(1.5);
    return model;
  });
}
