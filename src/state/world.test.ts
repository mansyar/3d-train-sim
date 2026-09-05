import { describe, expect, it, vi } from 'vitest';
import { isWater } from '../core/river';
import { STARTER_PRESETS, cozyOval, hilltopJunction, stationVillage } from '../core/starters';
import { MAX_PIECES } from '../core/track-graph';
import { TRAIN_KINDS } from '../core/trains';
import { defaultConsist, withConsistPreset } from '../core/wagons';
import { createWorldStore } from './world';

const ORIGIN = { x: 0, y: 0 };
const NEXT_CELL = { x: 1, y: 0 };

/** A water and a land cell on the river's mid row (the river crosses every row). */
const MID_ROW = 8;
const WATER_CELL = [...Array(16).keys()].map((x) => ({ x, y: MID_ROW })).find((c) => isWater(c));
const LAND_CELL = [...Array(16).keys()].map((x) => ({ x, y: MID_ROW })).find((c) => !isWater(c));

function cellOr(cell: { x: number; y: number } | undefined, fallback: { x: number; y: number }) {
  return cell ?? fallback;
}

function fillWorld(store: ReturnType<typeof createWorldStore>, count: number) {
  let filled = 0;
  for (let y = 0; y < 16 && filled < count; y += 1) {
    for (let x = 0; x < 16 && filled < count; x += 1) {
      if (isWater({ x, y })) continue; // the riverbed stays bare in fixtures
      const result = store.place('straight', { x, y }, 0);
      if (result !== 'placed') throw new Error(`fixture failed at ${x},${y}: ${result}`);
      filled += 1;
    }
  }
  if (filled < count) throw new Error(`fixture ran out of dry land at ${filled}/${count}`);
}

