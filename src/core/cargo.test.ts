import { describe, expect, it } from 'vitest';
import { actionAtStop, deliveredCountAfter, loadAfterAction, MAX_DELIVERED_CRATES } from './cargo';

describe('actionAtStop', () => {
  it('loads at a stop when the wagons are empty', () => {
    expect(actionAtStop('empty')).toBe('load');
  });

  it('delivers at a stop when the wagons are loaded', () => {
    expect(actionAtStop('loaded')).toBe('deliver');
  });
});

describe('loadAfterAction', () => {
  it('leaves the wagons loaded after a load', () => {
    expect(loadAfterAction('load')).toBe('loaded');
  });

  it('empties the wagons after a deliver', () => {
    expect(loadAfterAction('deliver')).toBe('empty');
  });

  it('alternates across consecutive single-station stops', () => {
    let load: 'empty' | 'loaded' = 'empty';
    const actions: string[] = [];
    for (let i = 0; i < 4; i++) {
      const action = actionAtStop(load);
      actions.push(action);
      load = loadAfterAction(action);
    }
    // Load, deliver, load, deliver — the same-station loop stays busy.
    expect(actions).toEqual(['load', 'deliver', 'load', 'deliver']);
  });
});

describe('deliveredCountAfter', () => {
  it('counts each delivery', () => {
    expect(deliveredCountAfter(0)).toBe(1);
    expect(deliveredCountAfter(3)).toBe(4);
  });

  it('caps the pile at MAX_DELIVERED_CRATES', () => {
    expect(deliveredCountAfter(MAX_DELIVERED_CRATES)).toBe(MAX_DELIVERED_CRATES);
    expect(deliveredCountAfter(MAX_DELIVERED_CRATES + 5)).toBe(MAX_DELIVERED_CRATES);
  });
});
