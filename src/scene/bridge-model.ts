import type { Object3D } from 'three';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { enableCastShadows } from './shadows';

/**
 * The wooden trestle bridge — procedural kit-style geometry (no downloaded
 * asset, per the track's asset NFR): a plank deck carrying the rails, side
 * railings, and stilt legs reaching down into the river.
 *
 * The template is built from the *measured* straight-GLB mount — its rail
 * height and track width — so a train crosses the trestle at exactly the
 * height it already rides everywhere else, and the deck meets neighbouring
 * straights flush. Base orientation matches the straight it mirrors: the
 * long axis runs north–south (the graph's bridge endpoints).
 */

export interface TrestleMeasurements {
  /** One meadow cell in world units (the deck spans the full cell). */
  cellSize: number;
  /** The straight kit's rail top in world units — the deck sits here. */
  railTop: number;
  /** The straight kit's full track width — the deck matches it. */
  width: number;
}

/** Wood and steel tones matching the kit's toy palette. */
const WOOD = 0x9a6b43;
const PLANK = 0xb08a5f;
const RAIL_STEEL = 0x5a5a5f;

export function createTrestleTemplate(measure: TrestleMeasurements): Object3D {
  const group = new Group();
  const wood = new MeshStandardMaterial({ color: WOOD });
  const plank = new MeshStandardMaterial({ color: PLANK });
  const steel = new MeshStandardMaterial({ color: RAIL_STEEL });

  const box = (
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    material: MeshStandardMaterial,
  ): void => {
    const mesh = new Mesh(new BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    group.add(mesh);
  };

  const deck = measure.railTop;
  const half = measure.cellSize / 2;
  const edge = measure.width / 2;

  // Rails: two steel strips along the long axis, at the measured rail top.
  const gauge = Math.max(measure.width * 0.55, 0.3);
  for (const x of [-gauge / 2, gauge / 2]) {
    box(0.05, 0.045, measure.cellSize, x, deck + 0.02, 0, steel);
  }
  // Plank deck: a thin wooden bed right under the rails.
  box(measure.width, 0.06, measure.cellSize, 0, deck - 0.04, 0, plank);
  // Side railings: a low timber rail outboard on each edge, on short posts.
  for (const x of [-edge, edge]) {
    box(0.045, 0.045, measure.cellSize, x, deck + 0.14, 0, wood);
    for (const z of [-half + 0.25, 0, half - 0.25]) {
      box(0.04, 0.16, 0.04, x, deck + 0.06, z, wood);
    }
  }
  // Cross beams under the deck — the trestle's transverse bents.
  for (const z of [-half + 0.3, 0, half - 0.3]) {
    box(measure.width, 0.05, 0.12, 0, deck - 0.1, z, wood);
  }
  // Stilt legs: two pairs reaching from the bents down through the waterline.
  const footY = -0.08; // Slightly below the water surface (y ≈ 0.02) — legs in the river.
  const legHeight = deck - 0.1 - footY;
  for (const z of [-half + 0.3, half - 0.3]) {
    for (const x of [-edge + 0.06, edge - 0.06]) {
      box(0.07, legHeight, 0.07, x, footY + legHeight / 2, z, wood);
    }
  }

  enableCastShadows(group);
  return group;
}
