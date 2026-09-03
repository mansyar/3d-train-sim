import { describe, expect, it } from 'vitest';
import { closesLoop, hasCycle, isRideable } from './ride-ready';
import type { PlacedPiece, Rotation } from './track-graph';

function piece(id: string, x: number, y: number, rotation: Rotation = 0): PlacedPiece {
  return { id, type: 'corner', cell: { x, y }, rotation };
}

function straight(id: string, x: number, y: number): PlacedPiece {
  return { id, type: 'straight', cell: { x, y }, rotation: 0 };
}

/** Three corners of a 2x2 square — connected, but the loop is still open. */
function openSquare(): PlacedPiece[] {
  return [piece('a', 0, 0, 90), piece('b', 1, 0, 180), piece('c', 1, 1, 270)];
}

/** The fourth corner closes the 2x2 square into a loop. */
function closedSquare(): PlacedPiece[] {
  return [...openSquare(), piece('d', 0, 1, 0)];
}

describe('isRideable', () => {
  it('is false for an empty meadow', () => {
    expect(isRideable([])).toBe(false);
  });

  it('is true with a single piece on the meadow', () => {
    expect(isRideable([straight('a', 0, 0)])).toBe(true);
  });
});

describe('hasCycle', () => {
  it('is false for an empty meadow', () => {
    expect(hasCycle([])).toBe(false);
  });

  it('is false for an open line of straights', () => {
    expect(hasCycle([straight('a', 0, 0), straight('b', 0, 1)])).toBe(false);
  });

  it('is false for an open square', () => {
    expect(hasCycle(openSquare())).toBe(false);
  });

  it('is true for a closed square', () => {
    expect(hasCycle(closedSquare())).toBe(true);
  });
});

describe('closesLoop', () => {
  it('is false on an empty meadow', () => {
    expect(closesLoop([], [])).toBe(false);
  });

  it('is false when extending a straight line', () => {
    const before = [straight('a', 0, 0)];
    const after = [...before, straight('b', 0, 1)];
    expect(closesLoop(before, after)).toBe(false);
  });

  it('is false for the first piece on the meadow', () => {
    expect(closesLoop([], [straight('a', 0, 0)])).toBe(false);
  });

  it('is true when the new piece closes the square', () => {
    expect(closesLoop(openSquare(), closedSquare())).toBe(true);
  });

  it('is false when a loop already existed before', () => {
    const extra = [...closedSquare(), straight('e', 5, 5)];
    expect(closesLoop(closedSquare(), extra)).toBe(false);
  });
});
