import type { Cell } from './track-graph';

/** One place the train pauses: a station touching a path step. */
export interface StationStopStep {
  /** Index into the path steps where the train stops. */
  stepIndex: number;
  /** The station that triggers this stop. */
  stationId: string;
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
 * Each station contributes at most one stop — the first step it touches —
 * so a station beside a loop never stops the train twice in one lap.
 */
export function stationStopSteps(
  cells: readonly Cell[],
  stations: readonly { id: string; cell: Cell }[],
): StationStopStep[] {
  const stops: StationStopStep[] = [];
  for (const station of stations) {
    // A station on the path's own cell stops the train exactly there; only
    // when it sits beside the rails does the first touching step win.
    const exact = cells.findIndex((cell) => cell.x === station.cell.x && cell.y === station.cell.y);
    const stepIndex =
      exact !== -1 ? exact : cells.findIndex((cell) => isStationPassed(station.cell, cell));
    if (stepIndex !== -1) stops.push({ stepIndex, stationId: station.id });
  }
  return stops;
}
