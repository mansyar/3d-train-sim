/**
 * Local insights model — pure clock and counter logic for the parent-only
 * diagnostics panel. No storage, DOM, timers or module-level mutable state:
 * every function takes an explicit `now` or state value and returns the next
 * state. The DOM/IndexedDB wiring lives in later phases.
 *
 * These counters are device diagnostics, not the clarity audit's
 * time-to-first-ride or unassisted session length — those stay human-observed.
 */

/** The autosave outcomes the panel can report, plus the first-boot default. */
export type SaveOutcome = 'ok' | 'failed' | 'restored from backup' | 'none';

/** The storage numbers the panel renders, supplied by `navigator.storage`. */
export interface StorageEstimate {
  usage: number;
  quota: number;
}

/** The whole diagnostics snapshot. Only plain data; never error content. */
export interface InsightsState {
  sessions: number;
  longestSessionMs: number;
  resets: number;
  uncleanExits: number;
  /** The local "running" boot marker: set while a load is live, cleared on a clean exit. */
  running: boolean;
  /** Monotonic start time of the open foreground session, or null when none is open. */
  sessionStartedAt: number | null;
  lastSaveOutcome: SaveOutcome;
}

const BYTES_PER_MB = 1024 * 1024;
const UNAVAILABLE_ESTIMATE = 'Storage information is unavailable.';
const NO_SAVE_YET = 'No save yet.';

/** A fresh zeroed snapshot for a device that has never recorded anything. */
export function createInsights(): InsightsState {
  return {
    sessions: 0,
    longestSessionMs: 0,
    resets: 0,
    uncleanExits: 0,
    running: false,
    sessionStartedAt: null,
    lastSaveOutcome: 'none',
  };
}

/** Opens a foreground session. A repeated visible event cannot open a second one. */
export function startSession(state: InsightsState, now: number): InsightsState {
  if (state.sessionStartedAt !== null) return state;
  return { ...state, sessionStartedAt: now };
}

/**
 * Closes the open session on hide/unload: every completed interval counts once,
 * and only a positive, longer duration can raise the longest. Clock skew or
 * device sleep can yield a zero or negative duration — that still counts as a
 * session but cannot extend the longest.
 */
export function endSession(state: InsightsState, now: number): InsightsState {
  if (state.sessionStartedAt === null) return state;
  const duration = now - state.sessionStartedAt;
  const longestSessionMs =
    duration > 0 && duration > state.longestSessionMs ? duration : state.longestSessionMs;
  return {
    ...state,
    sessions: state.sessions + 1,
    longestSessionMs,
    sessionStartedAt: null,
  };
}

/** A parent reset increments the counter and leaves every other field intact. */
export function noteReset(state: InsightsState): InsightsState {
  return { ...state, resets: state.resets + 1 };
}

/**
 * Called once at boot. A still-set marker from a previous load means that load
 * ended uncleanly, so the counter increments once; the marker then stays set
 * for the new run. A boolean is all that is kept — never a reason or stack.
 */
export function noteBoot(state: InsightsState): InsightsState {
  const uncleanExits = state.running ? state.uncleanExits + 1 : state.uncleanExits;
  return { ...state, uncleanExits, running: true };
}

/** Clears the running marker on a clean hide/unload. */
export function noteCleanExit(state: InsightsState): InsightsState {
  return { ...state, running: false };
}

/** Records the most recent autosave outcome. */
export function noteSaveOutcome(state: InsightsState, outcome: SaveOutcome): InsightsState {
  return { ...state, lastSaveOutcome: outcome };
}

/** Renders the last save outcome in parent words, with a safe default. */
export function formatSaveOutcome(outcome?: SaveOutcome): string {
  if (outcome === 'ok') return 'Last save: OK.';
  if (outcome === 'failed') return 'The last save failed.';
  if (outcome === 'restored from backup') {
    return 'Your meadow was restored from a backup save.';
  }
  return NO_SAVE_YET;
}

/** Renders a quota estimate as rounded megabytes, or a plain unavailable line. */
export function formatStorageEstimate(estimate?: StorageEstimate): string {
  if (!estimate || !Number.isFinite(estimate.usage) || !Number.isFinite(estimate.quota)) {
    return UNAVAILABLE_ESTIMATE;
  }
  const usageMb = Math.round(estimate.usage / BYTES_PER_MB);
  const quotaMb = Math.round(estimate.quota / BYTES_PER_MB);
  return `About ${usageMb} MB used of ${quotaMb} MB available.`;
}

/** Renders the longest foreground session in parent words, with singular/plural units. */
export function formatLongestSession(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return 'No sessions yet.';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return seconds === 1 ? '1 second.' : `${seconds} seconds.`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  const minutePart = minutes === 1 ? '1 minute' : `${minutes} minutes`;
  if (rest === 0) return `${minutePart}.`;
  const secondPart = rest === 1 ? '1 second' : `${rest} seconds`;
  return `${minutePart} ${secondPart}.`;
}
