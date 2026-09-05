import { describe, expect, it } from 'vitest';
import { TRAIN_KINDS, trainAria, trainIcon, trainModelUrl, trainWhistle } from './trains';

describe('train catalog', () => {
  it('offers exactly six distinct locomotives', () => {
    expect([...TRAIN_KINDS]).toEqual(['steam', 'diesel', 'tram', 'express', 'freight', 'bullet']);
    expect(new Set(TRAIN_KINDS).size).toBe(6);
  });

  it('gives every train a local model, icon, label, and whistle personality', () => {
    for (const kind of TRAIN_KINDS) {
      expect(trainModelUrl(kind)).toMatch(/^\/assets\/train-kit\/[\w-]+\.glb$/);
      expect(trainIcon(kind).length).toBeGreaterThan(0);
      expect(trainAria(kind).length).toBeGreaterThan(0);
      expect(trainWhistle(kind).length).toBeGreaterThan(0);
    }
  });

  it('maps the new fleet engines to the vendored kit models', () => {
    expect(trainModelUrl('express')).toBe('/assets/train-kit/train-locomotive-b.glb');
    expect(trainModelUrl('freight')).toBe('/assets/train-kit/train-diesel-box-a.glb');
    expect(trainModelUrl('bullet')).toBe('/assets/train-kit/train-electric-bullet-a.glb');
  });

  it('reuses existing whistle profiles for the new engines', () => {
    expect(trainWhistle('express')).toBe('whistle-steam');
    expect(trainWhistle('freight')).toBe('whistle-diesel');
    expect(trainWhistle('bullet')).toBe('whistle-tram');
  });

  it('gives every engine its own chunky icon and aria label', () => {
    const icons = TRAIN_KINDS.map(trainIcon);
    expect(new Set(icons).size).toBe(TRAIN_KINDS.length);
    for (const kind of TRAIN_KINDS) {
      expect(trainIcon(kind)).toContain('<svg');
      expect(trainAria(kind)).toMatch(/^[A-Z]/);
    }
  });

  it('returns stable values for repeated catalog lookups', () => {
    for (const kind of TRAIN_KINDS) {
      expect(trainModelUrl(kind)).toBe(trainModelUrl(kind));
      expect(trainIcon(kind)).toBe(trainIcon(kind));
      expect(trainAria(kind)).toBe(trainAria(kind));
      expect(trainWhistle(kind)).toBe(trainWhistle(kind));
    }
  });
});
