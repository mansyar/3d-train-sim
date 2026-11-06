import { describe, expect, it } from 'vitest';
import {
  buildExport,
  exportFileName,
  type ImportResult,
  MAX_IMPORT_BYTES,
  readImport,
} from './portable';
import type { WorldData } from './save';
import type { PlacedScenery } from './scenery';
import { cozyOval } from './starters';
import { MAX_PIECES, type PlacedPiece } from './track-graph';
import { defaultConsist, withConsistPreset } from './wagons';

/** Bytes of a file as the browser would report them; all fixtures are ASCII-safe. */
function byteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

function imported(result: ImportResult): Extract<ImportResult, { status: 'imported' }> {
  if (result.status !== 'imported') {
    throw new Error(`expected an import, got ${result.status}`);
  }
  return result;
}

const mixedWorld: WorldData = {
  pieces: [
    { id: 'piece-1', type: 'corner', cell: { x: 0, y: 4 }, rotation: 90 },
    { id: 'piece-2', type: 'straight', cell: { x: 1, y: 4 }, rotation: 90 },
    { id: 'piece-3', type: 'bridge', cell: { x: 6, y: 5 }, rotation: 0 },
    { id: 'piece-4', type: 'switch', cell: { x: 3, y: 9 }, rotation: 270 },
  ],
  scenery: [
    { id: 'scenery-1', kind: 'station', cell: { x: 4, y: 6 }, rotation: 180 },
    { id: 'scenery-2', kind: 'tree', cell: { x: 5, y: 5 }, rotation: 0 },
  ],
  train: 'express',
  consist: withConsistPreset(defaultConsist(), 'express', 'tank'),
  deliveries: { 'scenery-1': 3, 'scenery-2': 1 },
};

/** The largest legal meadow: `MAX_PIECES` items shared by track and scenery. */
function maxWorld(): WorldData {
  const pieces: PlacedPiece[] = [];
  const scenery: PlacedScenery[] = [];
  const sceneryCount = 4;

  for (let index = 0; index < MAX_PIECES - sceneryCount; index += 1) {
    pieces.push({
      id: `piece-${index + 1}`,
      type: 'straight',
      cell: { x: index % 16, y: Math.floor(index / 16) },
      rotation: 0,
    });
  }
  for (let index = 0; index < sceneryCount; index += 1) {
    scenery.push({
      id: `scenery-${index + 1}`,
      kind: 'tree',
      cell: { x: index, y: 4 },
      rotation: 0,
    });
  }

  return { pieces, scenery, train: 'steam', deliveries: {}, consist: defaultConsist() };
}

describe('export file name', () => {
  it('names the file from the local calendar date with zero padding', () => {
    expect(exportFileName(new Date(2026, 0, 5))).toBe('tiny-tracks-2026-01-05.json');
  });

  it('keeps a late-evening export on its local day', () => {
    expect(exportFileName(new Date(2026, 11, 31, 23, 59))).toBe('tiny-tracks-2026-12-31.json');
  });
});

