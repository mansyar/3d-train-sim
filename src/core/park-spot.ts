import { type RideComponent, rideComponentsOf, selectRideComponents } from './pathing';
import { isWater } from './river';
import { type Cell, type Edge, MEADOW_CELLS, type PlacedPiece } from './track-graph';

/** Where the pre-ride spare parks: on the rails, or on dry land when none exist. */
export type ParkSpot =
  | { kind: 'rails'; pieceId: string; from: Edge; to: Edge }
  | { kind: 'land'; cell: Cell };

/** Distance from a cell's world centre to the meadow heart (world origin). */
function heartDistance(cell: Cell): number {
  return Math.hypot(cell.x + 0.5 - MEADOW_CELLS / 2, cell.y + 0.5 - MEADOW_CELLS / 2);
}

/**
 * The nearest dry rail step of the largest ride — the spot the pre-ride
 * opener parks on. Dry beats nearer-but-wet (a bridge) whenever a dry step
 * exists; walks are deterministic, so equal distances resolve by step order.
 */
function railsSpotOf(component: RideComponent, pieces: readonly PlacedPiece[]): ParkSpot | null {
  const pieceById = new Map(pieces.map((piece) => [piece.id, piece] as const));
  let bestStep: { pieceId: string; from: Edge; to: Edge } | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestDry = false;
  for (const step of component.path.steps) {
    const placed = pieceById.get(step.pieceId);
    if (!placed) continue;
    const dry = !isWater(placed.cell);
    const distance = heartDistance(placed.cell);
    const better = (dry && !bestDry) || (dry === bestDry && distance < bestDistance);
    if (better) {
      bestDry = dry;
      bestDistance = distance;
      bestStep = { pieceId: step.pieceId, from: step.from, to: step.to };
    }
  }
  return bestStep ? { kind: 'rails', ...bestStep } : null;
}

/**
 * The pre-ride spare's parking spot for a world: the dry rails of the largest
 * ride nearest the meadow heart (the ride ▶ adopts first), or — when the world
 * has no rideable track — the nearest dry cell, so the opening toy still
 * greets the toddler at the meadow's heart. Deterministic, total: every world
 * yields a spot.
 */
export function findParkSpot(pieces: readonly PlacedPiece[]): ParkSpot {
  const [largest] = selectRideComponents(rideComponentsOf(pieces), 1);
  if (largest) {
    const rails = railsSpotOf(largest, pieces);
    if (rails) return rails;
  }

  // No rideable track: park on land. Every row leaves dry banks (river.ts),
  // so the scan always finds a cell; the origin cell is a total-function guard.
  let best: Cell | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let y = 0; y < MEADOW_CELLS; y += 1) {
    for (let x = 0; x < MEADOW_CELLS; x += 1) {
      const cell = { x, y };
      if (isWater(cell)) continue;
      const distance = heartDistance(cell);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = cell;
      }
    }
  }
  return { kind: 'land', cell: best ?? { x: 0, y: 0 } };
}
