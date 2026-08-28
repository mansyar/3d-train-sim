import { type PlacedScenery } from '../core/scenery';
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
 * The in-memory world: every track piece and scenery toy on the meadow plus
 * the listeners the UI (and, later, autosave) subscribes to. Track and
 * scenery share one meadow: a cell holds at most one toy of either kind, and
 * the cap counts both. Persistence arrives with its own track — until then
 * the world lives exactly as long as the page does.
 */
export interface WorldStore {
  /** The pieces currently on the meadow, in placement order. */
  pieces(): readonly PlacedPiece[];
  place(type: PieceType, cell: Cell, rotation: Rotation): PlacementResult;
  relocate(id: string, cell: Cell, rotation: Rotation): PlacementResult;
  /** Returns a piece to the toybox drawer. Unknown ids are ignored. */
  remove(id: string): void;
  /** The scenery currently on the meadow, in placement order. */
  scenery(): readonly PlacedScenery[];
  placeScenery(kind: PlacedScenery['kind'], cell: Cell, rotation: Rotation): PlacementResult;
  relocateScenery(id: string, cell: Cell, rotation: Rotation): PlacementResult;
  /** Returns a scenery toy to the drawer. Unknown ids are ignored. */
  removeScenery(id: string): void;
  subscribe(listener: WorldListener): () => void;
}

export function createWorldStore(): WorldStore {
  const placed: PlacedPiece[] = [];
  const scenery: PlacedScenery[] = [];
  const listeners = new Set<WorldListener>();
  let nextId = 1;

  const notify = () => {
    for (const listener of listeners) listener(placed);
  };

  const holderOf = (cell: Cell) =>
    placed.find((p) => p.cell.x === cell.x && p.cell.y === cell.y) ??
    scenery.find((s) => s.cell.x === cell.x && s.cell.y === cell.y);

  const meadowCount = () => placed.length + scenery.length;

  return {
    /** A defensive copy — callers can never mutate the store's array. */
    pieces: () => placed.slice(),

    place(type, cell, rotation) {
      if (!inBounds(cell)) return 'out-of-bounds';
      if (holderOf(cell)) return 'occupied';
      if (meadowCount() >= MAX_PIECES) return 'capacity';
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

    /** A defensive copy — callers can never mutate the store's array. */
    scenery: () => scenery.slice(),

    placeScenery(kind, cell, rotation) {
      if (!inBounds(cell)) return 'out-of-bounds';
      if (holderOf(cell)) return 'occupied';
      if (meadowCount() >= MAX_PIECES) return 'capacity';
      scenery.push({ id: `scenery-${nextId++}`, kind, cell, rotation });
      notify();
      return 'placed';
    },

    relocateScenery(id, cell, rotation) {
      const item = scenery.find((s) => s.id === id);
      if (!item) return 'not-found';
      if (!inBounds(cell)) return 'out-of-bounds';
      const holder = holderOf(cell);
      if (holder && holder !== item) return 'occupied';
      item.cell = { x: cell.x, y: cell.y };
      item.rotation = rotation;
      notify();
      return 'placed';
    },

    removeScenery(id) {
      const index = scenery.findIndex((s) => s.id === id);
      if (index === -1) return;
      scenery.splice(index, 1);
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
