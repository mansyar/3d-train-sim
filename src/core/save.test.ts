import { describe, expect, it } from 'vitest';
import {
  deserializePreferences,
  deserializeWorld,
  serializeWorld,
  type WorldSnapshot,
} from './save';
import type { PlacedScenery } from './scenery';
import type { PlacedPiece } from './track-graph';

const pieces: PlacedPiece[] = [
  { id: 'piece-4', type: 'corner', cell: { x: 2, y: 3 }, rotation: 90 },
  { id: 'piece-8', type: 'straight', cell: { x: 4, y: 5 }, rotation: 180 },
];
const scenery: PlacedScenery[] = [
  { id: 'scenery-5', kind: 'tree', cell: { x: 7, y: 1 }, rotation: 270 },
];

describe('world snapshots', () => {
  it('serializes a JSON-safe, versioned snapshot with the selected train', () => {
    const snapshot = serializeWorld(pieces, scenery, 'diesel');

    expect(snapshot).toEqual({ version: 1, pieces, scenery, train: 'diesel' });
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('round-trips tracks, scenery, and train without changing order or fields', () => {
    const snapshot = serializeWorld(pieces, scenery, 'tram');

    expect(deserializeWorld(snapshot)).toEqual({ pieces, scenery, train: 'tram' });
  });

  it('restores steam for legacy snapshots without a train field', () => {
    expect(deserializeWorld({ version: 1, pieces, scenery })).toEqual({
      pieces,
      scenery,
      train: 'steam',
    });
  });

  it('restores steam for unknown persisted train identifiers', () => {
    expect(deserializeWorld({ version: 1, pieces, scenery, train: 'hovercraft' })).toEqual({
      pieces,
      scenery,
      train: 'steam',
    });
  });

  it('rejects malformed and unknown-version snapshots safely', () => {
    expect(deserializeWorld(null)).toEqual({ pieces: [], scenery: [], train: 'steam' });
    expect(deserializeWorld({ version: 2, pieces, scenery })).toEqual({
      pieces: [],
      scenery: [],
      train: 'steam',
    });
    expect(deserializeWorld({ version: 1, pieces: 'bad', scenery: [] })).toEqual({
      pieces: [],
      scenery: [],
      train: 'steam',
    });
  });

  it('rejects unknown kinds, invalid rotations, and invalid cells', () => {
    const invalid = {
      version: 1,
      pieces: [{ id: 'piece-1', type: 'hovercraft', cell: { x: 0, y: 0 }, rotation: 45 }],
      scenery: [{ id: 'scenery-2', kind: 'house', cell: { x: 16, y: 0 }, rotation: 0 }],
    };

    expect(deserializeWorld(invalid)).toEqual({ pieces: [], scenery: [], train: 'steam' });
  });

  it('round-trips crossing pieces like any other track piece', () => {
    const crossing: PlacedPiece[] = [
      { id: 'piece-1', type: 'crossing', cell: { x: 3, y: 4 }, rotation: 90 },
      { id: 'piece-2', type: 'straight', cell: { x: 3, y: 3 }, rotation: 0 },
    ];

    const snapshot = serializeWorld(crossing, [], 'steam');

    expect(snapshot.pieces).toEqual(crossing);
    expect(deserializeWorld(snapshot)).toEqual({ pieces: crossing, scenery: [], train: 'steam' });
  });

  it('restores a persisted crossing snapshot (rotation preserved verbatim)', () => {
    expect(
      deserializeWorld({
        version: 1,
        pieces: [{ id: 'piece-9', type: 'crossing', cell: { x: 5, y: 6 }, rotation: 270 }],
        scenery: [],
        train: 'steam',
      }),
    ).toEqual({
      pieces: [{ id: 'piece-9', type: 'crossing', cell: { x: 5, y: 6 }, rotation: 270 }],
      scenery: [],
      train: 'steam',
    });
  });

  it('rejects duplicate cells across tracks and scenery', () => {
    const invalid = {
      version: 1,
      pieces: [{ id: 'piece-1', type: 'straight', cell: { x: 0, y: 0 }, rotation: 0 }],
      scenery: [{ id: 'scenery-2', kind: 'tree', cell: { x: 0, y: 0 }, rotation: 0 }],
    };

    expect(deserializeWorld(invalid)).toEqual({ pieces: [], scenery: [], train: 'steam' });
  });

  it('rejects snapshots over the shared capacity', () => {
    const fullPieces = Array.from({ length: 65 }, (_, index) => ({
      id: `piece-${index}`,
      type: 'straight' as const,
      cell: { x: index % 16, y: Math.floor(index / 16) },
      rotation: 0 as const,
    }));
    const snapshot: WorldSnapshot = { version: 1, pieces: fullPieces, scenery: [] };

    expect(deserializeWorld(snapshot)).toEqual({ pieces: [], scenery: [], train: 'steam' });
  });
});

describe('device preferences', () => {
  it('serializes a muted preference into the snapshot', () => {
    const snapshot = serializeWorld(pieces, [], 'steam', true);

    expect(snapshot).toEqual({
      version: 1,
      pieces,
      scenery: [],
      train: 'steam',
      preferences: { muted: true },
    });
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('omits preferences when sound is on', () => {
    expect(serializeWorld(pieces, scenery, 'steam')).toEqual({
      version: 1,
      pieces,
      scenery,
      train: 'steam',
    });
  });

  it('round-trips the muted preference in both directions', () => {
    expect(deserializePreferences(serializeWorld(pieces, scenery, 'steam', true))).toEqual({
      muted: true,
    });
    expect(deserializePreferences(serializeWorld(pieces, scenery, 'steam', false))).toEqual({
      muted: false,
    });
  });

  it('restores sound-on for legacy snapshots without preferences', () => {
    expect(deserializePreferences({ version: 1, pieces, scenery })).toEqual({ muted: false });
  });

  it('falls back to sound-on for invalid preferences without throwing', () => {
    const invalid: unknown[] = [
      null,
      'bad',
      42,
      {},
      { muted: 'yes' },
      { muted: 1 },
      { muted: null },
    ];

    for (const preferences of invalid) {
      expect(deserializePreferences({ version: 1, pieces, scenery, preferences })).toEqual({
        muted: false,
      });
    }
  });
});
