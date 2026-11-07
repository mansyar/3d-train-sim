/**
 * The meadow snap-cell overlay and the drag preview ghost. Both are transient
 * view aids: neither touches the store, and the ghost clones out of
 * placement's live `templates` map at call time — an asset that has not
 * loaded yet simply yields no ghost, retried on the next pointer move.
 */
import {
  BufferGeometry,
  Color,
  Group,
  Line,
  LineBasicMaterial,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  type Scene,
  Vector3,
} from 'three';
import { CELL_SIZE, cellToWorld } from '../core/meadow-grid';
import type { PieceType } from '../core/pieces';
import type { SceneryKind } from '../core/scenery';
import { type Cell, MEADOW_CELLS, type Rotation } from '../core/track-graph';
import { GROUND_SIZE } from './ground';
import { disableShadows } from './shadows';
import { baseYawOf } from './track-catalog';

/** The grid toggle and the drag preview, owned by one module. */
export interface TrackGhost {
  /** Begin a drag preview: the real model follows the pointer, grid-snapped. */
  beginGhost(kind: PieceType | SceneryKind): void;
  /** Snap the ghost to a cell (null hides it off-meadow); tint by validity. */
  moveGhost(cell: Cell | null, rotation: Rotation, valid: boolean): void;
  /** Drop the preview ghost and release its per-drag materials. */
  endGhost(): void;
  /** Debug aid: show the meadow's snap-cell boundaries. */
  setGridVisible(visible: boolean): void;
  dispose(): void;
}

/** Owns the debug grid lines and the translucent drag ghost. */
export function startTrackGhost(
  scene: Scene,
  templates: ReadonlyMap<PieceType | SceneryKind, Object3D>,
): TrackGhost {
  // ---- Meadow grid: a debug overlay of the snap-cell boundaries -----------
  // One cell = CELL_SIZE world units starting at the meadow's north-west
  // corner, so the lines land exactly on the lattice pieces snap to.
  const gridLines = new Group();
  gridLines.visible = false;
  const gridMaterial = new LineBasicMaterial({
    color: 0x2d5a2d,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const gridGeometries: BufferGeometry[] = [];
  {
    const half = GROUND_SIZE / 2;
    for (let i = 0; i <= MEADOW_CELLS; i += 1) {
      const t = -half + i * CELL_SIZE;
      const westEast = new BufferGeometry().setFromPoints([
        new Vector3(-half, 0.05, t),
        new Vector3(half, 0.05, t),
      ]);
      const northSouth = new BufferGeometry().setFromPoints([
        new Vector3(t, 0.05, -half),
        new Vector3(t, 0.05, half),
      ]);
      gridGeometries.push(westEast, northSouth);
      gridLines.add(new Line(westEast, gridMaterial), new Line(northSouth, gridMaterial));
    }
  }
  scene.add(gridLines);

  // ---- Drag ghost: a translucent clone of the real template --------------
  let ghost: Object3D | null = null;
  let ghostType: PieceType | SceneryKind | null = null;
  const ghostTint = new Color();
  const TINT_VALID = new Color(1, 0.75, 0.35); // Warm amber glow while placeable.
  const TINT_BLOCKED = new Color(0.5, 0.5, 0.5); // Desaturated while blocked.

  const ghostMaterials = (model: Object3D): MeshStandardMaterial[] => {
    const found: MeshStandardMaterial[] = [];
    model.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) found.push(mat as MeshStandardMaterial);
    });
    return found;
  };

  const spawnGhost = (): void => {
    if (!ghostType) return;
    const template = templates.get(ghostType);
    if (!template) return; // Asset not loaded yet — retried on the next move.
    const model = template.clone(true);
    // Ghosts never cast or receive shadows — they are previews, not toys —
    // and clone(true) copies the shared template's casting flag.
    disableShadows(model);
    // Clone materials per ghost so tint/dispose never touch the shared
    // template materials (three.js clones share material references).
    model.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((mat) => mat.clone())
        : mesh.material.clone();
    });
    for (const mat of ghostMaterials(model)) {
      mat.transparent = true;
      mat.depthWrite = false;
      mat.userData.baseColor = mat.color.clone();
    }
    model.visible = false;
    scene.add(model);
    ghost = model;
  };

  const tintGhost = (valid: boolean): void => {
    if (!ghost) return;
    ghostTint.copy(valid ? TINT_VALID : TINT_BLOCKED);
    for (const mat of ghostMaterials(ghost)) {
      const base = mat.userData.baseColor as Color | undefined;
      if (base) mat.color.copy(base).multiply(ghostTint);
      mat.opacity = valid ? 0.8 : 0.35;
    }
  };

  function beginGhost(kind: PieceType | SceneryKind): void {
    endGhost();
    ghostType = kind;
    spawnGhost();
  }

  function moveGhost(cell: Cell | null, rotation: Rotation, valid: boolean): void {
    if (!ghostType) return;
    if (!ghost) spawnGhost();
    if (!ghost) return;
    if (!cell) {
      ghost.visible = false;
      return;
    }
    const yaw = -(rotation * Math.PI) / 180 + baseYawOf(ghostType);
    const { x, z } = cellToWorld(cell);
    ghost.position.set(x, 0, z);
    ghost.rotation.y = yaw;
    ghost.visible = true;
    tintGhost(valid);
  }

  function endGhost(): void {
    ghostType = null;
    if (!ghost) return;
    scene.remove(ghost);
    for (const mat of ghostMaterials(ghost)) mat.dispose(); // Clones share geometry.
    ghost = null;
  }

  function setGridVisible(visible: boolean): void {
    gridLines.visible = visible;
  }

  return {
    beginGhost,
    moveGhost,
    endGhost,
    setGridVisible,
    dispose(): void {
      endGhost();
      scene.remove(gridLines);
      for (const geometry of gridGeometries) geometry.dispose();
      gridMaterial.dispose();
    },
  };
}
