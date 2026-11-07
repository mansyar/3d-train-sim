/** The GLB loader, the render maps, and the single `world.subscribe` that
 *  reconciles them. Per-item reactions report outward through the hooks. */
import { Box3, Group, type Object3D, type Scene } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MAX_DELIVERED_CRATES } from '../core/cargo';
import { CELL_SIZE, cellToWorld } from '../core/meadow-grid';
import { PIECE_TYPES, type PieceType } from '../core/pieces';
import { isWater } from '../core/river';
import {
  type PlacedScenery,
  SCENERY_KINDS,
  type SceneryKind,
  sceneryFloats,
  sceneryLift,
  sceneryScale,
  sceneryUrl,
} from '../core/scenery';
import { type Edge, nextEdge, type PlacedPiece } from '../core/track-graph';
import { tunnelRunsOf } from '../core/tunnels';
import type { WorldStore } from '../state/world';
import { createTrestleTemplate } from './bridge-model';
import { disposeObject } from './dispose-object';
import { SURFACE_LIFT } from './river-water';
import { enableCastShadows } from './shadows';
import {
  baseYawOf,
  HILL_SNOW_URLS,
  isPiece,
  KIT_ANCHORS,
  KIT_MODULE_UNITS,
  type MeadowItem,
  PIECE_URLS,
} from './track-catalog';
import { attachWindowGlow } from './window-glow';

/** The renderer's still-resident reactions to placement changes. */
export interface PlacementHooks {
  /** A piece template finished loading, before it is published. */
  onPieceTemplate?(type: PieceType, model: Object3D): void;
  /** A scenery template finished loading, before it is published. */
  onSceneryTemplate?(kind: SceneryKind, model: Object3D): void;
  onModelReplaced?(id: string): void;
  onModelRemoved?(id: string): void;
  onModelAdded?(id: string, model: Object3D, kind: PieceType | SceneryKind): void;
  /** An item was applied — the hook re-attaches ambient motion to its model. */
  onItemAttached?(id: string, model: Object3D | undefined, item: MeadowItem): void;
  /** The tracked map settled — the hook refreshes the critter roster. */
  afterSync?(wanted: ReadonlyMap<string, MeadowItem>): void;
}

/** The live placement state, read by picking and the resident modules. */
export interface TrackPlacement {
  /** Loaded templates keyed by kind (also read by the drag ghost). */
  templates: Map<PieceType | SceneryKind, Object3D>;
  /** Placed clones by item id. */
  rendered: Map<string, Object3D>;
  /** Meadow records by id, mirroring the store for picking. */
  tracked: Map<string, MeadowItem>;
  setPieceVisible(id: string, visible: boolean): void;
  setHillSnow(visible: boolean): void;
  dispose(): void;
}

/** The piece's endpoint labels, advanced by its yaw (the core convention). */
export const advancedEdge = (edge: Edge, steps: number): Edge => {
  let out = edge;
  for (let i = 0; i < steps; i++) out = nextEdge(out);
  return out;
};

/** Owns the loader, the render maps, and the store→scene reconcile loop. */
export function startTrackPlacement(
  scene: Scene,
  world: WorldStore,
  reducedMotion: boolean,
  hooks: PlacementHooks = {},
): TrackPlacement {
  const templates = new Map<PieceType | SceneryKind, Object3D>();
  const rendered = new Map<string, Object3D>();
  /** Meadow records by id, mirroring the store for picking. */
  const tracked = new Map<string, MeadowItem>();
  const loader = new GLTFLoader();
  let disposed = false;

  // Removed toys pop away softly instead of vanishing — celebration, never
  // punishment. Reduced-motion users keep the instant removal they had.
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
      hooks.onModelReplaced?.(item.id);
      model = undefined;
    }
    if (!model) {
      model = template.clone(true);
      model.userData.renderedKind = kind;
      scene.add(model);
      rendered.set(item.id, model);
      hooks.onModelAdded?.(item.id, model, kind);
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
        hooks.onModelRemoved?.(id);
      }
    }
    tracked.clear();
    for (const item of wanted.values()) {
      tracked.set(item.id, item);
      apply(item);
      hooks.onItemAttached?.(item.id, rendered.get(item.id), item);
    }
    hooks.afterSync?.(wanted);
    syncTunnelPortals(world.pieces());
    syncStationCrates(world.scenery(), (id) => world.deliveryCount(id));
  }

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

  function setPieceVisible(id: string, visible: boolean): void {
    const model = rendered.get(id);
    if (model) model.visible = visible;
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

  const unsubscribe = world.subscribe(() => reconcile());

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
        hooks.onPieceTemplate?.(type, model);
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
        const model = new Group();
        model.add(gltf.scene);
        // Kit-authored scenery hangs below its origin (the track kit's mat
        // sits at z = -1) while the Kenney/Quaternius kits stand on theirs:
        // measure the model and rest its lowest point at the ground lift, so
        // every toy stands on the meadow exactly as its recipe intended.
        const measured = new Box3().setFromObject(gltf.scene);
        gltf.scene.position.y = sceneryLift(kind) - measured.min.y;
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
        hooks.onSceneryTemplate?.(kind, model);
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
    templates,
    rendered,
    tracked,
    setPieceVisible,
    setHillSnow,
    dispose(): void {
      disposed = true;
      unsubscribe();
      if (popRaf !== null) cancelAnimationFrame(popRaf);
      popRaf = null;
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
    },
  };
}