describe('buildExport', () => {
  it('serializes world data only, with no device preferences', () => {
    const snapshot: unknown = JSON.parse(buildExport(mixedWorld));

    expect(snapshot).toEqual({
      version: 3,
      pieces: mixedWorld.pieces,
      scenery: mixedWorld.scenery,
      train: 'express',
      deliveries: mixedWorld.deliveries,
      consist: mixedWorld.consist,
    });
    expect(snapshot).not.toHaveProperty('preferences');
  });

  it('exports an empty meadow that imports back empty', () => {
    const json = buildExport({ pieces: [], scenery: [] });
    const result = imported(readImport(json, byteLength(json)));

    expect(result.world).toEqual({
      pieces: [],
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
    expect(result.droppedPieces + result.droppedScenery + result.droppedDuplicates).toBe(0);
  });

  it('exports the seeded starter railway', () => {
    const starter = cozyOval();
    const json = buildExport(starter);
    const result = imported(readImport(json, byteLength(json)));

    expect(result.world).toEqual(starter);
  });
});

describe('readImport size guard', () => {
  it('accepts a file exactly at the cap', () => {
    const json = buildExport(mixedWorld);

    expect(readImport(json, MAX_IMPORT_BYTES).status).toBe('imported');
  });

  it('refuses a file one byte over the cap without carrying a world', () => {
    expect(readImport(buildExport(mixedWorld), MAX_IMPORT_BYTES + 1)).toEqual({
      status: 'too-large',
    });
  });

  it('checks size before parsing', () => {
    expect(readImport('not json at all', MAX_IMPORT_BYTES + 1)).toEqual({ status: 'too-large' });
  });
});

describe('readImport refusal', () => {
  it.each(['', '   ', 'hello', '[]', '[1,2,3]', 'null', '{"version":99}'])(
    'refuses %j without carrying a world',
    (text) => {
      expect(readImport(text, byteLength(text))).toEqual({ status: 'unreadable' });
    },
  );

  it('refuses a snapshot whose piece and scenery lists are not arrays', () => {
    const text = '{"version":3,"pieces":"nope","scenery":[]}';

    expect(readImport(text, byteLength(text))).toEqual({ status: 'unreadable' });
  });

  it('leaves no world behind on a refusal', () => {
    const result = readImport('{"version":99}', 15);

    expect('world' in result).toBe(false);
    expect(Object.keys(result)).toEqual(['status']);
  });
});

describe('readImport salvage', () => {
  it('refuses a salvage that kept no pieces or scenery', () => {
    const text = JSON.stringify({
      version: 3,
      pieces: [
        { id: 'piece-1', type: 'hovercraft', cell: { x: 0, y: 0 }, rotation: 0 },
        { id: 2, type: 'straight', cell: { x: 1, y: 0 }, rotation: 0 },
      ],
      scenery: [],
    });

    expect(readImport(text, byteLength(text))).toEqual({ status: 'unreadable' });
  });

  it('still imports a clean empty world', () => {
    const text = JSON.stringify({ version: 3, pieces: [], scenery: [] });

    expect(readImport(text, byteLength(text)).status).toBe('imported');
  });

  it('imports the valid toys and counts each kind of skip separately', () => {
    const text = JSON.stringify({
      version: 3,
      pieces: [
        { id: 'piece-1', type: 'straight', cell: { x: 0, y: 0 }, rotation: 0 },
        { id: 'piece-1', type: 'straight', cell: { x: 1, y: 0 }, rotation: 0 },
        { id: 'piece-2', type: 'straight', cell: { x: 0, y: 0 }, rotation: 0 },
        { id: 'piece-3', type: 'hovercraft', cell: { x: 2, y: 0 }, rotation: 0 },
      ],
      scenery: [
        { id: 'scenery-1', kind: 'tree', cell: { x: 0, y: 0 }, rotation: 0 },
        { id: 'scenery-2', kind: 'dragon', cell: { x: 2, y: 1 }, rotation: 0 },
        { id: 'scenery-3', kind: 'tree', cell: { x: 3, y: 1 }, rotation: 0 },
      ],
    });
    const result = imported(readImport(text, byteLength(text)));

    expect(result.droppedPieces).toBe(1);
    expect(result.droppedScenery).toBe(1);
    expect(result.droppedDuplicates).toBe(3);
    expect(result.world.pieces).toEqual([
      { id: 'piece-1', type: 'straight', cell: { x: 0, y: 0 }, rotation: 0 },
    ]);
    expect(result.world.scenery).toEqual([
      { id: 'scenery-3', kind: 'tree', cell: { x: 3, y: 1 }, rotation: 0 },
    ]);
  });
});

describe('export to import round trip', () => {
  it('reproduces ids, types, rotations, cells, train, consist and deliveries', () => {
    const json = buildExport(mixedWorld);
    const result = imported(readImport(json, byteLength(json)));

    expect(result.world.pieces).toEqual(mixedWorld.pieces);
    expect(result.world.scenery).toEqual(mixedWorld.scenery);
    expect(result.world.train).toBe(mixedWorld.train);
    expect(result.world.consist).toEqual(mixedWorld.consist);
    expect(result.world.deliveries).toEqual(mixedWorld.deliveries);
  });
});

describe('export size', () => {
  it('keeps a full 64-item meadow under 100 KB', () => {
    const world = maxWorld();
    const json = buildExport(world);
    const size = byteLength(json);
    const result = imported(readImport(json, size));

    expect(size).toBeLessThan(100 * 1024);
    expect(result.droppedPieces + result.droppedScenery + result.droppedDuplicates).toBe(0);
    expect(result.world.pieces).toHaveLength(MAX_PIECES - 4);
    expect(result.world.scenery).toHaveLength(4);
  });
});
