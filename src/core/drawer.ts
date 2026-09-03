/**
 * The tabbed toybox drawer's pure model: which tabs exist and which toys
 * each holds. The UI (app.ts) renders from here; the catalog (scenery.ts)
 * stays the single source of truth for scenery grouping. Pure data — no
 * browser or Three.js coupling.
 */

import { PIECE_TYPES, type PieceType } from './pieces';
import { SCENERY_KINDS, type SceneryKind, sceneryCategory } from './scenery';

/** The four toddler-visible drawer tabs, in toybox order. */
export const DRAWER_TABS = ['rails', 'nature', 'town', 'critter'] as const;
export type DrawerTabId = (typeof DRAWER_TABS)[number];

/** One tab: its identity, its chunky icon, and the toys it holds. */
export interface DrawerTab {
  id: DrawerTabId;
  icon: string;
  aria: string;
  /** Toy kinds on this tab, in catalog/piece order. */
  kinds: (PieceType | SceneryKind)[];
}

/** The tab each toy kind belongs to. Rails pieces share the Rails tab. */
const TAB_FOR_KIND: Record<PieceType | SceneryKind, DrawerTabId> = {
  straight: 'rails',
  corner: 'rails',
  crossing: 'rails',
  bridge: 'rails',
  tunnel: 'rails',
  'slope-up': 'rails',
  hill: 'rails',
  'slope-down': 'rails',
  switch: 'rails',
  tree: 'nature',
  bush: 'nature',
  rock: 'nature',
  house: 'town',
  cottage: 'town',
  station: 'town',
  pig: 'critter',
  sheep: 'critter',
  pug: 'critter',
};

const TAB_ICONS: Record<DrawerTabId, string> = {
  rails: '🛤️',
  nature: '🌳',
  town: '🏠',
  critter: '🐾',
};

const TAB_ARIA: Record<DrawerTabId, string> = {
  rails: 'Rails toys',
  nature: 'Nature toys',
  town: 'Town toys',
  critter: 'Critter toys',
};

/** The drawer tabs with their toys, derived from the catalogs. */
export function drawerTabs(): DrawerTab[] {
  const kindsByTab = new Map<DrawerTabId, (PieceType | SceneryKind)[]>(
    DRAWER_TABS.map((id) => [id, []]),
  );
  for (const kind of PIECE_TYPES) kindsByTab.get('rails')?.push(kind);
  for (const kind of SCENERY_KINDS) kindsByTab.get(sceneryCategory(kind))?.push(kind);
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
