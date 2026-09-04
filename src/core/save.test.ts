import { describe, expect, it } from 'vitest';
import { isWater } from './river';
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

    expect(snapshot).toEqual({ version: 3, pieces, scenery, train: 'diesel' });
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('round-trips tracks, scenery, and train without changing order or fields', () => {
    const snapshot = serializeWorld(pieces, scenery, 'tram');

    expect(deserializeWorld(snapshot)).toEqual({ pieces, scenery, train: 'tram', deliveries: {} });
  });

  it('restores steam for legacy snapshots without a train field', () => {
    expect(deserializeWorld({ version: 1, pieces, scenery })).toEqual({
      pieces,
      scenery,
      train: 'steam',
      deliveries: {},
    });
  });

  it('restores steam for unknown persisted train identifiers', () => {
    expect(deserializeWorld({ version: 1, pieces, scenery, train: 'hovercraft' })).toEqual({
      pieces,
      scenery,
      train: 'steam',
      deliveries: {},
    });
  });

  it('rejects malformed and unknown-version snapshots safely', () => {
    expect(deserializeWorld(null)).toEqual({
      pieces: [],
      scenery: [],
      train: 'steam',
      deliveries: {},
    });
    expect(deserializeWorld({ version: 4, pieces, scenery })).toEqual({
      pieces: [],
      scenery: [],
      train: 'steam',
      deliveries: {},
    });
    expect(deserializeWorld({ version: 1, pieces: 'bad', scenery: [] })).toEqual({
      pieces: [],
      scenery: [],
      train: 'steam',
      deliveries: {},
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
    });
  });

  it('loads a legacy world of only V1 kinds unchanged', () => {
    const legacy = serializeWorld(pieces, scenery, 'steam');
    expect(deserializeWorld(legacy)).toEqual({ pieces, scenery, train: 'steam', deliveries: {} });
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
    });
  });

  it('rejects duplicate cells across tracks and scenery', () => {
    const invalid = {
      version: 1,
      pieces: [{ id: 'piece-1', type: 'straight', cell: { x: 0, y: 0 }, rotation: 0 }],
      scenery: [{ id: 'scenery-2', kind: 'tree', cell: { x: 0, y: 0 }, rotation: 0 }],
    };

    expect(deserializeWorld(invalid)).toEqual({
      pieces: [],
      scenery: [],
      train: 'steam',
      deliveries: {},
    });
  });

  it('rejects snapshots over the shared capacity', () => {
    const fullPieces = Array.from({ length: 65 }, (_, index) => ({
      id: `piece-${index}`,
      type: 'straight' as const,
      cell: { x: index % 16, y: Math.floor(index / 16) },
      rotation: 0 as const,
    }));
    const snapshot: WorldSnapshot = { version: 3, pieces: fullPieces, scenery: [] };

    expect(deserializeWorld(snapshot)).toEqual({
      pieces: [],
      scenery: [],
      train: 'steam',
      deliveries: {},
    });
  });
});

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
    });
  });

  it('restores a persisted v2 snapshot containing tunnels verbatim', () => {
    expect(
      deserializeWorld({ version: 2, pieces: [tunnelPiece], scenery: [], train: 'diesel' }),
    ).toEqual({ pieces: [tunnelPiece], scenery: [], train: 'diesel', deliveries: {} });
  });

  it('keeps rejecting unknown piece types — the tunnel is catalog-listed, anything else is not', () => {
    expect(
      deserializeWorld({
        version: 2,
        pieces: [{ id: 'piece-1', type: 'hovercraft', cell: { x: 0, y: 0 }, rotation: 0 }],
        scenery: [],
      }),
    ).toEqual({ pieces: [], scenery: [], train: 'steam', deliveries: {} });
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
    });
  });

  it('keeps rejecting unknown piece types alongside the hill catalog', () => {
    expect(
      deserializeWorld({
        version: 3,
        pieces: [{ id: 'piece-1', type: 'rollercoaster', cell: { x: 0, y: 0 }, rotation: 0 }],
        scenery: [],
      }),
    ).toEqual({ pieces: [], scenery: [], train: 'steam', deliveries: {} });
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
    });
  });

  it('migrates pre-cargo snapshots to a world with no deliveries', () => {
    expect(deserializeWorld({ version: 2, pieces: [], scenery: [station] })).toEqual({
      pieces: [],
      scenery: [station],
      train: 'steam',
      deliveries: {},
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

  it('still refuses broken v1 snapshots — migration never weakens validation', () => {
    expect(
      deserializeWorld({ version: 1, pieces: [{ id: 'x', type: 'nope' }], scenery: [] }),
    ).toEqual({ pieces: [], scenery: [], train: 'steam', deliveries: {} });
  });
});
