/**
 * The station cargo cycle: every train's wagons alternate between hauling a
 * crate and having just delivered one. Pure data — the ride wires these
 * answers into its existing station pauses, and the world tracks how many
 * crates each station has received.
 */

/** How many crates one station's platform can show. */
export const MAX_DELIVERED_CRATES = 8;

/** The wagons' cargo state on one train. */
export type CargoLoad = 'empty' | 'loaded';

/** What a station stop asks the train to do. */
export type CargoAction = 'load' | 'deliver';

/**
 * The stop's job: empty wagons load, loaded wagons deliver. The answer
 * alternates by itself — no route bookkeeping, and a single-station loop
 * still loads and delivers on alternating laps.
 */
export function actionAtStop(load: CargoLoad): CargoAction {
  return load === 'empty' ? 'load' : 'deliver';
}

/** The wagons' state once the action is done. */
export function loadAfterAction(action: CargoAction): CargoLoad {
  return action === 'load' ? 'loaded' : 'empty';
}

/**
 * The station's delivered count after one more delivery. The platform only
 * holds MAX_DELIVERED_CRATES crates; later deliveries still celebrate but
 * the pile stops growing.
 */
export function deliveredCountAfter(current: number): number {
  return Math.min(current + 1, MAX_DELIVERED_CRATES);
}
