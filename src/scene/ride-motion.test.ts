import { describe, expect, it } from 'vitest';
import type { PathStep } from '../core/pathing';
import type { Edge, PlacedPiece } from '../core/track-graph';
import { MEADOW_CELLS } from '../core/track-graph';
import { GROUND_SIZE } from './ground';
import { segmentForStep } from './ride-motion';

const CELL_SIZE = GROUND_SIZE / MEADOW_CELLS;

/** A placed piece at (x, y) with the given rotation (defaults 0). */
function piece(
  type: PlacedPiece['type'],
  x: number,
  y: number,
  rotation: PlacedPiece['rotation'] = 0,
): PlacedPiece {
  return { id: 'p', type, cell: { x, y }, rotation };
}

function step(from: Edge, to: Edge): PathStep {
  return { pieceId: 'p', from, to };
}

/** The cell-centre of (8, 8) — the river runs through the middle columns. */
const CENTER = {
  x: -GROUND_SIZE / 2 + 8.5 * CELL_SIZE,
  z: -GROUND_SIZE / 2 + 8.5 * CELL_SIZE,
};

describe('segmentForStep — the bridge rides exactly like the straight it mirrors', () => {
  it('rides a north–south bridge as a straight line, not a corner arc', () => {
    const segment = segmentForStep(piece('bridge', 8, 8), step('north', 'south'));

    expect(segment.kind).toBe('line');
    expect(segment.length).toBe(CELL_SIZE);
    expect(segment.ax).toBeCloseTo(CENTER.x);
    expect(segment.az).toBeCloseTo(CENTER.z - CELL_SIZE / 2); // north edge midpoint
    expect(segment.bx).toBeCloseTo(CENTER.x);
    expect(segment.bz).toBeCloseTo(CENTER.z + CELL_SIZE / 2); // south edge midpoint
  });

  it('rides an east–west bridge (rotation 90) as a straight line too', () => {
    const segment = segmentForStep(piece('bridge', 8, 8, 90), step('east', 'west'));

    expect(segment.kind).toBe('line');
    expect(segment.length).toBe(CELL_SIZE);
    expect(segment.ax).toBeCloseTo(CENTER.x + CELL_SIZE / 2); // east edge midpoint
    expect(segment.az).toBeCloseTo(CENTER.z);
    expect(segment.bx).toBeCloseTo(CENTER.x - CELL_SIZE / 2); // west edge midpoint
    expect(segment.bz).toBeCloseTo(CENTER.z);
  });

  it('still rides corners on their quarter-arc pivot', () => {
    const segment = segmentForStep(piece('corner', 8, 8), step('north', 'east'));

    expect(segment.kind).toBe('arc');
    expect(segment.r).toBeCloseTo(CELL_SIZE / 2);
  });

  it('keeps straights and crossings on straight lines', () => {
    expect(segmentForStep(piece('straight', 8, 8), step('north', 'south')).kind).toBe('line');
    expect(segmentForStep(piece('crossing', 8, 8), step('north', 'south')).kind).toBe('line');
  });
});
