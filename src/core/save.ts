import { PIECE_TYPES } from './pieces';
import { type PlacedScenery, SCENERY_KINDS, type SceneryKind } from './scenery';
import {
  MAX_PIECES,
  MEADOW_CELLS,
  type PieceType,
  type PlacedPiece,
  type Rotation,
} from './track-graph';
import { TRAIN_KINDS, type TrainKind } from './trains';

const SNAPSHOT_VERSION = 1;

export interface DevicePreferences {
  muted: boolean;
}

export interface WorldSnapshot {
  version: typeof SNAPSHOT_VERSION;
  pieces: PlacedPiece[];
  scenery: PlacedScenery[];
  train?: TrainKind;
  preferences?: DevicePreferences;
}

export interface WorldData {
  pieces: PlacedPiece[];
  scenery: PlacedScenery[];
  train: TrainKind;
}

export function serializeWorld(
  pieces: readonly PlacedPiece[],
  scenery: readonly PlacedScenery[],
  train: TrainKind = 'steam',
  muted = false,
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
  return snapshot;
}

export function deserializeWorld(value: unknown): WorldData {
  if (!isRecord(value) || value.version !== SNAPSHOT_VERSION) return emptyWorld();
  if (!Array.isArray(value.pieces) || !Array.isArray(value.scenery)) return emptyWorld();
  if (value.pieces.length + value.scenery.length > MAX_PIECES) return emptyWorld();

  const parsedPieces = value.pieces.map(parsePiece);
  if (parsedPieces.some((piece) => piece === null)) return emptyWorld();
  const validPieces = parsedPieces as PlacedPiece[];

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
  };
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
  return { pieces: [], scenery: [], train: 'steam' };
}
