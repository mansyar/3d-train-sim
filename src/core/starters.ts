/**
 * Starter worlds: hand-shaped first-run railways a toddler can ride with one
 * tap. Each builder returns an ordinary `WorldData` — closed loop, dry-land
 * legal (bridges water-only, everything else dry), one toy per cell — so the
 * app can hydrate it exactly like a hand-built world. Pure data, no three.js.
 *
 * Layout notes: the river S-curve (`cx(y) = 8 − 3·cos(π·y/15)`, 3 cells
 * wide) leaves the west bank (columns 0–3) dry in every row, which is where
 * the land ovals sit. The river crossing spans x4–x10 where the top (y5) and
 * bottom (y8) water bands sit at columns 6–8 and 7–9, with dry corners.
 */
import type { WorldData } from './save';
import type { PlacedScenery, SceneryKind } from './scenery';
import type { PieceType, PlacedPiece, Rotation } from './track-graph';
import { defaultConsist } from './wagons';

export type StarterPresetId =
  | 'cozy-oval'
  | 'station-village'
  | 'river-crossing'
  | 'hilltop-junction';

export interface StarterPreset {
  id: StarterPresetId;
  build: () => WorldData;
}

function rail(
  entries: ReadonlyArray<readonly [PieceType, number, number, Rotation]>,
): PlacedPiece[] {
  return entries.map(([type, x, y, rotation], index) => ({
    id: `piece-${index + 1}`,
    type,
    cell: { x, y },
    rotation,
  }));
}

function decor(entries: ReadonlyArray<readonly [SceneryKind, number, number]>): PlacedScenery[] {
  return entries.map(([kind, x, y], index) => ({
    id: `scenery-${index + 1}`,
    kind,
    cell: { x, y },
    rotation: 0,
  }));
}

function starter(pieces: PlacedPiece[], scenery: PlacedScenery[]): WorldData {
  return { pieces, scenery, train: 'steam', deliveries: {}, consist: defaultConsist() };
}

/** The first-run default: a 10-piece oval on the west bank + station and trees. */
export function cozyOval(): WorldData {
  return starter(
    rail([
      ['corner', 0, 5, 90],
      ['straight', 1, 5, 90],
      ['straight', 2, 5, 90],
      ['corner', 3, 5, 180],
      ['straight', 3, 6, 0],
      ['corner', 3, 7, 270],
      ['straight', 2, 7, 90],
      ['straight', 1, 7, 90],
      ['corner', 0, 7, 0],
      ['straight', 0, 6, 0],
    ]),
    decor([
      ['station', 4, 6],
      ['tree', 5, 5],
      ['tree', 5, 7],
      ['house', 1, 8],
    ]),
  );
}

/** A roomier loop with homes and critters for the parent-gated gallery. */
export function stationVillage(): WorldData {
  return starter(
    rail([
      ['corner', 0, 4, 90],
      ['straight', 1, 4, 90],
      ['straight', 2, 4, 90],
      ['straight', 3, 4, 90],
      ['corner', 4, 4, 180],
      ['straight', 4, 5, 0],
      ['straight', 4, 6, 0],
      ['corner', 4, 7, 270],
      ['straight', 3, 7, 90],
      ['straight', 2, 7, 90],
      ['straight', 1, 7, 90],
      ['corner', 0, 7, 0],
      ['straight', 0, 6, 0],
      ['straight', 0, 5, 0],
    ]),
    decor([
      ['station', 5, 6],
      ['house', 1, 3],
      ['cottage', 3, 3],
      ['pig', 2, 8],
      ['sheep', 5, 8],
    ]),
  );
}

/** An oval crossing the river twice on trestle bridges, station on dry land. */
export function riverCrossing(): WorldData {
  return starter(
    rail([
      ['corner', 4, 5, 90],
      ['straight', 5, 5, 90],
      ['bridge', 6, 5, 90],
      ['bridge', 7, 5, 90],
      ['bridge', 8, 5, 90],
      ['straight', 9, 5, 90],
      ['corner', 10, 5, 180],
      ['straight', 10, 6, 0],
      ['straight', 10, 7, 0],
      ['corner', 10, 8, 270],
      ['bridge', 9, 8, 90],
      ['bridge', 8, 8, 90],
      ['bridge', 7, 8, 90],
      ['straight', 6, 8, 90],
      ['straight', 5, 8, 90],
      ['corner', 4, 8, 0],
      ['straight', 4, 7, 0],
      ['straight', 4, 6, 0],
    ]),
    decor([
      ['station', 5, 6],
      ['tree', 11, 7],
    ]),
  );
}

/** Hilltop Junction: the hill run and a passing loop in a single showcase.
 *
 * A roomier west-bank oval (columns 0–4) with the hill trio cresting the far
 * straight and a passing loop on the near straight — a right-switch (stem
 * west / diverge south) and a mirrored right-switch (stem east / diverge
 * south) joined by a zigzag siding dipping one row below and rising back.
 * BOTH diverging legs face the siding so its rails meet the switch blades;
 * the loop rides westward along the near straight, so the east mirrored
 * switch alternates main + siding laps while the west switch merges the
 * siding back (trailing point). Station sits beside the main line west of
 * the siding; trees dot the dry verge.
 */
export function hilltopJunction(): WorldData {
  return starter(
    rail([
      ['corner', 0, 4, 90],
      ['slope-up', 1, 4, 90],
      ['hill', 2, 4, 90],
      ['slope-down', 3, 4, 90],
      ['corner', 4, 4, 180],
      ['straight', 4, 5, 0],
      ['straight', 4, 6, 0],
      ['corner', 4, 7, 270],
      ['switch-mirror', 3, 7, 270],
      ['straight', 2, 7, 90],
      ['switch', 1, 7, 90],
      ['corner', 0, 7, 0],
      ['straight', 0, 6, 0],
      ['straight', 0, 5, 0],
      ['corner', 1, 8, 0],
      ['straight', 2, 8, 90],
      ['corner', 3, 8, 270],
    ]),
    decor([
      ['station', 0, 8],
      ['tree', 5, 5],
      ['tree', 5, 7],
    ]),
  );
}

/** The gallery's icon-only choices, in picker order. */
export const STARTER_PRESETS: readonly StarterPreset[] = [
  { id: 'cozy-oval', build: cozyOval },
  { id: 'station-village', build: stationVillage },
  { id: 'river-crossing', build: riverCrossing },
  { id: 'hilltop-junction', build: hilltopJunction },
];
