import {
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
import type { AudioController } from '../audio/audio-controller';
import { createMusicBoxVoice } from '../audio/music-box-audio';
import { advanceCrossing, type CrossingMotion, idleCrossing } from '../core/crossings';
import { CELL_SIZE, cellToWorld, type PickedItem } from '../core/meadow-grid';
import type { PieceType } from '../core/pieces';
import { type SceneryKind, sceneryCategory, sceneryVoice } from '../core/scenery';
import { isSwitchPiece, type SwitchPieceType } from '../core/switches';
import { type Cell, type Edge, MEADOW_CELLS, type Rotation } from '../core/track-graph';
import type { WorldStore } from '../state/world';
import { type CritterMood, createCritterLife } from './critter-life';
import { createDelightMotion, isDelightKind } from './delight-motion';
import { GROUND_SIZE } from './ground';
import { createMusicBoxScene, type MusicBoxScene } from './music-box';
import { DELIGHT_CAPS, isPiece, type MeadowItem } from './track-catalog';
import { startTrackGhost } from './track-ghost';
import { advancedEdge, startTrackPlacement } from './track-placement';

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
  /** Flip a switch's point blades to the chosen road (event-driven). The
   *  double slip also needs the entry edge — its blades live per entry. */
  setSwitchRoad(pieceId: string, exit: Edge, entry?: Edge): void;
  /** Advance every crossing gate toward the trains; poses the arms, lantern,
   *  and bell ask. `trains` are riding trains' world-space spots, `night` the
   *  0..1 night factor (idle lanterns glow softly after dusk). */
  updateCrossings(dt: number, trains: ReadonlyArray<{ x: number; z: number }>, night: number): void;
  /** Winter tell: show/hide the crossing's snow cap (event-driven). */
  setCrossingSnow(visible: boolean): void;
  /** Advance the delight toys: windmill sails, carousel spin, balloon wander. */
  updateDelight(dt: number): void;
  /** Winter tell: show/hide the delight toys' snow caps (event-driven). */
  setDelightSnow(visible: boolean): void;
  /** Dev/e2e witness: the first balloon's drift from its base, in cells. */
  delightBalloonDrift(): { x: number; z: number; altitude: number } | null;
  /** Advance the music boxes; `trains` are riding trains' world-space spots. */
  updateMusicBox(dt: number, trains: ReadonlyArray<{ x: number; z: number }>): void;
  /** Hidden-tab lifecycle for the boxes' synthesized voice. */
  suspendMusicBox(): void;
  resumeMusicBox(): void;
  /** Dev/e2e witness: the first music box's winding state. */
  musicBoxProbe(): ReturnType<MusicBoxScene['probe']>;

  /** Debug aid: every placed crossing's live phase ('idle'|'closing'|
   *  'active'|'lifting'), for e2e witnesses. */
  crossingPhases(): string[];
  /** Debug aid: whether the crossing bell edge is ringing right now. */
  bellRinging(): boolean;
  /** Dev/e2e witness: a switch piece's live point-blade + signal-lever
   *  angles (null when the piece is missing or has no blades rendered).
   *  The double slip keeps one blade group per entry edge — pass the
   *  model entry to read that group (south group = the default node). */
  switchPose(pieceId: string, entry?: Edge): { blade: number; lever: number | null } | null;
}

