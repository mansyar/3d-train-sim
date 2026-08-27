import type { Object3D } from 'three';
import { Mesh, Texture } from 'three';

/** Deep-disposes a subtree's geometries, materials, and textures (GPU memory). */
export function disposeObject(object: Object3D): void {
  object.traverse((child) => {
    if (child instanceof Mesh) {
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        for (const value of Object.values(material)) {
          if (value instanceof Texture) value.dispose();
        }
        material.dispose();
      }
    }
  });
}
