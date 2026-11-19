import { describe, expect, it } from 'vitest';
import {
  actionAtStop,
  type CargoAction,
  type CargoLoad,
  deliveredCountAfter,
  loadAfterAction,
  MAX_DELIVERED_CRATES,
} from './cargo';
import {
  arcLift,
  resolveTransferProgress,
  TRANSFER_DURATION_SECONDS,
  TRANSFER_LIFT,
  type TransferPoint,
  transferPoint,
  transferProgress,
} from './cargo-transfer';
import { serializeWorld } from './save';
import { defaultConsist, withConsistPreset } from './wagons';

// Scene coordinates (y is up): a platform slot and a wagon bed that differ in
// both height and horizontal position, like the real crate hand-off.
const platform: TransferPoint = { x: 2, y: 0.6, z: 3 };
const wagon: TransferPoint = { x: 5, y: 1.1, z: 3 };

function scratch(): TransferPoint {
  return { x: 0, y: 0, z: 0 };
}

function expectPoint(actual: TransferPoint, expected: TransferPoint): void {
  expect(actual.x).toBeCloseTo(expected.x, 10);
  expect(actual.y).toBeCloseTo(expected.y, 10);
  expect(actual.z).toBeCloseTo(expected.z, 10);
}

describe('transferProgress', () => {
  it('starts at 0, ends at 1, and is bounded within the short duration', () => {
    expect(transferProgress(0, TRANSFER_DURATION_SECONDS)).toBe(0);
    expect(transferProgress(TRANSFER_DURATION_SECONDS, TRANSFER_DURATION_SECONDS)).toBe(1);
    expect(transferProgress(TRANSFER_DURATION_SECONDS * 2, TRANSFER_DURATION_SECONDS)).toBe(1);
    expect(transferProgress(-1, TRANSFER_DURATION_SECONDS)).toBe(0);
    expect(transferProgress(TRANSFER_DURATION_SECONDS / 2, TRANSFER_DURATION_SECONDS)).toBe(0.5);
  });

  it('advances monotonically across frames', () => {
    let previous = -1;
    for (let frame = 0; frame <= 10; frame++) {
      const progress = transferProgress(frame * (TRANSFER_DURATION_SECONDS / 10));
      expect(progress).toBeGreaterThanOrEqual(previous);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
      previous = progress;
    }
    expect(previous).toBe(1);
  });

  it('snaps instantly for a zero or negative duration', () => {
    expect(transferProgress(0.1, 0)).toBe(1);
    expect(transferProgress(0.1, -1)).toBe(1);
  });
});

describe('arcLift', () => {
  it('is zero at both endpoints and peaks gently at the midpoint', () => {
    expect(arcLift(0)).toBe(0);
    expect(arcLift(1)).toBe(0);
    expect(arcLift(0.5)).toBe(1);
  });

  it('is symmetric, bounded, and deterministic for either direction', () => {
    for (const p of [0.1, 0.25, 0.75, 0.9]) {
      expect(arcLift(p)).toBeCloseTo(arcLift(1 - p), 10);
    }
    expect(arcLift(0.25)).toBe(arcLift(0.25));
    expect(arcLift(2)).toBe(0);
    expect(arcLift(-1)).toBe(0);
  });
});

