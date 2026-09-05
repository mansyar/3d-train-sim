import { describe, expect, it } from 'vitest';
import { DRAWER_TABS, drawerTabs, tabForKind } from './drawer';
import { SCENERY_KINDS } from './scenery';
import type { PieceType } from './track-graph';

describe('drawerTabs', () => {
  it('exposes exactly the five toddler tabs in order', () => {
    expect(DRAWER_TABS).toEqual(['rails', 'adventure', 'nature', 'town', 'critter']);
    expect(drawerTabs().map((tab) => tab.id)).toEqual([
      'rails',
      'adventure',
      'nature',
      'town',
      'critter',
    ]);
  });

  it('holds the basic track pieces on the Rails tab, in piece order', () => {
    const rails = drawerTabs().find((tab) => tab.id === 'rails');
    expect(rails?.kinds).toEqual<PieceType[]>([
      'straight',
      'corner',
      'crossing',
      'bump-up',
      'hill-half',
      'bump-down',
      'corner-up',
      'hill-corner',
      'corner-down',
    ]);
  });

  it('holds the adventure pieces on the Adventure tab, in piece order', () => {
    const adventure = drawerTabs().find((tab) => tab.id === 'adventure');
    expect(adventure?.kinds).toEqual<PieceType[]>([
      'bridge',
      'tunnel',
      'slope-up',
      'hill',
      'slope-down',
      'switch',
      'switch-mirror',
    ]);
  });

  it('groups scenery kinds by their catalog category, in catalog order', () => {
    const byId = new Map(drawerTabs().map((tab) => [tab.id, tab]));
    expect(byId.get('nature')?.kinds).toEqual(['tree', 'bush', 'rock']);
    expect(byId.get('town')?.kinds).toEqual(['house', 'cottage', 'station']);
    expect(byId.get('critter')?.kinds).toEqual(['pig', 'sheep', 'pug']);
  });

  it('covers every catalog kind exactly once across all tabs', () => {
    const all = drawerTabs().flatMap((tab) => tab.kinds);
    expect(all).toHaveLength(SCENERY_KINDS.length + 16); // + 16 track pieces
    expect(new Set(all).size).toBe(all.length);
  });

  it('gives every tab an icon and an aria label (icon-only UI)', () => {
    for (const tab of drawerTabs()) {
      expect(tab.icon.length).toBeGreaterThan(0);
      expect(tab.aria.length).toBeGreaterThan(0);
    }
  });

  it('gives the Adventure tab a bridge icon and label', () => {
    const adventure = drawerTabs().find((tab) => tab.id === 'adventure');
    expect(adventure?.icon).toBe('🌉');
    expect(adventure?.aria).toBe('Adventure toys');
  });
});

describe('tabForKind', () => {
  it('maps basic track pieces to the Rails tab', () => {
    expect(tabForKind('straight')).toBe('rails');
    expect(tabForKind('corner')).toBe('rails');
    expect(tabForKind('crossing')).toBe('rails');
    expect(tabForKind('bump-up')).toBe('rails');
    expect(tabForKind('hill-half')).toBe('rails');
    expect(tabForKind('bump-down')).toBe('rails');
    expect(tabForKind('corner-up')).toBe('rails');
    expect(tabForKind('hill-corner')).toBe('rails');
    expect(tabForKind('corner-down')).toBe('rails');
  });

  it('maps adventure pieces to the Adventure tab', () => {
    expect(tabForKind('bridge')).toBe('adventure');
    expect(tabForKind('tunnel')).toBe('adventure');
    expect(tabForKind('slope-up')).toBe('adventure');
    expect(tabForKind('hill')).toBe('adventure');
    expect(tabForKind('slope-down')).toBe('adventure');
    expect(tabForKind('switch')).toBe('adventure');
    expect(tabForKind('switch-mirror')).toBe('adventure');
  });

  it('maps each scenery kind to its catalog category tab', () => {
    expect(tabForKind('tree')).toBe('nature');
    expect(tabForKind('station')).toBe('town');
    expect(tabForKind('pug')).toBe('critter');
  });
});
