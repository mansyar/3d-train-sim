import { describe, expect, it, vi } from 'vitest';
import type { WorldData, WorldSnapshot } from '../core/save';
import { createWorldStore } from './world';

const ORIGIN = { x: 0, y: 0 };
const NEXT_CELL = { x: 1, y: 0 };

const data: WorldData = {
  train: 'diesel',
  pieces: [{ id: 'piece-40', type: 'straight', cell: ORIGIN, rotation: 0 }],
  scenery: [{ id: 'scenery-41', kind: 'tree', cell: NEXT_CELL, rotation: 90 }],
};

describe('world hydration', () => {
  it('restores tracks and scenery and advances generated ids', () => {
    const store = createWorldStore();
    store.hydrate(data);

    expect(store.pieces()).toEqual(data.pieces);
    expect(store.scenery()).toEqual(data.scenery);
    expect(store.train()).toBe('diesel');
    expect(store.place('corner', { x: 2, y: 0 }, 0)).toBe('placed');
    expect(store.pieces()[1]?.id).toBe('piece-42');
  });

  it('defensively copies hydrated cells', () => {
    const store = createWorldStore();
    store.hydrate(data);
    const restored = store.pieces()[0];
    if (!restored) throw new Error('fixture failed');
    restored.cell.x = 99;
    expect(store.pieces()[0]?.cell.x).toBe(0);
  });
});

describe('autosave subscription', () => {
  it('can serialize every successful mutation exactly once', () => {
    const store = createWorldStore();
    const save = vi.fn<(snapshot: WorldSnapshot) => void>();
    store.subscribe(() =>
      save({
        version: 1,
        train: store.train(),
        pieces: [...store.pieces()],
        scenery: [...store.scenery()],
      }),
    );

    store.place('straight', ORIGIN, 0);
    expect(save).toHaveBeenCalledTimes(1);
    store.placeScenery('tree', NEXT_CELL, 0);
    expect(save).toHaveBeenCalledTimes(2);
    store.relocate('piece-1', { x: 2, y: 0 }, 90);
    expect(save).toHaveBeenCalledTimes(3);
    store.removeScenery('scenery-2');
    expect(save).toHaveBeenCalledTimes(4);
    store.remove('piece-1');
    expect(save).toHaveBeenCalledTimes(5);
  });

  it('does not notify for failed mutations', () => {
    const store = createWorldStore();
    const listener = vi.fn();
    store.subscribe(listener);

    expect(store.place('straight', { x: 99, y: 99 }, 0)).toBe('out-of-bounds');
    expect(store.relocate('ghost', ORIGIN, 0)).toBe('not-found');
    store.removeScenery('ghost');
    expect(listener).not.toHaveBeenCalled();
  });
});
