/**
 * Local persistence for the parent-only diagnostics counters. The counters live
 * in their own `insights` object store inside the same `tiny-tracks` IndexedDB
 * database as the world, so a reset, preset or import can never erase them and
 * no counter key can leak into the world snapshot or export. Every public
 * function is non-fatal: storage is an enhancement, never a play requirement.
 */

import { type DBSchema, openDB } from 'idb';
import {
  createInsights,
  type InsightsState,
  type SaveOutcome,
  type StorageEstimate,
} from '../core/insights';

const DATABASE_NAME = 'tiny-tracks';
// Keep in lockstep with persistence.ts: whichever helper opens the database
// first must create BOTH stores, because the upgrade callback only runs when
// the version increases.
const DATABASE_VERSION = 2;
const INSIGHTS_KEY = 'state';

const SAVE_OUTCOMES: readonly string[] = ['none', 'ok', 'failed', 'restored from backup'];

interface InsightsDatabase extends DBSchema {
  worlds: { key: string; value: unknown };
  insights: { key: string; value: InsightsState };
}

async function database() {
  return openDB<InsightsDatabase>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('worlds')) db.createObjectStore('worlds');
      if (!db.objectStoreNames.contains('insights')) db.createObjectStore('insights');
    },
  });
}

function nonNegativeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Rebuilds a trustworthy snapshot from whatever is in storage. Every field is
 * checked: corrupt or hand-edited bytes fall back to a safe value instead of
 * breaking boot. Only counters, booleans and a known outcome are accepted — no
 * error content, identifier or free-form text has anywhere to land.
 */
export function normalizeInsights(value: unknown): InsightsState {
  const fallback = createInsights();
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return fallback;
  const raw = value as Record<string, unknown>;
  return {
    sessions: nonNegativeNumber(raw.sessions) ?? fallback.sessions,
    longestSessionMs: nonNegativeNumber(raw.longestSessionMs) ?? fallback.longestSessionMs,
    resets: nonNegativeNumber(raw.resets) ?? fallback.resets,
    uncleanExits: nonNegativeNumber(raw.uncleanExits) ?? fallback.uncleanExits,
    running: typeof raw.running === 'boolean' ? raw.running : fallback.running,
    sessionStartedAt: nonNegativeNumber(raw.sessionStartedAt),
    lastSaveOutcome:
      typeof raw.lastSaveOutcome === 'string' && SAVE_OUTCOMES.includes(raw.lastSaveOutcome)
        ? (raw.lastSaveOutcome as SaveOutcome)
        : fallback.lastSaveOutcome,
  };
}

/** Reads the stored snapshot; a missing or unreadable store yields a safe default. */
export async function loadInsights(): Promise<InsightsState> {
  try {
    const db = await database();
    try {
      return normalizeInsights(await db.get('insights', INSIGHTS_KEY));
    } finally {
      db.close();
    }
  } catch {
    return createInsights();
  }
}

/** Writes only the `insights` store; storage failures are swallowed. */
export async function saveInsights(state: InsightsState): Promise<void> {
  try {
    const db = await database();
    try {
      await db.put('insights', state, INSIGHTS_KEY);
    } finally {
      db.close();
    }
  } catch {
    // Diagnostics are an enhancement; never make the toy world unusable.
  }
}

/**
 * Reads the browser's storage estimate in boundary code only — the gated tray
 * calls this when it opens (Phase 3), never on boot or per frame. An absent or
 * failing API returns `undefined` so the caller can render an unavailable line.
 */
export async function readStorageEstimate(): Promise<StorageEstimate | undefined> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return undefined;
    const estimate = await navigator.storage.estimate();
    if (typeof estimate.usage !== 'number' || typeof estimate.quota !== 'number') return undefined;
    return { usage: estimate.usage, quota: estimate.quota };
  } catch {
    return undefined;
  }
}
