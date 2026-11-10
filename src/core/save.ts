import { MAX_DELIVERED_CRATES } from './cargo';
import { DAY_PHASES, type DayPhase, DEFAULT_DAY_PHASE } from './day-clock';
import type { DisclosureState } from './disclosure';
import { PIECE_TYPES } from './pieces';
import { isWater } from './river';
import { type PlacedScenery, SCENERY_KINDS, type SceneryKind } from './scenery';
import {
  MAX_PIECES,
  MEADOW_CELLS,
  type PieceType,
  type PlacedPiece,
  type Rotation,
} from './track-graph';
import { TRAIN_KINDS, type TrainKind } from './trains';
import {
  DEFAULT_WAGON_PRESET,
  defaultConsist,
  resolveWagonPreset,
  type TrainConsist,
  type WagonPreset,
} from './wagons';

const SNAPSHOT_VERSION = 3;

/** Snapshot versions this build understands: current, pre-tunnel v2, pre-river v1. */
const SUPPORTED_VERSIONS: readonly number[] = [1, 2, 3];

export interface DevicePreferences {
  muted: boolean;
  /**
   * The day phase the child last chose with the sun/moon button. Absent for
   * older snapshots, which simply start at the default mid-morning.
   */
  dayPhase?: DayPhase;
}

export interface WorldSnapshot {
  version: typeof SNAPSHOT_VERSION;
  pieces: PlacedPiece[];
  scenery: PlacedScenery[];
  train?: TrainKind;
  preferences?: DevicePreferences;
  deliveries?: Record<string, number>;
  /** Per-train wagon presets; omitted when every train pulls classic. */
  consist?: Partial<Record<TrainKind, WagonPreset>>;
  /**
   * Progressive-disclosure progress: the completed-ride count plus the unlock
   * flag. Omitted for fresh-locked worlds, which read back identically.
   * Parsed outside `parseWorldSnapshot` (like `preferences`), so the
   * salvage rules below never see it.
   */
  disclosure?: DisclosureState;
}

export interface WorldData {
  pieces: PlacedPiece[];
  scenery: PlacedScenery[];
  train: TrainKind;
  /** Delivered-crate counts, keyed by the station scenery's id. */
  deliveries: Record<string, number>;
  /** The wagon preset pair each locomotive pulls. */
  consist: TrainConsist;
}

export function serializeWorld(
  pieces: readonly PlacedPiece[],
  scenery: readonly PlacedScenery[],
  train: TrainKind = 'steam',
  muted = false,
  deliveries: Record<string, number> = {},
  consist: TrainConsist = defaultConsist(),
  dayPhase?: DayPhase,
  disclosure?: DisclosureState,
): WorldSnapshot {
  const snapshot: WorldSnapshot = {
    version: SNAPSHOT_VERSION,
    pieces: pieces.map((piece) => ({
      id: piece.id,
      type: piece.type,
      cell: { x: piece.cell.x, y: piece.cell.y },
      rotation: piece.rotation,
    })),
    scenery: scenery.map((item) => ({
      id: item.id,
      kind: item.kind,
      cell: { x: item.cell.x, y: item.cell.y },
      rotation: item.rotation,
    })),
    train,
  };
  // Sound-on is the default and mid-morning is where every day starts, so
  // both are omitted to keep snapshots minimal.
  const chosen = dayPhase && dayPhase !== DEFAULT_DAY_PHASE ? dayPhase : undefined;
  if (muted || chosen) {
    snapshot.preferences = { muted, ...(chosen ? { dayPhase: chosen } : {}) };
  }
  // Same for an empty delivery ledger.
  if (Object.keys(deliveries).length > 0) snapshot.deliveries = { ...deliveries };
  // Same for an all-classic consist — the default needs no storage.
  if (!isClassicConsist(consist)) snapshot.consist = { ...consist };
  // Same for a fresh lock — zero rides and no unlock read back identically.
  if (disclosure && (disclosure.completedRides > 0 || disclosure.unlocked)) {
    snapshot.disclosure = { ...disclosure };
  }
  return snapshot;
}

export type SnapshotStatus = 'clean' | 'salvaged' | 'unreadable';

