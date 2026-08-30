import {
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
import { PIECE_TYPES, type PieceType } from '../core/pieces';
import {
  type PlacedScenery,
  SCENERY_KINDS,
  type SceneryKind,
  sceneryCategory,
  sceneryLift,
  sceneryScale,
  sceneryUrl,
  sceneryVoice,
} from '../core/scenery';
import { type Cell, MEADOW_CELLS, type PlacedPiece, type Rotation } from '../core/track-graph';
import type { WorldStore } from '../state/world';
import { type CritterMood, createCritterLife } from './critter-life';
import { disposeObject } from './dispose-object';
import { GROUND_SIZE } from './ground';
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
  // Placeholder until the trestle model lands (Phase 2): rides like a straight.
  bridge: 0,
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
  // Placeholder until the trestle model lands (Phase 2): same anchor as the
  // straight it mirrors.
  bridge: [0, -1, 2],
};

const PIECE_URLS: Record<PieceType, string> = {
  straight: '/assets/train-kit/railroad-straight.glb',
  corner: '/assets/train-kit/railroad-corner-small.glb',
  crossing: '/assets/train-kit/railroad-crossing.glb',
  // Placeholder until the trestle model lands (Phase 2).
  bridge: '/assets/train-kit/railroad-straight.glb',
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
    if (!model) {
      model = template.clone(true);
      scene.add(model);
      rendered.set(item.id, model);
    }
    model.position.set(x, 0, z);
    model.rotation.y = yaw;
  }

  function reconcile(): void {
    const wanted = new Map<string, MeadowItem>();
    for (const piece of world.pieces()) wanted.set(piece.id, piece);
    for (const item of world.scenery()) wanted.set(item.id, item);
    for (const [id, model] of rendered) {
      if (!wanted.has(id)) {
        popOut(model); // A soft scale-down pop, then the mesh leaves the scene.
        rendered.delete(id);
      }
    }
    tracked.clear();
    for (const item of wanted.values()) {
      tracked.set(item.id, item);
      apply(item);
    }
    syncCritterAnimations(wanted);
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

  for (const type of PIECE_TYPES) {
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
        templates.set(type, model);
        reconcile(); // Render items placed before the asset arrived.
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
    dispose(): void {
      disposed = true;
      unsubscribe();
      endGhost();
      if (popRaf !== null) cancelAnimationFrame(popRaf);
      popRaf = null;
      for (const pop of pops) scene.remove(pop.model);
      pops.length = 0;
      for (const model of rendered.values()) scene.remove(model);
      rendered.clear();
      tracked.clear();
      for (const template of templates.values()) disposeObject(template);
      templates.clear();
      critterLife.dispose();
      animatedCritters.clear();
      scene.remove(gridLines);
      for (const geometry of gridGeometries) geometry.dispose();
      gridMaterial.dispose();
    },
  };
}
