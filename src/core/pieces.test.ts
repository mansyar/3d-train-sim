import { describe, expect, it } from 'vitest';
import { type Edge, endpointsFor, FOOTPRINT_CELLS, PIECE_TYPES, type Rotation } from './pieces';

const ALL_ROTATIONS: Rotation[] = [0, 90, 180, 270];

/** Canonical edge order the catalog must always return. */
const CANONICAL: Edge[] = ['north', 'east', 'south', 'west'];

function canonical(edges: Edge[]): Edge[] {
  return CANONICAL.filter((edge) => edges.includes(edge));
}

describe('piece catalog', () => {
  it('offers exactly the piece set: straight, corner, crossing, and bridge', () => {
    expect([...PIECE_TYPES].sort()).toEqual(['bridge', 'corner', 'crossing', 'straight']);
  });

  it('gives every piece a 1-cell footprint', () => {
    expect(FOOTPRINT_CELLS).toBe(1);
  });
});

describe('bridge piece geometry', () => {
  it('joins opposite edges exactly like a straight — trains ride across unchanged', () => {
    expect(endpointsFor('bridge', 0)).toEqual(['north', 'south']);
    expect(endpointsFor('bridge', 90)).toEqual(['east', 'west']);
    // Symmetric under 180°, same as the straight it mirrors.
    expect(endpointsFor('bridge', 180)).toEqual(['north', 'south']);
    expect(endpointsFor('bridge', 270)).toEqual(['east', 'west']);
  });
});

describe('endpointsFor', () => {
  it('joins opposite edges for the straight piece at every rotation', () => {
    expect(endpointsFor('straight', 0)).toEqual(['north', 'south']);
    expect(endpointsFor('straight', 90)).toEqual(['east', 'west']);
    // A straight is symmetric: 180° maps it back onto itself.
    expect(endpointsFor('straight', 180)).toEqual(['north', 'south']);
    expect(endpointsFor('straight', 270)).toEqual(['east', 'west']);
  });

  it('walks the corner join clockwise through all rotations', () => {
    expect(endpointsFor('corner', 0)).toEqual(['north', 'east']);
    expect(endpointsFor('corner', 90)).toEqual(['east', 'south']);
    expect(endpointsFor('corner', 180)).toEqual(['south', 'west']);
    expect(endpointsFor('corner', 270)).toEqual(['north', 'west']);
  });

  it('returns endpoints in canonical edge order for stable comparisons', () => {
    for (const type of PIECE_TYPES) {
      for (const rotation of ALL_ROTATIONS) {
        const edges = endpointsFor(type, rotation);
        expect(edges).toEqual(canonical(edges));
      }
    }
  });

  it('gives two-end pieces exactly two endpoints (one joins two edges)', () => {
    for (const type of ['straight', 'corner'] as const) {
      for (const rotation of ALL_ROTATIONS) {
        expect(endpointsFor(type, rotation)).toHaveLength(2);
      }
    }
  });
});

describe('endpointsFor — crossing', () => {
  it('joins all four edges at every rotation', () => {
    for (const rotation of ALL_ROTATIONS) {
      expect(endpointsFor('crossing', rotation)).toEqual(CANONICAL);
    }
  });

  it('is rotation-invariant (4-fold symmetric)', () => {
    expect(endpointsFor('crossing', 90)).toEqual(endpointsFor('crossing', 0));
    expect(endpointsFor('crossing', 270)).toEqual(endpointsFor('crossing', 0));
  });
});
