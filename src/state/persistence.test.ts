import { openDB } from 'idb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deserializePreferences, type WorldData, type WorldSnapshot } from '../core/save';
import {
  loadWorldSnapshot,
  restoreMutePreference,
  saveWorldSnapshot,
  watchMutePersistence,
  watchWorldPersistence,
} from './persistence';
import { createWorldStore } from './world';

vi.mock('idb', () => ({
  openDB: vi.fn(),
}));

const openDBMock = vi.mocked(openDB);

const ORIGIN = { x: 0, y: 0 };
const NEXT_CELL = { x: 1, y: 0 };

const data: WorldData = {
  train: 'diesel',
  deliveries: {},
  pieces: [{ id: 'piece-40', type: 'straight', cell: ORIGIN, rotation: 0 }],
  scenery: [{ id: 'scenery-41', kind: 'tree', cell: NEXT_CELL, rotation: 90 }],
};

describe('world hydration', () => {
  it('restores tracks and scenery and advances generated ids', () => {
    const store = createWorldStore();
    store.hydrate(data);

    expect(store.pieces()).toEqual(data.pieces);
    expect(store.scenery()).toEqual(data.scenery);
    expect(store.train()).toBe('diesel');
    expect(store.place('corner', { x: 2, y: 0 }, 0)).toBe('placed');
    expect(store.pieces()[1]?.id).toBe('piece-42');
  });

  it('defensively copies hydrated cells', () => {
    const store = createWorldStore();
    store.hydrate(data);
    const restored = store.pieces()[0];
    if (!restored) throw new Error('fixture failed');
    restored.cell.x = 99;
    expect(store.pieces()[0]?.cell.x).toBe(0);
  });
});

