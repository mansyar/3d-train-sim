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
 * The three-way junction generalizes the same contract across four open
 * ends: its stem cycles straight → right → left on a 0|1|2 counter, and
 * every branch entry (either side road or the straight) merges through the
 * stem unchanged.
 *
 * Counters are session-only runtime state — never serialized (spec FR8);
 * each placed switch starts fresh, on the straight branch.
 */

import type { Edge, PieceType, Rotation } from './pieces';

/** The two roads through a Y switch, named from the through-driver's view. */
export type SwitchBranch = 'straight' | 'diverge';

/** The three roads through the three-way, named from the stem-driver's view. */
export type ThreeWayBranch = 'straight' | 'right' | 'left';

/** A piece type that routes like a junction (right Y, mirror Y, or three-way). */
export type SwitchPieceType = 'switch' | 'switch-mirror' | 'switch-3way';

/** True for any of the junction pieces. */
export function isSwitchPiece(type: PieceType): type is SwitchPieceType {
  return type === 'switch' || type === 'switch-mirror' || type === 'switch-3way';
}

/** Base-frame legs at yaw 0 (edges advance one compass step per 90° yaw). */
const STEM_EDGE: Edge = 'south';
const STRAIGHT_EDGE: Edge = 'north';
/** The right switch diverges east; the mirror diverges west (same alternation). */
const DIVERGE_EDGE: Record<'switch' | 'switch-mirror', Edge> = {
  switch: 'east',
  'switch-mirror': 'west',
};
/** Base-frame exits for the three-way's roads (right = east at yaw 0). */
const THREE_WAY_EDGES: Record<ThreeWayBranch, Edge> = {
  straight: STRAIGHT_EDGE,
  right: 'east',
  left: 'west',
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

/** The three-way branches in cycle order. */
const THREE_WAY_BRANCHES: readonly ThreeWayBranch[] = ['straight', 'right', 'left'];

/** The road the next stem entry takes on the three-way, given its 0|1|2 counter. */
export function nextThreeWayBranch(counter: number): ThreeWayBranch {
  return THREE_WAY_BRANCHES[counter % 3] as ThreeWayBranch;
}

/**
 * Route one pass through the switch: `from` is the world-oriented entry
 * edge at the piece's rotation, `counter` its alternation state (0 = next
 * stem entry takes the straight branch). `type` selects the handedness —
 * the mirror diverges west where the right switch diverges east, with the
 * same stem→alternating / branch→stem rule. Returns the world-oriented exit
 * edge and the counter after the pass — advanced only when the entry came
 * from the stem: folded back to 0|1 on the Y switches and to 0|1|2 on the
 * three-way. Pure and total. Defaults to the right switch so older callers
 * keep their routing byte for byte.
 */
export function routeSwitch(
  counter: number,
  rotation: Rotation,
  from: Edge,
  type: SwitchPieceType = 'switch',
): { exit: Edge; counter: number } {
  const fromBase = unrotateEdge(from, rotation);
  if (type === 'switch-3way') {
    if (fromBase === STEM_EDGE) {
      const exitBase = THREE_WAY_EDGES[nextThreeWayBranch(counter)];
      return { exit: rotateEdge(exitBase, rotation), counter: (counter + 1) % 3 };
    }
    return { exit: rotateEdge(STEM_EDGE, rotation), counter: counter % 3 };
  }
  if (fromBase === STEM_EDGE) {
    const branch = nextBranch(counter);
    const exitBase = branch === 'straight' ? STRAIGHT_EDGE : DIVERGE_EDGE[type];
    return { exit: rotateEdge(exitBase, rotation), counter: (counter + 1) % 2 };
  }
  return { exit: rotateEdge(STEM_EDGE, rotation), counter: counter % 2 };
}
