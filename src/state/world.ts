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
import {
  DEFAULT_WAGON_PRESET,
  defaultConsist,
  isWagonPreset,
  resolveWagonPreset,
  type TrainConsist,
  type WagonPreset,
} from '../core/wagons';

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
  /** The wagon preset pair each locomotive pulls (a defensive copy). */
  consist(): TrainConsist;
  /** One train's wagon preset. */
  consistFor(train: TrainKind): WagonPreset;
  /** Switches one train's wagons; invalid presets fall back to classic. */
  selectConsist(train: TrainKind, preset: unknown): boolean;
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
  /** Whether the last toybox change can be taken back. */
  canUndo(): boolean;
  /** Reverses the last undoable change; false when there is nothing to undo. */
  undo(): boolean;
  /** Delivered-crate count for one station (0 for unknown ids). */
  deliveryCount(stationId: string): number;
  /** Records one delivery to a station; returns its new, capped count. */
  deliverCrate(stationId: string): number;
  /** A defensive copy of the delivery ledger — station id → crate count. */
  deliveries(): Record<string, number>;
  hydrate(data: WorldData): void;
  /** Replaces the whole meadow with a preset world as ONE undoable change. */
  applyPreset(data: WorldData): void;
  /** Returns the meadow to a factory-fresh world: empty, steam selected. */
  reset(): void;
  subscribe(listener: WorldListener): () => void;
}

/**
 * Reads a consist forgivingly: every locomotive resolves to a curated
 * preset, so hand-built or older worlds always yield a total mapping.
 */
function readConsist(value: TrainConsist | undefined): TrainConsist {
  return {
    steam: resolveWagonPreset(value?.steam),
    diesel: resolveWagonPreset(value?.diesel),
    tram: resolveWagonPreset(value?.tram),
  };
}

export function createWorldStore(): WorldStore {
  const placed: PlacedPiece[] = [];
  const scenery: PlacedScenery[] = [];
  let deliveries: Record<string, number> = {};
  let selectedTrain: TrainKind = 'steam';
  let consist: TrainConsist = defaultConsist();
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

  // Single-step undo: every successful toybox mutation replaces the pending
  // inverse. Inverses only move toys — they never touch the delivery ledger —
  // so undoing a placement cannot destroy crates earned after it.
  let pendingUndo: (() => void) | null = null;

  const takePiece = (id: string) => {
    const index = placed.findIndex((p) => p.id === id);
    if (index === -1) return undefined;
    const taken = placed.splice(index, 1)[0];
    if (!taken) return undefined;
    return { piece: { ...taken, cell: { ...taken.cell } }, index };
  };

  const takeScenery = (id: string) => {
    const index = scenery.findIndex((s) => s.id === id);
    if (index === -1) return undefined;
    const taken = scenery.splice(index, 1)[0];
    if (!taken) return undefined;
    return { item: { ...taken, cell: { ...taken.cell } }, index };
  };

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
    consist: () => ({ ...consist }),

    consistFor: (train) => resolveWagonPreset(consist[train]),

    selectConsist(train, preset) {
      if (!isWagonPreset(preset)) {
        consist = { ...consist, [train]: DEFAULT_WAGON_PRESET };
        return false;
      }
      if (preset === consist[train]) return true;
      consist = { ...consist, [train]: preset };
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
      const id = `piece-${nextId++}`;
      placed.push({ id, type, cell: { ...cell }, rotation });
      pendingUndo = () => {
        takePiece(id);
      };
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
      const from = { ...piece.cell };
      const fromRotation = piece.rotation;
      piece.cell = { x: cell.x, y: cell.y };
      piece.rotation = rotation;
      pendingUndo = () => {
        const back = placed.find((p) => p.id === id);
        if (!back) return;
        back.cell = from;
        back.rotation = fromRotation;
      };
      notify();
      return 'placed';
    },

    remove(id) {
      const taken = takePiece(id);
      if (!taken) return;
      pendingUndo = () => {
        placed.splice(Math.min(taken.index, placed.length), 0, taken.piece);
      };
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
      const id = `scenery-${nextId++}`;
      scenery.push({ id, kind, cell: { ...cell }, rotation });
      pendingUndo = () => {
        takeScenery(id);
      };
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
      const from = { ...item.cell };
      const fromRotation = item.rotation;
      item.cell = { x: cell.x, y: cell.y };
      item.rotation = rotation;
      pendingUndo = () => {
        const back = scenery.find((s) => s.id === id);
        if (!back) return;
        back.cell = from;
        back.rotation = fromRotation;
      };
      notify();
      return 'placed';
    },

    removeScenery(id) {
      const taken = takeScenery(id);
      if (!taken) return;
      const crates = deliveries[id];
      delete deliveries[id];
      pendingUndo = () => {
        scenery.splice(Math.min(taken.index, scenery.length), 0, taken.item);
        if (crates !== undefined) deliveries[id] = crates;
      };
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
      consist = readConsist(data.consist);
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
      pendingUndo = null;
      notify();
    },

    reset() {
      // A factory-fresh meadow, delivered as ONE mutation: rides stop gently
      // through the usual world subscription, and persistence saves exactly
      // once — no per-item teardown cascades.
      selectedTrain = 'steam';
      consist = defaultConsist();
      placed.splice(0, placed.length);
      scenery.splice(0, scenery.length);
      deliveries = {};
      nextId = 1;
      pendingUndo = null;
      notify();
    },

    applyPreset(data) {
      // A starter-gallery pick lands as ONE mutation: the prior build is
      // snapshotted (pieces, scenery, train, deliveries) so a single undo
      // restores it exactly, replacing any in-progress edit undo.
      const copyPieces = (list: PlacedPiece[]) =>
        list.map((piece) => ({ ...piece, cell: { ...piece.cell } }));
      const copyScenery = (list: PlacedScenery[]) =>
        list.map((item) => ({ ...item, cell: { ...item.cell } }));
      const priorPieces = copyPieces(placed);
      const priorScenery = copyScenery(scenery);
      const priorDeliveries = { ...deliveries };
      const priorTrain = selectedTrain;
      const priorConsist = { ...consist };
      const priorNextId = nextId;
      selectedTrain = data.train;
      deliveries = { ...(data.deliveries ?? {}) };
      consist = readConsist(data.consist);
      placed.splice(0, placed.length, ...copyPieces(data.pieces));
      scenery.splice(0, scenery.length, ...copyScenery(data.scenery));
      nextId = 1;
      for (const piece of placed) advanceId(piece.id);
      for (const item of scenery) advanceId(item.id);
      pendingUndo = () => {
        selectedTrain = priorTrain;
        deliveries = { ...priorDeliveries };
        consist = { ...priorConsist };
        placed.splice(0, placed.length, ...copyPieces(priorPieces));
        scenery.splice(0, scenery.length, ...copyScenery(priorScenery));
        nextId = priorNextId;
      };
      notify();
    },

    canUndo: () => pendingUndo !== null,

    undo() {
      const reverse = pendingUndo;
      if (!reverse) return false;
      pendingUndo = null;
      reverse();
      notify();
      return true;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
