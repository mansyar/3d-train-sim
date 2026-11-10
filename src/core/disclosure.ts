/**
 * Progressive disclosure: the basics-only toybox and its ride-count unlock.
 * Fresh installs see every catalog kind except the advanced tier
 * (`switch-3way`, `switch-slip`, `station`); the third completed ride reveals
 * the full toybox. Pure data and pure transitions — no browser or Three.js
 * coupling — so the drawer, the ride controller, and the save layer can all
 * share it. Call the selectors on drawer-open and ride-end, never per frame.
 */

import { PIECE_TYPES, type PieceType } from './pieces';
import { SCENERY_KINDS, type SceneryKind } from './scenery';

/** Every toy kind the drawer can show. */
export type ToyKind = PieceType | SceneryKind;

/**
 * The advanced tier, hidden while locked: the two big junctions and the
 * cargo-loop gate. Everything else in the catalogs is basics.
 */
export const ADVANCED_KINDS = ['switch-3way', 'switch-slip', 'station'] as const;
export type AdvancedKind = (typeof ADVANCED_KINDS)[number];

/** Completed rides needed to reveal the advanced tier (spec interview decision). */
export const UNLOCK_RIDE_COUNT = 3;

/**
 * Persistable disclosure progress: the completed-ride count plus the unlock
 * flag. Plain data only — no class instances — so it round-trips through the
 * world save untouched, and Phase 3 can store it as-is.
 */
export interface DisclosureState {
  completedRides: number;
  unlocked: boolean;
}

/** A fresh install: zero rides, basics tier. */
export function createDisclosureState(): DisclosureState {
  return { completedRides: 0, unlocked: false };
}

/** True only for the three advanced kinds; unknown future kinds fail open to basics. */
export function isAdvancedKind(kind: string): kind is AdvancedKind {
  return (ADVANCED_KINDS as readonly string[]).includes(kind);
}

/** Whether a kind shows in the toybox under the given state. */
export function isKindVisible(kind: string, state: DisclosureState): boolean {
  return state.unlocked || !isAdvancedKind(kind);
}

/** Every kind the toybox shows under the given state, in catalog order. */
export function visibleKinds(state: DisclosureState): ToyKind[] {
  if (state.unlocked) return [...PIECE_TYPES, ...SCENERY_KINDS];
  return [
    ...PIECE_TYPES.filter((kind) => !isAdvancedKind(kind)),
    ...SCENERY_KINDS.filter((kind) => !isAdvancedKind(kind)),
  ];
}

/**
 * Records one completed ride (a ▶ run with the train moving, ended by ⏹ or
 * ride end — pause/resume never reaches here, so it cannot double-count).
 * Returns a new state; the input is never mutated.
 */
export function recordCompletedRide(state: DisclosureState): DisclosureState {
  const completedRides = state.completedRides + 1;
  return { completedRides, unlocked: state.unlocked || completedRides >= UNLOCK_RIDE_COUNT };
}

/**
 * Grandfather rule: a world already holding an advanced piece counts as
 * unlocked, with every piece kept — this model never deletes pieces, it only
 * flips the flag. Takes the world's piece types plus scenery kinds.
 */
export function applyGrandfather(
  state: DisclosureState,
  kinds: readonly string[],
): DisclosureState {
  if (state.unlocked || !kinds.some((kind) => isAdvancedKind(kind))) return state;
  return { completedRides: state.completedRides, unlocked: true };
}

/**
 * Reads disclosure progress forgivingly for save/load: anything missing or
 * malformed falls back to a fresh locked state, and a salvaged count that
 * already met the threshold carries its unlock with it.
 */
export function parseDisclosureState(value: unknown): DisclosureState {
  if (typeof value !== 'object' || value === null) return createDisclosureState();
  const record = value as Record<string, unknown>;
  const completedRides =
    typeof record.completedRides === 'number' &&
    Number.isInteger(record.completedRides) &&
    record.completedRides >= 0
      ? record.completedRides
      : 0;
  const unlocked = record.unlocked === true || completedRides >= UNLOCK_RIDE_COUNT;
  return { completedRides, unlocked };
}
