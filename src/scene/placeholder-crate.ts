import { BoxGeometry, Mesh, MeshStandardMaterial } from 'three';

/** Temporary spinning crate — proves the render loop works before real models land. */
export interface PlaceholderCrate {
  mesh: Mesh;
  dispose(): void;
}

export function createPlaceholderCrate(): PlaceholderCrate {
  const geometry = new BoxGeometry(1.5, 1.5, 1.5);
  const material = new MeshStandardMaterial({ color: 0xff9f1c });
  const mesh = new Mesh(geometry, material);
  mesh.position.y = 0.75;
  return {
    mesh,
    dispose(): void {
      geometry.dispose();
      material.dispose();
    },
  };
}
