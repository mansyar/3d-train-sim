import type { SceneryKind } from './scenery';
import { type Cell, MEADOW_CELLS, type PieceType, type Rotation } from './track-graph';

/** The "table surface" the toy world sits on — soft play-mat green. */
export const GROUND_SIZE = 60;

/** One meadow cell in world units (the mat split into the grid). */
export const CELL_SIZE = GROUND_SIZE / MEADOW_CELLS;

/** The world-space center of a meadow cell (grid north is -Z). */
export function cellToWorld(cell: Cell): { x: number; z: number } {
  return {
    x: -GROUND_SIZE / 2 + (cell.x + 0.5) * CELL_SIZE,
    z: -GROUND_SIZE / 2 + (cell.y + 0.5) * CELL_SIZE,
  };
}

/** A placed track piece or scenery toy found under the pointer, for
 * relocate/remove drags. The kind discriminator tells the UI which store
 * mutation to apply on drop. */
export type PickedItem =
  | { kind: 'piece'; id: string; type: PieceType; rotation: Rotation; cell: Cell }
  | { kind: 'scenery'; id: string; scenery: SceneryKind; rotation: Rotation; cell: Cell };
