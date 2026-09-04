/**
 * Switch routing — pure core, no three.js.
 *
 * The switch is a Y-junction with three open ends. A train entering from
 * the stem chooses a branch; the per-switch alternation counter makes that
 * choice deterministic and fair: first pass straight through, next pass
 * diverging, forever alternating. Entries from either branch merge through
 * the stem — no choice, no counter movement. The rule is entry-based and
 * direction-agnostic, so reverse (shuttling) passes follow it unchanged:
 * only a pass entering from the stem advances the counter.
 *
 * Counters are session-only runtime state — never serialized (spec FR8);
 * each placed switch starts fresh, on the straight branch.
 */

import type { Edge, PieceType, Rotation } from './pieces';

/** The two roads through the switch, named from the through-driver's view. */
export type SwitchBranch = 'straight' | 'diverge';

/** A piece type that routes like a Y-junction (right or mirror). */
export type SwitchPieceType = 'switch' | 'switch-mirror';

/** True for either handedness of the Y-junction. */
export function isSwitchPiece(type: PieceType): type is SwitchPieceType {
  return type === 'switch' || type === 'switch-mirror';
}

/** Base-frame legs at yaw 0 (edges advance one compass step per 90° yaw). */
const STEM_EDGE: Edge = 'south';
const STRAIGHT_EDGE: Edge = 'north';
/** The right switch diverges east; the mirror diverges west (same alternation). */
const DIVERGE_EDGE: Record<SwitchPieceType, Edge> = {
  switch: 'east',
  'switch-mirror': 'west',
};

const CANONICAL_EDGES: readonly Edge[] = ['north', 'east', 'south', 'west'];

/** Rotate one edge counterclockwise by a 90° step count — world back to base. */
function unrotateEdge(edge: Edge, rotation: Rotation): Edge {
  const steps = (4 - rotation / 90) % 4;
  return CANONICAL_EDGES[(CANONICAL_EDGES.indexOf(edge) + steps) % 4] as Edge;
}

/** Rotate one edge clockwise by a 90° step count — base out to world. */
function rotateEdge(edge: Edge, rotation: Rotation): Edge {
  const steps = rotation / 90;
  return CANONICAL_EDGES[(CANONICAL_EDGES.indexOf(edge) + steps) % 4] as Edge;
}

/** The branch the next stem entry takes, given the switch's current counter. */
export function nextBranch(counter: number): SwitchBranch {
  return counter % 2 === 0 ? 'straight' : 'diverge';
}

/**
 * Route one pass through the switch: `from` is the world-oriented entry
 * edge at the piece's rotation, `counter` its alternation state (0 = next
 * stem entry takes the straight branch). `type` selects the handedness —
 * the mirror diverges west where the right switch diverges east, with the
 * same stem→alternating / branch→stem rule. Returns the world-oriented exit
 * edge and the counter after the pass — advanced only when the entry came
 * from the stem, and always folded back to 0|1 so the state stays a
 * two-state machine. Pure and total. Defaults to the right switch so older
 * callers keep their routing byte for byte.
 */
export function routeSwitch(
  counter: number,
  rotation: Rotation,
  from: Edge,
  type: SwitchPieceType = 'switch',
): { exit: Edge; counter: number } {
  const fromBase = unrotateEdge(from, rotation);
  if (fromBase === STEM_EDGE) {
    const branch = nextBranch(counter);
    const exitBase = branch === 'straight' ? STRAIGHT_EDGE : DIVERGE_EDGE[type];
    return { exit: rotateEdge(exitBase, rotation), counter: (counter + 1) % 2 };
  }
  return { exit: rotateEdge(STEM_EDGE, rotation), counter: counter % 2 };
}
