import { describe, expect, it, vi } from 'vitest';
import { MAX_PIECES } from '../core/track-graph';
import { createWorldStore } from './world';

const ORIGIN = { x: 0, y: 0 };
const NEXT_CELL = { x: 1, y: 0 };

function fillWorld(store: ReturnType<typeof createWorldStore>, count: number) {
  for (let i = 0; i < count; i++) {
    const result = store.place('straight', { x: i % 16, y: Math.floor(i / 16) }, 0);
    if (result !== 'placed') throw new Error(`fixture failed at ${i}: ${result}`);
  }
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
