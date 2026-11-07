/**
 * Raycast picking: the ground-plane hit test, the cell under a screen point,
 * the placed item tracked on that cell, and the screen projection of a cell.
 * The hit test reads placement's live `tracked`/`rendered` maps through the
 * placement handle; the projection is the frozen
 * `cellToScreen(cell, camera, canvas)` the scene handle and the e2e probes use.
 */
import { type PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from 'three';
import { CELL_SIZE, cellToWorld, type PickedItem } from '../core/meadow-grid';
import { type Cell, MEADOW_CELLS } from '../core/track-graph';
import { GROUND_SIZE } from './ground';
import { isPiece } from './track-catalog';
import type { TrackPlacement } from './track-placement';

/** Screen-space center of a meadow cell, or null when it is off-camera. */
export function cellToScreen(
  cell: Cell,
  camera: PerspectiveCamera,
  canvas: HTMLCanvasElement,
): { x: number; y: number } | null {
  // The projection depends on fresh camera matrices, which the render loop
  // does not refresh when the camera is not a scene child — ask first.
  camera.updateMatrixWorld();
  const { x, z } = cellToWorld(cell);
  const ndc = new Vector3(x, 0, z).project(camera);
  // The meadow sits near this camera's far plane, so its NDC z hovers around
  // 1 — only a non-finite projection, or a point outside the view frustum,
  // means the cell is not usable on screen.
  if (
    !Number.isFinite(ndc.x) ||
    !Number.isFinite(ndc.y) ||
    ndc.x < -1.2 ||
    ndc.x > 1.2 ||
    ndc.y < -1.2 ||
    ndc.y > 1.2
  ) {
    return null;
  }
  return {
    x: ((ndc.x + 1) / 2) * canvas.clientWidth,
    y: ((1 - ndc.y) / 2) * canvas.clientHeight,
  };
}

/** The ground hit test and the cell projection, owned by one module. */
export interface TrackPicking {
  /** The meadow cell under a screen point, or null off-meadow. */
  cellFromPoint(clientX: number, clientY: number): Cell | null;
  /** The screen-space center of a meadow cell, or null when off-camera. */
  cellToScreen(cell: Cell): { x: number; y: number } | null;
  /** The placed meadow item whose cell is under a screen point, for relocate/return drags. */
  pickPiece(clientX: number, clientY: number): PickedItem | null;
}

/** Owns the raycaster, the ground plane and the pointer hit tests. */
export function startTrackPicking(
  camera: PerspectiveCamera,
  canvas: HTMLCanvasElement,
  placement: TrackPlacement,
): TrackPicking {
  const raycaster = new Raycaster();
  const pointerNdc = new Vector2();
  const groundPlane = new Plane(new Vector3(0, 1, 0), 0);
  const groundHit = new Vector3();

  /** The meadow cell under a screen point, or null off-meadow. */
  function cellFromPoint(clientX: number, clientY: number): Cell | null {
    const rect = canvas.getBoundingClientRect();
    pointerNdc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointerNdc, camera);
    const hit = raycaster.ray.intersectPlane(groundPlane, groundHit);
    if (!hit) return null;
    const x = Math.floor((hit.x + GROUND_SIZE / 2) / CELL_SIZE);
    const y = Math.floor((hit.z + GROUND_SIZE / 2) / CELL_SIZE);
    if (x < 0 || x >= MEADOW_CELLS || y < 0 || y >= MEADOW_CELLS) return null;
    return { x, y };
  }

  /**
   * The placed meadow item (piece or scenery) whose cell is under a screen
   * point. The store keeps at most one toy per cell, so the cell itself is
   * the tap target — far more forgiving for small fingers than raycasting
   * thin rail geometry.
   */
  function pickPiece(clientX: number, clientY: number): PickedItem | null {
    const cell = cellFromPoint(clientX, clientY);
    if (!cell) return null;
    for (const item of placement.tracked.values()) {
      if (item.cell.x === cell.x && item.cell.y === cell.y) {
        if (isPiece(item)) {
          return {
            kind: 'piece',
            id: item.id,
            type: item.type,
            rotation: item.rotation,
            cell: item.cell,
          };
        }
        return {
          kind: 'scenery',
          id: item.id,
          scenery: item.kind,
          rotation: item.rotation,
          cell: item.cell,
        };
      }
    }
    return null;
  }

  return {
    cellFromPoint,
    cellToScreen: (cell) => cellToScreen(cell, camera, canvas),
    pickPiece,
  };
}
