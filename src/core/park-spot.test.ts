import { describe, expect, it } from 'vitest';
import { findParkSpot } from './park-spot';
import { rideComponentsOf } from './pathing';
import { endpointsFor } from './pieces';
import { isWater } from './river';
import { cozyOval, hilltopJunction, riverCrossing } from './starters';
import type { Cell, PieceType, PlacedPiece, Rotation } from './track-graph';

/** The meadow heart is world origin — cell-space (7.5, 7.5) of the 16×16 grid. */
const heartDistance = (cell: Cell): number => Math.hypot(cell.x + 0.5 - 8, cell.y + 0.5 - 8);

function piece(id: string, type: PieceType, x: number, y: number, rotation: Rotation): PlacedPiece {
  return { id, type, cell: { x, y }, rotation };
}

function placedOf(pieces: readonly PlacedPiece[], id: string): PlacedPiece {
  const found = pieces.find((p) => p.id === id);
  if (!found) throw new Error(`spot references unknown piece ${id}`);
  return found;
}

describe('findParkSpot — rails first', () => {
  it('parks on the cozy oval at its dry spot nearest the meadow heart', () => {
    const pieces = cozyOval().pieces;
    const spot = findParkSpot(pieces);

    expect(spot.kind).toBe('rails');
    if (spot.kind !== 'rails') return;
    const placed = placedOf(pieces, spot.pieceId);
    expect(placed.cell).toEqual({ x: 3, y: 7 });
    expect(isWater(placed.cell)).toBe(false);
    expect([spot.from, spot.to].sort()).toEqual(
      [...endpointsFor(placed.type, placed.rotation)].sort(),
    );

    // The chosen step really is the nearest dry step of the loop.
    const steps = rideComponentsOf(pieces)[0]?.path.steps ?? [];
    const dry = steps.map((step) => placedOf(pieces, step.pieceId)).filter((p) => !isWater(p.cell));
    expect(heartDistance(placed.cell)).toBe(Math.min(...dry.map((p) => heartDistance(p.cell))));
  });

  it('prefers the nearest dry step over a nearer bridge step (river crossing)', () => {
    const pieces = riverCrossing().pieces;
    const spot = findParkSpot(pieces);

    expect(spot.kind).toBe('rails');
    if (spot.kind !== 'rails') return;
    const placed = placedOf(pieces, spot.pieceId);
    expect(placed.cell).toEqual({ x: 6, y: 8 });
    expect(isWater(placed.cell)).toBe(false);
    // The bridge at (7,8) sits nearer the heart, but dry beats near.
    expect(heartDistance({ x: 7, y: 8 })).toBeLessThan(heartDistance(placed.cell));
  });

  it('picks the largest component even when a smaller loop sits nearer the heart', () => {
    const big = cozyOval().pieces;
    const small = [
      piece('sq-1', 'corner', 5, 7, 90),
      piece('sq-2', 'corner', 6, 7, 180),
      piece('sq-3', 'corner', 6, 8, 270),
      piece('sq-4', 'corner', 5, 8, 0),
    ];
    const pieces = [...big, ...small];
    const spot = findParkSpot(pieces);

    expect(spot.kind).toBe('rails');
    if (spot.kind !== 'rails') return;
    expect(big.some((p) => p.id === spot.pieceId)).toBe(true);
    const placed = placedOf(pieces, spot.pieceId);
    expect(isWater(placed.cell)).toBe(false);
    // Sanity: the small loop really is nearer the heart than the big one.
    expect(Math.min(...small.map((p) => heartDistance(p.cell)))).toBeLessThan(
      Math.min(...big.map((p) => heartDistance(p.cell))),
    );
  });

  it('allows a wet rail step when the whole component floats (bridges only)', () => {
    const bridges = [
      piece('b-1', 'bridge', 8, 7, 0),
      piece('b-2', 'bridge', 8, 8, 0),
      piece('b-3', 'bridge', 8, 9, 0),
    ];
    const spot = findParkSpot(bridges);

    expect(spot.kind).toBe('rails');
    if (spot.kind !== 'rails') return;
    const placed = placedOf(bridges, spot.pieceId);
    expect(isWater(placed.cell)).toBe(true);
    // Both end bridges tie at the same distance; the walk order decides.
    expect(['b-1', 'b-2']).toContain(spot.pieceId);
    expect(heartDistance(placed.cell)).toBeCloseTo(Math.hypot(0.5, 0.5), 10);
  });

  it('handles switch layouts (hilltop junction) and picks the nearest dry corner', () => {
    const pieces = hilltopJunction().pieces;
    const spot = findParkSpot(pieces);

    expect(spot.kind).toBe('rails');
    if (spot.kind !== 'rails') return;
    const placed = placedOf(pieces, spot.pieceId);
    expect(placed.cell).toEqual({ x: 4, y: 7 });
    expect(isWater(placed.cell)).toBe(false);
  });

  it('is deterministic under input order (rotated and reversed inputs)', () => {
    const pieces = riverCrossing().pieces;
    const expected = findParkSpot(pieces);
    const rotated = [...pieces.slice(7), ...pieces.slice(0, 7)];
    const reversed = [...pieces].reverse();

    expect(findParkSpot(rotated)).toEqual(expected);
    expect(findParkSpot(reversed)).toEqual(expected);
  });
});

describe('findParkSpot — land fallback', () => {
  it('parks on the nearest dry cell when the world has no pieces', () => {
    const spot = findParkSpot([]);

    expect(spot.kind).toBe('land');
    if (spot.kind !== 'land') return;
    expect(spot.cell).toEqual({ x: 6, y: 7 });
    expect(isWater(spot.cell)).toBe(false);
  });
});
