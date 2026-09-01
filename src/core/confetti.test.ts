import { describe, expect, it } from 'vitest';
import { CONFETTI_LIFETIME, CONFETTI_POOL_SIZE, createConfettiPool } from './confetti';

describe('confetti pool', () => {
  it('spawns a burst of particles at the delivery point', () => {
    const pool = createConfettiPool();
    const spawned = pool.burst(1, 0.5, 2, 18);

    expect(spawned).toBe(18);
    expect(pool.activeCount()).toBe(18);
    const first = pool.slot(0);
    expect(first.active).toBe(true);
    expect(first.x).toBe(1);
    expect(first.y).toBe(0.5);
    expect(first.z).toBe(2);
    // Every particle launches upward — the burst pops, then falls.
    expect(first.vy).toBeGreaterThan(0);
  });

  it('caps bursts at the pool capacity', () => {
    const pool = createConfettiPool();
    pool.burst(0, 0, 0, 18);
    const overflow = pool.burst(0, 0, 0, 18);

    expect(pool.activeCount()).toBeLessThanOrEqual(CONFETTI_POOL_SIZE);
    expect(overflow).toBeLessThanOrEqual(18);
  });

  it('ages particles with gravity and retires them at their lifetime', () => {
    const pool = createConfettiPool();
    pool.burst(0, 0, 0, 1);
    const particle = pool.slot(0);
    const startVy = particle.vy;
    const startY = particle.y;

    pool.update(0.1);
    expect(particle.age).toBeCloseTo(0.1);
    // Gravity pulls harder than the launch rise after the first instants.
    expect(particle.vy).toBeLessThan(startVy);
    expect(particle.y).toBeGreaterThan(startY - 0.001);

    pool.update(CONFETTI_LIFETIME);
    expect(particle.active).toBe(false);
    expect(pool.activeCount()).toBe(0);
  });

  it('recycles retired slots for later bursts', () => {
    const pool = createConfettiPool();
    pool.burst(0, 0, 0, 1);
    pool.update(CONFETTI_LIFETIME);

    expect(pool.burst(0, 0, 0, 1)).toBe(1);
  });

  it('gives particles a palette color index', () => {
    const pool = createConfettiPool();
    pool.burst(0, 0, 0, 8);
    for (let i = 0; i < 8; i += 1) {
      const index = pool.slot(i).colorIndex;
      expect(index).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(index)).toBe(true);
    }
  });
});
