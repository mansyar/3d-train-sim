import { describe, expect, it } from 'vitest';

import {
  BOOT_GUARD_MS,
  PROBE_INTERVAL_MS,
  shouldProbeForUpdate,
  shouldReload,
} from './update-state';

describe('shouldReload', () => {
  it('reloads once the table is quiet, past the boot guard, and not yet reloaded', () => {
    expect(shouldReload({ rideActive: false, uptimeMs: 20_000, alreadyReloaded: false })).toBe(
      true,
    );
  });

  it('defers the reload while a train is riding', () => {
    expect(shouldReload({ rideActive: true, uptimeMs: 20_000, alreadyReloaded: false })).toBe(
      false,
    );
  });

  it('never reloads within the boot guard, even when fully idle', () => {
    expect(
      shouldReload({ rideActive: false, uptimeMs: BOOT_GUARD_MS - 1, alreadyReloaded: false }),
    ).toBe(false);
  });

  it('reloads exactly at the boot-guard threshold', () => {
    expect(
      shouldReload({ rideActive: false, uptimeMs: BOOT_GUARD_MS, alreadyReloaded: false }),
    ).toBe(true);
  });

  it('never reloads twice for the same update', () => {
    expect(shouldReload({ rideActive: false, uptimeMs: 60_000, alreadyReloaded: true })).toBe(
      false,
    );
  });
});

describe('shouldProbeForUpdate', () => {
  it('probes on first visibility when no probe has run yet', () => {
    expect(shouldProbeForUpdate({ visible: true, msSinceLastProbe: null })).toBe(true);
  });

  it('probes when the tab is visible and the interval has elapsed', () => {
    expect(shouldProbeForUpdate({ visible: true, msSinceLastProbe: PROBE_INTERVAL_MS })).toBe(true);
  });

  it('does not probe again before the interval elapses', () => {
    expect(shouldProbeForUpdate({ visible: true, msSinceLastProbe: PROBE_INTERVAL_MS - 1 })).toBe(
      false,
    );
  });

  it('never probes while the tab is hidden, no matter how long it has been', () => {
    expect(shouldProbeForUpdate({ visible: false, msSinceLastProbe: null })).toBe(false);
    expect(shouldProbeForUpdate({ visible: false, msSinceLastProbe: PROBE_INTERVAL_MS * 10 })).toBe(
      false,
    );
  });
});
