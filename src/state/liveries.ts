import type { PersistedLiveries } from '../core/save';
import type { TrainKind } from '../core/trains';
import type { WagonSlot } from '../core/wagons';

/** The six chunky paints, chosen once here so drawer and scene share one set. */
export const PAINT_IDS = ['cherry', 'tangerine', 'sunshine', 'clover', 'sky', 'grape'] as const;
export type PaintId = (typeof PAINT_IDS)[number];

export interface PaintSwatch {
  id: PaintId;
  hex: string;
  aria: string;
}

export const PAINT_SWATCHES = [
  { id: 'cherry', hex: '#e8553f', aria: 'Cherry red' },
  { id: 'tangerine', hex: '#f49b32', aria: 'Tangerine orange' },
  { id: 'sunshine', hex: '#f5cf3f', aria: 'Sunshine yellow' },
  { id: 'clover', hex: '#59b45a', aria: 'Clover green' },
  { id: 'sky', hex: '#3f9bd8', aria: 'Sky blue' },
  { id: 'grape', hex: '#9b6bd6', aria: 'Grape purple' },
] as const satisfies readonly PaintSwatch[];

/** Four sticker shapes — one per tap, oldest first, newest kept when full. */
export const STICKER_IDS = ['star', 'heart', 'flower', 'bolt'] as const;
export type StickerId = (typeof STICKER_IDS)[number];

/** Two anchors per side; the cap falls out of the number of anchors. */
export const STICKER_ANCHORS = ['left-front', 'left-rear', 'right-front', 'right-rear'] as const;
export type StickerAnchor = (typeof STICKER_ANCHORS)[number];
export const MAX_STICKERS = STICKER_ANCHORS.length;

export type VehicleId = string;

export function locoVehicleId(kind: TrainKind): VehicleId {
  return `${kind}:loco`;
}

export function wagonVehicleId(kind: TrainKind, slot: WagonSlot): VehicleId {
  return `${kind}:${slot}`;
}

export type PaintChoice = PaintId | null;
/** Factory paint: no paint key in the snapshot, no material override in the scene. */
export const STOCK_PAINT: PaintChoice = null;

export interface VehicleLivery {
  paint: PaintChoice;
  /** Oldest-first; the first stamp is evicted when a fifth arrives. */
  stickers: StickerId[];
}

export function stockLivery(): VehicleLivery {
  return { paint: STOCK_PAINT, stickers: [] };
}

export type LiveryListener = (id: VehicleId, livery: VehicleLivery) => void;

export interface LiveryStore {
  liveryFor(id: VehicleId): VehicleLivery;
  liveries(): Record<string, VehicleLivery>;
  setPaint(id: VehicleId, paint: PaintChoice): void;
  stamp(id: VehicleId, sticker: StickerId): void;
  restoreDefault(id: VehicleId): void;
  hydrate(persisted: PersistedLiveries): void;
  snapshot(): PersistedLiveries;
  reset(): void;
  subscribe(listener: LiveryListener): () => void;
}

function isPaintId(value: unknown): value is PaintId {
  return typeof value === 'string' && (PAINT_IDS as readonly string[]).includes(value);
}

function isStickerId(value: unknown): value is StickerId {
  return typeof value === 'string' && (STICKER_IDS as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Prototype keys never become vehicle ids, even in a hand-edited save. */
function safeId(id: string): boolean {
  return id !== '__proto__' && id !== 'constructor' && id !== 'prototype';
}

function copy(livery: VehicleLivery): VehicleLivery {
  return { paint: livery.paint, stickers: [...livery.stickers] };
}

function isStock(livery: VehicleLivery): boolean {
  return livery.paint === STOCK_PAINT && livery.stickers.length === 0;
}

/**
 * Pure per-vehicle livery state. No DOM, no three.js, no Howler — the drawer,
 * scene, and persistence watchers subscribe and translate changes themselves.
 */
export function createLiveryStore(): LiveryStore {
  const entries = new Map<VehicleId, VehicleLivery>();
  const listeners = new Set<LiveryListener>();

  function notify(id: VehicleId, livery: VehicleLivery): void {
    for (const listener of listeners) listener(id, copy(livery));
  }

  function ensure(id: VehicleId): VehicleLivery {
    let livery = entries.get(id);
    if (!livery) {
      livery = stockLivery();
      entries.set(id, livery);
    }
    return livery;
  }

  function prune(id: VehicleId, livery: VehicleLivery): void {
    if (isStock(livery)) entries.delete(id);
  }

  return {
    liveryFor(id) {
      const livery = entries.get(id);
      return livery ? copy(livery) : stockLivery();
    },

    liveries() {
      const all: Record<string, VehicleLivery> = {};
      for (const [id, livery] of entries) all[id] = copy(livery);
      return all;
    },

    setPaint(id, paint) {
      if (!safeId(id) || (paint !== null && !isPaintId(paint))) return;
      const livery = ensure(id);
      livery.paint = paint;
      prune(id, livery);
      notify(id, livery);
    },

    stamp(id, sticker) {
      if (!safeId(id) || !isStickerId(sticker)) return;
      const livery = ensure(id);
      livery.stickers = [...livery.stickers, sticker].slice(-MAX_STICKERS);
      notify(id, livery);
    },

    restoreDefault(id) {
      if (!safeId(id)) return;
      entries.delete(id);
      notify(id, stockLivery());
    },

    hydrate(persisted) {
      entries.clear();
      for (const [id, raw] of Object.entries(persisted ?? {})) {
        if (!safeId(id) || !isRecord(raw)) continue;
        // A present-but-unknown paint means a newer build wrote it; drop the
        // whole entry rather than half-restore a vehicle the child won't recognise.
        if (raw.paint !== undefined && raw.paint !== null && !isPaintId(raw.paint)) continue;
        const paint = isPaintId(raw.paint) ? raw.paint : null;
        const stickers = Array.isArray(raw.stickers)
          ? raw.stickers.filter(isStickerId).slice(-MAX_STICKERS)
          : [];
        if (paint === null && stickers.length === 0) continue;
        const livery = { paint, stickers };
        entries.set(id, livery);
        notify(id, livery);
      }
    },

    snapshot() {
      const persisted: PersistedLiveries = {};
      for (const [id, livery] of entries) {
        if (isStock(livery)) continue;
        persisted[id] = {
          ...(livery.paint !== null ? { paint: livery.paint } : {}),
          ...(livery.stickers.length > 0 ? { stickers: [...livery.stickers] } : {}),
        };
      }
      return persisted;
    },

    reset() {
      entries.clear();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
