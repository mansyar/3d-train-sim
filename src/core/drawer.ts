/**
 * The tabbed toybox drawer's pure model: which tabs exist and which toys
 * each holds. The UI (app.ts) renders from here; the catalog (scenery.ts)
 * stays the single source of truth for scenery grouping. Pure data — no
 * browser or Three.js coupling.
 */

import { type DisclosureState, isKindVisible } from './disclosure';
import { PIECE_TYPES, type PieceType } from './pieces';
import { SCENERY_KINDS, type SceneryKind, sceneryCategory } from './scenery';

/** The five toddler-visible drawer tabs, in toybox order. */
export const DRAWER_TABS = ['rails', 'adventure', 'nature', 'town', 'critter'] as const;
export type DrawerTabId = (typeof DRAWER_TABS)[number];

/** Maximum toy slots shown on one page of a dense tab. */
export const PAGE_SIZE = 4;

/** The dense tabs: their toys span several pages. Nature and Critters stay single-page. */
export const PAGED_TABS: readonly DrawerTabId[] = ['rails', 'adventure', 'town'];

/** True when a tab's toys are split into pages. */
export const isPagedTab = (id: DrawerTabId): boolean => PAGED_TABS.some((tab) => tab === id);

/**
 * Split an already-filtered tab's kinds into pages of at most PAGE_SIZE.
 * Paging only groups kinds the caller already decided to show — disclosure
 * filtering and cap dimming stay the caller's job, before this runs.
 */
export function drawerPages(
  kinds: (PieceType | SceneryKind)[],
  tabId: DrawerTabId,
): (PieceType | SceneryKind)[][] {
  if (!isPagedTab(tabId)) return [kinds.slice()];
  const pages: (PieceType | SceneryKind)[][] = [];
  for (let start = 0; start < kinds.length; start += PAGE_SIZE) {
    pages.push(kinds.slice(start, start + PAGE_SIZE));
  }
  return pages;
}

/** One tab: its identity, its chunky icon, and the toys it holds. */
export interface DrawerTab {
  id: DrawerTabId;
  icon: string;
  aria: string;
  /** Toy kinds on this tab, in catalog/piece order. */
  kinds: (PieceType | SceneryKind)[];
}

/** The tab each toy kind belongs to. Basics ride Rails; big tricks ride Adventure. */
const TAB_FOR_KIND: Record<PieceType | SceneryKind, DrawerTabId> = {
  straight: 'rails',
  corner: 'rails',
  crossing: 'rails',
  'crossing-gate': 'rails',
  'bump-up': 'rails',
  'hill-half': 'rails',
  'bump-down': 'rails',
  'corner-up': 'rails',
  'hill-corner': 'rails',
  'corner-down': 'rails',
  bridge: 'adventure',
  tunnel: 'adventure',
  'slope-up': 'adventure',
  hill: 'adventure',
  'slope-down': 'adventure',
  switch: 'adventure',
  'switch-mirror': 'adventure',
  'switch-3way': 'adventure',
  'switch-slip': 'adventure',
  tree: 'nature',
  bush: 'nature',
  rock: 'nature',
  house: 'town',
  cottage: 'town',
  station: 'town',
  windmill: 'town',
  carousel: 'town',
  balloon: 'town',
  'music-box': 'town',
  pig: 'critter',
  sheep: 'critter',
  pug: 'critter',
  frog: 'critter',
};

const TAB_ICONS: Record<DrawerTabId, string> = {
  rails: '🛤️',
  adventure: '🌉',
  nature: '🌳',
  town: '🏠',
  critter: '🐾',
};

const TAB_ARIA: Record<DrawerTabId, string> = {
  rails: 'Rails toys',
  adventure: 'Adventure toys',
  nature: 'Nature toys',
  town: 'Town toys',
  critter: 'Critter toys',
};

/**
 * The drawer tabs with their toys, derived from the catalogs. Pass the
 * disclosure state to hide the advanced tier while locked (fresh installs
 * see basics only); omit it — or pass an unlocked state — for the full
 * toybox exactly as before.
 */
export function drawerTabs(state?: DisclosureState): DrawerTab[] {
  const kindsByTab = new Map<DrawerTabId, (PieceType | SceneryKind)[]>(
    DRAWER_TABS.map((id) => [id, []]),
  );
  for (const kind of PIECE_TYPES) kindsByTab.get(tabForKind(kind))?.push(kind);
  for (const kind of SCENERY_KINDS) kindsByTab.get(sceneryCategory(kind))?.push(kind);
  if (state !== undefined && !state.unlocked) {
    return DRAWER_TABS.map((id) => ({
      id,
      icon: TAB_ICONS[id],
      aria: TAB_ARIA[id],
      kinds: (kindsByTab.get(id) ?? []).filter((kind) => isKindVisible(kind, state)),
    }));
  }
  return DRAWER_TABS.map((id) => ({
    id,
    icon: TAB_ICONS[id],
    aria: TAB_ARIA[id],
    kinds: kindsByTab.get(id) ?? [],
  }));
}

/** Which tab a toy kind lives on. */
export function tabForKind(kind: PieceType | SceneryKind): DrawerTabId {
  return TAB_FOR_KIND[kind];
}
