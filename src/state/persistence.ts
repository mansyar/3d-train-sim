import { type DBSchema, openDB } from 'idb';
import { type DayPhase, DEFAULT_DAY_PHASE } from '../core/day-clock';
import {
  deserializePreferences,
  parseWorldSnapshot,
  type SnapshotStatus,
  serializeWorld,
  type WorldParseResult,
  type WorldSnapshot,
} from '../core/save';
import type { PlacedScenery } from '../core/scenery';
import type { PlacedPiece } from '../core/track-graph';
import type { TrainKind } from '../core/trains';
import type { TrainConsist } from '../core/wagons';

const DATABASE_NAME = 'tiny-tracks';
const DATABASE_VERSION = 1;
const WORLD_KEY = 'current';
const PREVIOUS_KEY = 'previous';

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

/** What a boot found: a clean world, a salvaged one, a restored backup, or nothing. */
export type WorldRecoveryStatus = UsableSnapshotStatus | 'restored' | 'fresh';

export interface WorldRecovery {
  snapshot: WorldSnapshot | null;
  status: WorldRecoveryStatus;
  droppedPieces: number;
  droppedScenery: number;
  droppedDuplicates: number;
}

function freshRecovery(): WorldRecovery {
  return {
    snapshot: null,
    status: 'fresh',
    droppedPieces: 0,
    droppedScenery: 0,
    droppedDuplicates: 0,
  };
}

/** Statuses a usable snapshot can have; `unreadable` never reaches a caller. */
type UsableSnapshotStatus = Exclude<SnapshotStatus, 'unreadable'>;

/**
 * A clean snapshot is always usable, even when empty (the child may have
 * deleted everything). A salvaged snapshot is usable only if it kept content;
 * an empty salvage means every entry failed and the backup is the better world.
 */
function isUsable(
  parsed: WorldParseResult,
): parsed is WorldParseResult & { status: UsableSnapshotStatus } {
  if (parsed.status === 'salvaged') {
    return parsed.world.pieces.length + parsed.world.scenery.length > 0;
  }
  return parsed.status === 'clean';
}

/**
 * Reads both save slots and reports what the boot found. A usable `current`
 * wins even when it had to be salvaged — keeping every valid piece beats
 * throwing the whole world away for the backup. An unreadable `current`, or a
 * salvage that kept nothing, falls back to `previous`, which then reports
 * `restored`. Never throws: a storage failure is simply a fresh meadow. At
 * most two reads per boot.
 */
export async function loadWorldRecovery(): Promise<WorldRecovery> {
  try {
    const db = await database();
    try {
      const current = await db.get('worlds', WORLD_KEY);
      const parsed = parseWorldSnapshot(current);
      if (isUsable(parsed)) {
        return {
          snapshot: current ?? null,
          status: parsed.status,
          droppedPieces: parsed.droppedPieces,
          droppedScenery: parsed.droppedScenery,
          droppedDuplicates: parsed.droppedDuplicates,
        };
      }

      const previous = await db.get('worlds', PREVIOUS_KEY);
      const backup = parseWorldSnapshot(previous);
      if (isUsable(backup)) {
        return {
          snapshot: previous ?? null,
          status: 'restored',
          droppedPieces: backup.droppedPieces,
          droppedScenery: backup.droppedScenery,
          droppedDuplicates: backup.droppedDuplicates,
        };
      }
      return freshRecovery();
    } finally {
      db.close();
    }
  } catch {
    return freshRecovery();
  }
}

/** Snapshot-only view of the recovery read; the boot wiring uses the status. */
export async function loadWorldSnapshot(): Promise<WorldSnapshot | null> {
  return (await loadWorldRecovery()).snapshot;
}

interface WorldReader {
  train(): TrainKind;
  pieces(): readonly PlacedPiece[];
  scenery(): readonly PlacedScenery[];
  deliveries(): Record<string, number>;
  consist(): TrainConsist;
  subscribe(listener: () => void): () => void;
}

function snapshotOf(world: WorldReader, muted: boolean, dayPhase?: DayPhase): WorldSnapshot {
  return serializeWorld(
    world.pieces(),
    world.scenery(),
    world.train(),
    muted,
    world.deliveries(),
    world.consist(),
    dayPhase,
  );
}

export function watchWorldPersistence(
  world: WorldReader,
  readMuted: () => boolean = () => false,
  save: (snapshot: WorldSnapshot) => void = saveWorldSnapshot,
  readDayPhase: () => DayPhase = () => DEFAULT_DAY_PHASE,
): () => void {
  return world.subscribe(() => {
    void save(snapshotOf(world, readMuted(), readDayPhase()));
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

/**
 * Keeps the chosen day phase in storage: every phase change re-saves the full
 * snapshot, so a tap can never clobber the world and a world edit can never
 * drop the phase. A phase the day drifts into is saved too, so reopening
 * resumes the day the child left rather than snapping back to mid-morning.
 */
export function watchDayPhasePersistence(
  clock: {
    readonly phase: DayPhase;
    subscribe(listener: (event: { phase: DayPhase }) => void): () => void;
  },
  world: WorldReader,
  readMuted: () => boolean = () => false,
  save: (snapshot: WorldSnapshot) => void = saveWorldSnapshot,
): () => void {
  let lastPersisted = clock.phase;
  return clock.subscribe((event) => {
    if (event.phase === lastPersisted) return;
    lastPersisted = event.phase;
    try {
      void save(snapshotOf(world, readMuted(), event.phase));
    } catch {
      // Storage is an enhancement; never make the toy world unusable.
    }
  });
}

/**
 * Applies a snapshot's persisted day phase on boot. A snapshot without one
 * (or with an unknown phase) leaves the clock at its default mid-morning.
 */
export function restoreDayPhasePreference(
  snapshot: unknown,
  clock: { setPhase(phase: DayPhase): void },
): void {
  const { dayPhase } = deserializePreferences(snapshot);
  if (dayPhase) clock.setPhase(dayPhase);
}

/**
 * Saves the world and keeps the one before it as a safety net. Both writes
 * share a single `readwrite` transaction, so an interrupted save leaves a
 * consistent pair: either the new world plus its predecessor, or neither. A
 * prior payload that parses as an empty salvage is never promoted — corrupt
 * bytes must not replace a good backup. Storage failures stay non-fatal.
 */
export async function saveWorldSnapshot(snapshot: WorldSnapshot): Promise<void> {
  try {
    const db = await database();
    try {
      const tx = db.transaction('worlds', 'readwrite');
      const prior = await tx.store.get(WORLD_KEY);
      if (prior !== undefined && isUsable(parseWorldSnapshot(prior))) {
        await tx.store.put(prior, PREVIOUS_KEY);
      }
      await tx.store.put(snapshot, WORLD_KEY);
      await tx.done;
    } finally {
      db.close();
    }
  } catch {
    // Storage is an enhancement; never make the toy world unusable.
  }
}
