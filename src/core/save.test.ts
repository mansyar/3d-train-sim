import { describe, expect, it } from 'vitest';
import { DAY_PHASES } from './day-clock';
import { isWater } from './river';
import {
  deserializePreferences,
  deserializeWorld,
  parseWorldSnapshot,
  serializeWorld,
} from './save';
import type { PlacedScenery } from './scenery';
import { MAX_PIECES, type PlacedPiece } from './track-graph';
import { defaultConsist, withConsistPreset } from './wagons';

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

    expect(snapshot).toEqual({ version: 3, pieces, scenery, train: 'diesel' });
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('round-trips tracks, scenery, and train without changing order or fields', () => {
    const snapshot = serializeWorld(pieces, scenery, 'tram');

    expect(deserializeWorld(snapshot)).toEqual({
      pieces,
      scenery,
      train: 'tram',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('restores steam for legacy snapshots without a train field', () => {
    expect(deserializeWorld({ version: 1, pieces, scenery })).toEqual({
      pieces,
      scenery,
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('restores steam for unknown persisted train identifiers', () => {
    expect(deserializeWorld({ version: 1, pieces, scenery, train: 'hovercraft' })).toEqual({
      pieces,
      scenery,
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('rejects malformed and unknown-version snapshots safely', () => {
    expect(deserializeWorld(null)).toEqual({
      pieces: [],
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
    expect(deserializeWorld({ version: 4, pieces, scenery })).toEqual({
      pieces: [],
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
    expect(deserializeWorld({ version: 1, pieces: 'bad', scenery: [] })).toEqual({
      pieces: [],
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('rejects unknown kinds, invalid rotations, and invalid cells', () => {
    const invalid = {
      version: 1,
      pieces: [{ id: 'piece-1', type: 'hovercraft', cell: { x: 0, y: 0 }, rotation: 45 }],
      scenery: [{ id: 'scenery-2', kind: 'dragon', cell: { x: 16, y: 0 }, rotation: 0 }],
    };

    expect(deserializeWorld(invalid)).toEqual({
      pieces: [],
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('round-trips town buildings and critters like any other scenery', () => {
    const townAndCritters: PlacedScenery[] = [
      { id: 'scenery-1', kind: 'station', cell: { x: 2, y: 2 }, rotation: 0 },
      { id: 'scenery-2', kind: 'house', cell: { x: 3, y: 2 }, rotation: 90 },
      { id: 'scenery-3', kind: 'cottage', cell: { x: 4, y: 2 }, rotation: 180 },
      { id: 'scenery-4', kind: 'pig', cell: { x: 5, y: 2 }, rotation: 0 },
      { id: 'scenery-5', kind: 'sheep', cell: { x: 6, y: 2 }, rotation: 270 },
      { id: 'scenery-6', kind: 'pug', cell: { x: 7, y: 2 }, rotation: 90 },
    ];
    const snapshot = serializeWorld(pieces, townAndCritters, 'steam');

    expect(deserializeWorld(snapshot)).toEqual({
      pieces,
      scenery: townAndCritters,
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('loads a legacy world of only V1 kinds unchanged', () => {
    const legacy = serializeWorld(pieces, scenery, 'steam');
    expect(deserializeWorld(legacy)).toEqual({
      pieces,
      scenery,
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('drops unknown scenery kinds but keeps the rest of the world', () => {
    const mixed = {
      version: 1,
      pieces,
      scenery: [
        { id: 'scenery-1', kind: 'dragon', cell: { x: 9, y: 1 }, rotation: 0 },
        { id: 'scenery-2', kind: 'station', cell: { x: 2, y: 9 }, rotation: 90 },
        { id: 'scenery-3', kind: 'sheep', cell: { x: 3, y: 9 }, rotation: 0 },
      ],
      train: 'steam',
    };

    expect(deserializeWorld(mixed)).toEqual({
      pieces,
      scenery: [
        { id: 'scenery-2', kind: 'station', cell: { x: 2, y: 9 }, rotation: 90 },
        { id: 'scenery-3', kind: 'sheep', cell: { x: 3, y: 9 }, rotation: 0 },
      ],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('round-trips crossing pieces like any other track piece', () => {
    const crossing: PlacedPiece[] = [
      { id: 'piece-1', type: 'crossing', cell: { x: 3, y: 4 }, rotation: 90 },
      { id: 'piece-2', type: 'straight', cell: { x: 3, y: 3 }, rotation: 0 },
    ];

    const snapshot = serializeWorld(crossing, [], 'steam');

    expect(snapshot.pieces).toEqual(crossing);
    expect(deserializeWorld(snapshot)).toEqual({
      pieces: crossing,
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
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
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('round-trips the hills-phase-2 elevation pieces like any other track piece', () => {
    const elevation: PlacedPiece[] = [
      { id: 'piece-1', type: 'bump-up', cell: { x: 3, y: 4 }, rotation: 0 },
      { id: 'piece-2', type: 'hill-half', cell: { x: 3, y: 3 }, rotation: 0 },
      { id: 'piece-3', type: 'bump-down', cell: { x: 3, y: 2 }, rotation: 0 },
      { id: 'piece-4', type: 'corner-up', cell: { x: 5, y: 4 }, rotation: 90 },
      { id: 'piece-5', type: 'hill-corner', cell: { x: 5, y: 3 }, rotation: 90 },
      { id: 'piece-6', type: 'corner-down', cell: { x: 5, y: 2 }, rotation: 90 },
    ];

    const snapshot = serializeWorld(elevation, [], 'steam');

    expect(snapshot.pieces).toEqual(elevation);
    expect(deserializeWorld(snapshot)).toEqual({
      pieces: elevation,
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('keeps the first claimant of a duplicated cell and drops the rest', () => {
    const duplicated = {
      version: 1,
      pieces: [{ id: 'piece-1', type: 'straight', cell: { x: 0, y: 0 }, rotation: 0 }],
      scenery: [{ id: 'scenery-2', kind: 'tree', cell: { x: 0, y: 0 }, rotation: 0 }],
    };

    const result = parseWorldSnapshot(duplicated);

    expect(result.world).toEqual({
      pieces: duplicated.pieces,
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
    expect(result.status).toBe('salvaged');
    expect(result.droppedDuplicates).toBe(1);
  });
});

describe('snapshot recovery — malformed entries never destroy valid work', () => {
  const statuses = ['clean', 'salvaged', 'unreadable'] as const;
  const tenPieces: PlacedPiece[] = Array.from({ length: 10 }, (_, index) => ({
    id: `piece-${index}`,
    type: 'straight',
    cell: { x: index, y: 0 },
    rotation: 0,
  }));

  it('salvages the valid pieces from a v3 snapshot with one malformed entry', () => {
    const snapshot = {
      version: 3 as const,
      pieces: [
        ...tenPieces.slice(0, 5),
        { id: 'piece-bad', type: 'hovercraft', cell: { x: 5, y: 0 }, rotation: 0 },
        ...tenPieces.slice(5),
      ],
      scenery: [],
    };

    const result = parseWorldSnapshot(snapshot);

    expect(result.world.pieces).toEqual(tenPieces);
    expect(result.status).toBe('salvaged');
    expect(result.droppedPieces).toBe(1);
    expect(result.droppedScenery).toBe(0);
    expect(result.droppedDuplicates).toBe(0);
    expect(deserializeWorld(snapshot)).toEqual(result.world);
  });

  it('treats an empty world as clean, not corrupt', () => {
    const result = parseWorldSnapshot({ version: 3, pieces: [], scenery: [] });

    expect(result.world).toEqual({
      pieces: [],
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
    expect(result.status).toBe('clean');
    expect(result.droppedPieces + result.droppedScenery + result.droppedDuplicates).toBe(0);
  });

  it('reserves unreadable for structurally broken snapshots', () => {
    const unreadable: unknown[] = [
      null,
      'world',
      42,
      { version: 4, pieces: [], scenery: [] },
      { pieces: [], scenery: [] },
      { version: 3, pieces: 'bad', scenery: [] },
      { version: 3, pieces: [], scenery: 'bad' },
    ];

    for (const value of unreadable) {
      const result = parseWorldSnapshot(value);

      expect(result.status).toBe('unreadable');
      expect(result.world.pieces).toEqual([]);
      expect(result.world.scenery).toEqual([]);
      expect(result.droppedPieces + result.droppedScenery + result.droppedDuplicates).toBe(0);
    }
  });

  it('keeps the first claimant of a duplicated cell and counts the later ones', () => {
    const first: PlacedPiece = {
      id: 'piece-1',
      type: 'straight',
      cell: { x: 0, y: 0 },
      rotation: 0,
    };
    const second: PlacedPiece = {
      id: 'piece-2',
      type: 'corner',
      cell: { x: 0, y: 0 },
      rotation: 90,
    };
    const tree: PlacedScenery = {
      id: 'scenery-1',
      kind: 'tree',
      cell: { x: 0, y: 0 },
      rotation: 0,
    };

    const result = parseWorldSnapshot({ version: 3, pieces: [first, second], scenery: [tree] });

    expect(result.world.pieces).toEqual([first]);
    expect(result.world.scenery).toEqual([]);
    expect(result.droppedPieces).toBe(0);
    expect(result.droppedDuplicates).toBe(2);
    expect(result.status).toBe('salvaged');
  });

  it('keeps the first piece per id and counts duplicate ids', () => {
    const first: PlacedPiece = {
      id: 'piece-1',
      type: 'straight',
      cell: { x: 0, y: 0 },
      rotation: 0,
    };
    const sameId: PlacedPiece = {
      id: 'piece-1',
      type: 'straight',
      cell: { x: 1, y: 0 },
      rotation: 0,
    };

    const result = parseWorldSnapshot({ version: 3, pieces: [first, sameId], scenery: [] });

    expect(result.world.pieces).toEqual([first]);
    expect(result.droppedDuplicates).toBe(1);
    expect(result.droppedPieces).toBe(0);
    expect(result.status).toBe('salvaged');
  });

  it('keeps the first MAX_PIECES entries and counts the overflow', () => {
    const overflow: PlacedPiece[] = Array.from({ length: MAX_PIECES + 1 }, (_, index) => ({
      id: `piece-${index}`,
      type: 'straight',
      cell: { x: index % 16, y: Math.floor(index / 16) },
      rotation: 0,
    }));

    const result = parseWorldSnapshot({ version: 3, pieces: overflow, scenery: [] });

    expect(result.world.pieces).toEqual(overflow.slice(0, MAX_PIECES));
    expect(result.droppedPieces).toBe(1);
    expect(result.status).toBe('salvaged');
  });

  it('counts an overflow entry that duplicates an accepted cell as a duplicate', () => {
    const fill: PlacedPiece[] = Array.from({ length: MAX_PIECES }, (_, index) => ({
      id: `piece-${index}`,
      type: 'straight',
      cell: { x: index % 16, y: Math.floor(index / 16) },
      rotation: 0,
    }));
    const overflowDuplicate: PlacedPiece = {
      id: 'piece-overflow',
      type: 'corner',
      cell: { x: 0, y: 0 },
      rotation: 90,
    };

    const result = parseWorldSnapshot({
      version: 3,
      pieces: [...fill, overflowDuplicate],
      scenery: [],
    });

    expect(result.world.pieces).toHaveLength(MAX_PIECES);
    expect(result.droppedPieces).toBe(0);
    expect(result.droppedDuplicates).toBe(1);
    expect(result.status).toBe('salvaged');
  });

  it('fills the shared capacity with pieces before scenery', () => {
    const fill: PlacedPiece[] = Array.from({ length: MAX_PIECES }, (_, index) => ({
      id: `piece-${index}`,
      type: 'straight',
      cell: { x: index % 16, y: Math.floor(index / 16) },
      rotation: 0,
    }));
    const tree: PlacedScenery = {
      id: 'scenery-1',
      kind: 'tree',
      cell: { x: 15, y: 15 },
      rotation: 0,
    };

    const result = parseWorldSnapshot({ version: 3, pieces: fill, scenery: [tree] });

    expect(result.world.pieces).toHaveLength(MAX_PIECES);
    expect(result.world.scenery).toEqual([]);
    expect(result.droppedScenery).toBe(1);
    expect(result.status).toBe('salvaged');
  });

  it('salvages valid scenery and counts the rest', () => {
    const kept: PlacedScenery[] = [
      { id: 'scenery-1', kind: 'tree', cell: { x: 1, y: 1 }, rotation: 0 },
      { id: 'scenery-3', kind: 'station', cell: { x: 3, y: 1 }, rotation: 0 },
    ];

    const result = parseWorldSnapshot({
      version: 3,
      pieces: [],
      scenery: [
        kept[0],
        { id: 'scenery-2', kind: 'dragon', cell: { x: 2, y: 1 }, rotation: 0 },
        kept[1],
      ],
    });

    expect(result.world.scenery).toEqual(kept);
    expect(result.droppedScenery).toBe(1);
    expect(result.status).toBe('salvaged');
  });

  it('loads v1, v2, and v3 fixtures to their expected worlds with status clean', () => {
    const consist = withConsistPreset(defaultConsist(), 'steam', 'coal');
    const fixtures: Array<{ fixture: unknown; expected: unknown }> = [
      {
        fixture: {
          version: 1,
          pieces: [{ id: 'piece-1', type: 'straight', cell: { x: 0, y: 0 }, rotation: 0 }],
          scenery: [{ id: 'scenery-1', kind: 'tree', cell: { x: 1, y: 0 }, rotation: 0 }],
        },
        expected: {
          pieces: [{ id: 'piece-1', type: 'straight', cell: { x: 0, y: 0 }, rotation: 0 }],
          scenery: [{ id: 'scenery-1', kind: 'tree', cell: { x: 1, y: 0 }, rotation: 0 }],
          train: 'steam',
          deliveries: {},
          consist: defaultConsist(),
        },
      },
      {
        fixture: {
          version: 2,
          pieces: [{ id: 'piece-2', type: 'tunnel', cell: { x: 2, y: 0 }, rotation: 90 }],
          scenery: [],
          train: 'diesel',
        },
        expected: {
          pieces: [{ id: 'piece-2', type: 'tunnel', cell: { x: 2, y: 0 }, rotation: 90 }],
          scenery: [],
          train: 'diesel',
          deliveries: {},
          consist: defaultConsist(),
        },
      },
      {
        fixture: {
          version: 3,
          pieces: [{ id: 'piece-3', type: 'switch', cell: { x: 3, y: 0 }, rotation: 180 }],
          scenery: [{ id: 'scenery-3', kind: 'station', cell: { x: 3, y: 1 }, rotation: 0 }],
          train: 'tram',
          deliveries: { 'scenery-3': 2 },
          consist,
        },
        expected: {
          pieces: [{ id: 'piece-3', type: 'switch', cell: { x: 3, y: 0 }, rotation: 180 }],
          scenery: [{ id: 'scenery-3', kind: 'station', cell: { x: 3, y: 1 }, rotation: 0 }],
          train: 'tram',
          deliveries: { 'scenery-3': 2 },
          consist,
        },
      },
    ];

    for (const { fixture, expected } of fixtures) {
      const result = parseWorldSnapshot(fixture);

      expect(result.status).toBe('clean');
      expect(result.world).toEqual(expected);
    }
  });

  it('never throws and always reports a defined status for hostile input', () => {
    const rand = seededRandom(20261107);
    const hostile: unknown[] = [
      undefined,
      null,
      0,
      1,
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      '',
      'world',
      true,
      false,
      [],
      {},
      () => undefined,
      Symbol('world'),
      10n,
    ];

    for (const value of hostile) {
      expect(() => parseWorldSnapshot(value)).not.toThrow();
      expect(statuses).toContain(parseWorldSnapshot(value).status);
    }

    for (let index = 0; index < 250; index += 1) {
      const value = randomJson(rand, 4);

      expect(() => parseWorldSnapshot(value)).not.toThrow();
      const result = parseWorldSnapshot(value);
      expect(statuses).toContain(result.status);
      expect(Array.isArray(result.world.pieces)).toBe(true);
      expect(Array.isArray(result.world.scenery)).toBe(true);
    }
  });
});

/** Deterministic LCG so a fuzz failure is always reproducible. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

/** JSON-shaped hostile values: primitives, arrays, and objects with save keys. */
function randomJson(rand: () => number, depth: number): unknown {
  const roll = Math.floor(rand() * 8);
  if (depth <= 0 || roll < 3) {
    const primitives: unknown[] = [
      null,
      true,
      false,
      Math.floor(rand() * 1_000) - 500,
      '',
      'straight',
      'tree',
      0,
    ];
    return primitives[Math.floor(rand() * primitives.length)];
  }
  if (roll < 5) {
    return Array.from({ length: Math.floor(rand() * 4) }, () => randomJson(rand, depth - 1));
  }
  const keys = [
    'version',
    'pieces',
    'scenery',
    'train',
    'deliveries',
    'consist',
    'id',
    'type',
    'kind',
    'cell',
    'rotation',
    'x',
    'y',
    'preferences',
    'muted',
    'dayPhase',
  ];
  const value: Record<string, unknown> = {};
  for (let index = 0; index < Math.floor(rand() * 6); index += 1) {
    const key = keys[Math.floor(rand() * keys.length)] ?? 'version';
    value[key] = randomJson(rand, depth - 1);
  }
  return value;
}

describe('tunnel snapshots', () => {
  const tunnelPiece: PlacedPiece = {
    id: 'piece-7',
    type: 'tunnel',
    cell: { x: 6, y: 6 },
    rotation: 90,
  };

  it('round-trips a v2 snapshot carrying tunnels like any other piece', () => {
    const snapshot = serializeWorld([tunnelPiece], [], 'steam');

    expect(snapshot.pieces).toEqual([tunnelPiece]);
    expect(deserializeWorld(snapshot)).toEqual({
      pieces: [tunnelPiece],
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('restores a persisted v2 snapshot containing tunnels verbatim', () => {
    expect(
      deserializeWorld({ version: 2, pieces: [tunnelPiece], scenery: [], train: 'diesel' }),
    ).toEqual({
      pieces: [tunnelPiece],
      scenery: [],
      train: 'diesel',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('keeps rejecting unknown piece types — the tunnel is catalog-listed, anything else is not', () => {
    expect(
      deserializeWorld({
        version: 2,
        pieces: [{ id: 'piece-1', type: 'hovercraft', cell: { x: 0, y: 0 }, rotation: 0 }],
        scenery: [],
      }),
    ).toEqual({
      pieces: [],
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });
});

describe('crossing-gate snapshots — additive piece types', () => {
  const crossing: PlacedPiece[] = [
    { id: 'piece-x1', type: 'crossing-gate', cell: { x: 6, y: 5 }, rotation: 0 },
  ];

  it('round-trips a snapshot carrying the crossing gate like any other piece', () => {
    const snapshot = serializeWorld(crossing, [], 'steam');

    expect(snapshot.version).toBe(3); // additive type: no version bump
    expect(deserializeWorld(snapshot)).toEqual({
      pieces: crossing,
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('restores a persisted pre-crossing v3 snapshot verbatim — old worlds load untouched', () => {
    const preCrossing = {
      version: 3 as const,
      pieces: [{ id: 'piece-1', type: 'straight', cell: { x: 2, y: 3 }, rotation: 0 }],
      scenery: [],
      train: 'tram' as const,
    };

    expect(deserializeWorld(preCrossing)).toEqual({
      pieces: preCrossing.pieces,
      scenery: [],
      train: 'tram',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('round-trips the crossing gate at every rotation', () => {
    const rotated: PlacedPiece[] = [0, 90, 180, 270].map((rotation, index) => ({
      id: `piece-r${index}`,
      type: 'crossing-gate' as const,
      cell: { x: index, y: 1 },
      rotation: rotation as 0 | 90 | 180 | 270,
    }));

    expect(deserializeWorld(serializeWorld(rotated, [], 'steam'))).toEqual({
      pieces: rotated,
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });
});

describe('hill snapshots — additive piece types', () => {
  const hillRun: PlacedPiece[] = [
    { id: 'piece-h1', type: 'slope-up', cell: { x: 4, y: 4 }, rotation: 0 },
    { id: 'piece-h2', type: 'hill', cell: { x: 4, y: 3 }, rotation: 180 },
    { id: 'piece-h3', type: 'slope-down', cell: { x: 4, y: 2 }, rotation: 0 },
  ];

  it('round-trips a snapshot carrying the three hill types like any other piece', () => {
    const snapshot = serializeWorld(hillRun, [], 'steam');

    expect(snapshot.version).toBe(3); // additive types: no version bump
    expect(deserializeWorld(snapshot)).toEqual({
      pieces: hillRun,
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('restores a persisted pre-hill v3 snapshot verbatim — old worlds load untouched', () => {
    const preHill = {
      version: 3 as const,
      pieces: [
        { id: 'piece-1', type: 'straight', cell: { x: 2, y: 3 }, rotation: 0 },
        { id: 'piece-2', type: 'tunnel', cell: { x: 2, y: 4 }, rotation: 0 },
      ],
      scenery: [],
      train: 'tram' as const,
    };

    expect(deserializeWorld(preHill)).toEqual({
      pieces: preHill.pieces,
      scenery: [],
      train: 'tram',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('round-trips hill pieces at every rotation', () => {
    const rotated: PlacedPiece[] = [
      { id: 'piece-r1', type: 'slope-up', cell: { x: 1, y: 1 }, rotation: 90 },
      { id: 'piece-r2', type: 'hill', cell: { x: 2, y: 1 }, rotation: 270 },
      { id: 'piece-r3', type: 'slope-down', cell: { x: 3, y: 1 }, rotation: 180 },
    ];

    expect(deserializeWorld(serializeWorld(rotated, [], 'steam'))).toEqual({
      pieces: rotated,
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('keeps rejecting unknown piece types alongside the hill catalog', () => {
    expect(
      deserializeWorld({
        version: 3,
        pieces: [{ id: 'piece-1', type: 'rollercoaster', cell: { x: 0, y: 0 }, rotation: 0 }],
        scenery: [],
      }),
    ).toEqual({
      pieces: [],
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });
});

describe('switch snapshots — additive piece types', () => {
  const switchPiece: PlacedPiece = {
    id: 'piece-s1',
    type: 'switch',
    cell: { x: 3, y: 5 },
    rotation: 90,
  };

  it('round-trips a snapshot carrying a switch like any other piece', () => {
    const snapshot = serializeWorld([switchPiece], [], 'steam');

    expect(snapshot.version).toBe(3); // additive types: no version bump
    expect(deserializeWorld(snapshot)).toEqual({
      pieces: [switchPiece],
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('restores a persisted pre-switch v3 snapshot verbatim — old worlds load untouched', () => {
    const preSwitch = {
      version: 3 as const,
      pieces: [
        { id: 'piece-1', type: 'straight', cell: { x: 2, y: 3 }, rotation: 0 },
        { id: 'piece-2', type: 'hill', cell: { x: 2, y: 4 }, rotation: 0 },
      ],
      scenery: [],
      train: 'diesel' as const,
    };

    expect(deserializeWorld(preSwitch)).toEqual({
      pieces: preSwitch.pieces,
      scenery: [],
      train: 'diesel',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('round-trips switches at every rotation', () => {
    const rotated: PlacedPiece[] = [
      { id: 'piece-r1', type: 'switch', cell: { x: 1, y: 1 }, rotation: 0 },
      { id: 'piece-r2', type: 'switch', cell: { x: 2, y: 1 }, rotation: 90 },
      { id: 'piece-r3', type: 'switch', cell: { x: 3, y: 1 }, rotation: 180 },
      { id: 'piece-r4', type: 'switch', cell: { x: 4, y: 1 }, rotation: 270 },
    ];

    expect(deserializeWorld(serializeWorld(rotated, [], 'steam'))).toEqual({
      pieces: rotated,
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });
});

describe('mirror switch snapshots — additive piece types', () => {
  const mirrorPiece: PlacedPiece = {
    id: 'piece-m1',
    type: 'switch-mirror',
    cell: { x: 3, y: 5 },
    rotation: 90,
  };

  it('round-trips a snapshot carrying a mirror switch like any other piece', () => {
    const snapshot = serializeWorld([mirrorPiece], [], 'steam');

    expect(snapshot.version).toBe(3); // additive types: no version bump
    expect(deserializeWorld(snapshot)).toEqual({
      pieces: [mirrorPiece],
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('restores a persisted pre-mirror v3 snapshot verbatim — old worlds load untouched', () => {
    const preMirror = {
      version: 3 as const,
      pieces: [
        { id: 'piece-1', type: 'straight', cell: { x: 2, y: 3 }, rotation: 0 },
        { id: 'piece-2', type: 'switch', cell: { x: 2, y: 4 }, rotation: 0 },
      ],
      scenery: [],
      train: 'diesel' as const,
    };

    expect(deserializeWorld(preMirror)).toEqual({
      pieces: preMirror.pieces,
      scenery: [],
      train: 'diesel',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('round-trips mirror switches at every rotation', () => {
    const rotated: PlacedPiece[] = [
      { id: 'piece-m1', type: 'switch-mirror', cell: { x: 1, y: 1 }, rotation: 0 },
      { id: 'piece-m2', type: 'switch-mirror', cell: { x: 2, y: 1 }, rotation: 90 },
      { id: 'piece-m3', type: 'switch-mirror', cell: { x: 3, y: 1 }, rotation: 180 },
      { id: 'piece-m4', type: 'switch-mirror', cell: { x: 4, y: 1 }, rotation: 270 },
    ];

    expect(deserializeWorld(serializeWorld(rotated, [], 'steam'))).toEqual({
      pieces: rotated,
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });
});

describe('three-way switch snapshots — additive piece types', () => {
  const threeWayPiece: PlacedPiece = {
    id: 'piece-t1',
    type: 'switch-3way',
    cell: { x: 3, y: 5 },
    rotation: 90,
  };

  it('round-trips a snapshot carrying a three-way switch like any other piece', () => {
    const snapshot = serializeWorld([threeWayPiece], [], 'steam');

    expect(snapshot.version).toBe(3); // additive types: no version bump
    expect(deserializeWorld(snapshot)).toEqual({
      pieces: [threeWayPiece],
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('restores a persisted pre-three-way v3 snapshot verbatim — old worlds load untouched', () => {
    const preThreeWay = {
      version: 3 as const,
      pieces: [
        { id: 'piece-1', type: 'straight', cell: { x: 2, y: 3 }, rotation: 0 },
        { id: 'piece-2', type: 'switch-mirror', cell: { x: 2, y: 4 }, rotation: 0 },
      ],
      scenery: [],
      train: 'diesel' as const,
    };

    expect(deserializeWorld(preThreeWay)).toEqual({
      pieces: preThreeWay.pieces,
      scenery: [],
      train: 'diesel',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('round-trips three-way switches at every rotation', () => {
    const rotated: PlacedPiece[] = [
      { id: 'piece-t1', type: 'switch-3way', cell: { x: 1, y: 1 }, rotation: 0 },
      { id: 'piece-t2', type: 'switch-3way', cell: { x: 2, y: 1 }, rotation: 90 },
      { id: 'piece-t3', type: 'switch-3way', cell: { x: 3, y: 1 }, rotation: 180 },
      { id: 'piece-t4', type: 'switch-3way', cell: { x: 4, y: 1 }, rotation: 270 },
    ];

    expect(deserializeWorld(serializeWorld(rotated, [], 'steam'))).toEqual({
      pieces: rotated,
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });
});

describe('delivery snapshots — per-station crate counts', () => {
  const station: PlacedScenery = {
    id: 'scenery-1',
    kind: 'station',
    cell: { x: 2, y: 2 },
    rotation: 0,
  };

  it('omits deliveries when no station has received crates', () => {
    expect(serializeWorld([], [station], 'steam', false, {})).toEqual({
      version: 3,
      pieces: [],
      scenery: [station],
      train: 'steam',
    });
  });

  it('round-trips delivery counts keyed by station id', () => {
    const snapshot = serializeWorld([], [station], 'steam', false, { 'scenery-1': 4 });

    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
    expect(deserializeWorld(snapshot)).toEqual({
      pieces: [],
      scenery: [station],
      train: 'steam',
      deliveries: { 'scenery-1': 4 },
      consist: defaultConsist(),
    });
  });

  it('migrates pre-cargo snapshots to a world with no deliveries', () => {
    expect(deserializeWorld({ version: 2, pieces: [], scenery: [station] })).toEqual({
      pieces: [],
      scenery: [station],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('drops malformed delivery entries without dropping the world', () => {
    const snapshot = {
      version: 3 as const,
      pieces: [],
      scenery: [station],
      deliveries: {
        'scenery-1': 3,
        bad: 'x',
        'scenery-2': -1,
        'scenery-3': 2.5,
        'scenery-4': '9',
        'scenery-5': null,
        __proto__: { polluted: true },
      },
    };

    expect(deserializeWorld(snapshot)).toEqual({
      pieces: [],
      scenery: [station],
      train: 'steam',
      deliveries: { 'scenery-1': 3 },
      consist: defaultConsist(),
    });
  });

  it('clamps counts over the platform cap', () => {
    const snapshot = {
      version: 3 as const,
      pieces: [],
      scenery: [station],
      deliveries: { 'scenery-1': 99 },
    };

    expect(deserializeWorld(snapshot)).toEqual({
      pieces: [],
      scenery: [station],
      train: 'steam',
      deliveries: { 'scenery-1': 8 },
      consist: defaultConsist(),
    });
  });

  it('forgives a non-record deliveries field', () => {
    const snapshot = {
      version: 3 as const,
      pieces: [],
      scenery: [station],
      deliveries: 'all the crates',
    };

    expect(deserializeWorld(snapshot)).toEqual({
      pieces: [],
      scenery: [station],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });
});

describe('device preferences', () => {
  it('serializes a muted preference into the snapshot', () => {
    const snapshot = serializeWorld(pieces, [], 'steam', true);

    expect(snapshot).toEqual({
      version: 3,
      pieces,
      scenery: [],
      train: 'steam',
      preferences: { muted: true },
    });
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('omits preferences when sound is on', () => {
    expect(serializeWorld(pieces, scenery, 'steam')).toEqual({
      version: 3,
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

describe('day-phase preference', () => {
  it('serializes the day phase alongside the mute preference', () => {
    const snapshot = serializeWorld(pieces, [], 'steam', false, {}, defaultConsist(), 'dusk');

    expect(snapshot.preferences).toEqual({ muted: false, dayPhase: 'dusk' });
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('omits the default mid-morning phase so snapshots stay minimal', () => {
    expect(
      serializeWorld(pieces, [], 'steam', false, {}, defaultConsist(), 'morning').preferences,
    ).toBeUndefined();
  });

  it('round-trips every day phase; mid-morning comes back as the default', () => {
    for (const dayPhase of DAY_PHASES) {
      const restored = deserializePreferences(
        serializeWorld(pieces, [], 'steam', true, {}, defaultConsist(), dayPhase),
      );
      expect(restored.muted).toBe(true);
      expect(restored.dayPhase ?? 'morning').toBe(dayPhase);
    }
  });

  it('leaves the phase out for legacy snapshots that predate it', () => {
    expect(deserializePreferences({ version: 1, pieces, scenery })).toEqual({ muted: false });
    expect(deserializePreferences(serializeWorld(pieces, scenery, 'steam', true))).toEqual({
      muted: true,
    });
  });

  it('drops an unrecognized day phase without losing the mute state', () => {
    const invalid: unknown[] = ['evening', '', 3, null, {}, 'Night'];

    for (const dayPhase of invalid) {
      expect(
        deserializePreferences({
          version: 3,
          pieces,
          scenery,
          preferences: { muted: true, dayPhase },
        }),
      ).toEqual({ muted: true });
    }
  });
});

describe('river migration — v1 snapshots load as v2 bridges', () => {
  // The river crosses every row; row 8's water spans x 7–9, so x 0 is bank.
  const water = [...Array(16).keys()].map((x) => ({ x, y: 8 })).find((c) => isWater(c));
  const land = [...Array(16).keys()].map((x) => ({ x, y: 8 })).find((c) => !isWater(c));
  const wet = water ?? { x: 8, y: 8 };
  const dry = land ?? { x: 0, y: 8 };

  const v1 = {
    version: 1 as const,
    pieces: [
      { id: 'piece-1', type: 'straight', cell: wet, rotation: 90 },
      { id: 'piece-2', type: 'corner', cell: { x: wet.x, y: 7 }, rotation: 0 },
      { id: 'piece-3', type: 'straight', cell: dry, rotation: 180 },
    ],
    scenery: [{ id: 'scenery-1', kind: 'tree', cell: { x: wet.x, y: 9 }, rotation: 0 }],
    train: 'diesel' as const,
  };

  it('rewrites water-crossing straights and corners as bridges, keeping identity', () => {
    const world = deserializeWorld(v1);

    expect(world.pieces).toHaveLength(3);
    expect(world.pieces[0]).toEqual({ id: 'piece-1', type: 'bridge', cell: wet, rotation: 90 });
    expect(world.pieces[1]).toEqual({
      id: 'piece-2',
      type: 'bridge',
      cell: { x: wet.x, y: 7 },
      rotation: 0,
    });
    // Dry-land track is untouched by the migration.
    expect(world.pieces[2]).toEqual({ id: 'piece-3', type: 'straight', cell: dry, rotation: 180 });
    expect(world.train).toBe('diesel');
  });

  it('never drops a toy: scenery standing where water now flows restores as-is', () => {
    const world = deserializeWorld(v1);
    expect(world.scenery).toEqual(v1.scenery);
  });

  it('round-trips v2 snapshots — bridges persist as bridges', () => {
    const first = deserializeWorld(v1);
    const v2 = serializeWorld(first.pieces, first.scenery, first.train);
    expect(v2.version).toBe(3);
    expect(deserializeWorld(v2)).toEqual(first);
  });

  it('is idempotent: migrating twice changes nothing', () => {
    const once = deserializeWorld(v1);
    const twice = deserializeWorld({
      version: 1 as const,
      pieces: once.pieces,
      scenery: once.scenery,
      train: once.train,
    });
    expect(twice).toEqual(once);
  });

  it('drops broken v1 pieces without weakening the migration', () => {
    expect(
      deserializeWorld({ version: 1, pieces: [{ id: 'x', type: 'nope' }], scenery: [] }),
    ).toEqual({
      pieces: [],
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });
});

describe('wagon consist snapshots — per-train presets', () => {
  it('omits the consist when every train pulls classic', () => {
    expect(serializeWorld(pieces, scenery, 'steam')).toEqual({
      version: 3,
      pieces,
      scenery,
      train: 'steam',
    });
  });

  it('round-trips a fleet engine choice and its preset', () => {
    const consist = withConsistPreset(defaultConsist(), 'freight', 'coal');
    const snapshot = serializeWorld(pieces, scenery, 'bullet', false, {}, consist);

    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
    expect(deserializeWorld(snapshot)).toEqual({
      pieces,
      scenery,
      train: 'bullet',
      deliveries: {},
      consist,
    });
  });

  it('round-trips a new engine chosen on an otherwise classic consist', () => {
    const snapshot = serializeWorld(pieces, scenery, 'express');

    expect(snapshot).toEqual({ version: 3, pieces, scenery, train: 'express' });
    expect(deserializeWorld(snapshot)).toEqual({
      pieces,
      scenery,
      train: 'express',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('loads pre-fleet snapshots without a train field as all-classic steam', () => {
    expect(deserializeWorld({ version: 3, pieces, scenery })).toEqual({
      pieces,
      scenery,
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('round-trips per-train presets', () => {
    const consist = withConsistPreset(
      withConsistPreset(defaultConsist(), 'diesel', 'coal'),
      'tram',
      'container',
    );
    const snapshot = serializeWorld(pieces, scenery, 'diesel', false, {}, consist);

    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
    expect(deserializeWorld(snapshot)).toEqual({
      pieces,
      scenery,
      train: 'diesel',
      deliveries: {},
      consist,
    });
  });

  it('loads pre-workshop snapshots as all-classic', () => {
    expect(deserializeWorld({ version: 3, pieces, scenery, train: 'tram' })).toEqual({
      pieces,
      scenery,
      train: 'tram',
      deliveries: {},
      consist: defaultConsist(),
    });
  });

  it('forgives corrupt consist entries back to classic', () => {
    const raw = JSON.parse(
      JSON.stringify({
        version: 3,
        pieces,
        scenery,
        train: 'steam',
        consist: { steam: 'coal', diesel: 'rocket', tram: null, rocket: 'tank' },
      }),
    );

    expect(deserializeWorld(raw).consist).toEqual({ ...defaultConsist(), steam: 'coal' });
  });

  it('forgives a non-record consist field', () => {
    expect(deserializeWorld({ version: 3, pieces, scenery, consist: 'coal duo' }).consist).toEqual(
      defaultConsist(),
    );
  });
});
