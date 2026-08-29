import type { Object3D } from 'three';
import {
  NeutralToneMapping,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { AudioController } from '../audio/audio-controller';
import { bindRideAudio } from '../audio/ride-audio';
import type { SceneryKind } from '../core/scenery';
import type { Cell, PieceType, Rotation } from '../core/track-graph';
import { TRAIN_KINDS, type TrainKind } from '../core/trains';
import { wagonSlots } from '../core/wagons';
import { createRideController } from '../state/ride';
import type { WorldStore } from '../state/world';
import { disposeObject } from './dispose-object';
import { createGround } from './ground';
import { createLights } from './lights';
import { loadLocomotive } from './load-locomotive';
import { loadWagon } from './load-wagons';
import { createPlaceholderCrate } from './placeholder-crate';
import { createRideMotion, parkFollowersBehind } from './ride-motion';
import { startSpinLoop } from './spin-loop';
import { createSteamPuffEmitter, type SteamPuffEmitter } from './steam-puff-emitter';
import { type PickedItem, startTrackRenderer } from './track-renderer';

/** Pixel ratio cap: tablet GPUs render crisp without melting the battery. */
const MAX_PIXEL_RATIO = 2;

/** Elevated oblique view framing the whole 60-unit meadow. */
const OVERVIEW_POSITION = new Vector3(0, 52, 44);
const OVERVIEW_LOOK = new Vector3(0, 0, 0);
/** Chase offset over/behind the locomotive while riding (world-relative). */
const FOLLOW_OFFSET = new Vector3(0, 9, 11);
/** Higher = snappier chase. Chosen for a gentle, toy-like glide. */
const CAMERA_EASE = 2.5;
/** The breath between the two dings of a station welcome. */
const STATION_DING_GAP_MS = 350;

export interface SceneHandle {
  dispose(): void;
  /** The meadow cell under a screen point, or null off-meadow. */
  cellFromPoint(clientX: number, clientY: number): Cell | null;
  /** In-scene ghost preview of the toy being dragged from the drawer. */
  beginGhost(kind: PieceType | SceneryKind): void;
  moveGhost(cell: Cell | null, rotation: Rotation, valid: boolean): void;
  endGhost(): void;
  /** The placed piece under a screen point, for relocate/return drags. */
  pickPiece(clientX: number, clientY: number): PickedItem | null;
  /** Hide/show a placed clone (the ghost stands in while it is dragged). */
  setPieceVisible(id: string, visible: boolean): void;
  /** Debug aid: show the meadow's snap-cell boundaries. */
  setGridVisible(visible: boolean): void;
  /** Debug aid: how many cargo wagons are live in the scene. */
  wagonCount(): number;
  /** Debug aid: number of currently visible steam puffs. */
  steamPuffCount(): number;
  /** Begin riding the current layout. Refuses an empty meadow. */
  startRide(): boolean;
  /** Gently stop the ride. */
  stopRide(): void;
}

export function initScene(
  canvas: HTMLCanvasElement,
  world: WorldStore,
  audio: AudioController,
): SceneHandle {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  // Soft shadow maps pair with the shadowed sun in lights.ts; neutral tone
  // mapping keeps bright toy surfaces from clipping to white.
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.toneMapping = NeutralToneMapping;

  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.copy(OVERVIEW_POSITION);
  camera.lookAt(OVERVIEW_LOOK);

  const disposables: Array<() => void> = [];
  disposables.push(createLights(scene));
  disposables.push(createGround(scene));
  const tracks = startTrackRenderer(scene, camera, canvas, world, audio);
  const crate = createPlaceholderCrate();
  scene.add(crate.mesh);

  const rides = createRideController(world);
  // Motion and sound stay married: ride starts → chug starts, always.
  const rideAudio = bindRideAudio(rides, audio);
  let rideUpdate: ((dt: number) => void) | null = null;
  let locomotive: Object3D | null = null;
  let steamPuffs: SteamPuffEmitter | null = null;
  let loadedTrain: TrainKind | null = null;
  const locomotiveTemplates = new Map<TrainKind, Object3D>();
  /**
   * The live cargo wagons in the scene, in pulling order (index 0 rides
   * directly behind the engine). One set serves every locomotive kind, so
   * train switches re-attach it instead of rebuilding it — nothing to swap,
   * nothing to leak.
   */
  const wagonSet: Object3D[] = wagonSlots().map(() => null as unknown as Object3D);

  let spinTarget: Object3D | null = crate.mesh;
  let disposed = false;
  let visibleSteamPuffs = 0;
  const showTrain = (kind: TrainKind): void => {
    const template = locomotiveTemplates.get(kind);
    if (!template) return;
    if (locomotive) {
      // Clones share geometry and materials with their cached template. The
      // template owns those GPU resources and disposes them during teardown.
      scene.remove(locomotive);
    }
    const model = template.clone(true);
    scene.add(model);
    locomotive = model;
    loadedTrain = kind;
    steamPuffs?.dispose();
    if (steamPuffs) scene.remove(steamPuffs.group);
    steamPuffs = createSteamPuffEmitter(model, camera, kind);
    scene.add(steamPuffs.group);
    scene.remove(crate.mesh);
    spinTarget = null;
    rideUpdate = createRideMotion(
      model,
      world,
      rides,
      rideAudio.setPaused,
      // A station stop earns a happy ding-ding (spec FR4). Two blips, a
      // breath apart; late blips are skipped if the scene has been torn down.
      () => {
        audio.ding();
        window.setTimeout(() => {
          if (!disposed) audio.ding();
        }, STATION_DING_GAP_MS);
      },
      wagonSet,
    ).update;
    parkFollowersBehind(model, wagonSet);
  };

  for (const kind of TRAIN_KINDS) {
    loadLocomotive(kind)
      .then((model) => {
        if (disposed) {
          disposeObject(model);
          return;
        }
        locomotiveTemplates.set(kind, model);
        if (kind === world.train() && loadedTrain !== kind) showTrain(kind);
      })
      .catch(() => {
        // Kit asset unavailable — the crate remains as the fallback placeholder.
      });
  }

  const slots = wagonSlots();
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (!slot) continue;
    loadWagon(slot)
      .then((wagon) => {
        if (disposed) {
          disposeObject(wagon);
          return;
        }
        wagonSet[i] = wagon; // Pulling order: index 0 rides behind the engine.
        scene.add(wagon);
        if (locomotive) parkFollowersBehind(locomotive, wagonSet);
      })
      .catch(() => {
        // Wagon asset unavailable — the train chugs on without it.
      });
  }

  const unsubscribeBeat = audio.onChugBeat(() => {
    if (rides.mode() === 'riding') steamPuffs?.emit();
  });
  const unsubscribeRideForPuffs = rides.subscribe((mode) => {
    steamPuffs?.setEmitting(mode === 'riding');
  });

  const unsubscribeTrain = world.subscribe(() => {
    const kind = world.train();
    if (kind !== loadedTrain) showTrain(kind);
  });

  const resize = () => {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  // The camera glides after the train while riding and eases home on stop.
  // Reduced-motion users keep the fixed overview — no chase, no drift.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const camLook = OVERVIEW_LOOK.clone();
  const desiredPosition = new Vector3();
  const desiredLook = new Vector3();
  const updateCamera = (dt: number): void => {
    if (reducedMotion) return;
    const riding = rides.mode() === 'riding' && locomotive !== null;
    if (riding && locomotive) {
      desiredPosition.copy(locomotive.position).add(FOLLOW_OFFSET);
      desiredLook.copy(locomotive.position);
    } else {
      desiredPosition.copy(OVERVIEW_POSITION);
      desiredLook.copy(OVERVIEW_LOOK);
    }
    const ease = 1 - Math.exp(-CAMERA_EASE * dt);
    camera.position.lerp(desiredPosition, ease);
    camLook.lerp(desiredLook, ease);
    camera.lookAt(camLook);
  };

  const stopSpin = startSpinLoop(
    renderer,
    scene,
    camera,
    () => spinTarget,
    (dt) => {
      rideUpdate?.(dt);
      // Critters idle always and hop while the riding train passes close.
      // A parked train reports null — hops read as passing, not presence.
      const riding = rides.mode() === 'riding' && locomotive !== null;
      const trainX = riding && locomotive ? locomotive.position.x : null;
      const trainZ = riding && locomotive ? locomotive.position.z : null;
      tracks.updateCritters(dt, trainX, trainZ);
      steamPuffs?.update(dt);
      visibleSteamPuffs = steamPuffs?.activeCount() ?? 0;
      updateCamera(dt);
    },
  );

  return {
    // Ground→cell mapping lives in the track renderer, next to cellToWorld.
    cellFromPoint: (clientX, clientY) => tracks.cellFromPoint(clientX, clientY),
    beginGhost: (type) => tracks.beginGhost(type),
    moveGhost: (cell, rotation, valid) => tracks.moveGhost(cell, rotation, valid),
    endGhost: () => tracks.endGhost(),
    pickPiece: (clientX, clientY) => tracks.pickPiece(clientX, clientY),
    setPieceVisible: (id, visible) => tracks.setPieceVisible(id, visible),
    setGridVisible: (visible) => tracks.setGridVisible(visible),
    wagonCount: () => wagonSet.filter((wagon) => wagon !== null).length,
    steamPuffCount: () => visibleSteamPuffs,
    startRide: () => rides.start(),
    stopRide: () => rides.stop(),
    dispose(): void {
      disposed = true;
      stopSpin();
      window.removeEventListener('resize', resize);
      rideAudio.dispose();
      unsubscribeBeat();
      unsubscribeRideForPuffs();
      steamPuffs?.dispose();
      if (steamPuffs) scene.remove(steamPuffs.group);
      unsubscribeTrain();
      audio.dispose();
      tracks.dispose();
      crate.dispose();
      for (const model of locomotiveTemplates.values()) disposeObject(model);
      locomotiveTemplates.clear();
      for (const wagon of wagonSet) {
        if (wagon) disposeObject(wagon);
      }
      wagonSet.length = 0;
      for (const dispose of disposables) dispose();
      renderer.dispose();
    },
  };
}
