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
