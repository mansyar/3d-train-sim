import type { Mesh, Object3D } from 'three';

/** Marks every mesh under a model as a shadow caster. Apply to loaded GLB
 * templates so every clone inherits the flag (three.js clones castShadow). */
export function enableCastShadows(model: Object3D): void {
  model.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
  });
}

/** Clear all shadow participation — drag ghosts clone shared casting
 * templates, so they must opt out explicitly. */
export function disableShadows(model: Object3D): void {
  model.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  });
}
