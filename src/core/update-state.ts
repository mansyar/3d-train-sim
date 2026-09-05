/**
 * Update state — pure decision logic for the PWA self-update flow.
 *
 * Deployments ship a fresh service worker, but a never-closed PWA keeps
 * running the old version until the page itself reloads. These helpers
 * decide *when* it is safe to quietly adopt the new version: only when the
 * table is quiet (no ride), only after the boot-loop guard has passed, and
 * only once per update. Probing (asking the service worker registration for
 * an update) is likewise limited to visible tabs and a slow cadence — the
 * DOM/timer wiring lives in `src/main.ts`.
 */

/** Reloads are refused this long after load, so a bad update cannot ping-pong. */
export const BOOT_GUARD_MS = 15_000;

/** How often a visible tab asks the service worker for an update (1 hour). */
export const PROBE_INTERVAL_MS = 60 * 60 * 1000;

export interface ReloadDecision {
  /** True while a train is on the tracks — updates wait for the ride to end. */
  rideActive: boolean;
  /** Milliseconds since the page loaded. */
  uptimeMs: number;
  /** True once this update has already been applied (one reload per update). */
  alreadyReloaded: boolean;
}

/** True when the page may reload itself into the freshly installed version. */
export function shouldReload(input: ReloadDecision): boolean {
  return !input.rideActive && input.uptimeMs >= BOOT_GUARD_MS && !input.alreadyReloaded;
}

export interface ProbeDecision {
  /** Probes only happen while the family can see the table. */
  visible: boolean;
  /** Milliseconds since the last probe, or null if this tab never probed. */
  msSinceLastProbe: number | null;
}

/** True when it is time to ask the service worker registration for an update. */
export function shouldProbeForUpdate(input: ProbeDecision): boolean {
  if (!input.visible) return false;
  return input.msSinceLastProbe === null || input.msSinceLastProbe >= PROBE_INTERVAL_MS;
}
