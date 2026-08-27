import {
  Box3,
  Color,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  type Scene,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PIECE_TYPES, type PieceType } from '../core/pieces';
import { type Cell, MEADOW_CELLS, type PlacedPiece, type Rotation } from '../core/track-graph';
import type { WorldStore } from '../state/world';
import { disposeObject } from './dispose-object';
import { GROUND_SIZE } from './ground';

const CELL_SIZE = GROUND_SIZE / MEADOW_CELLS;

const PIECE_URLS: Record<PieceType, string> = {
  straight: '/assets/train-kit/railroad-straight.glb',
  corner: '/assets/train-kit/railroad-corner-small.glb',
};

/**
 * Extra yaw per type aligning each Kenney model's default facing with the
 * compass endpoints the track graph computes. Tuned against the rendered
 * world during the Phase 5 walkthrough.
 */
const BASE_YAW: Record<PieceType, number> = { straight: 0, corner: 0 };

/** The world-space center of a meadow cell (grid north is -Z). */
export function cellToWorld(cell: Cell): { x: number; z: number } {
  return {
    x: -GROUND_SIZE / 2 + (cell.x + 0.5) * CELL_SIZE,
    z: -GROUND_SIZE / 2 + (cell.y + 0.5) * CELL_SIZE,
  };
}

export interface TrackRenderer {
  dispose(): void;
  /** Begin a drag preview: the real model follows the pointer, grid-snapped. */
  beginGhost(type: PieceType): void;
  /** Snap the ghost to a cell (null hides it off-meadow); tint by validity. */
  moveGhost(cell: Cell | null, rotation: Rotation, valid: boolean): void;
  /** Drop the preview ghost and release its per-drag materials. */
  endGhost(): void;
}

/** Renders one cloned model per placed piece, kept in sync with the store. */
export function startTrackRenderer(scene: Scene, world: WorldStore): TrackRenderer {
  const templates = new Map<PieceType, Object3D>();
  const rendered = new Map<string, Object3D>();
  /** Vertical lift per type: kit models are authored below the mat. */
  const lift = new Map<PieceType, number>();
  const loader = new GLTFLoader();

  function apply(piece: PlacedPiece): void {
    const template = templates.get(piece.type);
    if (!template) return; // Asset not ready (or unavailable) — piece stays tracked.
    const yaw = -(piece.rotation * Math.PI) / 180 + BASE_YAW[piece.type];
    const { x, z } = cellToWorld(piece.cell);
    let model = rendered.get(piece.id);
    if (!model) {
      model = template.clone(true);
      scene.add(model);
      rendered.set(piece.id, model);
    }
    model.position.set(x, lift.get(piece.type) ?? 0, z);
    model.rotation.y = yaw;
  }

  function reconcile(pieces: readonly PlacedPiece[]): void {
    const seen = new Set(pieces.map((piece) => piece.id));
    for (const [id, model] of rendered) {
      if (!seen.has(id)) {
        scene.remove(model); // Clones share template geometry — no GPU dispose here.
        rendered.delete(id);
      }
    }
    for (const piece of pieces) apply(piece);
  }

  const unsubscribe = world.subscribe(reconcile);

  // ---- Drag ghost: a translucent clone of the real template --------------
  let ghost: Object3D | null = null;
  let ghostType: PieceType | null = null;
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

  function beginGhost(type: PieceType): void {
    endGhost();
    ghostType = type;
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
    const yaw = -(rotation * Math.PI) / 180 + BASE_YAW[ghostType];
    const { x, z } = cellToWorld(cell);
    ghost.position.set(x, lift.get(ghostType) ?? 0, z);
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

  for (const type of PIECE_TYPES) {
    loader.load(
      PIECE_URLS[type],
      (gltf) => {
        const box = new Box3().setFromObject(gltf.scene);
        lift.set(type, -box.min.y); // Sit the kit model on the meadow, not under it.
        templates.set(type, gltf.scene);
        reconcile(world.pieces()); // Render pieces placed before the asset arrived.
      },
      undefined,
      () => {
        // Asset unavailable — the world keeps working, models stay absent.
      },
    );
  }

  return {
    beginGhost,
    moveGhost,
    endGhost,
    dispose(): void {
      unsubscribe();
      endGhost();
      for (const model of rendered.values()) scene.remove(model);
      rendered.clear();
      for (const template of templates.values()) disposeObject(template);
      templates.clear();
    },
  };
}
