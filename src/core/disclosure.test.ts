import { describe, expect, it } from 'vitest';
import {
  ADVANCED_KINDS,
  applyGrandfather,
  createDisclosureState,
  isAdvancedKind,
  isKindVisible,
  parseDisclosureState,
  recordCompletedRide,
  UNLOCK_RIDE_COUNT,
  visibleKinds,
} from './disclosure';
import { PIECE_TYPES } from './pieces';
import { SCENERY_KINDS } from './scenery';

describe('disclosure tiers', () => {
  it('names exactly the three advanced kinds', () => {
    expect([...ADVANCED_KINDS]).toEqual(['switch-3way', 'switch-slip', 'station']);
  });

  it('keeps every advanced kind in the drawer catalogs', () => {
    const catalog = new Set<string>([...PIECE_TYPES, ...SCENERY_KINDS]);
    for (const kind of ADVANCED_KINDS) expect(catalog.has(kind)).toBe(true);
  });

  it('marks only the advanced kinds as advanced', () => {
    expect(isAdvancedKind('switch-3way')).toBe(true);
    expect(isAdvancedKind('switch-slip')).toBe(true);
    expect(isAdvancedKind('station')).toBe(true);
    expect(isAdvancedKind('straight')).toBe(false);
    expect(isAdvancedKind('switch')).toBe(false);
    expect(isAdvancedKind('bridge')).toBe(false);
    expect(isAdvancedKind('tree')).toBe(false);
    expect(isAdvancedKind('house')).toBe(false);
    expect(isAdvancedKind('music-box')).toBe(false);
    expect(isAdvancedKind('pig')).toBe(false);
  });

  it('leaves every other catalog kind on the basics tier', () => {
    const advanced = new Set<string>(ADVANCED_KINDS);
    for (const kind of [...PIECE_TYPES, ...SCENERY_KINDS]) {
      expect(isAdvancedKind(kind)).toBe(advanced.has(kind));
    }
  });

  it('treats unknown future kinds as basics (fail-open, never strand a toy)', () => {
    expect(isAdvancedKind('hyperloop')).toBe(false);
  });
});

describe('disclosure visibility', () => {
  it('shows zero advanced kinds on a fresh install (AC-1)', () => {
    const kinds = visibleKinds(createDisclosureState());
    expect(kinds.filter((kind) => isAdvancedKind(kind))).toEqual([]);
  });

  it('shows every basics kind while locked', () => {
    const kinds = visibleKinds(createDisclosureState());
    expect(kinds).toHaveLength(PIECE_TYPES.length + SCENERY_KINDS.length - ADVANCED_KINDS.length);
    expect(kinds).toContain('straight');
    expect(kinds).toContain('switch');
    expect(kinds).toContain('bridge');
    expect(kinds).toContain('house');
    expect(kinds).toContain('tree');
    expect(kinds).toContain('pig');
  });

  it('shows every catalog kind once unlocked (AC-2)', () => {
    let state = createDisclosureState();
    for (let ride = 0; ride < UNLOCK_RIDE_COUNT; ride += 1) state = recordCompletedRide(state);
    const kinds = visibleKinds(state);
    expect(kinds).toHaveLength(PIECE_TYPES.length + SCENERY_KINDS.length);
    expect(kinds).toContain('switch-3way');
    expect(kinds).toContain('switch-slip');
    expect(kinds).toContain('station');
  });

  it('hides advanced kinds while locked but keeps basics and unknown kinds', () => {
    const locked = createDisclosureState();
    expect(isKindVisible('switch-3way', locked)).toBe(false);
    expect(isKindVisible('switch-slip', locked)).toBe(false);
    expect(isKindVisible('station', locked)).toBe(false);
    expect(isKindVisible('straight', locked)).toBe(true);
    expect(isKindVisible('tree', locked)).toBe(true);
    expect(isKindVisible('hyperloop', locked)).toBe(true);
  });

  it('shows everything once unlocked', () => {
    const unlocked = { completedRides: UNLOCK_RIDE_COUNT, unlocked: true };
    expect(isKindVisible('switch-3way', unlocked)).toBe(true);
    expect(isKindVisible('station', unlocked)).toBe(true);
    expect(isKindVisible('straight', unlocked)).toBe(true);
    expect(isKindVisible('hyperloop', unlocked)).toBe(true);
  });
});

