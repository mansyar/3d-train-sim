import { openDB } from 'idb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInsights, type InsightsState } from '../core/insights';
import { buildExport } from '../core/portable';
import { serializeWorld } from '../core/save';
import { defaultConsist } from '../core/wagons';
import {
  loadInsights,
  normalizeInsights,
  readStorageEstimate,
  saveInsights,
} from './insights-store';

vi.mock('idb', () => ({
  openDB: vi.fn(),
}));

const openDBMock = vi.mocked(openDB);

const stored: InsightsState = {
  sessions: 4,
  longestSessionMs: 12_345,
  resets: 2,
  uncleanExits: 1,
  running: true,
  sessionStartedAt: 9_000,
  lastSaveOutcome: 'ok',
};

/** A tiny in-memory stand-in for the single `insights` store. */
function makeDb(initial?: Record<string, unknown>, failPut = false) {
  const entries = new Map<string, unknown>(Object.entries(initial ?? {}));
  return {
    entries,
    get: vi.fn(async (_store: string, key: string) => entries.get(key)),
    put: vi.fn(async (_store: string, value: unknown, key?: string) => {
      if (failPut) throw new Error('quota exceeded');
      entries.set(key ?? 'state', value);
    }),
    close: vi.fn(),
  };
}

/** The slice of an upgrade database the v2 migration actually touches. */
interface UpgradeDb {
  objectStoreNames: { contains(name: string): boolean };
  createObjectStore(name: string): void;
}
type UpgradeFn = (db: UpgradeDb) => void;

/** A stand-in that records which object stores the migration creates. */
function makeUpgradeDb(initialStores: string[] = []) {
  const stores = new Set(initialStores);
  return {
    stores,
    objectStoreNames: { contains: (name: string) => stores.has(name) },
    createObjectStore: vi.fn((name: string) => {
      stores.add(name);
    }),
  };
}

/** Captures the `upgrade` callback openDB receives as its third argument. */
function capturedUpgrade(): UpgradeFn {
  const call = openDBMock.mock.calls[0];
  if (!call) throw new Error('openDB was not called');
  const upgrade = call[2]?.upgrade;
  if (!upgrade) throw new Error('openDB was called without an upgrade callback');
  return upgrade as unknown as UpgradeFn;
}

describe('normalizeInsights', () => {
  it('returns a safe default for non-object values', () => {
    expect(normalizeInsights(null)).toEqual(createInsights());
    expect(normalizeInsights(undefined)).toEqual(createInsights());
    expect(normalizeInsights('nope')).toEqual(createInsights());
    expect(normalizeInsights([])).toEqual(createInsights());
  });

  it('keeps valid fields verbatim', () => {
    expect(normalizeInsights(stored)).toEqual(stored);
  });

  it('resets corrupt numeric fields to zero', () => {
    const result = normalizeInsights({
      sessions: -1,
      longestSessionMs: Number.NaN,
      resets: Number.POSITIVE_INFINITY,
      uncleanExits: '3',
    });
    expect(result).toMatchObject({
      sessions: 0,
      longestSessionMs: 0,
      resets: 0,
      uncleanExits: 0,
    });
  });

  it('falls back for invalid booleans, timestamps and outcomes', () => {
    const result = normalizeInsights({
      running: 'yes',
      sessionStartedAt: Number.NaN,
      lastSaveOutcome: 'uploaded to the cloud',
    });
    expect(result).toMatchObject({
      running: false,
      sessionStartedAt: null,
      lastSaveOutcome: 'none',
    });
  });

  it('accepts only known save outcomes', () => {
    const outcomes = ['none', 'ok', 'failed', 'restored from backup'] as const;
    for (const outcome of outcomes) {
      expect(normalizeInsights({ lastSaveOutcome: outcome }).lastSaveOutcome).toBe(outcome);
    }
  });
});

describe('loadInsights', () => {
  beforeEach(() => openDBMock.mockReset());

  it('reads the insights state at key state and closes cleanly', async () => {
    const db = makeDb({ state: stored });
    openDBMock.mockResolvedValue(db as never);

    await expect(loadInsights()).resolves.toEqual(stored);
    expect(db.get).toHaveBeenCalledWith('insights', 'state');
    expect(db.close).toHaveBeenCalledTimes(1);
  });

  it('returns a safe default when nothing is stored', async () => {
    const db = makeDb();
    openDBMock.mockResolvedValue(db as never);

    await expect(loadInsights()).resolves.toEqual(createInsights());
  });

  it('normalizes corrupt stored bytes instead of failing boot', async () => {
    const db = makeDb({ state: { sessions: -3, running: 'true', lastSaveOutcome: '???' } });
    openDBMock.mockResolvedValue(db as never);

    await expect(loadInsights()).resolves.toMatchObject({
      sessions: 0,
      running: false,
      lastSaveOutcome: 'none',
    });
  });

  it('never throws when storage is blocked', async () => {
    const db = makeDb();
    db.get.mockImplementation(() => {
      throw new Error('blocked');
    });
    openDBMock.mockResolvedValue(db as never);

    await expect(loadInsights()).resolves.toEqual(createInsights());
    expect(db.close).toHaveBeenCalledTimes(1);
  });
});