describe('transferPoint', () => {
  it('starts at the platform endpoint and ends at the wagon endpoint', () => {
    const out = scratch();
    transferPoint(platform, wagon, 0, out);
    expectPoint(out, platform);
    transferPoint(platform, wagon, 1, out);
    expectPoint(out, wagon);
  });

  it('has a deterministic midpoint with a short lift above the straight path', () => {
    const out = scratch();
    const mid = transferPoint(platform, wagon, 0.5, out);
    expect(mid.x).toBeCloseTo((platform.x + wagon.x) / 2, 10);
    expect(mid.z).toBeCloseTo((platform.z + wagon.z) / 2, 10);
    expect(mid.y).toBeCloseTo((platform.y + wagon.y) / 2 + TRANSFER_LIFT, 10);
    // A lift well under one world unit reads as a gentle arc, not a flight.
    expect(TRANSFER_LIFT).toBeLessThan(1);
    expectPoint(transferPoint(platform, wagon, 0.5, scratch()), mid);
  });

  it('interpolates the same way in both directions (direction-independent)', () => {
    const load = transferPoint(platform, wagon, 0.5, scratch());
    const deliver = transferPoint(wagon, platform, 0.5, scratch());
    expect(load.x).toBeCloseTo(deliver.x, 10);
    expect(load.z).toBeCloseTo(deliver.z, 10);
    expect(load.y - (platform.y + wagon.y) / 2).toBeCloseTo(TRANSFER_LIFT, 10);
    expect(deliver.y - (wagon.y + platform.y) / 2).toBeCloseTo(TRANSFER_LIFT, 10);
  });

  it('writes into the caller point so the per-frame path allocates nothing', () => {
    const out = scratch();
    expect(transferPoint(platform, wagon, 0.25, out)).toBe(out);
    for (let frame = 0; frame <= 20; frame++) {
      expect(transferPoint(platform, wagon, frame / 20, out)).toBe(out);
    }
  });
});

describe('resolveTransferProgress (cancel-and-snap)', () => {
  it('snaps to the final destination when a transfer is cancelled mid-arc', () => {
    expect(resolveTransferProgress(0.42, true)).toBe(1);
    const out = scratch();
    transferPoint(platform, wagon, resolveTransferProgress(0.42, true), out);
    expectPoint(out, wagon);
    transferPoint(wagon, platform, resolveTransferProgress(0.42, true), out);
    expectPoint(out, platform);
  });

  it('keeps live progress while active and clamps it to the arc', () => {
    expect(resolveTransferProgress(0.42, false)).toBe(0.42);
    expect(resolveTransferProgress(5, false)).toBe(1);
    expect(resolveTransferProgress(-2, false)).toBe(0);
  });
});

/**
 * P1.T2 — frozen data contract. These guards live here because phase 1's
 * Touches are limited to this test file; the assertions themselves prove the
 * cargo types/helpers and persisted keys did not move with the view work.
 */
describe('frozen cargo/save contract (P1.T2)', () => {
  it('keeps CargoLoad, CargoAction, and the pure cargo helpers unchanged', () => {
    // The annotations make tsc fail if either union gains or loses a member.
    const loads: CargoLoad[] = ['empty', 'loaded'];
    const actions: CargoAction[] = ['load', 'deliver'];
    expect(loads).toEqual(['empty', 'loaded']);
    expect(actions).toEqual(['load', 'deliver']);

    expect(actionAtStop('empty')).toBe('load');
    expect(actionAtStop('loaded')).toBe('deliver');
    expect(loadAfterAction('load')).toBe('loaded');
    expect(loadAfterAction('deliver')).toBe('empty');
    expect(deliveredCountAfter(0)).toBe(1);
    expect(deliveredCountAfter(MAX_DELIVERED_CRATES - 1)).toBe(MAX_DELIVERED_CRATES);
    expect(deliveredCountAfter(MAX_DELIVERED_CRATES)).toBe(MAX_DELIVERED_CRATES);
    expect(MAX_DELIVERED_CRATES).toBe(8);
  });

  it('keeps the persisted world snapshot keys unchanged', () => {
    const minimal = serializeWorld([], []);
    expect(Object.keys(minimal).sort()).toEqual(['version', 'pieces', 'scenery', 'train'].sort());

    const full = serializeWorld(
      [{ id: 'piece-1', type: 'straight', cell: { x: 0, y: 0 }, rotation: 0 }],
      [{ id: 'scenery-1', kind: 'station', cell: { x: 1, y: 0 }, rotation: 0 }],
      'steam',
      true,
      { 'scenery-1': 2 },
      withConsistPreset(defaultConsist(), 'steam', 'coal'),
      'dusk',
      { completedRides: 1, unlocked: false },
      true,
    );
    expect(Object.keys(full).sort()).toEqual(
      [
        'version',
        'pieces',
        'scenery',
        'train',
        'preferences',
        'deliveries',
        'consist',
        'disclosure',
      ].sort(),
    );
  });
});