export interface WorldParseResult {
  world: WorldData;
  status: SnapshotStatus;
  droppedPieces: number;
  droppedScenery: number;
  droppedDuplicates: number;
}

/**
 * Reads a snapshot forgivingly: every entry is validated on its own, the first
 * claimant of a cell (pieces before scenery) and the first piece per id win,
 * and the shared capacity keeps the first `MAX_PIECES` valid entries. Only a
 * structurally unreadable payload — not a record, an unknown version, or
 * non-array `pieces`/`scenery` — yields status `unreadable`; everything
 * narrower is salvaged. A lost toy is a pity — a lost world is a tragedy.
 */
export function parseWorldSnapshot(value: unknown): WorldParseResult {
  if (!isRecord(value)) return unreadableSnapshot();
  const version = value.version;
  if (typeof version !== 'number' || !SUPPORTED_VERSIONS.includes(version)) {
    return unreadableSnapshot();
  }
  if (!Array.isArray(value.pieces) || !Array.isArray(value.scenery)) {
    return unreadableSnapshot();
  }

  const rawPieces: unknown[] = value.pieces;
  const rawScenery: unknown[] = value.scenery;
  const legacy = version === 1;
  const claimedCells = new Set<string>();
  const claimedIds = new Set<string>();
  const pieces: PlacedPiece[] = [];
  const scenery: PlacedScenery[] = [];
  let droppedPieces = 0;
  let droppedScenery = 0;
  let droppedDuplicates = 0;

  for (const raw of rawPieces) {
    const piece = parsePiece(raw);
    if (!piece) {
      droppedPieces += 1;
      continue;
    }
    const migrated = legacy ? migratePieceToV2(piece) : piece;
    const cell = cellKey(migrated.cell);
    // Duplicates are identified before capacity so an overflow entry that
    // merely repeats an accepted cell is reported as the duplicate it is.
    if (claimedIds.has(migrated.id) || claimedCells.has(cell)) {
      droppedDuplicates += 1;
      continue;
    }
    if (pieces.length + scenery.length >= MAX_PIECES) {
      droppedPieces += 1;
      continue;
    }
    claimedIds.add(migrated.id);
    claimedCells.add(cell);
    pieces.push(migrated);
  }

  // Unknown scenery kinds (e.g. from a newer version) drop back to the
  // drawer; everything else restores exactly as it was.
  for (const raw of rawScenery) {
    const item = parseScenery(raw);
    if (!item) {
      droppedScenery += 1;
      continue;
    }
    const cell = cellKey(item.cell);
    if (claimedCells.has(cell)) {
      droppedDuplicates += 1;
      continue;
    }
    if (pieces.length + scenery.length >= MAX_PIECES) {
      droppedScenery += 1;
      continue;
    }
    claimedCells.add(cell);
    scenery.push(item);
  }

  const dropped = droppedPieces + droppedScenery + droppedDuplicates;
  return {
    world: {
      pieces,
      scenery,
      train: isTrainKind(value.train) ? value.train : 'steam',
      deliveries: parseDeliveries(value.deliveries),
      consist: parseConsist(value.consist),
    },
    status: dropped > 0 ? 'salvaged' : 'clean',
    droppedPieces,
    droppedScenery,
    droppedDuplicates,
  };
}

/** World-only view of a snapshot; the recovery-aware caller wants the rest. */
export function deserializeWorld(value: unknown): WorldData {
  return parseWorldSnapshot(value).world;
}

/**
 * Delivered-crate counts keyed by station id. Additive data, so it is read
 * forgivingly: a malformed entry is dropped (a lost count is a pity — a lost
 * world is a tragedy), counts are clamped to the platform's cap, and zero or
 * missing counts mean an empty ledger.
 */
function parseDeliveries(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  const deliveries: Record<string, number> = {};
  for (const [id, count] of Object.entries(value)) {
    if (id === '__proto__' || id === 'constructor') continue;
    if (typeof count !== 'number' || !Number.isInteger(count) || count <= 0) continue;
    deliveries[id] = Math.min(count, MAX_DELIVERED_CRATES);
  }
  return deliveries;
}