describe('v2 database migration', () => {
  beforeEach(() => openDBMock.mockReset());

  it('opens tiny-tracks at version 2 with an upgrade callback', async () => {
    openDBMock.mockResolvedValue(makeDb() as never);

    await loadInsights();

    expect(openDBMock).toHaveBeenCalledTimes(1);
    expect(openDBMock.mock.calls[0]?.[0]).toBe('tiny-tracks');
    expect(openDBMock.mock.calls[0]?.[1]).toBe(2);
    expect(capturedUpgrade()).toBeTypeOf('function');
  });

  it('creates both worlds and insights when upgrading an empty database', async () => {
    openDBMock.mockResolvedValue(makeDb() as never);
    await loadInsights();
    const db = makeUpgradeDb();

    capturedUpgrade()(db);

    expect(db.createObjectStore).toHaveBeenCalledTimes(2);
    expect(db.createObjectStore).toHaveBeenCalledWith('worlds');
    expect(db.createObjectStore).toHaveBeenCalledWith('insights');
    expect([...db.stores]).toEqual(['worlds', 'insights']);
  });

  it('creates only insights when upgrading a v1 database that already has worlds', async () => {
    openDBMock.mockResolvedValue(makeDb() as never);
    await loadInsights();
    const db = makeUpgradeDb(['worlds']);

    capturedUpgrade()(db);

    expect(db.createObjectStore).toHaveBeenCalledTimes(1);
    expect(db.createObjectStore).toHaveBeenCalledWith('insights');
    expect([...db.stores]).toEqual(['worlds', 'insights']);
  });

  it('creates nothing on a repeat invocation once both stores exist', async () => {
    openDBMock.mockResolvedValue(makeDb() as never);
    await loadInsights();
    const db = makeUpgradeDb();
    const upgrade = capturedUpgrade();

    upgrade(db);
    expect(db.createObjectStore).toHaveBeenCalledTimes(2);
    db.createObjectStore.mockClear();

    upgrade(db);
    expect(db.createObjectStore).not.toHaveBeenCalled();
    expect([...db.stores]).toEqual(['worlds', 'insights']);
  });
});

describe('saveInsights', () => {
  beforeEach(() => openDBMock.mockReset());

  it('writes only the insights store at key state', async () => {
    const db = makeDb();
    openDBMock.mockResolvedValue(db as never);

    await saveInsights(stored);

    expect(db.put).toHaveBeenCalledTimes(1);
    expect(db.put).toHaveBeenCalledWith('insights', stored, 'state');
    expect(db.entries.get('state')).toEqual(stored);
    expect(db.close).toHaveBeenCalledTimes(1);
  });

  it('never throws when the write fails', async () => {
    const db = makeDb(undefined, true);
    openDBMock.mockResolvedValue(db as never);

    await expect(saveInsights(stored)).resolves.toBeUndefined();
    expect(db.close).toHaveBeenCalledTimes(1);
  });

  it('never throws when the write fails synchronously', async () => {
    const db = makeDb();
    db.put.mockImplementation(() => {
      throw new Error('blocked');
    });
    openDBMock.mockResolvedValue(db as never);

    await expect(saveInsights(stored)).resolves.toBeUndefined();
    expect(db.close).toHaveBeenCalledTimes(1);
  });
});

describe('readStorageEstimate', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns usage and quota when the API provides them', async () => {
    const estimate = vi.fn().mockResolvedValue({ usage: 1024, quota: 4096 });
    vi.stubGlobal('navigator', { storage: { estimate } });

    await expect(readStorageEstimate()).resolves.toEqual({ usage: 1024, quota: 4096 });
    expect(estimate).toHaveBeenCalledTimes(1);
  });

  it('returns undefined when storage is unavailable', async () => {
    vi.stubGlobal('navigator', {});

    await expect(readStorageEstimate()).resolves.toBeUndefined();
  });

  it('returns undefined when the estimate is incomplete', async () => {
    vi.stubGlobal('navigator', {
      storage: { estimate: vi.fn().mockResolvedValue({ usage: 1 }) },
    });

    await expect(readStorageEstimate()).resolves.toBeUndefined();
  });

  it('returns undefined when the API throws', async () => {
    vi.stubGlobal('navigator', {
      storage: { estimate: vi.fn().mockRejectedValue(new Error('denied')) },
    });

    await expect(readStorageEstimate()).resolves.toBeUndefined();
  });
});

describe('diagnostic isolation', () => {
  it('never leaks counter keys into the world snapshot or export file', () => {
    const snapshot = serializeWorld([], [], 'steam', false);
    const json = buildExport({
      pieces: [],
      scenery: [],
      train: 'steam',
      consist: defaultConsist(),
      deliveries: {},
    });

    const counterKeys = [
      'sessions',
      'longestSessionMs',
      'resets',
      'uncleanExits',
      'running',
      'sessionStartedAt',
      'lastSaveOutcome',
    ];
    for (const key of counterKeys) {
      expect(snapshot).not.toHaveProperty(key);
      expect(json).not.toContain(key);
    }
  });
});
