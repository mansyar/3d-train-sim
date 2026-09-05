import {
  Box3,
  BufferGeometry,
  Color,
  Group,
  Line,
  LineBasicMaterial,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  type PerspectiveCamera,
  Plane,
  Raycaster,
  type Scene,
  Vector2,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { AudioController } from '../audio/audio-controller';
import { MAX_DELIVERED_CRATES } from '../core/cargo';
import { advanceCrossing, type CrossingMotion, idleCrossing } from '../core/crossings';
import { PIECE_TYPES, type PieceType } from '../core/pieces';
import { isWater } from '../core/river';
import {
  type PlacedScenery,
  SCENERY_KINDS,
  type SceneryKind,
  sceneryCategory,
  sceneryFloats,
  sceneryLift,
  sceneryScale,
  sceneryUrl,
  sceneryVoice,
} from '../core/scenery';
import { isSwitchPiece, type SwitchPieceType } from '../core/switches';
import {
  type Cell,
  type Edge,
  MEADOW_CELLS,
  nextEdge,
  type PlacedPiece,
  type Rotation,
} from '../core/track-graph';
import { tunnelRunsOf } from '../core/tunnels';
import type { WorldStore } from '../state/world';
import { createTrestleTemplate } from './bridge-model';
import { type CritterMood, createCritterLife } from './critter-life';
import { disposeObject } from './dispose-object';
import { GROUND_SIZE } from './ground';
import { SURFACE_LIFT } from './river-water';
import { disableShadows, enableCastShadows } from './shadows';
import { attachWindowGlow } from './window-glow';

const CELL_SIZE = GROUND_SIZE / MEADOW_CELLS;

/** Track pieces and scenery toys share one meadow renderer. */
type MeadowItem = PlacedPiece | PlacedScenery;

/** Track kit model kinds (scenery kinds carry no base yaw — they are decor). */
const BASE_YAW: Record<PieceType, number> = {
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
  // rides the same mount.
  switch: 0,
  'switch-mirror': 0,
};

const baseYawOf = (kind: PieceType | SceneryKind): number =>
  kind in BASE_YAW ? BASE_YAW[kind as PieceType] : 0;

const isPiece = (item: MeadowItem): item is PlacedPiece => 'type' in item;

/** Kit models are authored on a 4-unit module (straight length = corner diameter). */
const KIT_MODULE_UNITS = 4;

/**
 * Model-space point per type that must sit on the cell centre, measured from
 * the kit GLBs: the straight's rail midpoint, and the corner's quarter-arc
 * centre (NOT its bounding-box centre — the arc must pivot on the cell so its
 * ends land on the north/east edge midpoints the track graph connects).
 * y is the model's underside (kit meshes are authored below the mat).
 */
const KIT_ANCHORS: Record<PieceType, [number, number, number]> = {
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
  switch: [0, -1, 2],
  'switch-mirror': [0, -1, 2],
};

const PIECE_URLS: Record<PieceType, string> = {
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
};

/**
 * The winter snow crowns (blender-hill-snow.py), authored on each hill
 * piece's mount: loaded separately and attached to their piece template as
 * a hidden child, toggled event-driven by setHillSnow on the shared frozen
 * gate (tunnel_snow_cap precedent).
 */
const HILL_SNOW_URLS: Partial<Record<PieceType, string>> = {
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

/** The world-space center of a meadow cell (grid north is -Z). */
export function cellToWorld(cell: Cell): { x: number; z: number } {
  return {
    x: -GROUND_SIZE / 2 + (cell.x + 0.5) * CELL_SIZE,
    z: -GROUND_SIZE / 2 + (cell.y + 0.5) * CELL_SIZE,
  };
}

/** Screen-space center of a meadow cell, or null when it is off-camera. */
export function cellToScreen(
  cell: Cell,
  camera: PerspectiveCamera,
  canvas: HTMLCanvasElement,
): { x: number; y: number } | null {
  // The projection depends on fresh camera matrices, which the render loop
  // does not refresh when the camera is not a scene child — ask first.
  camera.updateMatrixWorld();
  const { x, z } = cellToWorld(cell);
  const ndc = new Vector3(x, 0, z).project(camera);
  // The meadow sits near this camera's far plane, so its NDC z hovers around
  // 1 — only a non-finite projection, or a point outside the view frustum,
  // means the cell is not usable on screen.
  if (
    !Number.isFinite(ndc.x) ||
    !Number.isFinite(ndc.y) ||
    ndc.x < -1.2 ||
    ndc.x > 1.2 ||
    ndc.y < -1.2 ||
    ndc.y > 1.2
  ) {
    return null;
  }
  return {
    x: ((ndc.x + 1) / 2) * canvas.clientWidth,
    y: ((1 - ndc.y) / 2) * canvas.clientHeight,
  };
}

/** A placed track piece or scenery toy found under the pointer, for
 * relocate/remove drags. The kind discriminator tells the UI which store
 * mutation to apply on drop. */
export type PickedItem =
  | { kind: 'piece'; id: string; type: PieceType; rotation: Rotation; cell: Cell }
  | { kind: 'scenery'; id: string; scenery: SceneryKind; rotation: Rotation; cell: Cell };

export interface TrackRenderer {
  dispose(): void;
  /** Advance critter idle sway/hops; the train position triggers hops.
   *  `mood` (optional) dampens hops in rain and silences them at night. */
  updateCritters(
    dt: number,
    trainX: number | null,
    trainZ: number | null,
    mood?: CritterMood,
  ): void;
  /** Trigger a hop on the critter with this voice (idle chirp dance). */
  hopCritter(voice: string): void;
  /** Begin a drag preview: the real model follows the pointer, grid-snapped. */
  beginGhost(kind: PieceType | SceneryKind): void;
  /** Snap the ghost to a cell (null hides it off-meadow); tint by validity. */
  moveGhost(cell: Cell | null, rotation: Rotation, valid: boolean): void;
  /** Drop the preview ghost and release its per-drag materials. */
  endGhost(): void;
  /** Show/hide the hill run's winter snow crowns (event-driven, change-gated). */
  setHillSnow(visible: boolean): void;
  /** The meadow cell under a screen point, or null off-meadow. */
  cellFromPoint(clientX: number, clientY: number): Cell | null;
  /** The screen-space center of a meadow cell, or null when off-camera. */
  cellToScreen(cell: Cell): { x: number; y: number } | null;
  /** The placed meadow item whose cell is under a screen point, for relocate/return drags. */
  pickPiece(clientX: number, clientY: number): PickedItem | null;
  /** Hide/show a placed clone (e.g. while its own drag ghost stands in). */
  setPieceVisible(id: string, visible: boolean): void;
  /** Debug aid: show the meadow's snap-cell boundaries. */
  setGridVisible(visible: boolean): void;
  /** Winter tell: show/hide the tunnel domes' snow caps (event-driven). */
  setTunnelSnow(visible: boolean): void;
  /** Flip a switch's point blades to the chosen road (event-driven). */
  setSwitchRoad(pieceId: string, exit: Edge): void;
  /** Advance every crossing gate toward the trains; poses the arms, lantern,
   *  and bell ask. `trains` are riding trains' world-space spots, `night` the
   *  0..1 night factor (idle lanterns glow softly after dusk). */
  updateCrossings(dt: number, trains: ReadonlyArray<{ x: number; z: number }>, night: number): void;
  /** Winter tell: show/hide the crossing's snow cap (event-driven). */
  setCrossingSnow(visible: boolean): void;

  /** Debug aid: every placed crossing's live phase ('idle'|'closing'|
   *  'active'|'lifting'), for e2e witnesses. */
  crossingPhases(): string[];
  /** Debug aid: whether the crossing bell edge is ringing right now. */
  bellRinging(): boolean;
}

/** Renders one cloned model per placed piece, kept in sync with the store. */
export function startTrackRenderer(
  scene: Scene,
  camera: PerspectiveCamera,
  canvas: HTMLCanvasElement,
  world: WorldStore,
  audio: AudioController,
): TrackRenderer {
  const templates = new Map<PieceType | SceneryKind, Object3D>();
  const rendered = new Map<string, Object3D>();
  /** Meadow records by id, mirroring the store for picking. */
  const tracked = new Map<string, MeadowItem>();
  /** Placed critter ids with live idle/hop animation (see critter-life). */
  const animatedCritters = new Set<string>();
  const critterLife = createCritterLife((voice) => audio.chirp(voice));
  const loader = new GLTFLoader();
  const raycaster = new Raycaster();
  const pointerNdc = new Vector2();
  const groundPlane = new Plane(new Vector3(0, 1, 0), 0);
  const groundHit = new Vector3();
  let disposed = false;

  // Removed toys pop away softly instead of vanishing — celebration, never
  // punishment. Reduced-motion users keep the instant removal they had.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const POP_MS = 320;
  const pops: Array<{ model: Object3D; start: number }> = [];
  let popRaf: number | null = null;

  const runPops = (now: number): void => {
    for (let i = pops.length - 1; i >= 0; i--) {
      const pop = pops[i] as { model: Object3D; start: number };
      const t = (now - pop.start) / POP_MS;
      if (t >= 1) {
        scene.remove(pop.model);
        pops.splice(i, 1);
      } else {
        pop.model.scale.setScalar(Math.max(1 - t, 0.001));
      }
    }
    popRaf = pops.length > 0 ? requestAnimationFrame(runPops) : null;
  };

  const popOut = (model: Object3D): void => {
    if (reducedMotion || disposed) {
      scene.remove(model);
      return;
    }
    pops.push({ model, start: performance.now() });
    if (popRaf === null) popRaf = requestAnimationFrame(runPops);
  };

  function apply(item: MeadowItem): void {
    const kind = isPiece(item) ? item.type : item.kind;
    const template = templates.get(kind);
    if (!template) return; // Asset not ready (or unavailable) — item stays tracked.
    const yaw = -(item.rotation * Math.PI) / 180 + baseYawOf(kind);
    const { x, z } = cellToWorld(item.cell);
    let model = rendered.get(item.id);
    // Whole-world swaps (preset gallery, snapshot restores) reuse ids across
    // kinds — a clone of another kind must leave, never just move and re-yaw.
    if (model && model.userData.renderedKind !== kind) {
      scene.remove(model);
      rendered.delete(item.id);
      bladeTweens.delete(item.id);
      crossingParts.delete(item.id);
      crossingMotions.delete(item.id);
      model = undefined;
    }
    if (!model) {
      model = template.clone(true);
      model.userData.renderedKind = kind;
      scene.add(model);
      rendered.set(item.id, model);
      if (kind === 'crossing-gate') trackCrossing(item.id, model);
    }
    model.position.set(x, 0, z);
    model.rotation.y = yaw;
    if (!isPiece(item) && sceneryFloats(item.kind)) {
      // The floating toy's GLB origin is its underside: on water cells the
      // pad rests on the river surface; on land it sits on the play mat.
      const inner = model.children[0];
      if (inner) {
        inner.position.y = isWater(item.cell) ? SURFACE_LIFT : sceneryLift(item.kind);
      }
    }
  }

  function reconcile(): void {
    const wanted = new Map<string, MeadowItem>();
    for (const piece of world.pieces()) wanted.set(piece.id, piece);
    for (const item of world.scenery()) wanted.set(item.id, item);
    for (const [id, model] of rendered) {
      if (!wanted.has(id)) {
        popOut(model); // A soft scale-down pop, then the mesh leaves the scene.
        rendered.delete(id);
        crossingParts.delete(id);
        crossingMotions.delete(id);
      }
    }
    tracked.clear();
    for (const item of wanted.values()) {
      tracked.set(item.id, item);
      apply(item);
    }
    syncCritterAnimations(wanted);
    syncTunnelPortals(world.pieces());
    syncStationCrates(world.scenery(), (id) => world.deliveryCount(id));
  }

  /** The piece's endpoint labels, advanced by its yaw (the core convention). */
  const advancedEdge = (edge: Edge, steps: number): Edge => {
    let out = edge;
    for (let i = 0; i < steps; i++) out = nextEdge(out);
    return out;
  };

  /**
   * Portal arches render only where the hill meets open air — merged seams
   * (two tunnels riding end-to-end) stay wall-less so the run reads as one
   * continuous hill. Seam data is core logic (tunnelRunsOf); this is the
   * node toggling. Event-driven: runs on reconcile, never per frame.
   */
  function syncTunnelPortals(pieces: readonly PlacedPiece[]): void {
    for (const run of tunnelRunsOf(pieces)) {
      const piece = pieces.find((p) => p.id === run.pieceId);
      const model = rendered.get(run.pieceId);
      if (!piece || !model) continue;
      const steps = piece.rotation / 90;
      const entry = model.getObjectByName('tunnel_portal_entry');
      if (entry) entry.visible = !run.mergedPortals.includes(advancedEdge('north', steps));
      const exit = model.getObjectByName('tunnel_portal_exit');
      if (exit) exit.visible = !run.mergedPortals.includes(advancedEdge('south', steps));
    }
  }

  /**
   * Delivered crates: each station's platform slots fill up to its
   * persisted delivery count. Event-driven — runs on reconcile (world
   * subscribe), never per frame.
   */
  function syncStationCrates(
    scenery: readonly PlacedScenery[],
    deliveryCount: (id: string) => number,
  ): void {
    for (const item of scenery) {
      if (item.kind !== 'station') continue;
      const model = rendered.get(item.id);
      if (!model) continue;
      const count = deliveryCount(item.id);
      for (let i = 1; i <= MAX_DELIVERED_CRATES; i += 1) {
        const slot = model.getObjectByName(`station_crate_${i}`);
        if (slot) slot.visible = i <= count;
      }
    }
  }

  /**
   * Point blades flip to the road the train will take: 0 (through) or
   * ±0.21 rad (diverge — negative tips east on the right switch, positive
   * tips west on the mirror) about the blades node's local Y — the Blender
   * +z angle from blender-switch.py arrives as glTF +y via export_yup
   * (verified: -0.21 in the render checks reads as diverge). Stem merges
   * (world exit = stem) keep the last branch — only stem entries
   * alternate, so only north/diverge-model exits move the blades.
   * Event-driven (ride-motion onSwitchRoad): a short ease-out tween,
   * instant snap under prefers-reduced-motion, no per-frame cost outside
   * the tween.
   */
  const BLADE_THROUGH_Y = 0;
  const BLADE_DIVERGE_Y: Record<SwitchPieceType, number> = {
    switch: -0.21,
    'switch-mirror': 0.21,
  };
  const BLADE_TWEEN_MS = 180;
  const bladeTweens = new Map<
    string,
    { node: Object3D; from: number; to: number; start: number }
  >();
  let bladeRaf: number | null = null;

  const runBladeTweens = (now: number): void => {
    for (const [id, tween] of [...bladeTweens]) {
      const t = (now - tween.start) / BLADE_TWEEN_MS;
      if (t >= 1) {
        tween.node.rotation.y = tween.to;
        bladeTweens.delete(id);
      } else {
        const eased = 1 - (1 - t) * (1 - t) * (1 - t);
        tween.node.rotation.y = tween.from + (tween.to - tween.from) * eased;
      }
    }
    bladeRaf = bladeTweens.size > 0 ? requestAnimationFrame(runBladeTweens) : null;
  };

  function setSwitchRoad(pieceId: string, exit: Edge): void {
    const item = tracked.get(pieceId);
    if (!item || !isPiece(item) || !isSwitchPiece(item.type)) return;
    const model = rendered.get(pieceId);
    if (!model) return;
    const blades = model.getObjectByName('switch_blades');
    if (!blades) return;
    // World exit -> model exit (yaw 0 frame): model north = through,
    // model east = diverge on the right switch, model west = diverge on
    // the mirror. Invert the yaw advance applied at mount.
    const steps = item.rotation / 90;
    const modelExit = advancedEdge(exit, (4 - steps) % 4);
    const divergeEdge = item.type === 'switch' ? 'east' : 'west';
    const target =
      modelExit === 'north'
        ? BLADE_THROUGH_Y
        : modelExit === divergeEdge
          ? BLADE_DIVERGE_Y[item.type]
          : null;
    if (target === null) return; // a branch→stem merge keeps the last branch
    if (Math.abs(blades.rotation.y - target) < 1e-4 && !bladeTweens.has(pieceId)) return;
    if (reducedMotion || disposed) {
      blades.rotation.y = target;
      bladeTweens.delete(pieceId);
      return;
    }
    bladeTweens.set(pieceId, {
      node: blades,
      from: blades.rotation.y,
      to: target,
      start: performance.now(),
    });
    if (bladeRaf === null) bladeRaf = requestAnimationFrame(runBladeTweens);
  }

  /** Keeps the critter animator's roster matched to the placed critters. */
  function syncCritterAnimations(wanted: Map<string, MeadowItem>): void {
    const next = new Set<string>();
    for (const [id, item] of wanted) {
      if (!isPiece(item) && sceneryCategory(item.kind) === 'critter') next.add(id);
    }
    for (const id of next) {
      if (animatedCritters.has(id)) continue;
      const model = rendered.get(id);
      const item = wanted.get(id);
      if (model && item && !isPiece(item)) {
        critterLife.track(model, id, sceneryVoice(item.kind) ?? undefined);
        animatedCritters.add(id);
      }
    }
    for (const id of animatedCritters) {
      if (!next.has(id)) {
        critterLife.forget(id);
        animatedCritters.delete(id);
      }
    }
  }

  const unsubscribe = world.subscribe(() => reconcile());

  // ---- Meadow grid: a debug overlay of the snap-cell boundaries -----------
  // One cell = CELL_SIZE world units starting at the meadow's north-west
  // corner, so the lines land exactly on the lattice pieces snap to.
  const gridLines = new Group();
  gridLines.visible = false;
  const gridMaterial = new LineBasicMaterial({
    color: 0x2d5a2d,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const gridGeometries: BufferGeometry[] = [];
  {
    const half = GROUND_SIZE / 2;
    for (let i = 0; i <= MEADOW_CELLS; i += 1) {
      const t = -half + i * CELL_SIZE;
      const westEast = new BufferGeometry().setFromPoints([
        new Vector3(-half, 0.05, t),
        new Vector3(half, 0.05, t),
      ]);
      const northSouth = new BufferGeometry().setFromPoints([
        new Vector3(t, 0.05, -half),
        new Vector3(t, 0.05, half),
      ]);
      gridGeometries.push(westEast, northSouth);
      gridLines.add(new Line(westEast, gridMaterial), new Line(northSouth, gridMaterial));
    }
  }
  scene.add(gridLines);

  // ---- Drag ghost: a translucent clone of the real template --------------
  let ghost: Object3D | null = null;
  let ghostType: PieceType | SceneryKind | null = null;
  const ghostTint = new Color();
  const TINT_VALID = new Color(1, 0.75, 0.35); // Warm amber glow while placeable.
  const TINT_BLOCKED = new Color(0.5, 0.5, 0.5); // Desaturated while blocked.

  const ghostMaterials = (model: Object3D): MeshStandardMaterial[] => {
    const found: MeshStandardMaterial[] = [];
    model.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) found.push(mat as MeshStandardMaterial);
    });
    return found;
  };

  const spawnGhost = (): void => {
    if (!ghostType) return;
    const template = templates.get(ghostType);
    if (!template) return; // Asset not loaded yet — retried on the next move.
    const model = template.clone(true);
    // Ghosts never cast or receive shadows — they are previews, not toys —
    // and clone(true) copies the shared template's casting flag.
    disableShadows(model);
    // Clone materials per ghost so tint/dispose never touch the shared
    // template materials (three.js clones share material references).
    model.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((mat) => mat.clone())
        : mesh.material.clone();
    });
    for (const mat of ghostMaterials(model)) {
      mat.transparent = true;
      mat.depthWrite = false;
      mat.userData.baseColor = mat.color.clone();
    }
    model.visible = false;
    scene.add(model);
    ghost = model;
  };

  const tintGhost = (valid: boolean): void => {
    if (!ghost) return;
    ghostTint.copy(valid ? TINT_VALID : TINT_BLOCKED);
    for (const mat of ghostMaterials(ghost)) {
      const base = mat.userData.baseColor as Color | undefined;
      if (base) mat.color.copy(base).multiply(ghostTint);
      mat.opacity = valid ? 0.8 : 0.35;
    }
  };

  function beginGhost(kind: PieceType | SceneryKind): void {
    endGhost();
    ghostType = kind;
    spawnGhost();
  }

  function moveGhost(cell: Cell | null, rotation: Rotation, valid: boolean): void {
    if (!ghostType) return;
    if (!ghost) spawnGhost();
    if (!ghost) return;
    if (!cell) {
      ghost.visible = false;
      return;
    }
    const yaw = -(rotation * Math.PI) / 180 + baseYawOf(ghostType);
    const { x, z } = cellToWorld(cell);
    ghost.position.set(x, 0, z);
    ghost.rotation.y = yaw;
    ghost.visible = true;
    tintGhost(valid);
  }

  function endGhost(): void {
    ghostType = null;
    if (!ghost) return;
    scene.remove(ghost);
    for (const mat of ghostMaterials(ghost)) mat.dispose(); // Clones share geometry.
    ghost = null;
  }

  /** The meadow cell under a screen point, or null off-meadow. */
  function cellFromPoint(clientX: number, clientY: number): Cell | null {
    const rect = canvas.getBoundingClientRect();
    pointerNdc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointerNdc, camera);
    const hit = raycaster.ray.intersectPlane(groundPlane, groundHit);
    if (!hit) return null;
    const x = Math.floor((hit.x + GROUND_SIZE / 2) / CELL_SIZE);
    const y = Math.floor((hit.z + GROUND_SIZE / 2) / CELL_SIZE);
    if (x < 0 || x >= MEADOW_CELLS || y < 0 || y >= MEADOW_CELLS) return null;
    return { x, y };
  }

  /**
   * The placed meadow item (piece or scenery) whose cell is under a screen
   * point. The store keeps at most one toy per cell, so the cell itself is
   * the tap target — far more forgiving for small fingers than raycasting
   * thin rail geometry.
   */
  function pickPiece(clientX: number, clientY: number): PickedItem | null {
    const cell = cellFromPoint(clientX, clientY);
    if (!cell) return null;
    for (const item of tracked.values()) {
      if (item.cell.x === cell.x && item.cell.y === cell.y) {
        if (isPiece(item)) {
          return {
            kind: 'piece',
            id: item.id,
            type: item.type,
            rotation: item.rotation,
            cell: item.cell,
          };
        }
        return {
          kind: 'scenery',
          id: item.id,
          scenery: item.kind,
          rotation: item.rotation,
          cell: item.cell,
        };
      }
    }
    return null;
  }

  function setPieceVisible(id: string, visible: boolean): void {
    const model = rendered.get(id);
    if (model) model.visible = visible;
  }

  function setGridVisible(visible: boolean): void {
    gridLines.visible = visible;
  }

  let tunnelSnow = false;
  // ── Railway crossing gates ──────────────────────────────────────────────
  // The Phase 1 core machine (advanceCrossing) owns each gate's phase; this
  // layer only poses the arm pivots, the lantern glow, and the bell ask.
  // Cost is a few transforms + emissive writes per frame while a gate is
  // awake — no allocations, no rAF of its own.

  const GATE_OPEN_Y = Math.PI / 2; // The authored open pose arrives as +y via export_yup.
  const CROSSING_BLINK_HZ = 2; // Classic alternating warn blink.
  const CROSSING_ACTIVE_GLOW = 3;
  const CROSSING_IDLE_BLINK_HZ = 0.8; // A slow night-light waltz.
  const CROSSING_IDLE_GLOW = 0.9;
  const CROSSING_NIGHT_THRESHOLD = 0.35;
  const CROSSING_SQUASH = 0.3; // Arms flatten mid-swing, spring back at rest.
  const CROSSING_STRETCH = 0.14;
  const easeOut = (t: number): number => 1 - (1 - t) * (1 - t) * (1 - t);

  let crossingSnow = false;
  let crossingBell = false;
  /** Runtime gate state per crossing — derived from the trains, never saved. */
  const crossingMotions = new Map<string, CrossingMotion>();
  /** Cached pose targets + per-clone lamp materials, so each gate's lantern
   *  blinks alone (placed clones share template materials otherwise). */
  const crossingParts = new Map<
    string,
    {
      east: Object3D | null;
      west: Object3D | null;
      lampA: MeshStandardMaterial | null;
      lampB: MeshStandardMaterial | null;
    }
  >();

  /** Cache a crossing clone's arm pivots and give it its own lamp materials. */
  function trackCrossing(id: string, model: Object3D): void {
    const east = model.getObjectByName('crossing_gate_east') ?? null;
    const west = model.getObjectByName('crossing_gate_west') ?? null;
    let lampA: MeshStandardMaterial | null = null;
    let lampB: MeshStandardMaterial | null = null;
    model.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      const slots = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (let i = 0; i < slots.length; i++) {
        const material = slots[i] as MeshStandardMaterial;
        if (material.name !== 'crossing_lamp_0' && material.name !== 'crossing_lamp_1') continue;
        const glow = material.clone();
        glow.emissive.setRGB(0.9, 0.08, 0.05); // Red warn light, dark until told.
        glow.emissiveIntensity = 0;
        if (material.name === 'crossing_lamp_0') lampA = glow;
        else lampB = glow;
        if (Array.isArray(mesh.material)) mesh.material[i] = glow;
        else mesh.material = glow;
      }
    });
    crossingParts.set(id, { east, west, lampA, lampB });
  }

  /** Scratch cell-space train spots — filled per frame, never reallocated. */
  const trainPool: Array<{ x: number; y: number }> = [];
  const trainView: Array<{ x: number; y: number }> = [];

  function updateCrossings(
    dt: number,
    trains: ReadonlyArray<{ x: number; z: number }>,
    night: number,
  ): void {
    if (disposed) return;
    // Trains ride in world units; the core reasons in cell space.
    trainView.length = trains.length;
    for (let i = 0; i < trains.length; i++) {
      const spot = trains[i];
      if (!spot) continue;
      let cell = trainPool[i];
      if (!cell) {
        cell = { x: 0, y: 0 };
        trainPool[i] = cell;
      }
      cell.x = (spot.x + GROUND_SIZE / 2) / CELL_SIZE - 0.5;
      cell.y = (spot.z + GROUND_SIZE / 2) / CELL_SIZE - 0.5;
      trainView[i] = cell;
    }
    const seconds = performance.now() / 1000;
    const beat = Math.floor(seconds * CROSSING_BLINK_HZ * 2) % 2 === 0;
    const breathe = 0.5 + 0.5 * Math.sin(seconds * Math.PI * 2 * CROSSING_IDLE_BLINK_HZ);
    const idleGlow = night > CROSSING_NIGHT_THRESHOLD ? CROSSING_IDLE_GLOW * breathe * night : 0;
    let anyAwake = false;
    for (const [id, item] of tracked) {
      if (!isPiece(item) || item.type !== 'crossing-gate') continue;
      const model = rendered.get(id);
      const parts = crossingParts.get(id);
      if (!model || !parts) continue;
      let motion = crossingMotions.get(id);
      if (!motion) {
        motion = idleCrossing();
        crossingMotions.set(id, motion);
      }
      advanceCrossing(motion, item.cell, trainView, dt, motion);
      if (motion.phase !== 'idle') anyAwake = true;
      // Arm swing: 1 = up, 0 = down. Closing descends 1 → 0, lifting rises
      // 0 → 1, both with the blades' gentle ease-out. The squash-and-stretch
      // bump peaks mid-swing. Reduced motion snaps the pose, no wobble.
      let open: number;
      if (motion.phase === 'closing') open = 1 - easeOut(motion.progress);
      else if (motion.phase === 'lifting') open = easeOut(motion.progress);
      else open = motion.phase === 'active' ? 0 : 1;
      let bump = Math.sin(Math.PI * open);
      if (reducedMotion) {
        open = motion.phase === 'active' || motion.phase === 'closing' ? 0 : 1;
        bump = 0;
      }
      const stretch = 1 + CROSSING_STRETCH * bump;
      const squash = 1 - CROSSING_SQUASH * bump;
      if (parts.east) {
        parts.east.rotation.y = -GATE_OPEN_Y * open;
        parts.east.scale.set(stretch, squash, stretch);
      }
      if (parts.west) {
        parts.west.rotation.y = GATE_OPEN_Y * open;
        parts.west.scale.set(stretch, squash, stretch);
      }
      // Lantern: hard alternating blink while awake (any time of day); a
      // soft paired night-light while it rests after dusk. Reduced motion
      // swaps the 2 Hz strobe for a steady warn glow on both lamps.
      const awake = motion.phase !== 'idle';
      const blinkA = beat ? CROSSING_ACTIVE_GLOW : 0;
      const blinkB = beat ? 0 : CROSSING_ACTIVE_GLOW;
      const glowA = awake ? (reducedMotion ? CROSSING_ACTIVE_GLOW : blinkA) : idleGlow;
      const glowB = awake ? (reducedMotion ? CROSSING_ACTIVE_GLOW : blinkB) : idleGlow;
      if (parts.lampA) parts.lampA.emissiveIntensity = glowA;
      if (parts.lampB) parts.lampB.emissiveIntensity = glowB;
    }
    // The bell rings while any gate is awake and eases off when the last
    // one rests — audio is change-gated, so only edges nudge it.
    if (anyAwake !== crossingBell) {
      crossingBell = anyAwake;
      audio.setCrossingBell(anyAwake);
    }
  }

  /** Winter tell: the crossing wears a snow cap like the tunnel domes. */
  function setCrossingSnow(visible: boolean): void {
    if (visible === crossingSnow) return;
    crossingSnow = visible;
    const setCap = (model: Object3D): void => {
      const cap = model.getObjectByName('crossing_snow_cap');
      if (cap) cap.visible = visible;
    };
    const template = templates.get('crossing-gate');
    if (template) setCap(template);
    for (const [id, model] of rendered) {
      const item = tracked.get(id);
      if (item && isPiece(item) && item.type === 'crossing-gate') setCap(model);
    }
  }

  function setTunnelSnow(visible: boolean): void {
    if (visible === tunnelSnow) return;
    tunnelSnow = visible;
    const setCap = (model: Object3D): void => {
      const cap = model.getObjectByName('tunnel_snow_cap');
      if (cap) cap.visible = visible;
    };
    const template = templates.get('tunnel');
    if (template) setCap(template);
    for (const [id, model] of rendered) {
      const item = tracked.get(id);
      if (item && isPiece(item) && item.type === 'tunnel') setCap(model);
    }
  }

  let hillSnow = false;
  /** Loaded snow-crown scenes keyed by hill type (clones share geometry). */
  const hillSnowShells: Partial<Record<PieceType, Object3D>> = {};

  /** Attaches a hill's snow crown hidden-unless-snow-already-settled. */
  function attachHillSnow(model: Object3D, type: PieceType): void {
    const shell = hillSnowShells[type];
    if (!shell) return;
    const crown = shell.clone(true);
    crown.visible = hillSnow;
    enableCastShadows(crown);
    model.add(crown);
  }

  /** Winter crowns on the hill run — the tunnel snow cap's sibling toggle. */
  function setHillSnow(visible: boolean): void {
    if (visible === hillSnow) return;
    hillSnow = visible;
    for (const type of Object.keys(HILL_SNOW_URLS) as PieceType[]) {
      const setCrown = (model: Object3D): void => {
        // Blender node names use underscores (hill_snow_slope_up), but the
        // piece types spell them with hyphens (slope-up) — normalize, or the
        // crown lookup silently misses and winter never shows on ramps.
        const crown = model.getObjectByName(`hill_snow_${type.replaceAll('-', '_')}`);
        if (crown) crown.visible = visible;
      };
      const template = templates.get(type);
      if (template) setCrown(template);
      for (const [id, model] of rendered) {
        const item = tracked.get(id);
        if (item && isPiece(item) && item.type === type) setCrown(model);
      }
    }
  }

  for (const type of PIECE_TYPES) {
    if (type === 'bridge') continue; // The trestle is procedural — built from the measured straight below.
    loader.load(
      PIECE_URLS[type],
      (gltf) => {
        if (disposed) {
          // Tore down before the asset arrived — release its GPU resources.
          disposeObject(gltf.scene);
          return;
        }
        // Scale the 4-unit kit module to the cell grid and anchor the model
        // so its open ends land on the cell-edge midpoints the graph joins.
        const scale = CELL_SIZE / KIT_MODULE_UNITS;
        const [ax, ay, az] = KIT_ANCHORS[type];
        gltf.scene.scale.setScalar(scale);
        gltf.scene.position.set(-scale * ax, -scale * ay, -scale * az);
        const model = new Group();
        model.add(gltf.scene);
        // Templates cast; every placed clone inherits the flag (shadows.ts).
        enableCastShadows(model);
        if (type === 'tunnel') {
          // The snow cap is a winter-only tell — hidden unless snow already
          // settled while the asset was in flight (setTunnelSnow is
          // change-driven, so the template must honor the live state).
          // Clones inherit the template's state.
          const cap = model.getObjectByName('tunnel_snow_cap');
          if (cap) cap.visible = tunnelSnow;
        }
        if (type === 'crossing-gate') {
          // The snow cap is a winter-only tell — hidden unless snow already
          // settled while the asset was in flight (setCrossingSnow is
          // change-driven, so the template must honor the live state).
          const cap = model.getObjectByName('crossing_snow_cap');
          if (cap) cap.visible = crossingSnow;
        }
        if (type in HILL_SNOW_URLS) {
          // The crown may have landed before its piece template did.
          attachHillSnow(model, type);
        }
        if (type === 'straight') {
          // The trestle rides at the straight's measured rail height and
          // matches its track width — trains cross bridges exactly as high
          // and flush as they cross every other piece.
          const measured = new Box3().setFromObject(model);
          templates.set(
            'bridge',
            createTrestleTemplate({
              cellSize: CELL_SIZE,
              railTop: Math.max(measured.max.y, 0.08),
              width: Math.max((measured.max.x - measured.min.x) * 0.9, 0.5),
            }),
          );
        }
        templates.set(type, model);
        reconcile(); // Render items placed before the asset arrived.
      },
      undefined,
      () => {
        // Asset unavailable — the world keeps working, models stay absent.
      },
    );
  }

  // Hill snow crowns load separately from their pieces: authored on the
  // same mount, so the piece's scale/anchor applies verbatim.
  for (const type of Object.keys(HILL_SNOW_URLS) as PieceType[]) {
    loader.load(
      HILL_SNOW_URLS[type] as string,
      (gltf) => {
        if (disposed) {
          disposeObject(gltf.scene);
          return;
        }
        const scale = CELL_SIZE / KIT_MODULE_UNITS;
        const [ax, ay, az] = KIT_ANCHORS[type];
        gltf.scene.scale.setScalar(scale);
        gltf.scene.position.set(-scale * ax, -scale * ay, -scale * az);
        hillSnowShells[type] = gltf.scene;
        // The template passes the crown to every future placement; hills
        // already on the meadow get theirs directly (asset race, and the
        // winter state at load time).
        const template = templates.get(type);
        if (template) attachHillSnow(template, type);
        for (const [id, model] of rendered) {
          const item = tracked.get(id);
          if (item && isPiece(item) && item.type === type) attachHillSnow(model, type);
        }
      },
      undefined,
      () => {
        // Asset unavailable — the world keeps working, models stay absent.
      },
    );
  }

  // Scenery templates: authored with 1 unit ≈ 1 cell, so the catalog
  // multiplier tunes each kind to toy-table size; the ground lift is baked
  // into the template so every clone inherits it.
  for (const kind of SCENERY_KINDS) {
    loader.load(
      sceneryUrl(kind),
      (gltf) => {
        if (disposed) {
          disposeObject(gltf.scene);
          return;
        }
        gltf.scene.scale.setScalar(CELL_SIZE * sceneryScale(kind));
        gltf.scene.position.set(0, sceneryLift(kind), 0);
        const model = new Group();
        model.add(gltf.scene);
        // Templates cast; every placed clone inherits the flag (shadows.ts).
        enableCastShadows(model);
        if (kind === 'station') {
          // Crate slots are delivery-earned — a fresh station (and its drag
          // ghost) shows an empty platform; reconcile fills the earned ones.
          for (let i = 1; i <= MAX_DELIVERED_CRATES; i += 1) {
            const slot = model.getObjectByName(`station_crate_${i}`);
            if (slot) slot.visible = false;
          }
        }
        // Buildings get a warm "windows lit" glow, driven by the night factor.
        attachWindowGlow(model, kind);
        templates.set(kind, model);
        reconcile();
      },
      undefined,
      () => {
        // Asset unavailable — the world keeps working, models stay absent.
      },
    );
  }

  return {
    cellFromPoint,
    cellToScreen: (cell) => cellToScreen(cell, camera, canvas),
    updateCritters(dt, trainX, trainZ, mood): void {
      if (disposed) return;
      critterLife.update(dt, trainX, trainZ, mood);
    },
    hopCritter(voice): void {
      if (disposed) return;
      critterLife.hopByVoice(voice);
    },
    beginGhost,
    moveGhost,
    endGhost,
    pickPiece,
    setPieceVisible,
    setGridVisible,
    setTunnelSnow,
    setHillSnow,
    setSwitchRoad,
    updateCrossings,
    setCrossingSnow,
    // Dev/e2e witnesses: live crossing phases and the bell edge state.
    crossingPhases: () =>
      [...tracked.values()]
        .filter((item) => isPiece(item) && item.type === 'crossing-gate')
        .map((item) => crossingMotions.get(item.id)?.phase ?? 'idle'),
    bellRinging: () => crossingBell,
    dispose(): void {
      disposed = true;
      unsubscribe();
      endGhost();
      if (popRaf !== null) cancelAnimationFrame(popRaf);
      popRaf = null;
      if (bladeRaf !== null) cancelAnimationFrame(bladeRaf);
      bladeRaf = null;
      bladeTweens.clear();
      crossingMotions.clear();
      crossingParts.clear();
      for (const pop of pops) scene.remove(pop.model);
      pops.length = 0;
      for (const model of rendered.values()) scene.remove(model);
      rendered.clear();
      tracked.clear();
      for (const template of templates.values()) disposeObject(template);
      templates.clear();
      for (const shell of Object.values(hillSnowShells)) {
        if (shell) disposeObject(shell); // Attached clones share geometry — idempotent.
      }
      for (const type of Object.keys(hillSnowShells) as PieceType[]) delete hillSnowShells[type];
      critterLife.dispose();
      animatedCritters.clear();
      scene.remove(gridLines);
      for (const geometry of gridGeometries) geometry.dispose();
      gridMaterial.dispose();
    },
  };
}