/**
 * Per-train wagon presets. Additive data, so it is read forgivingly: only
 * the known locomotives are read (extra keys from hand-edited saves are
 * ignored, so `__proto__` can never sneak in), unknown presets fall back to
 * classic, and anything missing or malformed means an all-classic consist.
 */
function parseConsist(value: unknown): TrainConsist {
  const consist = defaultConsist();
  if (!isRecord(value)) return consist;
  for (const kind of TRAIN_KINDS) {
    consist[kind] = resolveWagonPreset(value[kind]);
  }
  return consist;
}

/** True when every locomotive pulls the default classic pair. */
function isClassicConsist(consist: TrainConsist): boolean {
  for (const kind of TRAIN_KINDS) {
    if (consist[kind] !== DEFAULT_WAGON_PRESET) return false;
  }
  return true;
}

/**
 * Resolves the device preferences of a snapshot. Anything missing or invalid
 * falls back to the sound-on default; this never throws into the app.
 */
export function deserializePreferences(value: unknown): DevicePreferences {
  if (!isRecord(value)) return { muted: false };
  const preferences = value.preferences;
  if (!isRecord(preferences)) return { muted: false };
  const muted = typeof preferences.muted === 'boolean' ? preferences.muted : false;
  // A phase the child never chose, or one this build does not know, is simply
  // dropped — the day then starts at its default mid-morning.
  const dayPhase = parseDayPhase(preferences.dayPhase);
  return dayPhase ? { muted, dayPhase } : { muted };
}

function parseDayPhase(value: unknown): DayPhase | undefined {
  return typeof value === 'string' && (DAY_PHASES as readonly string[]).includes(value)
    ? (value as DayPhase)
    : undefined;
}

/**
 * v1 → v2 migration: the river arrived after v1, so any straight or corner
 * standing where water now flows re-renders as a trestle bridge — same id,
 * cell, and rotation, nothing dropped. The kid's built world survives the
 * new terrain; the bridge simply appears where the track crossed.
 */
function migratePieceToV2(piece: PlacedPiece): PlacedPiece {
  if ((piece.type === 'straight' || piece.type === 'corner') && isWater(piece.cell)) {
    return { ...piece, type: 'bridge' };
  }
  return piece;
}

function parsePiece(value: unknown): PlacedPiece | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || !isPieceType(value.type)) return null;
  const cell = parseCell(value.cell);
  const rotation = parseRotation(value.rotation);
  if (!cell || rotation === null) return null;
  return { id: value.id, type: value.type, cell, rotation };
}

function parseScenery(value: unknown): PlacedScenery | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || !isSceneryKind(value.kind)) return null;
  const cell = parseCell(value.cell);
  const rotation = parseRotation(value.rotation);
  if (!cell || rotation === null) return null;
  return { id: value.id, kind: value.kind, cell, rotation };
}

function parseCell(value: unknown): { x: number; y: number } | null {
  if (!isRecord(value) || typeof value.x !== 'number' || typeof value.y !== 'number') return null;
  if (!Number.isInteger(value.x) || !Number.isInteger(value.y)) return null;
  if (value.x < 0 || value.x >= MEADOW_CELLS || value.y < 0 || value.y >= MEADOW_CELLS) {
    return null;
  }
  return { x: value.x, y: value.y };
}

function parseRotation(value: unknown): Rotation | null {
  return value === 0 || value === 90 || value === 180 || value === 270 ? value : null;
}

function isPieceType(value: unknown): value is PieceType {
  return typeof value === 'string' && (PIECE_TYPES as readonly string[]).includes(value);
}

function isSceneryKind(value: unknown): value is SceneryKind {
  return typeof value === 'string' && (SCENERY_KINDS as readonly string[]).includes(value);
}

function isTrainKind(value: unknown): value is TrainKind {
  return typeof value === 'string' && (TRAIN_KINDS as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function emptyWorld(): WorldData {
  return { pieces: [], scenery: [], train: 'steam', deliveries: {}, consist: defaultConsist() };
}

function unreadableSnapshot(): WorldParseResult {
  return {
    world: emptyWorld(),
    status: 'unreadable',
    droppedPieces: 0,
    droppedScenery: 0,
    droppedDuplicates: 0,
  };
}

function cellKey(cell: { x: number; y: number }): string {
  return `${cell.x},${cell.y}`;
}
