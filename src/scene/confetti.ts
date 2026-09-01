import { BoxGeometry, Group, Mesh, MeshBasicMaterial, type Object3D } from 'three';

import { CONFETTI_LIFETIME, createConfettiPool } from '../core/confetti';

/** One fluttering square, small enough to read as paper at tablet distance. */
const CONFETTI_SIZE = 0.09;
/** Squares shrink away over the last part of their life (pooled, no per-
 *  particle materials, so fading happens in scale not opacity). */
const CONFETTI_FADE = 0.25;

/** Warm party palette — one shared material per color, four total. */
const PALETTE = [0xe2574c, 0xf2a541, 0x4fb286, 0xf5d547];

export interface Confetti {
  burst(x: number, y: number, z: number): void;
  update(dt: number): void;
  dispose(): void;
}

/**
 * A pooled confetti cannon for station deliveries. All particles share one
 * geometry and four materials; the frame cost while idle is a cheap pool
 * sweep, and bursts allocate nothing.
 */
export function createConfetti(scene: Object3D, burstEnabled: () => boolean): Confetti {
  const pool = createConfettiPool();
  const group = new Group();
  const geometry = new BoxGeometry(CONFETTI_SIZE, CONFETTI_SIZE, CONFETTI_SIZE * 0.4);
  const materials = PALETTE.map((color) => new MeshBasicMaterial({ color }));
  const meshes: Mesh[] = [];
  for (let i = 0; i < pool.capacity; i += 1) {
    const material = materials[i % materials.length];
    if (!material) break;
    const mesh = new Mesh(geometry, material);
    mesh.visible = false;
    group.add(mesh);
    meshes.push(mesh);
  }
  scene.add(group);

  return {
    burst(x, y, z) {
      if (!burstEnabled()) return; // Reduced motion: the crates still deliver.
      pool.burst(x, y, z);
    },
    update(dt) {
      pool.update(dt);
      for (let i = 0; i < meshes.length; i += 1) {
        const slot = pool.slot(i);
        const mesh = meshes[i];
        if (!mesh) continue;
        if (!slot.active) {
          mesh.visible = false;
          continue;
        }
        const material = materials[slot.colorIndex % materials.length];
        if (material) mesh.material = material;
        mesh.visible = true;
        mesh.position.set(slot.x, slot.y, slot.z);
        mesh.rotation.set(slot.spin * slot.age, slot.spin * 0.7 * slot.age, 0);
        // Flutter: shrink away over the tail of the flight.
        const lifeLeft = Math.max(0, 1 - slot.age / CONFETTI_LIFETIME);
        mesh.scale.setScalar(Math.max(lifeLeft / CONFETTI_FADE, 0.001));
      }
    },
    dispose() {
      scene.remove(group);
      geometry.dispose();
      for (const material of materials) material.dispose();
    },
  };
}
