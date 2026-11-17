import { describe, expect, it } from 'vitest';

import {
  createInsights,
  endSession,
  formatSaveOutcome,
  formatStorageEstimate,
  noteBoot,
  noteCleanExit,
  noteReset,
  noteSaveOutcome,
  startSession,
} from './insights';

const MB = 1024 * 1024;

describe('createInsights', () => {
  it('starts with zeroed counters, no open session, a clear marker and no save', () => {
    expect(createInsights()).toEqual({
      sessions: 0,
      longestSessionMs: 0,
      resets: 0,
      uncleanExits: 0,
      running: false,
      sessionStartedAt: null,
      lastSaveOutcome: 'none',
    });
  });
});

describe('session clock', () => {
  it('counts a foreground-to-hidden interval as exactly one session', () => {
    let state = startSession(createInsights(), 1_000);
    expect(state.sessionStartedAt).toBe(1_000);
    state = endSession(state, 60_000);
    expect(state.sessions).toBe(1);
    expect(state.longestSessionMs).toBe(59_000);
    expect(state.sessionStartedAt).toBeNull();
  });

  it('does not double-count repeated visible events while a session is open', () => {
    let state = startSession(createInsights(), 1_000);
    state = startSession(state, 2_000);
    expect(state.sessionStartedAt).toBe(1_000);
    state = endSession(state, 3_000);
    expect(state.sessions).toBe(1);
    expect(state.longestSessionMs).toBe(2_000);
  });

  it('treats a hidden event with no open session as a no-op', () => {
    const initial = createInsights();
    expect(endSession(initial, 5_000)).toEqual(initial);
  });

  it('counts a zero-duration session without increasing the longest duration', () => {
    let state = startSession(createInsights(), 1_000);
    state = endSession(state, 1_000);
    expect(state.sessions).toBe(1);
    expect(state.longestSessionMs).toBe(0);
  });

  it('updates the longest duration only when a longer session completes', () => {
    let state = startSession(createInsights(), 0);
    state = endSession(state, 10_000);
    state = startSession(state, 20_000);
    state = endSession(state, 25_000);
    expect(state.sessions).toBe(2);
    expect(state.longestSessionMs).toBe(10_000);
    state = startSession(state, 30_000);
    state = endSession(state, 50_000);
    expect(state.sessions).toBe(3);
    expect(state.longestSessionMs).toBe(20_000);
  });

  it('counts a negative-duration session without increasing the longest duration', () => {
    let state = startSession(createInsights(), 5_000);
    state = endSession(state, 1_000);
    expect(state.sessions).toBe(1);
    expect(state.longestSessionMs).toBe(0);
  });
});

describe('reset counter', () => {
  it('increments resets without clearing any other field', () => {
    const before = {
      ...createInsights(),
      sessions: 3,
      longestSessionMs: 12_000,
      uncleanExits: 1,
      running: true,
      sessionStartedAt: 42,
      lastSaveOutcome: 'ok' as const,
    };
    const after = noteReset(before);
    expect(after.resets).toBe(1);
    expect({ ...after, resets: before.resets }).toEqual(before);
  });
});

describe('unclean exit marker', () => {
  it('starts a run on a clean boot without counting an unclean exit', () => {
    const after = noteBoot(createInsights());
    expect(after.running).toBe(true);
    expect(after.uncleanExits).toBe(0);
  });

  it('increments unclean exits once on a dirty boot and keeps the marker set', () => {
    const after = noteBoot({ ...createInsights(), running: true });
    expect(after.uncleanExits).toBe(1);
    expect(after.running).toBe(true);
  });

  it('clears the running marker on a clean exit', () => {
    const running = noteBoot(createInsights());
    expect(noteCleanExit(running).running).toBe(false);
  });
});

describe('save outcome', () => {
  it('records the most recent outcome', () => {
    let state = noteSaveOutcome(createInsights(), 'ok');
    state = noteSaveOutcome(state, 'failed');
    expect(state.lastSaveOutcome).toBe('failed');
    state = noteSaveOutcome(state, 'restored from backup');
    expect(state.lastSaveOutcome).toBe('restored from backup');
  });
});

describe('formatSaveOutcome', () => {
  it('renders a plain-word line for every recorded outcome', () => {
    expect(formatSaveOutcome('ok')).toBe('Last save: OK.');
    expect(formatSaveOutcome('failed')).toBe('The last save failed.');
    expect(formatSaveOutcome('restored from backup')).toBe(
      'Your meadow was restored from a backup save.',
    );
  });

  it('reports no save yet for a none outcome and for a missing outcome', () => {
    expect(formatSaveOutcome('none')).toBe('No save yet.');
    expect(formatSaveOutcome()).toBe('No save yet.');
  });
});

describe('formatStorageEstimate', () => {
  it('renders usage and quota as rounded megabytes', () => {
    expect(formatStorageEstimate({ usage: 12 * MB, quota: 250 * MB })).toBe(
      'About 12 MB used of 250 MB available.',
    );
  });

  it('reports an unavailable state when the estimate is missing, without throwing', () => {
    expect(formatStorageEstimate()).toBe('Storage information is unavailable.');
  });

  it('reports an unavailable state for non-finite values', () => {
    expect(formatStorageEstimate({ usage: Number.NaN, quota: Number.POSITIVE_INFINITY })).toBe(
      'Storage information is unavailable.',
    );
  });
});
