import { describe, expect, it } from 'vitest';
import { solvePath } from './pathing';
import type { PieceType, PlacedPiece, Rotation } from './track-graph';
import { type PortalGlow, portalGlowAt, tunnelFlagsForPath, tunnelRunsOf } from './tunnels';

function piece(id: string, type: PieceType, x: number, y: number, rotation: Rotation): PlacedPiece {
  return { id, type, cell: { x, y }, rotation };
}

describe('tunnelRunsOf — portals vs. seams', () => {
  it('opens both portals of a lone tunnel — arch at each end', () => {
    expect(tunnelRunsOf([piece('t', 'tunnel', 2, 3, 0)])).toEqual([
      { pieceId: 't', openPortals: ['north', 'south'], mergedPortals: [] },
    ]);
  });

  it('opens the rotated portals of a lone east-west tunnel', () => {
    expect(tunnelRunsOf([piece('t', 'tunnel', 2, 3, 90)])).toEqual([
      { pieceId: 't', openPortals: ['east', 'west'], mergedPortals: [] },
    ]);
  });

  it('merges two tunnels riding end-to-end — one continuous hill, arches at the ends', () => {
    expect(tunnelRunsOf([piece('a', 'tunnel', 2, 3, 0), piece('b', 'tunnel', 2, 4, 0)])).toEqual([
      { pieceId: 'a', openPortals: ['north'], mergedPortals: ['south'] },
      { pieceId: 'b', openPortals: ['south'], mergedPortals: ['north'] },
    ]);
  });

  it('merges rotated tunnels riding east-west', () => {
    expect(tunnelRunsOf([piece('a', 'tunnel', 2, 3, 90), piece('b', 'tunnel', 3, 3, 90)])).toEqual([
      { pieceId: 'a', openPortals: ['west'], mergedPortals: ['east'] },
      { pieceId: 'b', openPortals: ['east'], mergedPortals: ['west'] },
    ]);
  });

  it('merges the inner seams of a three-tunnel run, arching only the ends', () => {
    expect(
      tunnelRunsOf([
        piece('a', 'tunnel', 2, 2, 0),
        piece('b', 'tunnel', 2, 3, 0),
        piece('c', 'tunnel', 2, 4, 0),
      ]),
    ).toEqual([
      { pieceId: 'a', openPortals: ['north'], mergedPortals: ['south'] },
      { pieceId: 'b', openPortals: [], mergedPortals: ['north', 'south'] },
      { pieceId: 'c', openPortals: ['south'], mergedPortals: ['north'] },
    ]);
  });

  it('keeps side-by-side tunnels as separate hills — the shared boundary carries no rail seam', () => {
    expect(tunnelRunsOf([piece('a', 'tunnel', 2, 3, 0), piece('b', 'tunnel', 3, 3, 90)])).toEqual([
      { pieceId: 'a', openPortals: ['north', 'south'], mergedPortals: [] },
      { pieceId: 'b', openPortals: ['east', 'west'], mergedPortals: [] },
    ]);
  });

  it('keeps portals open when the neighbour is plain track — arch meets rail, never merges', () => {
    expect(
      tunnelRunsOf([
        piece('s', 'straight', 2, 4, 0),
        piece('t', 'tunnel', 2, 3, 0),
        piece('x', 'crossing', 2, 2, 0),
      ]),
    ).toEqual([{ pieceId: 't', openPortals: ['north', 'south'], mergedPortals: [] }]);
  });

  it('reports one entry per tunnel in piece order, ignoring plain track', () => {
    const runs = tunnelRunsOf([
      piece('s', 'straight', 2, 1, 0),
      piece('t', 'tunnel', 2, 2, 0),
      piece('k', 'corner', 3, 2, 0),
    ]);
    expect(runs.map((run) => run.pieceId)).toEqual(['t']);
  });
});

describe('tunnelFlagsForPath — riding under the hill', () => {
  it('flags the tunnel steps along a mixed open line, in ride order', () => {
    const pieces = [
      piece('a', 'straight', 2, 2, 0),
      piece('t', 'tunnel', 2, 3, 0),
      piece('c', 'straight', 2, 4, 0),
    ];
    expect(tunnelFlagsForPath(pieces, solvePath(pieces))).toEqual([false, true, false]);
  });

  it('flags the one tunnel inside a closed corner loop', () => {
    // A 2×3 perimeter loop — the tunnel rides its bottom side (opposite-edge
    // piece: it can't take a loop's corner).
    const pieces = [
      piece('p1', 'corner', 2, 2, 90),
      piece('s1', 'straight', 3, 2, 90),
      piece('p2', 'corner', 4, 2, 180),
      piece('p3', 'corner', 4, 3, 270),
      piece('t', 'tunnel', 3, 3, 90),
      piece('p4', 'corner', 2, 3, 0),
    ];
    const path = solvePath(pieces);
    expect(path.closed).toBe(true);
    expect(tunnelFlagsForPath(pieces, path)).toEqual([false, false, false, false, true, false]);
  });

  it('flags every tunnel step of a long tunnel run, in ride order', () => {
    const pieces = [
      piece('a', 'straight', 2, 1, 0),
      piece('t1', 'tunnel', 2, 2, 0),
      piece('t2', 'tunnel', 2, 3, 0),
      piece('c', 'straight', 2, 4, 0),
    ];
    expect(tunnelFlagsForPath(pieces, solvePath(pieces))).toEqual([false, true, true, false]);
  });

  it('returns no flags for an empty path', () => {
    expect(
      tunnelFlagsForPath([piece('t', 'tunnel', 2, 3, 0)], { steps: [], closed: false }),
    ).toEqual([]);
  });
});

describe('portalGlowAt — the headlight catches the nearest open portal mouth', () => {
  // Flat [x, z, ...] portal positions in cell units: the north and south
  // mouths of the tunnel at (2, 3) — midpoints toward its open neighbours.
  const lone = [2, 2.5, 2, 3.5];
  const out: PortalGlow = { x: 0, z: 0, intensity: 0 };

  it('blazes at the mouth the engine is entering', () => {
    portalGlowAt(lone, 2, 2.5, 2.5, out);
    expect(out.x).toBe(2);
    expect(out.z).toBe(2.5);
    expect(out.intensity).toBeCloseTo(1);
  });

  it('fades with approach distance and dies beyond the radius', () => {
    portalGlowAt(lone, 2, 1.5, 2.5, out); // one cell short of the north mouth
    expect(out.z).toBe(2.5);
    expect(out.intensity).toBeCloseTo(1 - 1 / 2.5);
    portalGlowAt(lone, 9, 9, 2.5, out);
    expect(out.intensity).toBe(0);
  });

  it('picks the nearest mouth and never glows inside a wall-less seam', () => {
    // Two merged tunnels: the seam at (2, 3.5) has no arch; the mouths are
    // (2, 2.5) and (2, 4.5) — the engine at the seam still lights a real one.
    const run = [2, 2.5, 2, 4.5];
    portalGlowAt(run, 2, 3.5, 1.5, out);
    expect(out.z).toBe(2.5);
    expect(out.intensity).toBeCloseTo(1 - 1 / 1.5);
  });

  it('stays dark with no portals cached', () => {
    portalGlowAt([], 2, 3, 2.5, out);
    expect(out.intensity).toBe(0);
  });
});