describe('autosave subscription', () => {
  it('can serialize every successful mutation exactly once', () => {
    const store = createWorldStore();
    const save = vi.fn<(snapshot: WorldSnapshot) => void>();
    store.subscribe(() =>
      save({
        version: 3,
        train: store.train(),
        pieces: [...store.pieces()],
        scenery: [...store.scenery()],
      }),
    );

    store.place('straight', ORIGIN, 0);
    expect(save).toHaveBeenCalledTimes(1);
    store.placeScenery('tree', NEXT_CELL, 0);
    expect(save).toHaveBeenCalledTimes(2);
    store.relocate('piece-1', { x: 2, y: 0 }, 90);
    expect(save).toHaveBeenCalledTimes(3);
    store.removeScenery('scenery-2');
    expect(save).toHaveBeenCalledTimes(4);
    store.remove('piece-1');
    expect(save).toHaveBeenCalledTimes(5);
  });

  it('does not notify for failed mutations', () => {
    const store = createWorldStore();
    const listener = vi.fn();
    store.subscribe(listener);

    expect(store.place('straight', { x: 99, y: 99 }, 0)).toBe('out-of-bounds');
    expect(store.relocate('ghost', ORIGIN, 0)).toBe('not-found');
    store.removeScenery('ghost');
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('mute preference', () => {
  const makeAudio = () => {
    let muted = false;
    let notify: (() => void) | null = null;
    return {
      setMuted: vi.fn((value: boolean) => {
        muted = value;
      }),
      isMuted: () => muted,
      subscribe: (listener: () => void) => {
        notify = listener;
        return () => {
          notify = null;
        };
      },
      emit: () => {
        notify?.();
      },
    };
  };

  it('applies the persisted mute state exactly once on boot', () => {
    const audio = makeAudio();

    restoreMutePreference(
      { version: 3, pieces: [], scenery: [], preferences: { muted: true } },
      audio,
    );
    expect(audio.setMuted).toHaveBeenCalledTimes(1);
    expect(audio.setMuted).toHaveBeenCalledWith(true);

    restoreMutePreference(null, audio);
    expect(audio.setMuted).toHaveBeenCalledTimes(2);
    expect(audio.setMuted).toHaveBeenLastCalledWith(false);
  });

  it('saves exactly once per mute change with the current world', () => {
    const audio = makeAudio();
    const store = createWorldStore();
    store.place('straight', ORIGIN, 0);
    const save = vi.fn<(snapshot: WorldSnapshot) => void>();
    watchMutePersistence(audio, store, save);

    // Notifications that do not change the mute value (the real controller
    // also notifies on ride chug start/stop) never persist.
    audio.setMuted(true);
    audio.emit();
    audio.emit();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]?.[0]).toMatchObject({
      version: 3,
      train: 'steam',
      pieces: [{ type: 'straight', cell: ORIGIN }],
      scenery: [],
      preferences: { muted: true },
    });

    audio.setMuted(false);
    audio.emit();
    expect(save).toHaveBeenCalledTimes(2);
    expect(deserializePreferences(save.mock.calls[1]?.[0])).toEqual({ muted: false });
  });

  it('treats storage failures as non-fatal', () => {
    const audio = makeAudio();
    const store = createWorldStore();
    let calls = 0;
    const save = vi.fn<(snapshot: WorldSnapshot) => void>(() => {
      calls += 1;
      if (calls === 1) throw new Error('storage unavailable');
    });
    watchMutePersistence(audio, store, save);

    audio.setMuted(true);
    expect(() => audio.emit()).not.toThrow();
    audio.setMuted(false);
    audio.emit();
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('carries the current mute preference into world-mutation saves', () => {
    const audio = makeAudio();
    audio.setMuted(true);
    const store = createWorldStore();
    const save = vi.fn<(snapshot: WorldSnapshot) => void>();
    watchWorldPersistence(store, () => audio.isMuted(), save);

    store.place('straight', ORIGIN, 0);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]?.[0]).toMatchObject({ preferences: { muted: true } });

    audio.setMuted(false);
    store.place('corner', NEXT_CELL, 0);
    expect(save).toHaveBeenCalledTimes(2);
    expect(deserializePreferences(save.mock.calls[1]?.[0])).toEqual({ muted: false });
  });
});

describe('indexeddb storage', () => {
  const makeDb = () => ({
    get: vi.fn<(store: string, key: string) => Promise<unknown>>(async () => undefined),
    put: vi.fn<(store: string, value: unknown, key: string) => Promise<undefined>>(
      async () => undefined,
    ),
    close: vi.fn<() => void>(),
  });

  beforeEach(() => {
    openDBMock.mockReset();
  });

  it('loads the stored world snapshot', async () => {
    const db = makeDb();
    const stored: WorldSnapshot = { version: 3, pieces: [], scenery: [] };
    db.get.mockResolvedValue(stored);
    openDBMock.mockResolvedValue(db as never);

    await expect(loadWorldSnapshot()).resolves.toEqual(stored);
    expect(db.close).toHaveBeenCalledTimes(1);
  });

  it('loads null when storage is empty or unavailable', async () => {
    openDBMock.mockResolvedValue(makeDb() as never);
    await expect(loadWorldSnapshot()).resolves.toBeNull();

    openDBMock.mockRejectedValue(new Error('blocked'));
    await expect(loadWorldSnapshot()).resolves.toBeNull();
  });

  it('saves snapshots and treats storage failures as non-fatal', async () => {
    const db = makeDb();
    openDBMock.mockResolvedValue(db as never);
    const snapshot: WorldSnapshot = {
      version: 3,
      pieces: [],
      scenery: [],
      preferences: { muted: true },
    };

    await saveWorldSnapshot(snapshot);
    expect(db.put).toHaveBeenCalledWith('worlds', snapshot, 'current');
    expect(db.close).toHaveBeenCalledTimes(1);

    openDBMock.mockRejectedValue(new Error('quota exceeded'));
    await expect(saveWorldSnapshot(snapshot)).resolves.toBeUndefined();
  });
});
