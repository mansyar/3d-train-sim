import { describe, expect, it } from 'vitest';
import type { PlacedScenery } from './scenery';
import type { PlacedPiece } from './track-graph';
import { deserializeWorld, serializeWorld, type WorldSnapshot } from './save';

const pieces: PlacedPiece[] = [
  { id: 'piece-4', type: 'corner', cell: { x: 2, y: 3 }, rotation: 90 },
  { id: 'piece-8', type: 'straight', cell: { x: 4, y: 5 }, rotation: 180 },
];
const scenery: PlacedScenery[] = [
  { id: 'scenery-5', kind: 'tree', cell: { x: 7, y: 1 }, rotation: 270 },
];

describe('world snapshots', () => {
  it('serializes a JSON-safe, versioned snapshot', () => {
    const snapshot = serializeWorld(pieces, scenery);

    expect(snapshot).toEqual({ version: 1, pieces, scenery });
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('round-trips tracks and scenery without changing order or fields', () => {
    const snapshot = serializeWorld(pieces, scenery);

    expect(deserializeWorld(snapshot)).toEqual({ pieces, scenery });
  });

  it('rejects malformed and unknown-version snapshots safely', () => {
    expect(deserializeWorld(null)).toEqual({ pieces: [], scenery: [] });
    expect(deserializeWorld({ version: 2, pieces, scenery })).toEqual({ pieces: [], scenery: [] });
    expect(deserializeWorld({ version: 1, pieces: 'bad', scenery: [] })).toEqual({
      pieces: [],
      scenery: [],
    });
  });

  it('rejects unknown kinds, invalid rotations, and invalid cells', () => {
    const invalid = {
      version: 1,
      pieces: [{ id: 'piece-1', type: 'crossing', cell: { x: 0, y: 0 }, rotation: 45 }],
      scenery: [{ id: 'scenery-2', kind: 'house', cell: { x: 16, y: 0 }, rotation: 0 }],
    };

    expect(deserializeWorld(invalid)).toEqual({ pieces: [], scenery: [] });
  });

  it('rejects duplicate cells across tracks and scenery', () => {
    const invalid = {
      version: 1,
      pieces: [{ id: 'piece-1', type: 'straight', cell: { x: 0, y: 0 }, rotation: 0 }],
      scenery: [{ id: 'scenery-2', kind: 'tree', cell: { x: 0, y: 0 }, rotation: 0 }],
    };

    expect(deserializeWorld(invalid)).toEqual({ pieces: [], scenery: [] });
  });

  it('rejects snapshots over the shared capacity', () => {
    const fullPieces = Array.from({ length: 65 }, (_, index) => ({
      id: `piece-${index}`,
      type: 'straight' as const,
      cell: { x: index % 16, y: Math.floor(index / 16) },
      rotation: 0 as const,
    }));
    const snapshot: WorldSnapshot = { version: 1, pieces: fullPieces, scenery: [] };

    expect(deserializeWorld(snapshot)).toEqual({ pieces: [], scenery: [] });
  });
});
