/**
 * The track catalogue: asset URLs, model mounts, anchors and base yaw per
 * piece, plus the delight snow-cap node names. Data and pure helpers only —
 * no loader and no scene mutation, so adding a piece type is one table edit.
 */
import type { PieceType } from '../core/pieces';
import type { PlacedScenery, SceneryKind } from '../core/scenery';
import { type Edge, nextEdge, type PlacedPiece } from '../core/track-graph';

/** Toy snow-cap node names (windmill/carousel/balloon/music-box contracts). */
export const DELIGHT_CAPS = [
  'windmill_snow_cap',
  'carousel_snow_cap',
  'balloon_snow_cap',
  'musicbox_snow_cap',
];

/** Track pieces and scenery toys share one meadow renderer. */
export type MeadowItem = PlacedPiece | PlacedScenery;

/** Track kit model kinds (scenery kinds carry no base yaw — they are decor). */
export const BASE_YAW: Record<PieceType, number> = {
  straight: 0,
  corner: -Math.PI / 2,
  // 4-fold symmetric: every yaw looks identical, so rotation is a no-op.
  crossing: 0,
  // The crossing gate rides like the straight it mirrors; its road lies
  // across the rail at yaw 0 (north–south road ends east–west) — the
  // authored GLB carries the same frame as the straight, so no extra yaw.
  'crossing-gate': 0,
  // Placeholder until the trestle model lands (Phase 2): rides like a straight.
  bridge: 0,
  // The tunnel rides like the straight it mirrors; the dome is yaw-symmetric.
  tunnel: 0,
  // The hill run rides like the straight it mirrors: the climb direction is
  // baked into the authored GLBs (slope-up climbs south→north at yaw 0,
  // verified against the render check), so no extra base yaw applies.
  'slope-up': 0,
  hill: 0,
  'slope-down': 0,
  // The bump run rides like the straight it mirrors (half-height humps).
  'bump-up': 0,
  'hill-half': 0,
  'bump-down': 0,
  // The elevated corner run rides like the corner it mirrors (banked bend).
  'corner-up': -Math.PI / 2,
  'hill-corner': -Math.PI / 2,
  'corner-down': -Math.PI / 2,
  // The switch rides like the straight it mirrors in yaw: stem south,
  // straight north, diverge east at yaw 0 (pieces.ts) — the Y reads
  // correctly with no extra base yaw (verified in the render checks).
  // The mirror shares the yaw frame with diverge west; its mirrored GLB
  // rides the same mount. The three-way joins every edge and rides the
  // straight's frame too (its authored GLB keeps the same mount). The
  // double slip joins every edge as well and rides the straight's frame.
  switch: 0,
  'switch-mirror': 0,
  'switch-3way': 0,
  'switch-slip': 0,
};

export const baseYawOf = (kind: PieceType | SceneryKind): number =>
  kind in BASE_YAW ? BASE_YAW[kind as PieceType] : 0;

export const isPiece = (item: MeadowItem): item is PlacedPiece => 'type' in item;

/** The piece's endpoint labels, advanced by its yaw (the core convention). */
export const advancedEdge = (edge: Edge, steps: number): Edge => {
  let out = edge;
  for (let i = 0; i < steps; i++) out = nextEdge(out);
  return out;
};

/** Kit models are authored on a 4-unit module (straight length = corner diameter). */
export const KIT_MODULE_UNITS = 4;

/**
 * Model-space point per type that must sit on the cell centre, measured from
 * the kit GLBs: the straight's rail midpoint, and the corner's quarter-arc
 * centre (NOT its bounding-box centre — the arc must pivot on the cell so its
 * ends land on the north/east edge midpoints the track graph connects).
 * y is the model's underside (kit meshes are authored below the mat).
 */
export const KIT_ANCHORS: Record<PieceType, [number, number, number]> = {
  // Straight: midpoint of the 4-unit rail (ends at z=0 and z=4, centreline
  // x=0). Corner: the quarter-arc's centre, measured at (0, 2) in model
  // space — its ends sit north (0, 0) and east (2, 2) of that centre, so the
  // −90° base yaw below lands the centre on the cell's NE corner (the corner
  // shared by the north/east edges) with the ends on those edge midpoints.
  // Pivoting on the shared corner makes each end leave its edge
  // perpendicular — vertical at north, horizontal at east — collinear with
  // the neighbouring straights' rails and smooth across corner+corner
  // junctions (matching ride-motion).
  straight: [0, -1, 2],
  corner: [0, -1, 2],
  // The crossing centre (where the two rails intersect) sits at the same
  // model-space point as the straight's rail midpoint: x=0, underside y=−1,
  // mid-length z=2 — the cell centre the graph pivots rides around.
  crossing: [0, -1, 2],
  // The crossing gate: authored on the straight's mount (the rail half IS
  // the kit straight), so the same anchor lands the rails flush with
  // neighbours until the dedicated GLB replaces the placeholder.
  'crossing-gate': [0, -1, 2],
  // Placeholder until the trestle model lands (Phase 2): same anchor as the
  // straight it mirrors.
  bridge: [0, -1, 2],
  // The tunnel: same anchor as the straight it mirrors — the dome is authored
  // on the measured straight's mount, so rails meet neighbours flush.
  tunnel: [0, -1, 2],
  // The hill run: authored on the straight's mount (kit anchor convention —
  // the ride plane sits 0.1 above the origin's ground line), so rails meet
  // neighbours flush at grade and at the crest height H above it.
  'slope-up': [0, -1, 2],
  hill: [0, -1, 2],
  'slope-down': [0, -1, 2],
  // The bump run on the straight mount, the elevated corners on the corner mount.
  'bump-up': [0, -1, 2],
  'hill-half': [0, -1, 2],
  'bump-down': [0, -1, 2],
  'corner-up': [0, -1, 2],
  'hill-corner': [0, -1, 2],
  'corner-down': [0, -1, 2],
  // The switch: authored on the straight's mount (blender-switch.py —
  // through-road is the kit straight's own rails, diverge is the kit
  // corner's rails rotated onto the SE-pivot arc), so the same anchor
  // lands both roads' ends on their edge midpoints flush with neighbours.
  // The mirror shares the mount — its GLB (blender-switch-mirror.py) is
  // authored on the same straight mount with the diverge x-mirrored.
  // The three-way shares the family's mount too (one corner-small arc per
  // branch — blender-switch-3way.py), so the same anchor lands all three
  // roads' ends on their edge midpoints flush with neighbours.
  switch: [0, -1, 2],
  'switch-mirror': [0, -1, 2],
  'switch-3way': [0, -1, 2],
  // The double slip shares the family's straight mount (blender-switch-slip.py).
  'switch-slip': [0, -1, 2],
};

