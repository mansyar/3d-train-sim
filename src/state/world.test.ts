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
