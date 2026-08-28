import {
  type Cell,
  inBounds,
  MAX_PIECES,
  type PieceType,
  type PlacedPiece,
  type Rotation,
} from '../core/track-graph';

/** Outcome of a world mutation the kid UI can show gently (dim, wobble, snap). */
export type PlacementResult = 'placed' | 'not-found' | 'out-of-bounds' | 'occupied' | 'capacity';

export type WorldListener = (pieces: readonly PlacedPiece[]) => void;

/**
 * The in-memory world: every track piece on the meadow plus the listeners the
 * UI (and, later, autosave) subscribes to. Persistence arrives with its own
 * track — until then the world lives exactly as long as the page does.
 */
export interface WorldStore {
  /** The pieces currently on the meadow, in placement order. */
  pieces(): readonly PlacedPiece[];
  place(type: PieceType, cell: Cell, rotation: Rotation): PlacementResult;
  relocate(id: string, cell: Cell, rotation: Rotation): PlacementResult;
  /** Returns a piece to the toybox drawer. Unknown ids are ignored. */
  remove(id: string): void;
  subscribe(listener: WorldListener): () => void;
}

export function createWorldStore(): WorldStore {
  const placed: PlacedPiece[] = [];
  const listeners = new Set<WorldListener>();
  let nextId = 1;

  const notify = () => {
    for (const listener of listeners) listener(placed);
  };

  const holderOf = (cell: Cell) => placed.find((p) => p.cell.x === cell.x && p.cell.y === cell.y);

  return {
    /** A defensive copy — callers can never mutate the store's array. */
    pieces: () => placed.slice(),

    place(type, cell, rotation) {
      if (!inBounds(cell)) return 'out-of-bounds';
      if (holderOf(cell)) return 'occupied';
      if (placed.length >= MAX_PIECES) return 'capacity';
      placed.push({ id: `piece-${nextId++}`, type, cell, rotation });
      notify();
      return 'placed';
    },

    relocate(id, cell, rotation) {
      const piece = placed.find((p) => p.id === id);
      if (!piece) return 'not-found';
      if (!inBounds(cell)) return 'out-of-bounds';
      const holder = holderOf(cell);
      if (holder && holder !== piece) return 'occupied';
      piece.cell = { x: cell.x, y: cell.y };
      piece.rotation = rotation;
      notify();
      return 'placed';
    },

    remove(id) {
      const index = placed.findIndex((p) => p.id === id);
      if (index === -1) return;
      placed.splice(index, 1);
      notify();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
