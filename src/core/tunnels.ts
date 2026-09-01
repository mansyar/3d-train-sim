/**
 * Tunnel runs over the placed pieces: which portal faces of each tunnel cell
 * open into air (an arch renders there) vs. into another tunnel (a wall-less
 * seam of one continuous long hill). Pure data — the toybox renders arches at
 * open portals and nothing at seams; the ride reads path flags for the chug
 * duck, the whistle echo, and the night portal glow. No Three.js coupling.
 */

import type { TrainPath } from './pathing';
import { baseEndpointsFor } from './pieces';
import {
  boundaryKey,
  type Edge,
  type EdgeKey,
  neighbourOf,
  nextEdge,
  type PlacedPiece,
} from './track-graph';

/** One world-oriented tunnel end: its compass edge and boundary key. */
interface TunnelEnd {
  edge: Edge;
  key: EdgeKey;
}

function tunnelEndsOf(piece: PlacedPiece): TunnelEnd[] {
  return baseEndpointsFor(piece.type).map((base) => {
    let edge: Edge = base;
    for (let i = 0; i < piece.rotation / 90; i++) edge = nextEdge(edge);
    return { edge, key: boundaryKey(piece.cell, neighbourOf(piece.cell, edge)) };
  });
}

/** One tunnel piece's portals, split where the hill continues vs. arches. */
export interface TunnelRun {
  pieceId: string;
  /** Portal faces opening into air — an arch renders here. */
  openPortals: Edge[];
  /** Portal faces merged into a neighbouring tunnel — a wall-less seam. */
  mergedPortals: Edge[];
}

/**
 * One entry per tunnel piece, in piece order. A seam is a boundary two
 * tunnels share end-to-end — both ends landing on one boundary key, exactly
 * where the track graph connects them. Any other neighbour (plain track, an
 * open end, a side-by-side hill with no shared rail) leaves the portal open.
 */
export function tunnelRunsOf(pieces: readonly PlacedPiece[]): TunnelRun[] {
  const endsByPiece = new Map<string, TunnelEnd[]>();
  const endsByKey = new Map<EdgeKey, TunnelEnd[]>();
  for (const piece of pieces) {
    if (piece.type !== 'tunnel') continue;
    const ends = tunnelEndsOf(piece);
    endsByPiece.set(piece.id, ends);
    for (const end of ends) {
      const group = endsByKey.get(end.key);
      if (group) group.push(end);
      else endsByKey.set(end.key, [end]);
    }
  }
  const seams = new Set<EdgeKey>();
  for (const group of endsByKey.values()) {
    const [first] = group;
    if (group.length === 2 && first) seams.add(first.key);
  }
  return [...endsByPiece].map(([pieceId, ends]) => {
    const openPortals: Edge[] = [];
    const mergedPortals: Edge[] = [];
    for (const { edge, key } of ends) {
      (seams.has(key) ? mergedPortals : openPortals).push(edge);
    }
    return { pieceId, openPortals, mergedPortals };
  });
}

/**
 * Whether the train rides under the hill during each path step, in step
 * order — the single input the chug duck, the whistle echo, and the portal
 * glow need. Hiding itself stays geometric: the opaque dome occludes the
 * train through depth testing, exactly like any hill would.
 */
export function tunnelFlagsForPath(pieces: readonly PlacedPiece[], path: TrainPath): boolean[] {
  const tunnels = new Set(pieces.filter((p) => p.type === 'tunnel').map((p) => p.id));
  return path.steps.map((step) => tunnels.has(step.pieceId));
}

/** The night headlight catching a portal mouth, in cell units. */
export interface PortalGlow {
  /** The glowing mouth's centre in cell coordinates (cell centre = +0.5). */
  x: number;
  z: number;
  /** 0..1 — full at the mouth, fading to dark at the glow radius. */
  intensity: number;
}

/**
 * The nearest open portal mouth to the engine, with proximity intensity —
 * the single input the night portal glow visual needs. Portals arrive as a
 * flat [x, z, ...] array in cell units (built once per world edit by the
 * scene from `tunnelRunsOf`), so the per-frame scan allocates nothing.
 * Only real arch mouths glow — a merged seam is wall-less hill, nothing to
 * catch the beam.
 */
export function portalGlowAt(
  portals: readonly number[],
  ex: number,
  ez: number,
  radius: number,
  out: PortalGlow,
): PortalGlow {
  out.x = 0;
  out.z = 0;
  out.intensity = 0;
  for (let i = 0; i + 1 < portals.length; i += 2) {
    const px = portals[i] ?? 0;
    const pz = portals[i + 1] ?? 0;
    const t = 1 - Math.hypot(px - ex, pz - ez) / radius;
    if (t > out.intensity) {
      out.intensity = t;
      out.x = px;
      out.z = pz;
    }
  }
  return out;
}
