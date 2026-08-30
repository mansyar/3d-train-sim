import { type Cell, MEADOW_CELLS } from './track-graph';

/**
 * The meadow's river: a hand-shaped S-curve band ~3 cells wide, flowing
 * edge-to-edge across the 16×16 build grid. The center line is
 * `cx(y) = 8 − 3·cos(π·y/15)` — drifting from column 5 at the north edge to
 * column 11 at the south, which keeps at least 3 contiguous build cells on
 * *both* banks in every row (amplitude 4 would squeeze the east bank to 2).
 * Pure data: the set is built lazily on first lookup (module-load eagerness
 * would trip over the `track-graph → river → track-graph` cycle) — every
 * lookup stays O(1).
 */

/** Center column of the river at row `y` (0..15). */
function centerX(y: number): number {
  const t = y / (MEADOW_CELLS - 1);
  return Math.round(8 - 3 * Math.cos(Math.PI * t));
}

/** Half-width of the band: water spans cx−1 … cx+1 (3 cells per row). */
const BAND = 1;

let water: Set<string> | null = null;

/** The water-cell set, built on first lookup (see the module doc on cycles). */
function waterSet(): Set<string> {
  if (!water) {
    water = new Set<string>();
    for (let y = 0; y < MEADOW_CELLS; y += 1) {
      const cx = centerX(y);
      for (let x = cx - BAND; x <= cx + BAND; x += 1) {
        if (x >= 0 && x < MEADOW_CELLS) water.add(`${x},${y}`);
      }
    }
  }
  return water;
}

/** Is this meadow cell river water? Out-of-bounds cells are always dry. */
export function isWater(cell: Cell): boolean {
  if (cell.x < 0 || cell.x >= MEADOW_CELLS || cell.y < 0 || cell.y >= MEADOW_CELLS) {
    return false;
  }
  return waterSet().has(`${cell.x},${cell.y}`);
}

/**
 * Every water cell, in row order — the river's footprint on the meadow grid.
 * Computed once and cached; callers may hold the reference.
 */
let waterCells: Cell[] | null = null;

export function riverWaterCells(): Cell[] {
  if (!waterCells) {
    waterCells = [];
    for (let y = 0; y < MEADOW_CELLS; y += 1) {
      for (let x = 0; x < MEADOW_CELLS; x += 1) {
        if (waterSet().has(`${x},${y}`)) waterCells.push({ x, y });
      }
    }
  }
  return waterCells;
}

let driftPath: Cell[] | null = null;

/**
 * Ordered walk of the river's center cells, north edge → south edge — the
 * duck's patrol route. Computed once and cached (callers may hold the
 * reference; the array is never mutated).
 */
export function riverDriftPath(): Cell[] {
  if (!driftPath) {
    driftPath = [];
    for (let y = 0; y < MEADOW_CELLS; y += 1) {
      const cx = centerX(y);
      if (cx >= 0 && cx < MEADOW_CELLS) driftPath.push({ x: cx, y });
    }
  }
  return driftPath;
}
