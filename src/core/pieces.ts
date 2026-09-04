/** The piece catalog. The bridge spans the river; the tunnel rides under the hill; the hill run climbs it; the bump run humps it gently; the elevated corners bank it; the switch splits it. */
export const PIECE_TYPES = [
  'straight',
  'corner',
  'crossing',
  'bridge',
  'tunnel',
  'slope-up',
  'hill',
  'slope-down',
  'bump-up',
  'hill-half',
  'bump-down',
  'corner-up',
  'hill-corner',
  'corner-down',
  'switch',
  'switch-mirror',
] as const;

export type PieceType = (typeof PIECE_TYPES)[number];

/** A piece type that rides the quarter-arc (flat or banked). */
export type CornerPieceType = 'corner' | 'corner-up' | 'hill-corner' | 'corner-down';

/** True for the flat corner and every leg of the elevated corner run. */
export function isCornerPiece(type: PieceType): type is CornerPieceType {
  return type === 'corner' || type === 'corner-up' || type === 'hill-corner' || type === 'corner-down';
}

/** A piece type that humps gently at half height (the bump run). */
export type BumpPieceType = 'bump-up' | 'hill-half' | 'bump-down';

/** True for every leg of the bump run. */
export function isBumpPiece(type: PieceType): type is BumpPieceType {
  return type === 'bump-up' || type === 'hill-half' || type === 'bump-down';
}

/** Clockwise yaw in 90° steps. Zero points the piece's base toward north. */
export type Rotation = 0 | 90 | 180 | 270;

export const ROTATIONS: readonly Rotation[] = [0, 90, 180, 270];

/** Cell edges a piece endpoint can join. North is -Z; east is +X. */
export type Edge = 'north' | 'east' | 'south' | 'west';

/** Every piece occupies exactly one grid cell. */
export const FOOTPRINT_CELLS = 1;

/** Fixed order endpoints are always returned in, for stable comparisons. */
const CANONICAL_EDGES: readonly Edge[] = ['north', 'east', 'south', 'west'];

/** The unrotated cell edges a piece's open ends join. */
export function baseEndpointsFor(type: PieceType): readonly Edge[] {
  return BASE_ENDPOINTS[type];
}

/**
 * Unrotated endpoint geometry: the cell edges each piece joins. Two ends for
 * straights and corners; the crossing joins all four.
 */
const BASE_ENDPOINTS: Record<PieceType, readonly Edge[]> = {
  straight: ['north', 'south'],
  corner: ['north', 'east'],
  crossing: ['north', 'east', 'south', 'west'],
  // The bridge rides exactly like the straight it mirrors — trains cross at
  // normal speed and height; only its terrain rule differs.
  bridge: ['north', 'south'],
  // The tunnel rides exactly like the straight it mirrors — trains disappear
  // into the hill and pop out the far side; only its terrain rule differs
  // (dry land only: the river stays open, that's what bridges are for).
  tunnel: ['north', 'south'],
  // The hill run rides exactly like the straight it mirrors — slope-up climbs
  // south→north at yaw 0, hill cruises the crest, slope-down descends. Only
  // the height profile (elevation.ts) and terrain rule differ (dry land only).
  'slope-up': ['north', 'south'],
  hill: ['north', 'south'],
  'slope-down': ['north', 'south'],
  // The bump run is the hill run's gentle sibling at half height — bump-up
  // humps south→north at yaw 0, hill-half cruises the low crest, bump-down
  // settles back to grade. Same straight-like riding, same dry-land rule.
  'bump-up': ['north', 'south'],
  'hill-half': ['north', 'south'],
  'bump-down': ['north', 'south'],
  // The elevated corner run banks the turn: corner-up climbs into the bend,
  // hill-corner cruises the high bend, corner-down descends out of it.
  // Connectivity mirrors the corner; only the height profile differs.
  'corner-up': ['north', 'east'],
  'hill-corner': ['north', 'east'],
  'corner-down': ['north', 'east'],
  // The Y-junction: stem on south, straight-through branch on north, curved
  // diverging branch on east (right of the through-road). Routing is the
  // switches module's job — connectivity just sees three open ends.
  switch: ['north', 'east', 'south'],
  // The mirror Y: stem south, straight north, diverging branch west (left of
  // the through-road). Same alternation as the right switch, mirrored.
  'switch-mirror': ['north', 'west', 'south'],
};

/** Rotate one edge clockwise by a 90° step count. */
function rotateEdge(edge: Edge, steps: number): Edge {
  const index = CANONICAL_EDGES.indexOf(edge);
  return CANONICAL_EDGES[(index + steps) % CANONICAL_EDGES.length] as Edge;
}

/**
 * The cell edges a piece joins at the given rotation, in canonical order.
 * Pure and total for every catalog piece and rotation.
 */
export function endpointsFor(type: PieceType, rotation: Rotation): Edge[] {
  const steps = rotation / 90;
  const joined = BASE_ENDPOINTS[type].map((edge) => rotateEdge(edge, steps));
  return CANONICAL_EDGES.filter((edge) => joined.includes(edge));
}
