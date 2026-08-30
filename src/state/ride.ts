import { rideComponentsOf, selectRideComponents, type TrainPath } from '../core/pathing';
import type { PlacedPiece } from '../core/track-graph';
import type { WorldStore } from './world';

/** The controller's two states: building on the meadow, or riding the rails. */
export type RideMode = 'idle' | 'riding';

/** Everything the scene needs to animate one ride. */
export interface RideState {
  /** The component's unique anchor (its smallest cell key) — the registry key. */
  anchor: string;
  /** Piece ids of the component, for scoped mid-ride edits. */
  pieceIds: readonly string[];
  /** The solved route (closed loops cycle; open paths shuttle back). */
  path: TrainPath;
  /** Travel direction along `path.steps` — +1 forward, −1 shuttling back. */
  direction: 1 | -1;
}

export type RideListener = (mode: RideMode, rides: readonly RideState[]) => void;

export interface RideController {
  mode(): RideMode;
  /** The active rides, ranked most pieces first. */
  rides(): readonly RideState[];
  /**
   * The primary ride — the largest active one (kept after a stop for the
   * camera), or `null` while idle before the first start.
   */
  ride(): RideState | null;
  /** Re-solves the live layout and starts one ride per selected component (cap 4). */
  startAll(): boolean;
  /** Gently stops every ride. The last paths are kept for the camera. */
  stopAll(): void;
  /** ▶ convenience — alias of `startAll()` while the scene migrates. */
  start(): boolean;
  /** ⏹ convenience — alias of `stopAll()`. */
  stop(): void;
  subscribe(listener: RideListener): () => void;
}

/**
 * Rides are built from the world as it is *right now* — one per connected
 * track component, ranked most pieces first and capped at four concurrent
 * rides (beyond-cap components sit idle as static scenery). Edits are scoped:
 * a world change softly stops only the rides whose component is no longer
 * intact; scenery moves and train-kind switches never touch a running ride.
 * A mid-ride edit is a new ride waiting to happen, never an error.
 */
export function createRideController(world: WorldStore): RideController {
  let mode: RideMode = 'idle';
  const active = new Map<string, RideState>();
  let ranked: RideState[] = [];
  let lastPrimary: RideState | null = null;

  const listeners = new Set<RideListener>();
  const notify = () => {
    for (const listener of listeners) listener(mode, ranked);
  };

  const rebuildRanked = (): void => {
    ranked = [...active.values()].sort(
      (a, b) => b.pieceIds.length - a.pieceIds.length || (a.anchor < b.anchor ? -1 : 1),
    );
    if (ranked[0]) lastPrimary = ranked[0];
  };

  /** Piece ids that were removed, moved, or re-turned since the last snapshot. */
  const editedIds = (
    before: readonly PlacedPiece[],
    after: readonly PlacedPiece[],
  ): Set<string> => {
    const beforeById = new Map(before.map((p) => [p.id, p] as const));
    const edited = new Set<string>();
    const seen = new Set<string>();
    for (const piece of after) {
      seen.add(piece.id);
      const was = beforeById.get(piece.id);
      if (
        !was ||
        was.cell.x !== piece.cell.x ||
        was.cell.y !== piece.cell.y ||
        was.rotation !== piece.rotation
      ) {
        edited.add(piece.id);
      }
    }
    for (const piece of before) if (!seen.has(piece.id)) edited.add(piece.id);
    return edited;
  };

  const startAll = (): boolean => {
    const selected = selectRideComponents(rideComponentsOf(world.pieces()));
    let started = false;
    for (const component of selected) {
      if (active.has(component.anchor)) continue; // already riding — untouched
      active.set(component.anchor, {
        anchor: component.anchor,
        pieceIds: component.pieceIds,
        path: component.path,
        direction: 1,
      });
      started = true;
    }
    if (started) {
      rebuildRanked();
      mode = 'riding';
      notify();
    }
    return active.size > 0;
  };

  const stopAll = (): void => {
    if (active.size === 0) return;
    active.clear();
    ranked = [];
    mode = 'idle';
    notify();
  };

  // Edits are scoped: only rides whose component was touched (edited piece or
  // reshaped membership) soft-stop. Scenery and train-kind changes never do.
  let previousPieces = world.pieces();
  world.subscribe((pieces) => {
    const edited = editedIds(previousPieces, pieces);
    previousPieces = pieces;
    if (active.size === 0 || edited.size === 0) return;

    const liveSets = rideComponentsOf(pieces).map((c) => new Set(c.pieceIds));
    let stoppedAny = false;
    for (const [anchor, rideState] of [...active]) {
      const mine = new Set(rideState.pieceIds);
      const touched = rideState.pieceIds.some((id) => edited.has(id));
      const intact = liveSets.some((set) => sameSet(set, mine));
      if (touched || !intact) {
        active.delete(anchor);
        stoppedAny = true;
      }
    }
    if (stoppedAny) {
      rebuildRanked();
      mode = active.size > 0 ? 'riding' : 'idle';
      notify();
    }
  });

  return {
    mode: () => mode,
    rides: () => ranked,
    ride: () => lastPrimary,
    startAll,
    stopAll,
    start: () => startAll(),
    stop: () => stopAll(),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Same members → the same component survived the edit untouched. */
function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) if (!b.has(id)) return false;
  return true;
}