export const PIECE_URLS: Record<PieceType, string> = {
  straight: '/assets/train-kit/railroad-straight.glb',
  corner: '/assets/train-kit/railroad-corner-small.glb',
  crossing: '/assets/train-kit/railroad-crossing.glb',
  // The Blender-authored gate crossing: straight rails through a road strip,
  // crossbuck + swinging barrier arms + blinking lantern + winter snow cap.
  'crossing-gate': '/assets/train-kit/crossing-gate.glb',
  // Placeholder until the trestle model lands (Phase 2).
  bridge: '/assets/train-kit/railroad-straight.glb',
  // The Blender-authored dome: named nodes carry the portal arches and the
  // winter snow cap (toggled per piece in syncTunnelPortals / setTunnelSnow).
  tunnel: '/assets/train-kit/tunnel.glb',
  // Blender-authored on the kit's measurements (blender-hill-snow.py): the
  // kit's own straight-hill GLBs are bare rail ramps, so these carry the
  // kit straight's warped rails on grassy embankments riding elevation.ts.
  'slope-up': '/assets/train-kit/hill-slope-up.glb',
  hill: '/assets/train-kit/hill-hill.glb',
  'slope-down': '/assets/train-kit/hill-slope-down.glb',
  // Blender-authored little siblings (blender-hills-phase2.py): the same
  // kit-straight rails + embankment language at half height, plus banked
  // elevated corners carrying the kit corner-small's own arc.
  'bump-up': '/assets/train-kit/hill-bump-up.glb',
  'hill-half': '/assets/train-kit/hill-hill-half.glb',
  'bump-down': '/assets/train-kit/hill-bump-down.glb',
  'corner-up': '/assets/train-kit/hill-corner-up.glb',
  'hill-corner': '/assets/train-kit/hill-hill-corner.glb',
  'corner-down': '/assets/train-kit/hill-corner-down.glb',
  // Blender-authored Y-junction (blender-switch.py): kit straight rails
  // for the through-road + kit corner rails for the diverging road on the
  // kit mount, with a named `switch_blades` node the renderer flips.
  // The mirror loads its own mirrored GLB (blender-switch-mirror.py —
  // same mount, same blades contract, branch peeling west).
  switch: '/assets/train-kit/switch.glb',
  'switch-mirror': '/assets/train-kit/switch-mirror.glb',
  // Blender-authored three-way junction (blender-switch-3way.py): the kit
  // straight through-road + one corner-small arc per branch on the same
  // mount, with a named `switch_blades` node and a `switch_lever` the
  // renderer moves with the points (blades 0/±0.21, lever 0/±90°).
  'switch-3way': '/assets/train-kit/switch-3way.glb',
  'switch-slip': '/assets/train-kit/switch-slip.glb',
};

/**
 * The winter snow crowns (blender-hill-snow.py), authored on each hill
 * piece's mount: loaded separately and attached to their piece template as
 * a hidden child, toggled event-driven by setHillSnow on the shared frozen
 * gate (tunnel_snow_cap precedent).
 */
export const HILL_SNOW_URLS: Partial<Record<PieceType, string>> = {
  'slope-up': '/assets/train-kit/hill-snow-slope-up.glb',
  hill: '/assets/train-kit/hill-snow-hill.glb',
  'slope-down': '/assets/train-kit/hill-snow-slope-down.glb',
  // Hills Phase 2 crowns (blender-hills-phase2.py): proud where the piece's
  // own crest is high, so low bumps melt first like real snow.
  'bump-up': '/assets/train-kit/hill-snow-bump-up.glb',
  'hill-half': '/assets/train-kit/hill-snow-hill-half.glb',
  'bump-down': '/assets/train-kit/hill-snow-bump-down.glb',
  'corner-up': '/assets/train-kit/hill-snow-corner-up.glb',
  'hill-corner': '/assets/train-kit/hill-snow-hill-corner.glb',
  'corner-down': '/assets/train-kit/hill-snow-corner-down.glb',
};
