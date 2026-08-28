import { describe, expect, it } from 'vitest';
import { type Edge, endpointsFor, FOOTPRINT_CELLS, PIECE_TYPES, type Rotation } from './pieces';

const ALL_ROTATIONS: Rotation[] = [0, 90, 180, 270];

/** Canonical edge order the catalog must always return. */
const CANONICAL: Edge[] = ['north', 'east', 'south', 'west'];

function canonical(edges: Edge[]): Edge[] {
  return CANONICAL.filter((edge) => edges.includes(edge));
}

describe('piece catalog', () => {
  it('offers exactly the V1 piece set: straight and corner', () => {
    expect([...PIECE_TYPES].sort()).toEqual(['corner', 'straight']);
  });

  it('gives every piece a 1-cell footprint', () => {
    expect(FOOTPRINT_CELLS).toBe(1);
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

  it('gives every piece exactly two endpoints (one joins two edges)', () => {
    for (const type of PIECE_TYPES) {
      for (const rotation of ALL_ROTATIONS) {
        expect(endpointsFor(type, rotation)).toHaveLength(2);
      }
    }
  });
});
