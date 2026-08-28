/**
 * The V1 scenery set: toys that decorate the meadow without carrying the
 * train. Pure data - the renderer and the toybox drawer read from here, and
 * the world store applies the same one-toy-per-cell occupancy rules as track.
 */
import type { Cell, Rotation } from './track-graph';

export const SCENERY_KINDS = ['tree', 'bush', 'rock'] as const;

export type SceneryKind = (typeof SCENERY_KINDS)[number];

/** A scenery toy on the meadow, as the world store holds it. */
export interface PlacedScenery {
  id: string;
  kind: SceneryKind;
  cell: Cell;
  rotation: Rotation;
}

/** The meadow model for each kind (Kenney Nature Kit, CC0). */
const SCENERY_URLS: Record<SceneryKind, string> = {
  tree: '/assets/nature-kit/tree_default.glb',
  bush: '/assets/nature-kit/plant_bushDetailed.glb',
  rock: '/assets/nature-kit/rock_smallA.glb',
};

/**
 * Scale relative to one meadow cell. The kit is authored with 1 unit ~= 1
 * cell, so these are tuning multipliers: trees tower toy-like, bushes and
 * rocks sit low beside the rails.
 */
const SCENERY_SCALES: Record<SceneryKind, number> = {
  tree: 0.5,
  bush: 0.65,
  rock: 0.8,
};

/** Ground-plane lift so decor never z-fights with the meadow mat. */
const SCENERY_LIFTS: Record<SceneryKind, number> = {
  tree: 0.02,
  bush: 0.02,
  rock: 0.01,
};

/** Drawer button labels (aria only - the UI itself is icon-only). */
const SCENERY_ARIA: Record<SceneryKind, string> = {
  tree: 'Tree',
  bush: 'Bush',
  rock: 'Rock',
};

export function sceneryUrl(kind: SceneryKind): string {
  return SCENERY_URLS[kind];
}

export function sceneryScale(kind: SceneryKind): number {
  return SCENERY_SCALES[kind];
}

export function sceneryLift(kind: SceneryKind): number {
  return SCENERY_LIFTS[kind];
}

export function sceneryAria(kind: SceneryKind): string {
  return SCENERY_ARIA[kind];
}
