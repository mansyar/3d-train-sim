import { describe, expect, it } from 'vitest';

import { createSteamPuffPool } from './steam-puffs';

describe('createSteamPuffPool', () => {
  it('creates exactly sixteen reusable slots', () => {
    const pool = createSteamPuffPool();

    expect(pool.capacity).toBe(16);
    expect(pool.activeCount()).toBe(0);
  });

  it('emits into an inactive slot and drops when saturated', () => {
    const pool = createSteamPuffPool();

    for (let i = 0; i < 16; i += 1) {
      expect(pool.emit(10, 2, -4)).toBe(true);
    }
    expect(pool.emit(10, 2, -4)).toBe(false);
    expect(pool.activeCount()).toBe(16);
  });

  it('rises, expands, and fades over one second', () => {
    const pool = createSteamPuffPool();
    pool.emit(1, 2, 3);

    pool.update(0.5);
    const middle = pool.slot(0);
    expect(middle.active).toBe(true);
    expect(middle.x).toBe(1);
    expect(middle.y).toBeGreaterThan(2);
    expect(middle.z).toBe(3);
    expect(middle.scale).toBeGreaterThan(1);
    expect(middle.opacity).toBeGreaterThan(0);
    expect(middle.opacity).toBeLessThan(1);

    pool.update(0.5);
    expect(pool.slot(0).active).toBe(false);
    expect(pool.activeCount()).toBe(0);
  });

  it('keeps active puffs alive when emission is stopped', () => {
    const pool = createSteamPuffPool();
    pool.emit(0, 0, 0);

    pool.setEmitting(false);
    pool.update(0.5);
    expect(pool.activeCount()).toBe(1);
    expect(pool.emit(0, 0, 0)).toBe(false);

    pool.update(0.5);
    expect(pool.activeCount()).toBe(0);
  });
});
