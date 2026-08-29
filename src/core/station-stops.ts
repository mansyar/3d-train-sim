import type { Cell } from './track-graph';

/** One place the train pauses: a station touching a path step. */
export interface StationStopStep {
  /** Index into the path steps where the train stops. */
  stepIndex: number;
  /** The station that triggers this stop. */
  stationId: string;
  /** The station's cell — lets the ride stop at the closest point on the step. */
  cell: Cell;
}

/**
 * A path segment's geometry, in world units (mirrors the ride's segments):
 * a line between two edge midpoints, or a quarter-arc pivoting on the cell
 * corner shared by its two open edges.
 */
export interface PathSegmentGeom {
  kind: 'line' | 'arc';
  ax: number;
  az: number;
  bx: number;
  bz: number;
  cx: number;
  cz: number;
  r: number;
  a0: number;
  sweep: number;
}

/**
 * True when the piece cell is the station's own cell or touches it (the
 * 8-neighbourhood: sharing an edge or a corner). Stations cannot share a
 * track cell (world rule: one toy per cell), so a stop fires when the ride
 * passes the track cell right beside the station.
 */
export function isStationPassed(stationCell: Cell, pieceCell: Cell): boolean {
  return Math.abs(stationCell.x - pieceCell.x) <= 1 && Math.abs(stationCell.y - pieceCell.y) <= 1;
}

/**
 * The path steps at which the train pauses for stations, in travel order.
 * Each station contributes at most one stop — the touching step whose cell
 * centre is closest to the station (an edge touch beats a diagonal one, so
 * the train never stops a full cell early). Ties go to the earlier step.
 */
export function stationStopSteps(
  cells: readonly Cell[],
  stations: readonly { id: string; cell: Cell }[],
): StationStopStep[] {
  const stops: StationStopStep[] = [];
  for (const station of stations) {
    let best = -1;
    let bestDistanceSquared = Number.POSITIVE_INFINITY;
    for (let i = 0; i < cells.length; i++) {
      const pieceCell = cells[i];
      if (!pieceCell || !isStationPassed(station.cell, pieceCell)) continue;
      const dx = station.cell.x - pieceCell.x;
      const dy = station.cell.y - pieceCell.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < bestDistanceSquared) {
        bestDistanceSquared = distanceSquared;
        best = i;
      }
    }
    if (best !== -1) stops.push({ stepIndex: best, stationId: station.id, cell: station.cell });
  }
  return stops;
}

/**
 * The fraction u ∈ [0, 1] along the segment of the point closest to the
 * station centre (given in world units) — where the train should rest to sit
 * AT the station, not at the entry to its cell. Lines project; arcs clamp the
 * station's angle to the swept span.
 */
export function closestPointFraction(
  segment: PathSegmentGeom,
  point: { x: number; z: number },
): number {
  if (segment.kind === 'line') {
    const dx = segment.bx - segment.ax;
    const dz = segment.bz - segment.az;
    const lengthSquared = dx * dx + dz * dz;
    if (lengthSquared === 0) return 0;
    const t = ((point.x - segment.ax) * dx + (point.z - segment.az) * dz) / lengthSquared;
    return Math.min(1, Math.max(0, t));
  }
  const angle = Math.atan2(point.z - segment.cz, point.x - segment.cx);
  const u = (angle - segment.a0) / segment.sweep;
  return Math.min(1, Math.max(0, u));
}
