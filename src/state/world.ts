import { deliveredCountAfter } from '../core/cargo';
import { isWater } from '../core/river';
import type { WorldData } from '../core/save';
import type { PlacedScenery } from '../core/scenery';
import {
  type Cell,
  inBounds,
  MAX_PIECES,
  type PieceType,
  type PlacedPiece,
  type Rotation,
  terrainErrorFor,
} from '../core/track-graph';
import { TRAIN_KINDS, type TrainKind } from '../core/trains';

/** Outcome of a world mutation the kid UI can show gently (dim, wobble, snap). */
export type PlacementResult =
  | 'placed'
  | 'not-found'
  | 'out-of-bounds'
  | 'occupied'
  | 'capacity'
  | 'water';

export type WorldListener = (pieces: readonly PlacedPiece[]) => void;

/**
 * The in-memory world: every track piece and scenery toy on the meadow plus
 * the listeners the UI (and, later, autosave) subscribes to. Track and
 * scenery share one meadow: a cell holds at most one toy of either kind, and
 * the cap counts both. Persistence arrives with its own track — until then
 * the world lives exactly as long as the page does.
 */
export interface WorldStore {
  /** The currently selected locomotive. */
  train(): TrainKind;
  /** Selects a locomotive; invalid values fall back to steam. */
  selectTrain(kind: unknown): boolean;
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
  /** Delivered-crate count for one station (0 for unknown ids). */
  deliveryCount(stationId: string): number;
  /** Records one delivery to a station; returns its new, capped count. */
  deliverCrate(stationId: string): number;
  /** A defensive copy of the delivery ledger — station id → crate count. */
  deliveries(): Record<string, number>;
  hydrate(data: WorldData): void;
  /** Returns the meadow to a factory-fresh world: empty, steam selected. */
  reset(): void;
  subscribe(listener: WorldListener): () => void;
}

export function createWorldStore(): WorldStore {
  const placed: PlacedPiece[] = [];
  const scenery: PlacedScenery[] = [];
  let deliveries: Record<string, number> = {};
  let selectedTrain: TrainKind = 'steam';
  const listeners = new Set<WorldListener>();
  let nextId = 1;

  const advanceId = (id: string): void => {
    const match = /(?:piece|scenery)-(\d+)$/.exec(id);
    if (match?.[1]) nextId = Math.max(nextId, Number(match[1]) + 1);
  };

  const notify = () => {
    for (const listener of listeners) listener(placed);
  };

  const holderOf = (cell: Cell) =>
    placed.find((p) => p.cell.x === cell.x && p.cell.y === cell.y) ??
    scenery.find((s) => s.cell.x === cell.x && s.cell.y === cell.y);

  const meadowCount = () => placed.length + scenery.length;

  return {
    train: () => selectedTrain,

    selectTrain(kind) {
      if (!(TRAIN_KINDS as readonly unknown[]).includes(kind)) {
        selectedTrain = 'steam';
        return false;
      }
      const next = kind as TrainKind;
      if (next === selectedTrain) return true;
      selectedTrain = next;
      notify();
      return true;
    },

    /** A defensive copy — callers can never mutate the store's records. */
    pieces: () => placed.map((piece) => ({ ...piece, cell: { ...piece.cell } })),

    place(type, cell, rotation) {
      if (!inBounds(cell)) return 'out-of-bounds';
      if (holderOf(cell)) return 'occupied';
      if (terrainErrorFor(type, cell)) return 'water';
      if (meadowCount() >= MAX_PIECES) return 'capacity';
      placed.push({ id: `piece-${nextId++}`, type, cell: { ...cell }, rotation });
      notify();
      return 'placed';
    },

    relocate(id, cell, rotation) {
      const piece = placed.find((p) => p.id === id);
      if (!piece) return 'not-found';
      if (!inBounds(cell)) return 'out-of-bounds';
      const holder = holderOf(cell);
      if (holder && holder !== piece) return 'occupied';
      if (terrainErrorFor(piece.type, cell)) return 'water';
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

    /** A defensive copy — callers can never mutate the store's records. */
    scenery: () => scenery.map((item) => ({ ...item, cell: { ...item.cell } })),

    placeScenery(kind, cell, rotation) {
      if (!inBounds(cell)) return 'out-of-bounds';
      if (holderOf(cell)) return 'occupied';
      // Scenery is a land toy — the riverbed is no place for a tree.
      if (isWater(cell)) return 'water';
      if (meadowCount() >= MAX_PIECES) return 'capacity';
      scenery.push({ id: `scenery-${nextId++}`, kind, cell: { ...cell }, rotation });
      notify();
      return 'placed';
    },

    relocateScenery(id, cell, rotation) {
      const item = scenery.find((s) => s.id === id);
      if (!item) return 'not-found';
      if (!inBounds(cell)) return 'out-of-bounds';
      const holder = holderOf(cell);
      if (holder && holder !== item) return 'occupied';
      if (isWater(cell)) return 'water';
      item.cell = { x: cell.x, y: cell.y };
      item.rotation = rotation;
      notify();
      return 'placed';
    },

    removeScenery(id) {
      const index = scenery.findIndex((s) => s.id === id);
      if (index === -1) return;
      scenery.splice(index, 1);
      delete deliveries[id];
      notify();
    },

    /** A defensive copy — callers can never mutate the ledger. */
    deliveries: () => ({ ...deliveries }),

    deliveryCount: (stationId) => deliveries[stationId] ?? 0,

    deliverCrate(stationId) {
      const count = deliveredCountAfter(deliveries[stationId] ?? 0);
      deliveries[stationId] = count;
      notify();
      return count;
    },

    hydrate(data) {
      selectedTrain = data.train;
      deliveries = { ...(data.deliveries ?? {}) };
      placed.splice(
        0,
        placed.length,
        ...data.pieces.map((piece) => ({
          ...piece,
          cell: { ...piece.cell },
        })),
      );
      scenery.splice(
        0,
        scenery.length,
        ...data.scenery.map((item) => ({
          ...item,
          cell: { ...item.cell },
        })),
      );
      nextId = 1;
      for (const piece of placed) advanceId(piece.id);
      for (const item of scenery) advanceId(item.id);
      notify();
    },

    reset() {
      // A factory-fresh meadow, delivered as ONE mutation: rides stop gently
      // through the usual world subscription, and persistence saves exactly
      // once — no per-item teardown cascades.
      selectedTrain = 'steam';
      placed.splice(0, placed.length);
      scenery.splice(0, scenery.length);
      deliveries = {};
      nextId = 1;
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
