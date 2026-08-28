import { baseEndpointsFor, type PieceType, type Rotation } from './pieces';

/** Buildable meadow extent in cells (16×16). */
export const MEADOW_CELLS = 16;

/** Maximum track pieces a world may hold (the drawer dims at this cap). */
export const MAX_PIECES = 64;

export type { PieceType, Rotation } from './pieces';

/** One grid cell on the meadow. */
export interface Cell {
  x: number;
  y: number;
}

/** A track piece placed on the meadow. */
export interface PlacedPiece {
  id: string;
  type: PieceType;
  cell: Cell;
  rotation: Rotation;
}

/** Why a placement is blocked. The kid UI dims and gently returns; no errors. */
export type PlacementError = 'out-of-bounds' | 'occupied' | 'capacity';

/** The boundary between two adjacent cells, keyed `cellA|cellB` (sorted). */
export type EdgeKey = string;

/** A track connection: two pieces whose endpoints share one cell boundary. */
export interface Connection {
  a: string;
  b: string;
  via: EdgeKey;
}

const COMPASS = ['north', 'east', 'south', 'west'] as const;

/** One compass step clockwise — how an edge's label advances per 90° of yaw. */
const NEXT_EDGE: Record<Edge, Edge> = {
  north: 'east',
  east: 'south',
  south: 'west',
  west: 'north',
};
export type Edge = (typeof COMPASS)[number];

/** Cells inside the 16×16 meadow only. */
export function inBounds(cell: Cell): boolean {
  return cell.x >= 0 && cell.x < MEADOW_CELLS && cell.y >= 0 && cell.y < MEADOW_CELLS;
}

/**
 * Why `cell` cannot host a piece, or `null` when it can. Order matters:
 * bounds, then occupancy, then the piece cap — the drawer reads this to dim
 * itself rather than to complain.
 */
export function validatePlacement(
  pieces: readonly PlacedPiece[],
  cell: Cell,
): PlacementError | null {
  if (!inBounds(cell)) return 'out-of-bounds';
  if (pieces.some((p) => p.cell.x === cell.x && p.cell.y === cell.y)) {
    return 'occupied';
  }
  if (pieces.length >= MAX_PIECES) return 'capacity';
  return null;
}

export function cellKey(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}

/** The cell one step in a compass direction (north = -y). */
function neighbourOf(cell: Cell, edge: Edge): Cell {
  switch (edge) {
    case 'north':
      return { x: cell.x, y: cell.y - 1 };
    case 'east':
      return { x: cell.x + 1, y: cell.y };
    case 'south':
      return { x: cell.x, y: cell.y + 1 };
    case 'west':
      return { x: cell.x - 1, y: cell.y };
  }
}

function boundaryKey(a: Cell, b: Cell): EdgeKey {
  const [first, second] = [cellKey(a), cellKey(b)].sort();
  return `${first}|${second}`;
}

/**
 * The cell boundaries this piece's open ends land on, in the piece's winding
 * order. A single rule for every type and rotation: labels advance one compass
 * step clockwise per 90° of yaw, matching how yaw-rotated models turn.
 */
export function endpointEdgesFor(piece: PlacedPiece): EdgeKey[] {
  const openEdges = baseEndpointsFor(piece.type);
  const steps = piece.rotation / 90;
  return openEdges.map((edge) => {
    let label = edge;
    for (let i = 0; i < steps; i++) label = NEXT_EDGE[label];
    return boundaryKey(piece.cell, neighbourOf(piece.cell, label));
  });
}

/** Every connection in the world — where two pieces' open ends coincide. */
export function connectionsFor(pieces: readonly PlacedPiece[]): Connection[] {
  const edges = pieces.map((p) => ({
    id: p.id,
    keys: endpointEdgesFor(p),
  }));
  const connections: Connection[] = [];
  for (let i = 0; i < edges.length; i++) {
    const outer = edges[i];
    if (!outer) continue;
    for (let j = i + 1; j < edges.length; j++) {
      const inner = edges[j];
      if (!inner) continue;
      const via = outer.keys.find((key) => inner.keys.includes(key));
      if (via) connections.push({ a: outer.id, b: inner.id, via });
    }
  }
  return connections;
}
