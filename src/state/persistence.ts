import { type DBSchema, openDB } from 'idb';
import type { WorldSnapshot } from '../core/save';

const DATABASE_NAME = 'tiny-tracks';
const DATABASE_VERSION = 1;
const WORLD_KEY = 'current';

interface TinyTracksDatabase extends DBSchema {
  worlds: {
    key: string;
    value: WorldSnapshot;
  };
}

async function database(): Promise<ReturnType<typeof openDB<TinyTracksDatabase>>> {
  return openDB<TinyTracksDatabase>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('worlds')) db.createObjectStore('worlds');
    },
  });
}

export async function loadWorldSnapshot(): Promise<WorldSnapshot | null> {
  try {
    const db = await database();
    const snapshot = await db.get('worlds', WORLD_KEY);
    db.close();
    return snapshot ?? null;
  } catch {
    return null;
  }
}

export function watchWorldPersistence(world: {
  train(): import('../core/trains').TrainKind;
  pieces(): readonly import('../core/track-graph').PlacedPiece[];
  scenery(): readonly import('../core/scenery').PlacedScenery[];
  subscribe(listener: () => void): () => void;
}): () => void {
  return world.subscribe(() => {
    void saveWorldSnapshot({
      version: 1,
      train: world.train(),
      pieces: world.pieces().map((piece) => ({ ...piece, cell: { ...piece.cell } })),
      scenery: world.scenery().map((item) => ({ ...item, cell: { ...item.cell } })),
    });
  });
}

export async function saveWorldSnapshot(snapshot: WorldSnapshot): Promise<void> {
  try {
    const db = await database();
    await db.put('worlds', snapshot, WORLD_KEY);
    db.close();
  } catch {
    // Storage is an enhancement; never make the toy world unusable.
  }
}
