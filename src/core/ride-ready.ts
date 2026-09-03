/**
 * Ride-ready detection: pure, edit-time helpers behind the ride button's
 * invitation (pulse when the meadow becomes rideable, pop when a placement
 * closes a loop). Runs only on world edits — never per frame — so the
 * union-find below never touches the render loop. No three.js coupling.
 */

import { connectionsFor, type PlacedPiece } from './track-graph';

/** The meadow is rideable as soon as a single piece sits on it. */
export function isRideable(pieces: readonly PlacedPiece[]): boolean {
  return pieces.length > 0;
}

/** True when the pieces contain any closed cycle of connected track. */
export function hasCycle(pieces: readonly PlacedPiece[]): boolean {
  if (pieces.length < 3) return false;
  const parent = new Map<string, string>();
  for (const piece of pieces) parent.set(piece.id, piece.id);
  const find = (start: string): string => {
    let root = start;
    while (parent.get(root) !== root) root = parent.get(root) as string;
    return root;
  };
  for (const connection of connectionsFor(pieces)) {
    if (!parent.has(connection.a) || !parent.has(connection.b)) continue;
    const rootA = find(connection.a);
    const rootB = find(connection.b);
    if (rootA === rootB) return true;
    parent.set(rootA, rootB);
  }
  return false;
}

/** True only when the edit takes the meadow from open track to a loop. */
export function closesLoop(before: readonly PlacedPiece[], after: readonly PlacedPiece[]): boolean {
  return !hasCycle(before) && hasCycle(after);
}
