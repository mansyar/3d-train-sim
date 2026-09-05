import { describe, expect, it } from 'vitest';
import {
  type Edge,
  endpointsFor,
  FOOTPRINT_CELLS,
  isBumpPiece,
  isCornerPiece,
  PIECE_TYPES,
  type PieceType,
  type Rotation,
} from './pieces';

const ALL_ROTATIONS: Rotation[] = [0, 90, 180, 270];

/** Canonical edge order the catalog must always return. */
const CANONICAL: Edge[] = ['north', 'east', 'south', 'west'];

function canonical(edges: Edge[]): Edge[] {
  return CANONICAL.filter((edge) => edges.includes(edge));
}

describe('piece catalog', () => {
  it('offers exactly the piece set: straight, corner, crossing, crossing gate, bridge, tunnel, the hill run, both switches, the bump half-run, and the elevated corner run', () => {
    expect([...PIECE_TYPES].sort()).toEqual([
      'bridge',
      'bump-down',
      'bump-up',
      'corner',
      'corner-down',
      'corner-up',
      'crossing',
      'crossing-gate',
      'hill',
      'hill-corner',
      'hill-half',
      'slope-down',
      'slope-up',
      'straight',
      'switch',
      'switch-mirror',
      'tunnel',
    ]);
  });

  it('gives every piece a 1-cell footprint', () => {
    expect(FOOTPRINT_CELLS).toBe(1);
  });

  it('knows the corner family: the flat corner plus the elevated corner run', () => {
    const corners: PieceType[] = ['corner', 'corner-up', 'hill-corner', 'corner-down'];
    for (const type of corners) expect(isCornerPiece(type)).toBe(true);
    const others: PieceType[] = [
      'straight',
      'crossing',
      'bridge',
      'tunnel',
      'slope-up',
      'hill',
      'slope-down',
      'bump-up',
      'hill-half',
      'bump-down',
      'switch',
      'switch-mirror',
    ];
    for (const type of others) expect(isCornerPiece(type)).toBe(false);
  });

  it('knows the bump family: the gentle half-height hump run', () => {
    const bumps: PieceType[] = ['bump-up', 'hill-half', 'bump-down'];
    for (const type of bumps) expect(isBumpPiece(type)).toBe(true);
    const others: PieceType[] = [
      'straight',
      'corner',
      'crossing',
      'bridge',
      'tunnel',
      'slope-up',
      'hill',
      'slope-down',
      'corner-up',
      'hill-corner',
      'corner-down',
      'switch',
      'switch-mirror',
    ];
    for (const type of others) expect(isBumpPiece(type)).toBe(false);
  });
});

