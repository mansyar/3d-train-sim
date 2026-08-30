/**
 * Visibility pause controller — maps document visibility to a pause state so
 * a hidden tab can suspend rendering and audio.
 *
 * Pure mapping (no DOM listeners, no timers): the wiring layer owns the
 * `visibilitychange` listener and calls `sync()`. State transitions notify
 * the pause/resume callbacks exactly once per change — repeated syncs on the
 * same state are no-ops, so a flurry of visibility events never double-fires.
 */

export type VisibilityState = 'visible' | 'hidden';

export interface VisibilityControllerOptions {
  /** Reads the current document visibility (injected for deterministic tests). */
  isHidden: () => boolean;
  /** Fired exactly once when the tab goes hidden. */
  onPause: () => void;
  /** Fired exactly once when the tab becomes visible again. */
  onResume: () => void;
}

export interface VisibilityController {
  readonly state: VisibilityState;
  /** Re-read visibility and fire transitions if the state changed. */
  sync(): void;
}

export function createVisibilityController(
  options: VisibilityControllerOptions,
): VisibilityController {
  let state: VisibilityState = options.isHidden() ? 'hidden' : 'visible';

  return {
    get state() {
      return state;
    },

    sync() {
      const next: VisibilityState = options.isHidden() ? 'hidden' : 'visible';
      if (next === state) return;
      state = next;
      if (next === 'hidden') options.onPause();
      else options.onResume();
    },
  };
}
