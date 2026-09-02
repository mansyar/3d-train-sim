import { stepHeights } from './elevation';
import { baseEndpointsFor } from './pieces';
import {
  boundaryKey,
  type Cell,
  cellKey,
  type Edge,
  type EdgeKey,
  neighbourOf,
  type PlacedPiece,
} from './track-graph';

/** One leg of the ride: through one piece, entering by `from`, leaving by `to`. */
export interface PathStep {
  pieceId: string;
  from: Edge;
  to: Edge;
  /**
   * Natural heights above the flat rail plane at the step's entry and exit
   * edges (elevation.ts). The ride layer eases any disagreement between a
   * step's entry height and the height the train actually carries in; the
   * graph itself stays height-blind — hills never alter connectivity.
   */
  entryHeight: number;
  exitHeight: number;
}

/**
 * The ride the train follows. Closed layouts loop forever; open ones are ridden
 * forward and shuttled back by the ride layer. The solver never fails — every
 * non-empty world yields a path (product rule: zero dead ends).
 */
export interface TrainPath {
  steps: PathStep[];
  closed: boolean;
}

/** One connected track component, ready to ride. */
export interface RideComponent {
  /** Every piece id in the component, each exactly once. */
  pieceIds: readonly string[];
  /** The component's ride path (its deterministic walk). */
  path: TrainPath;
  /** Smallest cell key in the component — a stable, unique anchor. */
  anchor: string;
}

/**
 * The rides that get a train: ranked most pieces first (a bigger layout is the
 * kid's centre of attention), cell-key tiebreak for equal sizes, then capped —
 * beyond-cap components stay static scenery, never a failure. Deterministic
 * under any input order.
 */
export function selectRideComponents(
  components: readonly RideComponent[],
  cap = 4,
): RideComponent[] {
  return components
    .map((component, index) => ({ component, index }))
    .sort(
      (a, b) =>
        b.component.pieceIds.length - a.component.pieceIds.length ||
        (a.component.anchor < b.component.anchor ? -1 : 1) ||
        a.index - b.index,
    )
    .slice(0, cap)
    .map(({ component }) => component);
}

/** Next compass edge clockwise — how endpoint labels advance with yaw. */
const NEXT_EDGE: Record<Edge, Edge> = {
  north: 'east',
  east: 'south',
  south: 'west',
  west: 'north',
};

/** The edge across the cell — how a crossing routes straight through. */
const OPPOSITE_EDGE: Record<Edge, Edge> = {
  north: 'south',
  east: 'west',
  south: 'north',
  west: 'east',
};

/** One piece endpoint: its world-oriented compass edge and boundary key. */
interface End {
  pieceId: string;
  edge: Edge;
  key: EdgeKey;
}

/** The piece's two open ends, rotated into world orientation. */
function endsOf(piece: PlacedPiece): End[] {
  return baseEndpointsFor(piece.type).map((base) => {
    let edge: Edge = base;
    for (let i = 0; i < piece.rotation / 90; i++) edge = NEXT_EDGE[edge];
    return {
      pieceId: piece.id,
      edge,
      key: boundaryKey(piece.cell, neighbourOf(piece.cell, edge)),
    };
  });
}

/** Unwrap a lookup whose absence is a solver invariant violation, not a state. */
function invariant<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

/** Connectivity the walk needs: partner lookup plus cell/degree helpers. */
interface TrackGraph {
  pieceOf(id: string): PlacedPiece;
  cellOf(id: string): Cell;
  endsOfPiece(id: string): End[];
  partnerOf: Map<string, Map<EdgeKey, End>>;
  degreeOf(id: string): number;
}

function buildGraph(pieces: readonly PlacedPiece[]): TrackGraph {
  const byId = new Map(pieces.map((p) => [p.id, p] as const));
  const pieceOf = (id: string) => invariant(byId.get(id), `unknown piece ${id}`);
  const cellOf = (id: string) => pieceOf(id).cell;
  const endsByPiece = new Map(pieces.map((p) => [p.id, endsOf(p)] as const));
  const endsOfPiece = (id: string) => invariant(endsByPiece.get(id), `unknown piece ${id}`);

  // Group ends by boundary: a pair on one key means two pieces connect there.
  const endsByKey = new Map<EdgeKey, End[]>();
  for (const ends of endsByPiece.values()) {
    for (const end of ends) {
      const group = endsByKey.get(end.key);
      if (group) group.push(end);
      else endsByKey.set(end.key, [end]);
    }
  }

  const partnerOf = new Map<string, Map<EdgeKey, End>>();
  const setPartner = (from: End, to: End) => {
    const partners = partnerOf.get(from.pieceId) ?? new Map<EdgeKey, End>();
    partners.set(from.key, to);
    partnerOf.set(from.pieceId, partners);
  };
  for (const group of endsByKey.values()) {
    if (group.length !== 2) continue;
    const a = group[0];
    const b = group[1];
    if (!a || !b) continue;
    setPartner(a, b);
    setPartner(b, a);
  }

  return {
    pieceOf,
    cellOf,
    endsOfPiece,
    partnerOf,
    degreeOf: (id: string) => partnerOf.get(id)?.size ?? 0,
  };
}