describe('tunnel piece geometry', () => {
  it('joins opposite edges exactly like a straight — trains ride through unchanged', () => {
    expect(endpointsFor('tunnel', 0)).toEqual(['north', 'south']);
    expect(endpointsFor('tunnel', 90)).toEqual(['east', 'west']);
    // Symmetric under 180°, same as the straight it mirrors.
    expect(endpointsFor('tunnel', 180)).toEqual(['north', 'south']);
    expect(endpointsFor('tunnel', 270)).toEqual(['east', 'west']);
  });

  it('gives the tunnel exactly two endpoints at every rotation', () => {
    for (const rotation of ALL_ROTATIONS) {
      expect(endpointsFor('tunnel', rotation)).toHaveLength(2);
    }
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

describe('hill run piece geometry', () => {
  it('joins opposite edges exactly like a straight — at every rotation', () => {
    expect(endpointsFor('slope-up', 0)).toEqual(['north', 'south']);
    expect(endpointsFor('slope-up', 90)).toEqual(['east', 'west']);
    expect(endpointsFor('slope-up', 180)).toEqual(['north', 'south']);
    expect(endpointsFor('slope-up', 270)).toEqual(['east', 'west']);
    expect(endpointsFor('hill', 0)).toEqual(['north', 'south']);
    expect(endpointsFor('hill', 90)).toEqual(['east', 'west']);
    expect(endpointsFor('hill', 180)).toEqual(['north', 'south']);
    expect(endpointsFor('hill', 270)).toEqual(['east', 'west']);
    expect(endpointsFor('slope-down', 0)).toEqual(['north', 'south']);
    expect(endpointsFor('slope-down', 90)).toEqual(['east', 'west']);
    expect(endpointsFor('slope-down', 180)).toEqual(['north', 'south']);
    expect(endpointsFor('slope-down', 270)).toEqual(['east', 'west']);
  });

  it('gives each hill piece exactly two endpoints at every rotation', () => {
    for (const type of ['slope-up', 'hill', 'slope-down'] as const) {
      for (const rotation of ALL_ROTATIONS) {
        expect(endpointsFor(type, rotation)).toHaveLength(2);
      }
    }
  });
});

describe('bump half-run piece geometry', () => {
  it('joins opposite edges exactly like a straight — at every rotation', () => {
    expect(endpointsFor('bump-up', 0)).toEqual(['north', 'south']);
    expect(endpointsFor('bump-up', 90)).toEqual(['east', 'west']);
    expect(endpointsFor('bump-up', 180)).toEqual(['north', 'south']);
    expect(endpointsFor('bump-up', 270)).toEqual(['east', 'west']);
    expect(endpointsFor('hill-half', 0)).toEqual(['north', 'south']);
    expect(endpointsFor('hill-half', 90)).toEqual(['east', 'west']);
    expect(endpointsFor('hill-half', 180)).toEqual(['north', 'south']);
    expect(endpointsFor('hill-half', 270)).toEqual(['east', 'west']);
    expect(endpointsFor('bump-down', 0)).toEqual(['north', 'south']);
    expect(endpointsFor('bump-down', 90)).toEqual(['east', 'west']);
    expect(endpointsFor('bump-down', 180)).toEqual(['north', 'south']);
    expect(endpointsFor('bump-down', 270)).toEqual(['east', 'west']);
  });

  it('gives each bump piece exactly two endpoints at every rotation', () => {
    for (const type of ['bump-up', 'hill-half', 'bump-down'] as const) {
      for (const rotation of ALL_ROTATIONS) {
        expect(endpointsFor(type, rotation)).toHaveLength(2);
      }
    }
  });
});

describe('elevated corner run piece geometry', () => {
  it('joins adjacent edges exactly like a corner — at every rotation', () => {
    expect(endpointsFor('corner-up', 0)).toEqual(['north', 'east']);
    expect(endpointsFor('corner-up', 90)).toEqual(['east', 'south']);
    expect(endpointsFor('corner-up', 180)).toEqual(['south', 'west']);
    expect(endpointsFor('corner-up', 270)).toEqual(['north', 'west']);
    expect(endpointsFor('hill-corner', 0)).toEqual(['north', 'east']);
    expect(endpointsFor('hill-corner', 90)).toEqual(['east', 'south']);
    expect(endpointsFor('hill-corner', 180)).toEqual(['south', 'west']);
    expect(endpointsFor('hill-corner', 270)).toEqual(['north', 'west']);
    expect(endpointsFor('corner-down', 0)).toEqual(['north', 'east']);
    expect(endpointsFor('corner-down', 90)).toEqual(['east', 'south']);
    expect(endpointsFor('corner-down', 180)).toEqual(['south', 'west']);
    expect(endpointsFor('corner-down', 270)).toEqual(['north', 'west']);
  });

  it('gives each elevated corner exactly two endpoints at every rotation', () => {
    for (const type of ['corner-up', 'hill-corner', 'corner-down'] as const) {
      for (const rotation of ALL_ROTATIONS) {
        expect(endpointsFor(type, rotation)).toHaveLength(2);
      }
    }
  });
});

describe('switch piece geometry', () => {
  it('joins three edges at yaw 0: stem south, straight branch north, diverging branch east', () => {
    expect(endpointsFor('switch', 0)).toEqual(['north', 'east', 'south']);
  });

  it('walks the Y clockwise through all rotations, canonical order kept', () => {
    expect(endpointsFor('switch', 90)).toEqual(['east', 'south', 'west']);
    expect(endpointsFor('switch', 180)).toEqual(['north', 'south', 'west']);
    expect(endpointsFor('switch', 270)).toEqual(['north', 'east', 'west']);
  });

  it('gives the switch exactly three endpoints at every rotation', () => {
    for (const rotation of ALL_ROTATIONS) {
      expect(endpointsFor('switch', rotation)).toHaveLength(3);
    }
  });
});

describe('switch-mirror piece geometry', () => {
  it('joins three edges at yaw 0: stem south, straight branch north, diverging branch west', () => {
    expect(endpointsFor('switch-mirror', 0)).toEqual(['north', 'south', 'west']);
  });

  it('walks the mirrored Y clockwise through all rotations, canonical order kept', () => {
    expect(endpointsFor('switch-mirror', 90)).toEqual(['north', 'east', 'west']);
    expect(endpointsFor('switch-mirror', 180)).toEqual(['north', 'east', 'south']);
    expect(endpointsFor('switch-mirror', 270)).toEqual(['east', 'south', 'west']);
  });

  it('gives the mirror exactly three endpoints at every rotation', () => {
    for (const rotation of ALL_ROTATIONS) {
      expect(endpointsFor('switch-mirror', rotation)).toHaveLength(3);
    }
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

describe('crossing-gate piece geometry', () => {
  it('joins opposite edges exactly like a straight — the road crosses, the rail rides through', () => {
    expect(endpointsFor('crossing-gate', 0)).toEqual(['north', 'south']);
    expect(endpointsFor('crossing-gate', 90)).toEqual(['east', 'west']);
    // Symmetric under 180°, same as the straight it mirrors.
    expect(endpointsFor('crossing-gate', 180)).toEqual(['north', 'south']);
    expect(endpointsFor('crossing-gate', 270)).toEqual(['east', 'west']);
  });

  it('gives the crossing gate exactly two endpoints at every rotation', () => {
    for (const rotation of ALL_ROTATIONS) {
      expect(endpointsFor('crossing-gate', rotation)).toHaveLength(2);
    }
  });
});