describe('disclosure ride-count unlock', () => {
  it('starts locked with zero completed rides', () => {
    expect(createDisclosureState()).toEqual({ completedRides: 0, unlocked: false });
  });

  it('stays locked through the first two completed rides', () => {
    const afterOne = recordCompletedRide(createDisclosureState());
    expect(afterOne).toEqual({ completedRides: 1, unlocked: false });
    const afterTwo = recordCompletedRide(afterOne);
    expect(afterTwo).toEqual({ completedRides: 2, unlocked: false });
    expect(visibleKinds(afterTwo).filter((kind) => isAdvancedKind(kind))).toEqual([]);
  });

  it('unlocks exactly on the third completed ride', () => {
    expect(UNLOCK_RIDE_COUNT).toBe(3);
    let state = createDisclosureState();
    state = recordCompletedRide(state);
    state = recordCompletedRide(state);
    expect(state.unlocked).toBe(false);
    state = recordCompletedRide(state);
    expect(state).toEqual({ completedRides: 3, unlocked: true });
  });

  it('keeps counting past the threshold without relocking', () => {
    const unlocked = recordCompletedRide(
      recordCompletedRide(recordCompletedRide(createDisclosureState())),
    );
    const fourth = recordCompletedRide(unlocked);
    expect(fourth).toEqual({ completedRides: 4, unlocked: true });
  });

  it('never mutates the incoming state', () => {
    const before = createDisclosureState();
    recordCompletedRide(before);
    expect(before).toEqual({ completedRides: 0, unlocked: false });
  });
});

describe('disclosure grandfather', () => {
  it('unlocks a world already holding an advanced piece, keeping the count', () => {
    const state = applyGrandfather(createDisclosureState(), ['straight', 'switch-3way']);
    expect(state).toEqual({ completedRides: 0, unlocked: true });
  });

  it('unlocks for an advanced scenery kind too', () => {
    expect(applyGrandfather(createDisclosureState(), ['house', 'station']).unlocked).toBe(true);
    expect(applyGrandfather(createDisclosureState(), ['switch-slip']).unlocked).toBe(true);
  });

  it('stays locked when the world holds basics only', () => {
    const state = applyGrandfather(createDisclosureState(), ['straight', 'switch', 'house']);
    expect(state).toEqual({ completedRides: 0, unlocked: false });
  });

  it('stays locked for an empty world', () => {
    expect(applyGrandfather(createDisclosureState(), []).unlocked).toBe(false);
  });

  it('ignores unknown kinds without unlocking', () => {
    expect(applyGrandfather(createDisclosureState(), ['hyperloop']).unlocked).toBe(false);
  });
});

describe('disclosure persistence', () => {
  it('round-trips the unlocked flag through JSON (AC-3)', () => {
    const unlocked = recordCompletedRide(
      recordCompletedRide(recordCompletedRide(createDisclosureState())),
    );
    const revived = parseDisclosureState(JSON.parse(JSON.stringify(unlocked)));
    expect(revived).toEqual(unlocked);
    expect(visibleKinds(revived).filter((kind) => isAdvancedKind(kind))).toHaveLength(
      ADVANCED_KINDS.length,
    );
  });

  it('round-trips a locked count through JSON', () => {
    const locked = recordCompletedRide(createDisclosureState());
    expect(parseDisclosureState(JSON.parse(JSON.stringify(locked)))).toEqual(locked);
  });

  it('falls back to a fresh locked state for malformed saves', () => {
    const fresh = { completedRides: 0, unlocked: false };
    expect(parseDisclosureState(null)).toEqual(fresh);
    expect(parseDisclosureState('nope')).toEqual(fresh);
    expect(parseDisclosureState({})).toEqual(fresh);
    expect(parseDisclosureState({ completedRides: -2, unlocked: 'yes' })).toEqual(fresh);
  });

  it('derives the unlock from a salvaged count that already met the threshold', () => {
    expect(parseDisclosureState({ completedRides: 3 })).toEqual({
      completedRides: 3,
      unlocked: true,
    });
  });
});
