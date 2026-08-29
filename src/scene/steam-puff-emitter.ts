import {
  type Camera,
  CircleGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
} from 'three';

import { createSteamPuffPool } from '../core/steam-puffs';
import type { TrainKind } from '../core/trains';

const PUFF_SIZE = 0.75;
const PUFF_COLOR = new Color(0xffffff);
const FALLBACK_OFFSETS: Record<TrainKind, readonly [number, number, number]> = {
  steam: [0, 3.2, 0],
  diesel: [0, 2.8, 0],
  tram: [0, 3, 0],
};

export interface SteamPuffEmitter {
  readonly group: Group;
  emit(): boolean;
  update(dt: number): void;
  setEmitting(emitting: boolean): void;
  dispose(): void;
}

function findChimney(model: Object3D): Object3D | null {
  let chimney: Object3D | null = null;
  model.traverse((child) => {
    if (chimney === null && /chimney|smokestack|stack/i.test(child.name)) chimney = child;
  });
  return chimney;
}

export function createSteamPuffEmitter(
  model: Object3D,
  camera: Camera,
  train: TrainKind,
): SteamPuffEmitter {
  const group = new Group();
  const geometry = new CircleGeometry(PUFF_SIZE, 12);
  const material = new MeshBasicMaterial({
    color: PUFF_COLOR,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const meshes: Mesh[] = [];
  for (let i = 0; i < 16; i += 1) {
    const mesh = new Mesh(geometry, material);
    mesh.visible = false;
    group.add(mesh);
    meshes.push(mesh);
  }
  const pool = createSteamPuffPool();
  const chimney = findChimney(model);
  const offset = FALLBACK_OFFSETS[train];
  const origin = new Object3D();
  const worldOrigin = new Object3D();
  model.add(origin);
  group.add(worldOrigin);

  function emit(): boolean {
    if (chimney) chimney.getWorldPosition(worldOrigin.position);
    else {
      origin.position.set(offset[0], offset[1], offset[2]);
      origin.getWorldPosition(worldOrigin.position);
    }
    return pool.emit(worldOrigin.position.x, worldOrigin.position.y, worldOrigin.position.z);
  }

  return {
    group,
    emit,
    setEmitting: (emitting) => pool.setEmitting(emitting),
    update(dt) {
      pool.update(dt);
      for (let i = 0; i < meshes.length; i += 1) {
        const slot = pool.slot(i);
        const mesh = meshes[i];
        if (!mesh) continue;
        mesh.visible = slot.active;
        if (!slot.active) continue;
        mesh.position.set(slot.x, slot.y, slot.z);
        mesh.scale.setScalar(slot.scale);
        const meshMaterial = mesh.material;
        if (meshMaterial instanceof MeshBasicMaterial) meshMaterial.opacity = slot.opacity;
        mesh.lookAt(camera.position);
      }
    },
    dispose() {
      model.remove(origin);
      group.remove(worldOrigin);
      geometry.dispose();
      material.dispose();
    },
  };
}
