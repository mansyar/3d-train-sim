import { solvePath, type TrainPath } from '../core/pathing';
import type { WorldStore } from './world';

/** The controller's two states: building on the meadow, or riding the rails. */
export type RideMode = 'idle' | 'riding';

/** Everything the scene needs to animate one ride. */
export interface RideState {
  /** The solved route (closed loops cycle; open paths shuttle back). */
  path: TrainPath;
  /** Travel direction along `path.steps` — +1 forward, −1 shuttling back. */
  direction: 1 | -1;
}

export type RideListener = (mode: RideMode, ride: RideState | null) => void;

export interface RideController {
  mode(): RideMode;
  /** The current ride, or `null` while idle before the first start. */
  ride(): RideState | null;
  /** Solves the live layout and starts riding. Refuses an empty meadow. */
  start(): boolean;
  /** Eases the ride back to idle. The last path is kept for the camera. */
  stop(): void;
  subscribe(listener: RideListener): () => void;
}

/**
 * Rides are built from the world as it is *right now* — and torn down gently
 * the moment the world changes under the train (a piece moved mid-ride is a
 * new ride waiting to happen, never an error).
 */
export function createRideController(world: WorldStore): RideController {
  let mode: RideMode = 'idle';
  let state: RideState | null = null;
  const listeners = new Set<RideListener>();
  const notify = () => {
    for (const listener of listeners) listener(mode, state);
  };

  // A mid-ride edit gently stops the train; the scene eases it out.
  world.subscribe(() => {
    if (mode === 'riding') {
      mode = 'idle';
      notify();
    }
  });

  return {
    mode: () => mode,
    ride: () => state,

    start() {
      const path = solvePath(world.pieces());
      if (path.steps.length === 0) return false;
      state = { path, direction: 1 };
      mode = 'riding';
      notify();
      return true;
    },

    stop() {
      if (mode === 'idle') return;
      mode = 'idle';
      notify();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
