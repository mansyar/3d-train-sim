import { describe, expect, it } from 'vitest';
import { rideComponentsOf } from './pathing';
import { hasCycle, isRideable } from './ride-ready';
import { isWater } from './river';
import type { WorldData } from './save';
import { cozyOval, hilltopJunction, riverCrossing, STARTER_PRESETS, stationVillage } from './starters';
import { inBounds, terrainErrorFor } from './track-graph';

const BUILDERS = {
  'cozy-oval': cozyOval,
  'station-village': stationVillage,
  'river-crossing': riverCrossing,
  'hilltop-junction': hilltopJunction,
} as const;

/** Invariants every starter preset must hold: an ordinary, rideable, legal world. */
function expectValidStarter(data: WorldData): void {
  expect(data.train).toBe('steam');
  expect(data.deliveries).toEqual({});
  const toys = data.pieces.length + data.scenery.length;
  expect(toys).toBeGreaterThan(0);
  expect(toys).toBeLessThanOrEqual(20);
  expect(isRideable(data.pieces)).toBe(true);
  expect(hasCycle(data.pieces)).toBe(true);
  // The train's own solver must see one closed ride covering every piece —
  // weaker checks (any cycle exists) would let a dangling layout pass.
  // Switch layouts ride an alternating periodic cycle longer than the piece
  // count (main laps interleaved with spur shuttles), so coverage — not
  // exact length — is the invariant.
  const components = rideComponentsOf(data.pieces);
  expect(components).toHaveLength(1);
  expect(components[0]?.path.closed).toBe(true);
  expect(new Set(components[0]?.path.steps.map((step) => step.pieceId))).toEqual(
    new Set(data.pieces.map((piece) => piece.id)),
  );
  const ids = [...data.pieces.map((p) => p.id), ...data.scenery.map((s) => s.id)];
  expect(new Set(ids).size).toBe(ids.length);
  const cells = [...data.pieces.map((p) => p.cell), ...data.scenery.map((s) => s.cell)];
  for (const cell of cells) expect(inBounds(cell)).toBe(true);
  expect(new Set(cells.map((c) => `${c.x},${c.y}`)).size).toBe(cells.length);
  for (const piece of data.pieces) {
    expect(['straight', 'corner', 'bridge', 'slope-up', 'hill', 'slope-down', 'switch']).toContain(
      piece.type,
    );
    // Covers both directions: land toys on dry cells, bridges on water only.
    expect(terrainErrorFor(piece.type, piece.cell)).toBeNull();
  }
  for (const item of data.scenery) {
    expect(isWater(item.cell)).toBe(false);
  }
}

describe('cozyOval', () => {
  it('is a valid starter world', () => {
    expectValidStarter(cozyOval());
  });

  it('holds one station, two trees, and one house beside the loop', () => {
    const kinds = cozyOval().scenery.map((s) => s.kind);
    expect(kinds.filter((k) => k === 'station')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'tree')).toHaveLength(2);
    expect(kinds.filter((k) => k === 'house')).toHaveLength(1);
  });
});

describe('stationVillage', () => {
  it('is a valid starter world', () => {
    expectValidStarter(stationVillage());
  });

  it('brings a station, homes, and critters to the loop', () => {
    const kinds = stationVillage().scenery.map((s) => s.kind);
    expect(kinds).toContain('station');
    expect(kinds.some((k) => k === 'house' || k === 'cottage')).toBe(true);
    expect(kinds).toContain('pig');
    expect(kinds).toContain('sheep');
  });
});

describe('riverCrossing', () => {
  it('is a valid starter world', () => {
    expectValidStarter(riverCrossing());
  });

  it('spans the water on trestle bridges and keeps a station on dry land', () => {
    const data = riverCrossing();
    const bridges = data.pieces.filter((p) => p.type === 'bridge');
    expect(bridges.length).toBeGreaterThanOrEqual(2);
    for (const bridge of bridges) expect(isWater(bridge.cell)).toBe(true);
    expect(data.scenery.map((s) => s.kind)).toContain('station');
  });
});

describe('hilltopJunction', () => {
  it('is a valid starter world', () => {
    expectValidStarter(hilltopJunction());
  });

  it('showcases the hill run and a two-switch passing loop, nothing else exotic', () => {
    const types = hilltopJunction().pieces.map((piece) => piece.type);
    expect(types).toContain('slope-up');
    expect(types).toContain('hill');
    expect(types).toContain('slope-down');
    expect(types.filter((type) => type === 'switch')).toHaveLength(2);
    // Opposite-facing stems: each travel direction enters one stem, so the
    // alternating ride serves the siding whichever way the solver runs.
    const switchRotations = hilltopJunction()
      .pieces.filter((piece) => piece.type === 'switch')
      .map((piece) => piece.rotation)
      .sort((a, b) => a - b);
    expect(switchRotations).toEqual([90, 270]);
    expect(types).not.toContain('switch-mirror');
    expect(types).not.toContain('tunnel');
    expect(types).not.toContain('crossing-gate');
  });

  it('keeps a station beside the loop', () => {
    expect(hilltopJunction().scenery.map((item) => item.kind)).toContain('station');
  });
});

describe('STARTER_PRESETS', () => {
  it('lists the four gallery presets behind their builders', () => {
    expect(STARTER_PRESETS.map((p) => p.id)).toEqual([
      'cozy-oval',
      'station-village',
      'river-crossing',
      'hilltop-junction',
    ]);
    for (const preset of STARTER_PRESETS) {
      expectValidStarter(preset.build());
      expect(preset.build()).toEqual(BUILDERS[preset.id]());
    }
  });
});