/** Flood-fill the pieces into connected components, in first-seen order. */
function collectComponents(
  pieces: readonly PlacedPiece[],
  partnerOf: TrackGraph['partnerOf'],
): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];
  for (const p of pieces) {
    if (visited.has(p.id)) continue;
    const ids: string[] = [];
    const queue = [p.id];
    visited.add(p.id);
    for (;;) {
      const id = queue.shift();
      if (id === undefined) break;
      ids.push(id);
      const partners = partnerOf.get(id);
      if (!partners) continue;
      for (const partner of partners.values()) {
        if (!visited.has(partner.pieceId)) {
          visited.add(partner.pieceId);
          queue.push(partner.pieceId);
        }
      }
    }
    components.push(ids);
  }
  return components;
}

/** The component's smallest cell key — a stable anchor that ignores array order. */
function minCellKeyOf(ids: readonly string[], cellOf: TrackGraph['cellOf']): string {
  return ids.reduce((min, id) => {
    const key = cellKey(cellOf(id));
    return key < min ? key : min;
  }, 'ffffffff');
}

/**
 * Walk one component exactly as always: start at a dead end (open layout) or
 * the smallest cell entering through its lower-key end (cycle), then ride the
 * deterministic bijection until the lap closes or an open end ends the pass.
 */
function walkComponent(ids: readonly string[], graph: TrackGraph): TrainPath {
  const { pieceOf, cellOf, endsOfPiece, partnerOf, degreeOf } = graph;

  const byStartCell = (a: string, b: string) =>
    cellKey(cellOf(a)).localeCompare(cellKey(cellOf(b)));

  let startId: string;
  let entryEdge: Edge;
  if (ids.some((id) => degreeOf(id) < 2)) {
    // Open path or lone piece: start at a dead end (degree ≤ 1), entering
    // through its open end, and ride inward.
    const endpoints = ids.filter((id) => degreeOf(id) <= 1).sort(byStartCell);
    startId = invariant(endpoints[0], 'path component without an endpoint');
    const openEnds = endsOfPiece(startId)
      .filter((end) => !partnerOf.get(startId)?.has(end.key))
      .sort((a, b) => (a.key < b.key ? -1 : 1));
    entryEdge = invariant(openEnds[0], 'endpoint without an open end').edge;
  } else {
    // Cycle: start at the smallest cell, entering through its lower-key end.
    const sorted = ids.slice().sort(byStartCell);
    startId = invariant(sorted[0], 'cycle component without pieces');
    const connected = endsOfPiece(startId)
      .filter((end) => partnerOf.get(startId)?.has(end.key))
      .sort((a, b) => (a.key < b.key ? -1 : 1));
    entryEdge = invariant(connected[0], 'cycle piece without connected ends').edge;
  }

  const steps: PathStep[] = [];
  let curId = startId;
  let curEntry: Edge = entryEdge;
  let closed = false;
  for (;;) {
    const ends = endsOfPiece(curId);
    const entryEnd = invariant(
      ends.find((end) => end.edge === curEntry),
      `piece ${curId} has no ${curEntry} end`,
    );
    // Two-end pieces exit through their only other end; a crossing (four
    // ends) routes straight through to the edge opposite the entry.
    const exitEnd = invariant(
      ends.length === 2
        ? ends.find((end) => end.key !== entryEnd.key)
        : ends.find((end) => end.edge === OPPOSITE_EDGE[curEntry]),
      ends.length === 2
        ? `piece ${curId} has a single end`
        : `piece ${curId} has no ${OPPOSITE_EDGE[curEntry]} end`,
    );
    const placed = pieceOf(curId);
    const heights = stepHeights({ type: placed.type, rotation: placed.rotation, from: curEntry });
    steps.push({
      pieceId: curId,
      from: curEntry,
      to: exitEnd.edge,
      entryHeight: heights.entry,
      exitHeight: heights.exit,
    });

    const partner = partnerOf.get(curId)?.get(exitEnd.key);
    if (!partner) break; // open end — the ride finished this pass
    if (partner.pieceId === startId && partner.edge === entryEdge) {
      closed = true; // back at the exact start state — the lap is complete
      break;
    }
    // Re-entering an already-ridden piece through another edge is a legal
    // continuation (a crossing passed twice in one lap), never a closure.
    // Termination is guaranteed: the (piece, entry-edge) routing is a
    // deterministic bijection, so the walk either lands on the start state
    // (closed layout) or runs off an open end.
    curId = partner.pieceId;
    curEntry = partner.edge;
  }

  return { steps, closed };
}

/**
 * One ride per connected track component: every loop and line a toddler builds
 * gets its own train. Components are ordered by each one's smallest cell key
 * (the anchor), so the result never depends on array order — a cell hosts one
 * piece, so anchor keys are unique across components.
 */
export function rideComponentsOf(pieces: readonly PlacedPiece[]): RideComponent[] {
  if (pieces.length === 0) return [];
  const graph = buildGraph(pieces);
  return collectComponents(pieces, graph.partnerOf)
    .map((ids) => ({
      pieceIds: ids,
      anchor: minCellKeyOf(ids, graph.cellOf),
    }))
    .sort((a, b) => (a.anchor < b.anchor ? -1 : 1))
    .map(({ pieceIds, anchor }) => ({
      pieceIds,
      anchor,
      path: walkComponent(pieceIds, graph),
    }));
}

/**
 * One ride path per connected track component, in anchor order.
 */
export function solveRidePaths(pieces: readonly PlacedPiece[]): TrainPath[] {
  return rideComponentsOf(pieces).map((component) => component.path);
}

/**
 * The single chosen ride (the component anchored at the smallest cell) — the
 * original one-train behaviour, now just the first of `solveRidePaths`.
 */
export function solvePath(pieces: readonly PlacedPiece[]): TrainPath {
  return solveRidePaths(pieces)[0] ?? { steps: [], closed: false };
}
