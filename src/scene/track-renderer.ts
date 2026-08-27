import type { Object3D, Scene } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PIECE_TYPES, type PieceType } from '../core/pieces';
import { type Cell, MEADOW_CELLS, type PlacedPiece } from '../core/track-graph';
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
}

/** Renders one cloned model per placed piece, kept in sync with the store. */
export function startTrackRenderer(scene: Scene, world: WorldStore): TrackRenderer {
  const templates = new Map<PieceType, Object3D>();
  const rendered = new Map<string, Object3D>();
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
    model.position.set(x, 0, z);
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

  for (const type of PIECE_TYPES) {
    loader.load(
      PIECE_URLS[type],
      (gltf) => {
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
    dispose(): void {
      unsubscribe();
      for (const model of rendered.values()) scene.remove(model);
      rendered.clear();
      for (const template of templates.values()) disposeObject(template);
      templates.clear();
    },
  };
}
