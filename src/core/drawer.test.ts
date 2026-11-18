import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createDisclosureState, type DisclosureState, recordCompletedRide } from './disclosure';
import {
  DRAWER_TABS,
  type DrawerTabId,
  drawerPages,
  drawerTabs,
  PAGE_SIZE,
  PAGED_TABS,
  tabForKind,
} from './drawer';
import { PIECE_TYPES } from './pieces';
import { SCENERY_KINDS } from './scenery';
import type { PieceType } from './track-graph';

/** Read one tab's toy kinds, optionally under a disclosure state. */
const kindsOn = (id: DrawerTabId, state?: DisclosureState) => {
  const tab = drawerTabs(state).find((entry) => entry.id === id);
  if (!tab) throw new Error(`unknown drawer tab: ${id}`);
  return tab.kinds;
};

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
      'crossing-gate',
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
      'switch-3way',
      'switch-slip',
    ]);
  });

  it('groups scenery kinds by their catalog category, in catalog order', () => {
    const byId = new Map(drawerTabs().map((tab) => [tab.id, tab]));
    expect(byId.get('nature')?.kinds).toEqual(['tree', 'bush', 'rock']);
    expect(byId.get('town')?.kinds).toEqual([
      'house',
      'cottage',
      'station',
      'windmill',
      'carousel',
      'balloon',
      'music-box',
    ]);
    expect(byId.get('critter')?.kinds).toEqual(['pig', 'sheep', 'pug', 'frog']);
  });

  it('covers every catalog kind exactly once across all tabs', () => {
    const all = drawerTabs().flatMap((tab) => tab.kinds);
    expect(all).toHaveLength(SCENERY_KINDS.length + 19); // + 19 track pieces
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

describe('drawerTabs disclosure gating', () => {
  it('hides the advanced slots while locked (FR-2)', () => {
    const tabs = drawerTabs(createDisclosureState());
    const adventure = tabs.find((tab) => tab.id === 'adventure');
    expect(adventure?.kinds).not.toContain('switch-3way');
    expect(adventure?.kinds).not.toContain('switch-slip');
    const town = tabs.find((tab) => tab.id === 'town');
    expect(town?.kinds).not.toContain('station');
  });

  it('keeps every basics kind while locked, in the same order', () => {
    const locked = drawerTabs(createDisclosureState()).flatMap((tab) => tab.kinds);
    const full = drawerTabs().flatMap((tab) => tab.kinds);
    const advanced = ['switch-3way', 'switch-slip', 'station'];
    expect(locked).toHaveLength(full.length - advanced.length);
    expect(locked).toEqual(full.filter((kind) => !advanced.includes(kind)));
    for (const kind of ['straight', 'switch', 'bridge', 'house', 'tree', 'pig']) {
      expect(locked).toContain(kind);
    }
  });

  it('renders every slot unlocked, exactly as today', () => {
    let state = createDisclosureState();
    for (let ride = 0; ride < 3; ride += 1) state = recordCompletedRide(state);
    expect(drawerTabs(state)).toEqual(drawerTabs());
  });
});

describe('drawerPages', () => {
  it('pages dense tabs into no more than PAGE_SIZE slots each (AC-1)', () => {
    for (const id of PAGED_TABS) {
      const pages = drawerPages(kindsOn(id), id);
      expect(pages.length, `${id} should need more than one page`).toBeGreaterThan(1);
      for (const page of pages) {
        expect(page.length, `${id} page exceeded PAGE_SIZE`).toBeLessThanOrEqual(PAGE_SIZE);
      }
    }
  });

  it('makes full pages plus a partial final page for Rails and Adventure', () => {
    expect(drawerPages(kindsOn('rails'), 'rails').map((page) => page.length)).toEqual([4, 4, 2]);
    expect(drawerPages(kindsOn('adventure'), 'adventure').map((page) => page.length)).toEqual([
      4, 4, 1,
    ]);
  });

  it('makes a full page plus a partial final page for Town', () => {
    expect(drawerPages(kindsOn('town'), 'town').map((page) => page.length)).toEqual([4, 3]);
  });

  it('keeps Nature and Critters on a single page with every kind', () => {
    for (const id of ['nature', 'critter'] as const) {
      const pages = drawerPages(kindsOn(id), id);
      expect(pages).toHaveLength(1);
      expect(pages[0]).toEqual(kindsOn(id));
    }
  });

  it('pages only the kinds disclosure leaves visible', () => {
    expect(drawerPages(kindsOn('rails', createDisclosureState()), 'rails')).toEqual(
      drawerPages(kindsOn('rails'), 'rails'),
    );
    expect(
      drawerPages(kindsOn('adventure', createDisclosureState()), 'adventure').map(
        (page) => page.length,
      ),
    ).toEqual([4, 3]);
    expect(
      drawerPages(kindsOn('town', createDisclosureState()), 'town').map((page) => page.length),
    ).toEqual([4, 2]);
  });
});

// Read as text: src/core must never import from src/ui (import-graph guard).
describe('generated piece icons', () => {
  const source = new URL('../ui/generated-piece-icons.ts', import.meta.url);

  it('has a static SVG for every PieceType', () => {
    const icons = readFileSync(source, 'utf8');
    for (const kind of PIECE_TYPES) {
      const key = /^[A-Za-z][A-Za-z0-9]*$/.test(kind) ? kind : `'${kind}'`;
      expect(icons, `no generated icon for ${kind}`).toMatch(new RegExp(`^  ${key}: \``, 'm'));
    }
    expect(icons.match(/<svg viewBox="0 0 48 48"/g)).toHaveLength(PIECE_TYPES.length);
  });
});

describe('tabForKind', () => {
  it('maps basic track pieces to the Rails tab', () => {
    expect(tabForKind('straight')).toBe('rails');
    expect(tabForKind('corner')).toBe('rails');
    expect(tabForKind('crossing')).toBe('rails');
    expect(tabForKind('crossing-gate')).toBe('rails');
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
    expect(tabForKind('switch-3way')).toBe('adventure');
    expect(tabForKind('switch-slip')).toBe('adventure');
  });

  it('maps each scenery kind to its catalog category tab', () => {
    expect(tabForKind('tree')).toBe('nature');
    expect(tabForKind('station')).toBe('town');
    expect(tabForKind('music-box')).toBe('town');
    expect(tabForKind('pug')).toBe('critter');
  });
});
