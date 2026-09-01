import { MAX_DELIVERED_CRATES } from './cargo';
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

const SNAPSHOT_VERSION = 3;

/** Snapshot versions this build understands: current, pre-tunnel v2, pre-river v1. */
const SUPPORTED_VERSIONS: readonly number[] = [1, 2, 3];

export interface DevicePreferences {
  muted: boolean;
}

export interface WorldSnapshot {
  version: typeof SNAPSHOT_VERSION;
  pieces: PlacedPiece[];
  scenery: PlacedScenery[];
  train?: TrainKind;
  preferences?: DevicePreferences;
  deliveries?: Record<string, number>;
}

export interface WorldData {
  pieces: PlacedPiece[];
  scenery: PlacedScenery[];
  train: TrainKind;
  /** Delivered-crate counts, keyed by the station scenery's id. */
  deliveries: Record<string, number>;
}

export function serializeWorld(
  pieces: readonly PlacedPiece[],
  scenery: readonly PlacedScenery[],
  train: TrainKind = 'steam',
  muted = false,
  deliveries: Record<string, number> = {},
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
  // Sound-on is the default, so it is omitted to keep snapshots minimal.
  if (muted) snapshot.preferences = { muted: true };
  // Same for an empty delivery ledger.
  if (Object.keys(deliveries).length > 0) snapshot.deliveries = { ...deliveries };
  return snapshot;
}

export function deserializeWorld(value: unknown): WorldData {
  if (!isRecord(value)) return emptyWorld();
  const version = value.version;
  if (typeof version !== 'number' || !SUPPORTED_VERSIONS.includes(version)) {
    return emptyWorld();
  }
  const legacy = version === 1;
  if (!Array.isArray(value.pieces) || !Array.isArray(value.scenery)) return emptyWorld();
  if (value.pieces.length + value.scenery.length > MAX_PIECES) return emptyWorld();

  const parsedPieces = value.pieces.map(parsePiece);
  if (parsedPieces.some((piece) => piece === null)) return emptyWorld();
  const validPieces = legacy
    ? (parsedPieces as PlacedPiece[]).map(migratePieceToV2)
    : (parsedPieces as PlacedPiece[]);

  // Unknown scenery kinds (e.g. from a newer version) drop back to the
  // drawer; everything else restores exactly as it was. A lost toy is a
  // pity — a lost world is a tragedy.
  const parsedScenery = value.scenery.map(parseScenery);
  const validScenery = parsedScenery.filter((item): item is PlacedScenery => item !== null);

  const cells = [...validPieces, ...validScenery].map((item) => `${item.cell.x},${item.cell.y}`);
  if (new Set(cells).size !== cells.length) return emptyWorld();

  return {
    pieces: validPieces,
    scenery: validScenery,
    train: isTrainKind(value.train) ? value.train : 'steam',
    deliveries: parseDeliveries(value.deliveries),
  };
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
    if (typeof count !== 'number' || !Number.isInteger(count) || count <= 0) continue;
    deliveries[id] = Math.min(count, MAX_DELIVERED_CRATES);
  }
  return deliveries;
}

/**
 * Resolves the device preferences of a snapshot. Anything missing or invalid
 * falls back to the sound-on default; this never throws into the app.
 */
export function deserializePreferences(value: unknown): DevicePreferences {
  if (!isRecord(value)) return { muted: false };
  const preferences = value.preferences;
  if (!isRecord(preferences)) return { muted: false };
  return typeof preferences.muted === 'boolean' ? { muted: preferences.muted } : { muted: false };
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
  return { pieces: [], scenery: [], train: 'steam', deliveries: {} };
}
