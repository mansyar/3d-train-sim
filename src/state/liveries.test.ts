import { describe, expect, it, vi } from 'vitest';
import type { PersistedLiveries } from '../core/save';
import {
  createLiveryStore,
  locoVehicleId,
  MAX_STICKERS,
  PAINT_IDS,
  PAINT_SWATCHES,
  type PaintId,
  STICKER_ANCHORS,
  STICKER_IDS,
  type StickerId,
  stockLivery,
  wagonVehicleId,
} from './liveries';

const steam = locoVehicleId('steam');
const diesel = locoVehicleId('diesel');
const leadWagon = wagonVehicleId('steam', 'lead');

describe('livery catalogue', () => {
  it('pins six chunky paints and four sticker shapes once for the drawer and scene', () => {
    expect(PAINT_IDS).toHaveLength(6);
    expect(new Set(PAINT_IDS).size).toBe(6);
    expect(PAINT_SWATCHES.map((swatch) => swatch.id)).toEqual(PAINT_IDS);
    for (const swatch of PAINT_SWATCHES) {
      expect(swatch.hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(swatch.aria.length).toBeGreaterThan(0);
    }
    expect(STICKER_IDS).toHaveLength(4);
    expect(new Set(STICKER_IDS).size).toBe(4);
  });

  it('pins four side anchors — two per side — as the sticker cap', () => {
    expect(STICKER_ANCHORS).toHaveLength(4);
    expect(MAX_STICKERS).toBe(STICKER_ANCHORS.length);
  });

  it('names every locomotive and wagon slot distinctly', () => {
    expect(steam).not.toBe(diesel);
    expect(steam).not.toBe(leadWagon);
    expect(wagonVehicleId('steam', 'rear')).not.toBe(leadWagon);
    expect(wagonVehicleId('diesel', 'lead')).not.toBe(leadWagon);
  });
});

describe('livery store', () => {
  it('boots every vehicle stock and persists nothing', () => {
    const store = createLiveryStore();

    expect(store.liveryFor(steam)).toEqual(stockLivery());
    expect(store.liveryFor(leadWagon)).toEqual(stockLivery());
    expect(store.snapshot()).toEqual({});
    expect(store.liveries()).toEqual({});
  });

  it('paints one vehicle without touching the others', () => {
    const store = createLiveryStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.setPaint(steam, 'sky');

    expect(store.liveryFor(steam)).toEqual({ paint: 'sky', stickers: [] });
    expect(store.liveryFor(diesel)).toEqual(stockLivery());
    expect(store.liveryFor(leadWagon)).toEqual(stockLivery());
    expect(store.snapshot()).toEqual({ [steam]: { paint: 'sky' } });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(steam, { paint: 'sky', stickers: [] });
  });

  it('returns a vehicle to stock paint when the stock choice is applied', () => {
    const store = createLiveryStore();

    store.setPaint(steam, 'grape');
    store.setPaint(steam, null);

    expect(store.liveryFor(steam)).toEqual(stockLivery());
    expect(store.snapshot()).toEqual({});
  });

  it('ignores swatches and shapes outside the curated sets', () => {
    const store = createLiveryStore();

    store.setPaint(steam, 'hovercraft' as PaintId);
    store.stamp(steam, 'dragon' as StickerId);

    expect(store.liveryFor(steam)).toEqual(stockLivery());
    expect(store.snapshot()).toEqual({});
  });

  it('stamps stickers oldest-first, one per tap', () => {
    const store = createLiveryStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.stamp(steam, 'star');
    store.stamp(steam, 'heart');

    expect(store.liveryFor(steam)).toEqual({ paint: null, stickers: ['star', 'heart'] });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(steam, { paint: null, stickers: ['star', 'heart'] });
  });

  it('evicts exactly the oldest sticker when the anchors are full', () => {
    const store = createLiveryStore();
    const listener = vi.fn();
    store.subscribe(listener);

    for (const sticker of [...STICKER_IDS, 'star' as StickerId]) store.stamp(steam, sticker);

    expect(store.liveryFor(steam).stickers).toHaveLength(MAX_STICKERS);
    expect(store.liveryFor(steam).stickers).toEqual(['heart', 'flower', 'bolt', 'star']);
    expect(listener).toHaveBeenCalledTimes(MAX_STICKERS + 1);
  });

  it('restores a single vehicle to stock paint with all stickers cleared', () => {
    const store = createLiveryStore();

    store.setPaint(steam, 'cherry');
    store.stamp(steam, 'star');
    store.stamp(steam, 'bolt');
    store.restoreDefault(steam);

    expect(store.liveryFor(steam)).toEqual(stockLivery());
    expect(store.snapshot()).toEqual({});
    expect(store.liveryFor(diesel)).toEqual(stockLivery());
  });

  it('round-trips a hydrated fleet and keeps ids isolated', () => {
    const store = createLiveryStore();
    const persisted = {
      [steam]: { paint: 'sky', stickers: ['star', 'heart'] },
      [leadWagon]: { paint: 'grape' },
    };

    store.hydrate(persisted);

    expect(store.liveryFor(steam)).toEqual({ paint: 'sky', stickers: ['star', 'heart'] });
    expect(store.liveryFor(leadWagon)).toEqual({ paint: 'grape', stickers: [] });
    expect(store.liveryFor(diesel)).toEqual(stockLivery());
    expect(store.snapshot()).toEqual(persisted);
  });

  it('salvages corrupt hydrated entries without throwing', () => {
    const store = createLiveryStore();
    const tooMany = ['star', 'heart', 'flower', 'bolt', 'star'];

    // Corrupt payloads arrive from hand-edited JSON, so they are not valid
    // PersistedLiveries — parse them the way the loader really receives them.
    const corrupt = JSON.parse(
      '{"__proto__":{"paint":"sky"},' +
        `"${steam}":{"paint":"hovercraft","stickers":["dragon","${tooMany.join('","')}"]},` +
        `"${diesel}":{"paint":"sky","stickers":["${tooMany.join('","')}"]},` +
        `"${leadWagon}":{"paint":null,"stickers":[]}}`,
    ) as PersistedLiveries;

    expect(() => store.hydrate(corrupt)).not.toThrow();

    expect(store.liveryFor(steam)).toEqual(stockLivery());
    expect(store.liveryFor(diesel)).toEqual({ paint: 'sky', stickers: tooMany.slice(1) });
    expect(store.liveryFor(leadWagon)).toEqual(stockLivery());
  });

  it('hands out defensive copies so callers cannot mutate store state', () => {
    const store = createLiveryStore();

    store.stamp(steam, 'star');
    store.liveryFor(steam).stickers.push('bolt');
    const exposed = store.liveries()[steam];
    if (!exposed) throw new Error('expected the stamped livery to be listed');
    exposed.paint = 'grape';

    expect(store.liveryFor(steam)).toEqual({ paint: null, stickers: ['star'] });
  });

  it('clears every vehicle on a full reset', () => {
    const store = createLiveryStore();

    store.setPaint(steam, 'cherry');
    store.stamp(diesel, 'flower');
    store.reset();

    expect(store.liveries()).toEqual({});
    expect(store.snapshot()).toEqual({});
    expect(store.liveryFor(steam)).toEqual(stockLivery());
    expect(store.liveryFor(diesel)).toEqual(stockLivery());
  });

  it('notifies every affected vehicle with the stock livery on reset', () => {
    const store = createLiveryStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.setPaint(steam, 'cherry');
    store.stamp(steam, 'star');
    store.setPaint(leadWagon, 'grape');
    listener.mockClear();

    store.reset();

    expect(store.liveries()).toEqual({});
    expect(store.snapshot()).toEqual({});
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledWith(steam, stockLivery());
    expect(listener).toHaveBeenCalledWith(leadWagon, stockLivery());
  });

  it('a no-op reset notifies nobody, so the persistence guard never rewrites storage', () => {
    const store = createLiveryStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.reset();

    expect(listener).not.toHaveBeenCalled();
    expect(store.snapshot()).toEqual({});
  });

  it('stops notifying after unsubscribe', () => {
    const store = createLiveryStore();
    const listener = vi.fn();
    const off = store.subscribe(listener);

    store.stamp(steam, 'star');
    off();
    store.stamp(steam, 'heart');

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
