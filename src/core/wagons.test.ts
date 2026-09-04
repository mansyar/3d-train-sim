import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TRAIN_KINDS } from './trains';
import {
  consistPreset,
  defaultConsist,
  isWagonPreset,
  resolveWagonPreset,
  WAGON_COUNT,
  WAGON_PRESETS,
  wagonModelUrl,
  wagonPresetAria,
  wagonPresetIcon,
  wagonPresetUrls,
  wagonSlots,
  withConsistPreset,
} from './wagons';

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

describe('wagon workshop presets', () => {
  it('offers exactly four curated pair presets, classic first', () => {
    expect([...WAGON_PRESETS]).toEqual(['classic', 'coal', 'tank', 'container']);
  });

  it('defaults every locomotive to the classic consist', () => {
    const consist = defaultConsist();
    for (const kind of TRAIN_KINDS) {
      expect(consist[kind]).toBe('classic');
    }
  });

  it('keeps the classic preset identical to the lumber+box consist', () => {
    const classic = wagonPresetUrls('classic');
    expect(classic.lead).toBe(wagonModelUrl('lead'));
    expect(classic.rear).toBe(wagonModelUrl('rear'));
  });

  it('resolves bundled local models for every preset slot', () => {
    for (const preset of WAGON_PRESETS) {
      const urls = wagonPresetUrls(preset);
      for (const slot of wagonSlots()) {
        expect(urls[slot]).toMatch(/^\/assets\/train-kit\/train-carriage-[\w-]+\.glb$/);
      }
    }
  });

  it('gives each preset its kit identities', () => {
    expect(wagonPresetUrls('coal')).toEqual({
      lead: '/assets/train-kit/train-carriage-coal.glb',
      rear: '/assets/train-kit/train-carriage-coal.glb',
    });
    expect(wagonPresetUrls('tank')).toEqual({
      lead: '/assets/train-kit/train-carriage-tank.glb',
      rear: '/assets/train-kit/train-carriage-tank-large.glb',
    });
    expect(wagonPresetUrls('container')).toEqual({
      lead: '/assets/train-kit/train-carriage-container-red.glb',
      rear: '/assets/train-kit/train-carriage-container-blue.glb',
    });
  });

  it('gives every preset a chunky icon and a distinct label', () => {
    const labels = new Set<string>();
    for (const preset of WAGON_PRESETS) {
      const icon = wagonPresetIcon(preset);
      expect(icon).toContain('<svg');
      expect(icon).toContain('viewBox="0 0 48 48"');
      expect(wagonPresetIcon(preset)).toBe(icon);
      const aria = wagonPresetAria(preset);
      expect(aria.length).toBeGreaterThan(0);
      labels.add(aria);
    }
    expect(labels.size).toBe(WAGON_PRESETS.length);
  });

  it('sets one train without touching the others', () => {
    const before = defaultConsist();
    const after = withConsistPreset(before, 'diesel', 'coal');
    expect(after.diesel).toBe('coal');
    expect(after.steam).toBe('classic');
    expect(after.tram).toBe('classic');
    expect(before.diesel).toBe('classic');
  });

  it('recognizes only the four curated presets', () => {
    for (const preset of WAGON_PRESETS) {
      expect(isWagonPreset(preset)).toBe(true);
    }
    for (const raw of ['rocket', '', 'lumber', null, undefined, 42]) {
      expect(isWagonPreset(raw)).toBe(false);
    }
  });

  it('forgives unknown presets back to classic', () => {
    expect(resolveWagonPreset('rocket')).toBe('classic');
    expect(resolveWagonPreset(undefined)).toBe('classic');
    expect(resolveWagonPreset('coal')).toBe('coal');
  });

  it('forgives corrupt consist entries back to classic', () => {
    const corrupt = JSON.parse('{"steam":"rocket"}');
    expect(consistPreset(corrupt, 'steam')).toBe('classic');
    expect(consistPreset(defaultConsist(), 'tram')).toBe('classic');
  });

  it('keeps the workshop pure data: no Three.js or browser imports', () => {
    const source = readFileSync(new URL('./wagons.ts', import.meta.url), 'utf-8');
    expect(source).not.toMatch(/from ['"]three/);
    expect(source).not.toMatch(/\b(window|document|navigator)\b/);
  });
});
