import { type DBSchema, openDB } from 'idb';
import { deserializePreferences, serializeWorld, type WorldSnapshot } from '../core/save';
import type { PlacedScenery } from '../core/scenery';
import type { PlacedPiece } from '../core/track-graph';
import type { TrainKind } from '../core/trains';

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

interface WorldReader {
  train(): TrainKind;
  pieces(): readonly PlacedPiece[];
  scenery(): readonly PlacedScenery[];
  deliveries(): Record<string, number>;
  subscribe(listener: () => void): () => void;
}

function snapshotOf(world: WorldReader, muted: boolean): WorldSnapshot {
  return serializeWorld(world.pieces(), world.scenery(), world.train(), muted, world.deliveries());
}

export function watchWorldPersistence(
  world: WorldReader,
  readMuted: () => boolean = () => false,
  save: (snapshot: WorldSnapshot) => void = saveWorldSnapshot,
): () => void {
  return world.subscribe(() => {
    void save(snapshotOf(world, readMuted()));
  });
}

/**
 * Keeps the sound preference in storage: every mute change re-saves the full
 * snapshot so world mutations and mute toggles can never clobber each other.
 */
export function watchMutePersistence(
  audio: { isMuted(): boolean; subscribe(listener: () => void): () => void },
  world: WorldReader,
  save: (snapshot: WorldSnapshot) => void = saveWorldSnapshot,
): () => void {
  // Chug start/stop also notify; only an actual mute change persists.
  let lastPersisted = audio.isMuted();
  return audio.subscribe(() => {
    const muted = audio.isMuted();
    if (muted === lastPersisted) return;
    lastPersisted = muted;
    try {
      void save(snapshotOf(world, muted));
    } catch {
      // Storage is an enhancement; never make the toy world unusable.
    }
  });
}

/**
 * Applies a snapshot's persisted mute state on boot. Always resolves to an
 * explicit value (sound-on default) so the toggle reflects storage exactly
 * once, and never depends on the browser audio unlock gesture.
 */
export function restoreMutePreference(
  snapshot: unknown,
  audio: { setMuted(muted: boolean): void },
): void {
  audio.setMuted(deserializePreferences(snapshot).muted);
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