/** Renders one cloned model per placed piece, kept in sync with the store. */
export function startTrackRenderer(
  scene: Scene,
  camera: PerspectiveCamera,
  canvas: HTMLCanvasElement,
  world: WorldStore,
  audio: AudioController,
): TrackRenderer {
  /** Placed critter ids with live idle/hop animation (see critter-life). */
  const animatedCritters = new Set<string>();
  const critterLife = createCritterLife((voice) => audio.chirp(voice));
  /** Delight toys (windmill/carousel/balloon) with live motion appliers. */
  const delight = createDelightMotion();
  let delightSnow = false;
  /** Music boxes: winding state, figurine twirl, and the synthesized voice. */
  const musicBoxVoice = createMusicBoxVoice(audio);
  const musicBox = createMusicBoxScene(musicBoxVoice);
  const raycaster = new Raycaster();
  const pointerNdc = new Vector2();
  const groundPlane = new Plane(new Vector3(0, 1, 0), 0);
  const groundHit = new Vector3();
  let disposed = false;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * The switch points flip to the road the train will take — the point
   * blades (0 = through, ±0.21 rad toward the diverge) and the signal
   * lever (0 = arm north, ±90° swung to the diverge side) move together
   * in one tween. Angles are about each node's local Y — the Blender +z
   * angles from the recipes arrive as glTF +y via export_yup (verified:
   * -0.21 blades and -90° lever read as the east diverge in the render
   * checks). Stem merges (world exit = stem) keep the last road — only
   * stem entries alternate, so only model north/diverge exits move the
   * points. Pose tables: two roads per Y switch, three for the three-way.
   * The double slip has no stem: its blade groups live on the ENTRY edge
   * (the entry's blades set for the road being taken — 0 = straight
   * through, ±0.21 toward the diagonals per the recipe's pose contract,
   * bar tops leaning toward the chosen road's tangent), while the lever
   * follows the exit. Event-driven (ride-motion onSwitchRoad): a short
   * ease-out tween, instant snap under prefers-reduced-motion, no
   * per-frame cost outside the tween, and a missing `switch_lever` fails
   * soft (the blades still animate as before).
   */
  const LEVER_FORWARD_Y = 0; // arm north, along the through road
  const LEVER_EAST_Y = -Math.PI / 2;
  const LEVER_WEST_Y = Math.PI / 2;
  const LEVER_BACK_Y = Math.PI; // arm south — the slip's fourth road
  /** Model-frame road edge -> point blades + lever angles per piece type. */
  const SWITCH_POSES: Record<
    SwitchPieceType,
    Partial<Record<Edge, { blade: number; lever: number }>>
  > = {
    switch: {
      north: { blade: 0, lever: LEVER_FORWARD_Y },
      east: { blade: -0.21, lever: LEVER_EAST_Y },
    },
    'switch-mirror': {
      north: { blade: 0, lever: LEVER_FORWARD_Y },
      west: { blade: 0.21, lever: LEVER_WEST_Y },
    },
    'switch-3way': {
      north: { blade: 0, lever: LEVER_FORWARD_Y },
      east: { blade: -0.21, lever: LEVER_EAST_Y },
      west: { blade: 0.21, lever: LEVER_WEST_Y },
    },
    // The double slip is entry-aware: poses come from SLIP_BLADES +
    // SLIP_LEVERS below, keyed by the entry the engine arrived by.
    'switch-slip': {},
  };
  /**
   * Slip blades, model frame: per ENTRY edge, the blade angle for each
   * road the engine may take (0 = straight through; ±0.21 toward the
   * diagonals — the 3-way convention rotated into each group's frame per
   * the recipe's pose contract). The south group keeps the legacy
   * `switch_blades` node name; its siblings are `switch_blades_<edge>`.
   */
  const SLIP_BLADES: Record<Edge, Partial<Record<Edge, number>>> = {
    south: { north: 0, east: -0.21, west: 0.21 },
    north: { south: 0, west: -0.21, east: 0.21 },
    east: { west: 0, north: -0.21, south: 0.21 },
    west: { east: 0, south: -0.21, north: 0.21 },
  };
  /** Slip lever, model frame: the arm points along the chosen exit. */
  const SLIP_LEVERS: Record<Edge, number> = {
    north: LEVER_FORWARD_Y,
    east: LEVER_EAST_Y,
    south: LEVER_BACK_Y,
    west: LEVER_WEST_Y,
  };
  const BLADE_TWEEN_MS = 180;
  const bladeTweens = new Map<
    string,
    { targets: { node: Object3D; from: number; to: number }[]; start: number }
  >();
  let bladeRaf: number | null = null;

  const runBladeTweens = (now: number): void => {
    for (const [id, tween] of [...bladeTweens]) {
      const t = (now - tween.start) / BLADE_TWEEN_MS;
      if (t >= 1) {
        for (const target of tween.targets) target.node.rotation.y = target.to;
        bladeTweens.delete(id);
      } else {
        const eased = 1 - (1 - t) * (1 - t) * (1 - t);
        for (const target of tween.targets) {
          target.node.rotation.y = target.from + (target.to - target.from) * eased;
        }
      }
    }
    bladeRaf = bladeTweens.size > 0 ? requestAnimationFrame(runBladeTweens) : null;
  };

  function setSwitchRoad(pieceId: string, exit: Edge, entry?: Edge): void {
    const item = placement.tracked.get(pieceId);
    if (!item || !isPiece(item) || !isSwitchPiece(item.type)) return;
    const model = placement.rendered.get(pieceId);
    if (!model) return;
    // World exit/entry -> model frame (yaw 0): model north = through,
    // model east/west = the diverge sides per the pose table. Invert the
    // yaw advance applied at mount.
    const steps = item.rotation / 90;
    const modelExit = advancedEdge(exit, (4 - steps) % 4);
    let bladeNode: Object3D;
    let bladeAngle: number;
    let leverAngle: number;
    if (item.type === 'switch-slip') {
      if (!entry) return; // the slip's poses are entry-aware by contract
      const modelEntry = advancedEdge(entry, (4 - steps) % 4);
      const group = modelEntry === 'south' ? 'switch_blades' : `switch_blades_${modelEntry}`;
      const groupNode = model.getObjectByName(group);
      const angle = SLIP_BLADES[modelEntry]?.[modelExit];
      if (!groupNode || angle === undefined) return;
      bladeNode = groupNode;
      bladeAngle = angle;
      leverAngle = SLIP_LEVERS[modelExit];
    } else {
      const blades = model.getObjectByName('switch_blades');
      if (!blades) return;
      const pose = SWITCH_POSES[item.type][modelExit];
      if (!pose) return; // a branch→stem merge keeps the last road
      bladeNode = blades;
      bladeAngle = pose.blade;
      leverAngle = pose.lever;
    }
    const targets = [{ node: bladeNode, from: bladeNode.rotation.y, to: bladeAngle }];
    const lever = model.getObjectByName('switch_lever');
    if (lever) targets.push({ node: lever, from: lever.rotation.y, to: leverAngle });
    const settled = targets.every((t) => Math.abs(t.from - t.to) < 1e-4);
    if (settled && !bladeTweens.has(pieceId)) return;
    if (reducedMotion || disposed) {
      for (const target of targets) target.node.rotation.y = target.to;
      bladeTweens.delete(pieceId);
      return;
    }
    bladeTweens.set(pieceId, { targets, start: performance.now() });
    if (bladeRaf === null) bladeRaf = requestAnimationFrame(runBladeTweens);
  }

  /** Keeps the critter animator's roster matched to the placed critters. */
  function syncCritterAnimations(wanted: ReadonlyMap<string, MeadowItem>): void {
    const next = new Set<string>();
    for (const [id, item] of wanted) {
      if (!isPiece(item) && sceneryCategory(item.kind) === 'critter') next.add(id);
    }
    for (const id of next) {
      if (animatedCritters.has(id)) continue;
      const model = placement.rendered.get(id);
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

  // Placement owns the store subscription and the render maps; everything
  // below reads the live maps through this handle. The hooks are the
  // still-resident reactions (crossings, delight, critters, the music box).
  const placement = startTrackPlacement(scene, world, reducedMotion, {
    onPieceTemplate: (type, model) => {
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
    },
    onSceneryTemplate: (kind, model) => {
      if (isDelightKind(kind) || kind === 'music-box') {
        // Snow caps author visible; settle them to the winter state known
        // at load time (the asset race, as in syncTunnelPortals).
        const capName = kind === 'music-box' ? 'musicbox_snow_cap' : `${kind}_snow_cap`;
        const cap = model.getObjectByName(capName);
        if (cap) cap.visible = delightSnow;
      }
    },
    onModelReplaced: (id) => {
      bladeTweens.delete(id);
      crossingParts.delete(id);
      crossingMotions.delete(id);
      delight.detach(id);
      musicBox.detach(id);
    },
    onModelRemoved: (id) => {
      crossingParts.delete(id);
      crossingMotions.delete(id);
      delight.detach(id);
      musicBox.detach(id);
    },
    onModelAdded: (id, model, kind) => {
      if (kind === 'crossing-gate') trackCrossing(id, model);
    },
    onItemAttached: (id, model, item) => {
      if (!isPiece(item) && isDelightKind(item.kind)) delight.attach(id, item.kind, model);
      if (!isPiece(item) && item.kind === 'music-box') {
        const spot = cellToWorld(item.cell);
        musicBox.attach(id, model, spot.x, spot.z);
      }
    },
    afterSync: (wanted) => syncCritterAnimations(wanted),
  });

  // Ghost and grid own their scene objects; the ghost reads the live
  // template map, so an asset still in flight yields no preview.
  const ghost = startTrackGhost(scene, placement.templates);

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
    for (const item of placement.tracked.values()) {
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
    for (const [id, item] of placement.tracked) {
      if (!isPiece(item) || item.type !== 'crossing-gate') continue;
      const model = placement.rendered.get(id);
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
    const template = placement.templates.get('crossing-gate');
    if (template) setCap(template);
    for (const [id, model] of placement.rendered) {
      const item = placement.tracked.get(id);
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
    const template = placement.templates.get('tunnel');
    if (template) setCap(template);
    for (const [id, model] of placement.rendered) {
      const item = placement.tracked.get(id);
      if (item && isPiece(item) && item.type === 'tunnel') setCap(model);
    }
  }

  /** Winter tell: the toys wear snow caps like the tunnel domes. */
  function setDelightSnow(visible: boolean): void {
    if (visible === delightSnow) return;
    delightSnow = visible;
    const setCap = (model: Object3D): void => {
      for (const name of DELIGHT_CAPS) {
        const cap = model.getObjectByName(name);
        if (cap) cap.visible = visible;
      }
    };
    for (const kind of ['windmill', 'carousel', 'balloon', 'music-box'] as const) {
      const template = placement.templates.get(kind);
      if (template) setCap(template);
    }
    for (const [id, model] of placement.rendered) {
      const item = placement.tracked.get(id);
      if (item && !isPiece(item) && (isDelightKind(item.kind) || item.kind === 'music-box')) {
        setCap(model);
      }
    }
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
    beginGhost: ghost.beginGhost,
    moveGhost: ghost.moveGhost,
    endGhost: ghost.endGhost,
    pickPiece,
    setPieceVisible: (id, visible): void => placement.setPieceVisible(id, visible),
    setGridVisible: ghost.setGridVisible,
    setTunnelSnow,
    setHillSnow: (visible): void => placement.setHillSnow(visible),
    setSwitchRoad,
    updateCrossings,
    setCrossingSnow,
    updateDelight: (dt: number): void => {
      if (disposed) return;
      delight.update(dt, reducedMotion);
    },
    setDelightSnow,
    delightBalloonDrift: () => delight.probe(),
    updateMusicBox: (dt: number, trains: ReadonlyArray<{ x: number; z: number }>): void => {
      if (disposed) return;
      musicBox.update(dt, trains, reducedMotion);
    },
    suspendMusicBox: (): void => {
      musicBoxVoice.suspend();
    },
    resumeMusicBox: (): void => {
      musicBoxVoice.resume();
    },
    musicBoxProbe: () => musicBox.probe(),
    // Dev/e2e witnesses: live crossing phases and the bell edge state.
    crossingPhases: () =>
      [...placement.tracked.values()]
        .filter((item) => isPiece(item) && item.type === 'crossing-gate')
        .map((item) => crossingMotions.get(item.id)?.phase ?? 'idle'),
    bellRinging: () => crossingBell,
    // Dev/e2e witness: the rendered switch's live pose — the blades always
    // exist on an authored switch; a lever-less GLB fails soft to null.
    // The slip's per-entry groups: pass the entry to read that group.
    switchPose: (pieceId: string, entry?: Edge) => {
      const model = placement.rendered.get(pieceId);
      const group = entry && entry !== 'south' ? `switch_blades_${entry}` : 'switch_blades';
      const blades = model?.getObjectByName(group);
      if (!model || !blades) return null;
      const lever = model.getObjectByName('switch_lever');
      return { blade: blades.rotation.y, lever: lever ? lever.rotation.y : null };
    },
    dispose(): void {
      disposed = true;
      placement.dispose();
      ghost.endGhost();
      if (bladeRaf !== null) cancelAnimationFrame(bladeRaf);
      bladeRaf = null;
      bladeTweens.clear();
      crossingMotions.clear();
      crossingParts.clear();
      critterLife.dispose();
      animatedCritters.clear();
      delight.dispose();
      musicBox.dispose();
      musicBoxVoice.dispose();
      ghost.dispose();
    },
  };
}
