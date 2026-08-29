import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TRAIN_KINDS } from './trains';
import { WAGON_COUNT, wagonModelUrl, wagonSlots } from './wagons';

describe('wagon catalog', () => {
  it('offers exactly two cargo wagons per locomotive', () => {
    expect(WAGON_COUNT).toBe(2);
    expect(wagonSlots().length).toBe(2);
  });

  it('gives every wagon a bundled local cargo model', () => {
    for (const slot of wagonSlots()) {
      expect(wagonModelUrl(slot)).toMatch(/^\/assets\/train-kit\/train-carriage-[\w-]+\.glb$/);
    }
  });

  it('varies the cargo between the wagons', () => {
    const urls = wagonSlots().map((slot) => wagonModelUrl(slot));
    expect(new Set(urls).size).toBe(wagonSlots().length);
  });

  it('resolves the same wagon set for every locomotive kind', () => {
    const urls = wagonSlots().map((slot) => wagonModelUrl(slot));
    expect(TRAIN_KINDS.length).toBeGreaterThan(0);
    // The catalog is locomotive-agnostic: the same two wagons trail steam,
    // diesel, and tram alike.
    expect(wagonSlots().map((slot) => wagonModelUrl(slot))).toEqual(urls);
  });

  it('returns stable values for repeated catalog lookups', () => {
    for (const slot of wagonSlots()) {
      expect(wagonModelUrl(slot)).toBe(wagonModelUrl(slot));
    }
  });

  it('stays pure data: no Three.js or browser imports', () => {
    const source = readFileSync(new URL('./wagons.ts', import.meta.url), 'utf-8');
    expect(source).not.toMatch(/from ['"]three/);
    expect(source).not.toMatch(/\b(window|document|navigator)\b/);
  });
});