describe('world store', () => {
  it('places a piece on a free cell, generating an id and notifying', () => {
    const store = createWorldStore();
    const listener = vi.fn();
    store.subscribe(listener);

    expect(store.place('corner', ORIGIN, 90)).toBe('placed');
    expect(store.pieces()).toHaveLength(1);
    const piece = store.pieces()[0];
    expect(piece?.type).toBe('corner');
    expect(piece?.cell).toEqual(ORIGIN);
    expect(piece?.rotation).toBe(90);
    expect(piece?.id).toBeTruthy();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('rejects placement on an occupied cell without notifying', () => {
    const store = createWorldStore();
    store.place('straight', ORIGIN, 0);
    const listener = vi.fn();
    store.subscribe(listener);

    expect(store.place('corner', ORIGIN, 0)).toBe('occupied');
    expect(store.pieces()).toHaveLength(1);
    expect(listener).not.toHaveBeenCalled();
  });

  it('rejects placement outside the meadow bounds', () => {
    const store = createWorldStore();
    expect(store.place('straight', { x: 16, y: 0 }, 0)).toBe('out-of-bounds');
    expect(store.pieces()).toHaveLength(0);
  });

  it('dims at the 64-piece cap instead of erroring', () => {
    const store = createWorldStore();
    fillWorld(store, MAX_PIECES);
    expect(store.place('straight', { x: 0, y: 15 }, 0)).toBe('capacity');
    expect(store.pieces()).toHaveLength(MAX_PIECES);

    // Room returns when a piece goes back to the drawer.
    const first = store.pieces()[0];
    if (first) store.remove(first.id);
    expect(store.place('straight', { x: 0, y: 15 }, 0)).toBe('placed');
  });

  it('relocates a piece to a free cell and notifies', () => {
    const store = createWorldStore();
    store.place('straight', ORIGIN, 0);
    const id = store.pieces()[0]?.id;
    if (!id) throw new Error('fixture failed');

    expect(store.relocate(id, NEXT_CELL, 90)).toBe('placed');
    const piece = store.pieces()[0];
    expect(piece?.cell).toEqual(NEXT_CELL);
    expect(piece?.rotation).toBe(90);
  });

  it('refuses to relocate onto a cell held by another piece', () => {
    const store = createWorldStore();
    store.place('straight', ORIGIN, 0);
    store.place('straight', NEXT_CELL, 0);
    const id = store.pieces()[0]?.id;
    if (!id) throw new Error('fixture failed');

    expect(store.relocate(id, NEXT_CELL, 0)).toBe('occupied');
    expect(store.pieces()[0]?.cell).toEqual(ORIGIN);
  });

  it('treats relocating a piece onto its own cell as a no-op success', () => {
    const store = createWorldStore();
    store.place('straight', ORIGIN, 0);
    const id = store.pieces()[0]?.id;
    if (!id) throw new Error('fixture failed');

    expect(store.relocate(id, ORIGIN, 0)).toBe('placed');
    expect(store.pieces()).toHaveLength(1);
  });

  it('reports not-found for unknown ids on relocate and ignores unknown removes', () => {
    const store = createWorldStore();
    store.place('straight', ORIGIN, 0);

    expect(store.relocate('ghost', NEXT_CELL, 0)).toBe('not-found');
    expect(() => store.remove('ghost')).not.toThrow();
    expect(store.pieces()).toHaveLength(1);
  });

  it('removes a piece back to the drawer and notifies', () => {
    const store = createWorldStore();
    store.place('straight', ORIGIN, 0);
    const id = store.pieces()[0]?.id;
    if (!id) throw new Error('fixture failed');

    store.remove(id);
    expect(store.pieces()).toHaveLength(0);
  });

  it('stops notifying after unsubscribe', () => {
    const store = createWorldStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();

    store.place('straight', ORIGIN, 0);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('world store scenery', () => {
  it('places scenery on a free cell, generating an id and notifying', () => {
    const store = createWorldStore();
    const listener = vi.fn();
    store.subscribe(listener);

    expect(store.placeScenery('tree', ORIGIN, 0)).toBe('placed');
    expect(store.scenery()).toHaveLength(1);
    const item = store.scenery()[0];
    expect(item?.kind).toBe('tree');
    expect(item?.cell).toEqual(ORIGIN);
    expect(item?.rotation).toBe(0);
    expect(item?.id).toBeTruthy();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('never lets track and scenery share a cell', () => {
    const store = createWorldStore();
    store.place('straight', ORIGIN, 0);
    expect(store.placeScenery('tree', ORIGIN, 0)).toBe('occupied');
    expect(store.scenery()).toHaveLength(0);

    store.placeScenery('bush', NEXT_CELL, 0);
    expect(store.place('corner', NEXT_CELL, 90)).toBe('occupied');
    expect(store.pieces()).toHaveLength(1);
  });

  it('rejects scenery outside the meadow bounds', () => {
    const store = createWorldStore();
    expect(store.placeScenery('rock', { x: 16, y: 0 }, 0)).toBe('out-of-bounds');
    expect(store.scenery()).toHaveLength(0);
  });

  it('dims scenery at the shared 64-toy meadow cap', () => {
    const store = createWorldStore();
    fillWorld(store, MAX_PIECES);
    expect(store.placeScenery('tree', { x: 0, y: 15 }, 0)).toBe('capacity');
    expect(store.scenery()).toHaveLength(0);

    // Room returns when a toy goes back to the drawer.
    const first = store.pieces()[0];
    if (first) store.remove(first.id);
    expect(store.placeScenery('tree', { x: 0, y: 15 }, 0)).toBe('placed');
  });

  it('relocates scenery to a free cell and frees the old one', () => {
    const store = createWorldStore();
    store.placeScenery('tree', ORIGIN, 0);
    const id = store.scenery()[0]?.id;
    if (!id) throw new Error('fixture failed');

    expect(store.relocateScenery(id, NEXT_CELL, 90)).toBe('placed');
    expect(store.scenery()[0]?.cell).toEqual(NEXT_CELL);
    expect(store.place('straight', ORIGIN, 0)).toBe('placed');
  });

  it('refuses to relocate scenery onto an occupied cell', () => {
    const store = createWorldStore();
    store.placeScenery('tree', ORIGIN, 0);
    store.place('straight', NEXT_CELL, 0);
    const id = store.scenery()[0]?.id;
    if (!id) throw new Error('fixture failed');

    expect(store.relocateScenery(id, NEXT_CELL, 0)).toBe('occupied');
    expect(store.scenery()[0]?.cell).toEqual(ORIGIN);
  });

  it('treats relocating scenery onto its own cell as a no-op success', () => {
    const store = createWorldStore();
    store.placeScenery('bush', ORIGIN, 0);
    const id = store.scenery()[0]?.id;
    if (!id) throw new Error('fixture failed');

    expect(store.relocateScenery(id, ORIGIN, 0)).toBe('placed');
    expect(store.scenery()).toHaveLength(1);
  });

  it('reports not-found for unknown scenery ids and ignores unknown removes', () => {
    const store = createWorldStore();
    store.placeScenery('rock', ORIGIN, 0);

    expect(store.relocateScenery('ghost', NEXT_CELL, 0)).toBe('not-found');
    expect(() => store.removeScenery('ghost')).not.toThrow();
    expect(store.scenery()).toHaveLength(1);
  });

  it('removes scenery back to the drawer and notifies', () => {
    const store = createWorldStore();
    store.placeScenery('tree', ORIGIN, 0);
    const id = store.scenery()[0]?.id;
    if (!id) throw new Error('fixture failed');

    store.removeScenery(id);
    expect(store.scenery()).toHaveLength(0);
    expect(store.place('straight', ORIGIN, 0)).toBe('placed');
  });
});

describe('world store toy categories', () => {
  it('places town and critter toys under the same rules as nature scenery', () => {
    const store = createWorldStore();
    const listener = vi.fn();
    store.subscribe(listener);

    expect(store.placeScenery('station', ORIGIN, 0)).toBe('placed');
    expect(store.placeScenery('pig', NEXT_CELL, 0)).toBe('placed');
    const kinds = store.scenery().map((item) => item.kind);
    expect(kinds).toEqual(['station', 'pig']);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('never lets two toy categories share a cell', () => {
    const store = createWorldStore();
    expect(store.placeScenery('station', ORIGIN, 0)).toBe('placed');
    expect(store.placeScenery('pig', ORIGIN, 0)).toBe('occupied');
    expect(store.scenery()).toHaveLength(1);

    expect(store.placeScenery('house', NEXT_CELL, 0)).toBe('placed');
    expect(store.place('straight', NEXT_CELL, 0)).toBe('occupied');
    expect(store.pieces()).toHaveLength(0);
  });

  it('retains the toy kind through relocation and removal', () => {
    const store = createWorldStore();
    store.placeScenery('sheep', ORIGIN, 0);
    const sheep = store.scenery()[0];
    if (!sheep) throw new Error('fixture failed: sheep missing');

    expect(store.relocateScenery(sheep.id, NEXT_CELL, 90)).toBe('placed');
    const moved = store.scenery()[0];
    expect(moved?.kind).toBe('sheep');
    expect(moved?.cell).toEqual(NEXT_CELL);
    expect(moved?.rotation).toBe(90);

    store.removeScenery(sheep.id);
    expect(store.scenery()).toHaveLength(0);
  });

  it('counts town and critter toys toward the shared meadow cap', () => {
    const store = createWorldStore();
    fillWorld(store, MAX_PIECES - 1);
    expect(store.placeScenery('pug', { x: 0, y: 15 }, 0)).toBe('placed');
    expect(store.placeScenery('cottage', { x: 1, y: 15 }, 0)).toBe('capacity');

    const pug = store.scenery()[0];
    if (pug) store.removeScenery(pug.id);
    expect(store.placeScenery('cottage', { x: 1, y: 15 }, 0)).toBe('placed');
  });
});

describe('world store train selection', () => {
  it('defaults to steam and changes across the train catalog', () => {
    const store = createWorldStore();
    expect(store.train()).toBe('steam');

    expect(store.selectTrain('diesel')).toBe(true);
    expect(store.train()).toBe('diesel');
    expect(store.selectTrain('tram')).toBe(true);
    expect(store.train()).toBe('tram');
  });

  it('falls back to steam for an invalid persisted selection', () => {
    const store = createWorldStore();
    expect(store.selectTrain('hovercraft')).toBe(false);
    expect(store.train()).toBe('steam');
  });

  it('notifies selection changes without changing the meadow', () => {
    const store = createWorldStore();
    store.place('straight', ORIGIN, 0);
    store.placeScenery('tree', NEXT_CELL, 0);
    const beforePieces = store.pieces();
    const beforeScenery = store.scenery();
    const listener = vi.fn();
    store.subscribe(listener);

    expect(store.selectTrain('diesel')).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.pieces()).toEqual(beforePieces);
    expect(store.scenery()).toEqual(beforeScenery);
  });
});

describe('world store wagon consist', () => {
  it('defaults every locomotive to the classic pair', () => {
    const store = createWorldStore();

    expect(store.consist()).toEqual(defaultConsist());
    for (const kind of TRAIN_KINDS) expect(store.consistFor(kind)).toBe('classic');
  });

  it('switches one train without touching the others and notifies once', () => {
    const store = createWorldStore();
    const listener = vi.fn();
    store.subscribe(listener);

    expect(store.selectConsist('diesel', 'coal')).toBe(true);
    expect(store.consistFor('diesel')).toBe('coal');
    expect(store.consistFor('steam')).toBe('classic');
    expect(store.consistFor('tram')).toBe('classic');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('falls back to classic for an invalid preset', () => {
    const store = createWorldStore();
    expect(store.selectConsist('tram', 'container')).toBe(true);

    expect(store.selectConsist('tram', 'rocket')).toBe(false);
    expect(store.consistFor('tram')).toBe('classic');
  });

  it('stays silent when the preset is unchanged', () => {
    const store = createWorldStore();
    const listener = vi.fn();
    store.subscribe(listener);

    expect(store.selectConsist('steam', 'classic')).toBe(true);
    expect(listener).not.toHaveBeenCalled();
  });

  it('returns a consist copy callers cannot mutate', () => {
    const store = createWorldStore();
    store.consist().steam = 'coal';

    expect(store.consistFor('steam')).toBe('classic');
  });

  it('hydrates and resets the consist with the world', () => {
    const store = createWorldStore();
    store.hydrate({
      pieces: [],
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: withConsistPreset(defaultConsist(), 'steam', 'tank'),
    });
    expect(store.consistFor('steam')).toBe('tank');

    store.reset();
    expect(store.consist()).toEqual(defaultConsist());
  });

  it('carries the consist forward on preset apply, restores prior on undo', () => {
    const store = createWorldStore();
    store.selectConsist('diesel', 'coal');
    store.applyPreset({
      pieces: [],
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
    expect(store.consistFor('diesel')).toBe('coal');

    expect(store.undo()).toBe(true);
    expect(store.consistFor('diesel')).toBe('coal');
  });
});

describe('world reset', () => {
  it('clears every track piece and scenery toy in one notification', () => {
    const store = createWorldStore();
    store.place('straight', ORIGIN, 0);
    store.placeScenery('tree', NEXT_CELL, 0);
    const listener = vi.fn();
    store.subscribe(listener);

    store.reset();

    expect(store.pieces()).toEqual([]);
    expect(store.scenery()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('frees occupancy and the shared capacity after reset', () => {
    const store = createWorldStore();
    fillWorld(store, MAX_PIECES);

    store.reset();

    expect(store.place('straight', ORIGIN, 0)).toBe('placed');
    expect(store.placeScenery('tree', NEXT_CELL, 0)).toBe('placed');
    expect(store.pieces()[0]?.id).toBe('piece-1');
  });

  it('returns the train selection to the default steam locomotive', () => {
    const store = createWorldStore();
    store.selectTrain('diesel');

    store.reset();

    expect(store.train()).toBe('steam');
  });

  it('notifies exactly once even when the world is already empty', () => {
    const store = createWorldStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.reset();
    store.reset();

    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('river water rules', () => {
  it('rejects ordinary track pieces on river water', () => {
    const store = createWorldStore();
    expect(store.place('straight', cellOr(WATER_CELL, { x: 8, y: 8 }), 0)).toBe('water');
    expect(store.place('corner', cellOr(WATER_CELL, { x: 8, y: 8 }), 0)).toBe('water');
    expect(store.place('crossing', cellOr(WATER_CELL, { x: 8, y: 8 }), 0)).toBe('water');
    expect(store.pieces()).toHaveLength(0);
  });

  it('accepts a bridge on water — the one piece that spans the river', () => {
    const store = createWorldStore();
    expect(store.place('bridge', cellOr(WATER_CELL, { x: 8, y: 8 }), 90)).toBe('placed');
    expect(store.pieces()[0]?.type).toBe('bridge');
  });

  it('rejects a bridge on dry land — the trestle is a water-only toy', () => {
    const store = createWorldStore();
    expect(store.place('bridge', cellOr(LAND_CELL, { x: 0, y: 8 }), 0)).toBe('water');
    expect(store.pieces()).toHaveLength(0);
  });

  it('refuses relocating a land piece into the water', () => {
    const store = createWorldStore();
    store.place('straight', ORIGIN, 0);
    const id = store.pieces()[0]?.id;
    if (!id) throw new Error('fixture failed');
    expect(store.relocate(id, cellOr(WATER_CELL, { x: 8, y: 8 }), 90)).toBe('water');
    expect(store.pieces()[0]?.cell).toEqual(ORIGIN);
  });

  it('refuses relocating a bridge off the water onto land', () => {
    const store = createWorldStore();
    expect(store.place('bridge', cellOr(WATER_CELL, { x: 8, y: 8 }), 0)).toBe('placed');
    const id = store.pieces()[0]?.id;
    if (!id) throw new Error('fixture failed');
    expect(store.relocate(id, cellOr(LAND_CELL, { x: 0, y: 8 }), 90)).toBe('water');
    expect(store.pieces()[0]?.cell).toEqual(cellOr(WATER_CELL, { x: 8, y: 8 }));
  });

  it('refuses scenery on the water — toys stay on the banks', () => {
    const store = createWorldStore();
    expect(store.placeScenery('tree', cellOr(WATER_CELL, { x: 8, y: 8 }), 0)).toBe('water');
    expect(store.scenery()).toHaveLength(0);
  });

  it('keeps the meadow playable: an all-land loop still rides', () => {
    const store = createWorldStore();
    store.place('corner', { x: 0, y: 0 }, 90);
    store.place('corner', { x: 1, y: 0 }, 180);
    store.place('corner', { x: 1, y: 1 }, 270);
    store.place('corner', { x: 0, y: 1 }, 0);
    expect(store.pieces()).toHaveLength(4);
  });
});

describe('station deliveries', () => {
  const placeStation = (store: ReturnType<typeof createWorldStore>, cell = NEXT_CELL) => {
    expect(store.placeScenery('station', cell, 0)).toBe('placed');
    const id = store.scenery()[0]?.id;
    if (!id) throw new Error('fixture failed');
    return id;
  };

  it('reports zero delivered crates before the first delivery', () => {
    const store = createWorldStore();
    const id = placeStation(store);

    expect(store.deliveryCount(id)).toBe(0);
  });

  it('reports zero for unknown ids', () => {
    const store = createWorldStore();
    placeStation(store);

    expect(store.deliveryCount('scenery-999')).toBe(0);
  });

  it('counts each delivery', () => {
    const store = createWorldStore();
    const id = placeStation(store);

    expect(store.deliverCrate(id)).toBe(1);
    expect(store.deliverCrate(id)).toBe(2);
    expect(store.deliveryCount(id)).toBe(2);
  });

  it('caps the platform at MAX_DELIVERED_CRATES', () => {
    const store = createWorldStore();
    const id = placeStation(store);

    for (let i = 0; i < 20; i += 1) store.deliverCrate(id);
    expect(store.deliveryCount(id)).toBe(8);
  });

  it('keeps the count when the station is relocated', () => {
    const store = createWorldStore();
    const id = placeStation(store);
    store.deliverCrate(id);

    expect(store.relocateScenery(id, { x: 4, y: 4 }, 90)).toBe('placed');
    expect(store.deliveryCount(id)).toBe(1);
  });

  it('drops the count when the station is removed', () => {
    const store = createWorldStore();
    const id = placeStation(store);
    store.deliverCrate(id);
    store.removeScenery(id);

    expect(store.deliveryCount(id)).toBe(0);
  });

  it('clears every count on reset', () => {
    const store = createWorldStore();
    const id = placeStation(store);
    store.deliverCrate(id);
    store.reset();

    expect(store.deliveryCount(id)).toBe(0);
  });

  it('hydrates counts from a save', () => {
    const store = createWorldStore();
    store.hydrate({
      pieces: [],
      scenery: [{ id: 'scenery-1', kind: 'station', cell: ORIGIN, rotation: 0 }],
      train: 'steam',
      deliveries: { 'scenery-1': 5 },
      consist: defaultConsist(),
    });

    expect(store.deliveryCount('scenery-1')).toBe(5);
  });

  it('notifies subscribers when a crate is delivered', () => {
    const store = createWorldStore();
    const id = placeStation(store);
    const listener = vi.fn();
    store.subscribe(listener);

    store.deliverCrate(id);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('world store undo', () => {
  it('starts with nothing to undo and stays silent', () => {
    const store = createWorldStore();
    const listener = vi.fn();
    store.subscribe(listener);

    expect(store.canUndo()).toBe(false);
    expect(store.undo()).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('undoes a placed piece and notifies exactly once', () => {
    const store = createWorldStore();
    expect(store.place('corner', ORIGIN, 90)).toBe('placed');
    expect(store.canUndo()).toBe(true);

    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.undo()).toBe(true);

    expect(store.pieces()).toHaveLength(0);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.canUndo()).toBe(false);
    expect(store.undo()).toBe(false);
  });

  it('undoes placed scenery the same way as track', () => {
    const store = createWorldStore();
    expect(store.placeScenery('tree', ORIGIN, 0)).toBe('placed');

    expect(store.undo()).toBe(true);
    expect(store.scenery()).toHaveLength(0);
    expect(store.canUndo()).toBe(false);
  });

  it('never arms undo for failed placements', () => {
    const store = createWorldStore();
    expect(store.place('corner', ORIGIN, 0)).toBe('placed');
    expect(store.undo()).toBe(true);

    expect(store.place('straight', cellOr(WATER_CELL, { x: 8, y: 8 }), 0)).toBe('water');
    expect(store.place('straight', { x: 16, y: 0 }, 0)).toBe('out-of-bounds');
    expect(store.placeScenery('rock', cellOr(WATER_CELL, { x: 8, y: 8 }), 0)).toBe('water');
    expect(store.canUndo()).toBe(false);
  });

  it('a refused placement leaves the pending undo untouched', () => {
    const store = createWorldStore();
    store.place('straight', ORIGIN, 0);
    store.place('corner', NEXT_CELL, 90);
    expect(store.place('straight', ORIGIN, 0)).toBe('occupied');

    expect(store.undo()).toBe(true);
    expect(store.pieces()).toHaveLength(1);
    expect(store.pieces()[0]?.type).toBe('straight');
  });

  it('a capacity refusal leaves the last fill undo armed', () => {
    const store = createWorldStore();
    fillWorld(store, MAX_PIECES);
    expect(store.place('straight', { x: 0, y: 15 }, 0)).toBe('capacity');
    // The only armed undo is the last successful fill placement.
    expect(store.canUndo()).toBe(true);
  });

  it('restores a removed piece with its id, rotation, and list position', () => {
    const store = createWorldStore();
    store.place('straight', ORIGIN, 0);
    store.place('corner', NEXT_CELL, 90);
    const first = store.pieces()[0];
    if (!first) throw new Error('fixture failed');

    store.remove(first.id);
    expect(store.pieces()).toHaveLength(1);

    expect(store.undo()).toBe(true);
    expect(store.pieces()).toHaveLength(2);
    const restored = store.pieces()[0];
    expect(restored?.id).toBe(first.id);
    expect(restored?.type).toBe('straight');
    expect(restored?.cell).toEqual(ORIGIN);
    expect(restored?.rotation).toBe(0);
  });

  it('restores removed scenery with its kind', () => {
    const store = createWorldStore();
    store.placeScenery('pig', ORIGIN, 0);
    const id = store.scenery()[0]?.id;
    if (!id) throw new Error('fixture failed');

    store.removeScenery(id);
    expect(store.undo()).toBe(true);

    const restored = store.scenery()[0];
    expect(restored?.id).toBe(id);
    expect(restored?.kind).toBe('pig');
    expect(restored?.cell).toEqual(ORIGIN);
  });

  it('ignores unknown removes without arming undo', () => {
    const store = createWorldStore();
    store.place('straight', ORIGIN, 0);
    store.undo();

    store.remove('ghost');
    store.removeScenery('ghost');
    expect(store.canUndo()).toBe(false);
  });

  it('moves a relocated piece back home', () => {
    const store = createWorldStore();
    store.place('straight', ORIGIN, 0);
    const id = store.pieces()[0]?.id;
    if (!id) throw new Error('fixture failed');

    expect(store.relocate(id, NEXT_CELL, 90)).toBe('placed');
    expect(store.undo()).toBe(true);

    expect(store.pieces()[0]?.cell).toEqual(ORIGIN);
    expect(store.pieces()[0]?.rotation).toBe(0);
  });

  it('restores the rotation of a same-cell turn', () => {
    const store = createWorldStore();
    store.place('straight', ORIGIN, 0);
    const id = store.pieces()[0]?.id;
    if (!id) throw new Error('fixture failed');

    expect(store.relocate(id, ORIGIN, 90)).toBe('placed');
    expect(store.undo()).toBe(true);
    expect(store.pieces()[0]?.rotation).toBe(0);
  });

  it('moves relocated scenery back home', () => {
    const store = createWorldStore();
    store.placeScenery('tree', ORIGIN, 0);
    const id = store.scenery()[0]?.id;
    if (!id) throw new Error('fixture failed');

    expect(store.relocateScenery(id, NEXT_CELL, 90)).toBe('placed');
    expect(store.undo()).toBe(true);
    expect(store.scenery()[0]?.cell).toEqual(ORIGIN);
  });

  it('never arms undo for a not-found relocate', () => {
    const store = createWorldStore();
    expect(store.relocate('ghost', NEXT_CELL, 0)).toBe('not-found');
    expect(store.relocateScenery('ghost', NEXT_CELL, 0)).toBe('not-found');
    expect(store.canUndo()).toBe(false);
  });

  it('keeps only the last mutation: one undo, then empty', () => {
    const store = createWorldStore();
    store.place('straight', ORIGIN, 0);
    store.place('corner', NEXT_CELL, 90);

    expect(store.undo()).toBe(true);
    expect(store.pieces()).toHaveLength(1);
    expect(store.pieces()[0]?.type).toBe('straight');
    expect(store.undo()).toBe(false);
  });

  it('clears pending undo on hydrate and on reset', () => {
    const store = createWorldStore();
    store.place('straight', ORIGIN, 0);

    store.hydrate({
      pieces: [],
      scenery: [],
      train: 'steam',
      deliveries: {},
      consist: defaultConsist(),
    });
    expect(store.canUndo()).toBe(false);

    store.place('straight', ORIGIN, 0);
    store.reset();
    expect(store.canUndo()).toBe(false);
    expect(store.undo()).toBe(false);
  });

  it('leaves undo alone for train selection and crate delivery', () => {
    const store = createWorldStore();
    store.placeScenery('station', NEXT_CELL, 0);
    const id = store.scenery()[0]?.id;
    if (!id) throw new Error('fixture failed');

    store.selectTrain('diesel');
    expect(store.canUndo()).toBe(true);

    store.deliverCrate(id);
    expect(store.canUndo()).toBe(true);

    expect(store.undo()).toBe(true);
    expect(store.scenery()).toHaveLength(0);
    expect(store.train()).toBe('diesel');
    expect(store.deliveryCount(id)).toBe(1);
  });
});

describe('world store preset replace', () => {
  it('swaps the whole meadow for the preset in one notification', () => {
    const store = createWorldStore();
    store.place('straight', ORIGIN, 0);
    store.placeScenery('tree', NEXT_CELL, 0);
    const listener = vi.fn();
    store.subscribe(listener);

    store.applyPreset(cozyOval());

    expect(store.pieces()).toEqual(cozyOval().pieces);
    expect(store.scenery()).toEqual(cozyOval().scenery);
    expect(store.train()).toBe('steam');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('arms single-undo: one undo restores pieces, scenery, train, and deliveries', () => {
    const store = createWorldStore();
    store.place('straight', ORIGIN, 0);
    expect(store.placeScenery('station', NEXT_CELL, 0)).toBe('placed');
    const stationId = store.scenery()[0]?.id;
    if (!stationId) throw new Error('fixture failed');
    store.deliverCrate(stationId);
    store.selectTrain('diesel');
    const beforePieces = store.pieces();
    const beforeScenery = store.scenery();

    store.applyPreset(cozyOval());
    expect(store.canUndo()).toBe(true);
    expect(store.pieces()).toEqual(cozyOval().pieces);

    expect(store.undo()).toBe(true);
    expect(store.pieces()).toEqual(beforePieces);
    expect(store.scenery()).toEqual(beforeScenery);
    expect(store.train()).toBe('diesel');
    expect(store.deliveryCount(stationId)).toBe(1);
    expect(store.canUndo()).toBe(false);
  });

  it('replaces in-progress edit undo instead of stacking', () => {
    const store = createWorldStore();
    store.place('straight', ORIGIN, 0);

    store.applyPreset(cozyOval());

    expect(store.undo()).toBe(true);
    expect(store.pieces()).toHaveLength(1);
    expect(store.pieces()[0]?.type).toBe('straight');
    expect(store.undo()).toBe(false);
  });

  it('keeps reset empty with steam selected after a preset', () => {
    const store = createWorldStore();
    store.applyPreset(stationVillage());

    store.reset();

    expect(store.pieces()).toEqual([]);
    expect(store.scenery()).toEqual([]);
    expect(store.train()).toBe('steam');
    expect(store.canUndo()).toBe(false);
  });
});

describe("world store preset apply preserves the kid's train", () => {
  it('keeps the selected train and wagon picks when applying any gallery preset', () => {
    const store = createWorldStore();
    store.selectTrain('diesel');
    store.selectConsist('diesel', 'coal');
    store.place('straight', ORIGIN, 0);

    for (const preset of STARTER_PRESETS) {
      store.applyPreset(preset.build());

      expect(store.train()).toBe('diesel');
      expect(store.consistFor('diesel')).toBe('coal');
      expect(store.pieces()).toEqual(preset.build().pieces);
      expect(store.scenery()).toEqual(preset.build().scenery);
    }
  });

  it('restores train and wagon picks exactly when undoing a preset apply', () => {
    const store = createWorldStore();
    store.selectTrain('tram');
    store.selectConsist('tram', 'container');
    store.place('straight', ORIGIN, 0);
    const beforePieces = store.pieces();

    store.applyPreset(hilltopJunction());
    expect(store.train()).toBe('tram');
    expect(store.consistFor('tram')).toBe('container');

    expect(store.undo()).toBe(true);
    expect(store.train()).toBe('tram');
    expect(store.consistFor('tram')).toBe('container');
    expect(store.pieces()).toEqual(beforePieces);
  });

  it('preserved train and picks survive a save-load round trip after apply', () => {
    const store = createWorldStore();
    store.selectTrain('diesel');
    store.selectConsist('diesel', 'coal');
    store.applyPreset(hilltopJunction());

    const reloaded = createWorldStore();
    reloaded.hydrate({
      pieces: store.pieces(),
      scenery: store.scenery(),
      train: store.train(),
      deliveries: store.deliveries(),
      consist: store.consist(),
    });

    expect(reloaded.train()).toBe('diesel');
    expect(reloaded.consistFor('diesel')).toBe('coal');
  });
});
