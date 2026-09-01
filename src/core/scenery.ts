/**
 * The meadow toy catalog: scenery that decorates the world without carrying
 * the train. Three drawer groups — nature, town, and critters — share the
 * same one-toy-per-cell rules as track. Pure data: the renderer, the tabbed
 * toybox drawer, and the world store all read from here, and nothing couples
 * the catalog to browser or Three.js.
 */
import type { Cell, Rotation } from './track-graph';

/** The drawer groups the tabbed toybox shows. Rails pieces live elsewhere. */
export const SCENERY_CATEGORIES = ['nature', 'town', 'critter'] as const;
export type SceneryCategory = (typeof SCENERY_CATEGORIES)[number];

export const SCENERY_KINDS = [
  'tree',
  'bush',
  'rock',
  'house',
  'cottage',
  'station',
  'pig',
  'sheep',
  'pug',
] as const;

export type SceneryKind = (typeof SCENERY_KINDS)[number];

/** A scenery toy on the meadow, as the world store holds it. */
export interface PlacedScenery {
  id: string;
  kind: SceneryKind;
  cell: Cell;
  rotation: Rotation;
}

/** The meadow model for each kind (Kenney kits, CC0, vendored in the repo);
 *  the station is an original Blender-authored piece (scripts/blender-station.py)
 *  with named crate slots for the cargo deliveries. */
const SCENERY_URLS: Record<SceneryKind, string> = {
  tree: '/assets/nature-kit/tree_default.glb',
  bush: '/assets/nature-kit/plant_bushDetailed.glb',
  rock: '/assets/nature-kit/rock_smallA.glb',
  house: '/assets/fantasy-town-kit/house.glb',
  cottage: '/assets/fantasy-town-kit/cottage.glb',
  station: '/assets/train-kit/station.glb',
  pig: '/assets/quaternius-farm/pig.glb',
  sheep: '/assets/quaternius-farm/sheep.glb',
  pug: '/assets/quaternius-farm/pug.glb',
};

/** The drawer group each kind belongs to. */
const SCENERY_CATEGORIES_BY_KIND: Record<SceneryKind, SceneryCategory> = {
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
/**
 * Scale relative to one meadow cell. The kits are authored with 1 unit ~= 1
 * cell, so these are tuning multipliers: trees tower toy-like, buildings and
 * the station read as chunky landmarks, critters sit low beside the rails.
 */
const SCENERY_SCALES: Record<SceneryKind, number> = {
  tree: 0.5,
  bush: 0.65,
  rock: 0.8,
  house: 1,
  cottage: 1,
  station: 0.7,
  pig: 1,
  sheep: 1,
  pug: 1,
};

/** Ground-plane lift so decor never z-fights with the meadow mat. */
const SCENERY_LIFTS: Record<SceneryKind, number> = {
  tree: 0.02,
  bush: 0.02,
  rock: 0.01,
  house: 0.02,
  cottage: 0.02,
  station: 0.02,
  pig: 0.01,
  sheep: 0.01,
  pug: 0.01,
};

/** Drawer button labels (aria only - the UI itself is icon-only). */
const SCENERY_ARIA: Record<SceneryKind, string> = {
  tree: 'Tree',
  bush: 'Bush',
  rock: 'Rock',
  house: 'House',
  cottage: 'Cottage',
  station: 'Train station',
  pig: 'Pig',
  sheep: 'Sheep',
  pug: 'Pug',
};

/**
 * The gentle voice id each critter chirps with when the train passes.
 * Non-critters stay silent; the audio layer maps ids to bundled sounds.
 */
const SCENERY_VOICES: Partial<Record<SceneryKind, string>> = {
  pig: 'oink-pig',
  sheep: 'baa-sheep',
  pug: 'woof-pug',
};

export function sceneryCategory(kind: SceneryKind): SceneryCategory {
  return SCENERY_CATEGORIES_BY_KIND[kind];
}

export function sceneryUrl(kind: SceneryKind): string {
  return SCENERY_URLS[kind];
}

export function sceneryScale(kind: SceneryKind): number {
  return SCENERY_SCALES[kind];
}

export function sceneryLift(kind: SceneryKind): number {
  return SCENERY_LIFTS[kind];
}

export function sceneryVoice(kind: SceneryKind): string | null {
  return SCENERY_VOICES[kind] ?? null;
}

export function sceneryAria(kind: SceneryKind): string {
  return SCENERY_ARIA[kind];
}
