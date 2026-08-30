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
import { createAttractClock } from '../core/attract-clock';
import type { SceneryKind } from '../core/scenery';
import type { Cell, PieceType, Rotation } from '../core/track-graph';
import { TRAIN_KINDS, type TrainKind } from '../core/trains';
import { createVisibilityController } from '../core/visibility-controller';
import { wagonSlots } from '../core/wagons';
import { createRideController, type RideState } from '../state/ride';
import type { WorldStore } from '../state/world';
import { createAttractCamera } from './attract-camera';
import { disposeObject } from './dispose-object';
import { createGround, GROUND_SIZE } from './ground';
import { createLights } from './lights';
import { loadLocomotive } from './load-locomotive';
import { loadWagon } from './load-wagons';
import { createPlaceholderCrate } from './placeholder-crate';
import { createRideMotion, parkFollowersBehind, type RideMotion } from './ride-motion';
import { startSpinLoop } from './spin-loop';
import { createSteamPuffEmitter, type SteamPuffEmitter } from './steam-puff-emitter';
import { type PickedItem, startTrackRenderer } from './track-renderer';

/** Pixel ratio cap: tablet GPUs render crisp without melting the battery. */
const MAX_PIXEL_RATIO = 2;

/** Elevated oblique view framing the whole 60-unit meadow in landscape. */
const OVERVIEW_POSITION = new Vector3(0, 52, 44);
const OVERVIEW_LOOK = new Vector3(0, 0, 0);
/** The live overview home — stays at OVERVIEW_POSITION in landscape, pulls
 * back in tall viewports so the square meadow still fits the frame. */
const overviewBase = OVERVIEW_POSITION.clone();
/** Chase offset over/behind the locomotive while riding (world-relative). */
const FOLLOW_OFFSET = new Vector3(0, 9, 11);
/** Higher = snappier chase. Chosen for a gentle, toy-like glide. */
const CAMERA_EASE = 2.5;
/** The breath between the two dings of a station welcome. */
const STATION_DING_GAP_MS = 350;
/** Inactivity before the meadow comes alive with a slow camera drift. */
const ATTRACT_IDLE_MS = 25_000;
/** How often the attract clock re-checks its timers (cheap, timer-driven). */
const ATTRACT_TICK_MS = 250;

export interface SceneHandle {
  dispose(): void;
  /** The meadow cell under a screen point, or null off-meadow. */
  cellFromPoint(clientX: number, clientY: number): Cell | null;
  /** The screen-space center of a meadow cell, or null when off-camera. */
  cellToScreen(cell: Cell): { x: number; y: number } | null;
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
  /** The whistle's visual voice: a steam burst at the chimney (no-op before a train shows). */
  whistlePuff(): void;
  /** Begin riding the current layout. Refuses an empty meadow. */
  startRide(): boolean;
  /** Gently stop the ride. */
  stopRide(): void;
  /** Notify the idle-attract clock of toddler activity (touch, press, drag). */
  notifyActivity(): void;
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
  camera.position.copy(overviewBase);
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

  // Attract life: after a quiet 25 s the meadow stirs — a slow camera drift
  // (this phase) and, later in the track, quiet critter chirps. The clock is
  // pure logic driven by a cheap interval, so it stays alive even under
  // reduced motion (static frame, no RAF loop). Any toddler touch calls
  // notifyActivity() through the SceneHandle.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const attract = createAttractCamera(overviewBase, OVERVIEW_LOOK, { reducedMotion });
  const attractClock = createAttractClock(ATTRACT_IDLE_MS, {
    now: () => performance.now(),
    reducedMotion,
  });
  const unsubscribeAttract = attractClock.subscribe((event) => {
    if (event.kind === 'drift') attract.enterIdle();
    else if (event.kind === 'state' && event.state === 'active') attract.exitIdle();
    else if (event.kind === 'chirp') {
      // Quiet meadow chirps stay out of the train's moment — no chirping mid-ride.
      if (rides.mode() === 'riding') return;
      audio.chirp(event.critter);
      tracks.hopCritter(event.critter);
    }
  });
  let attractTimer = window.setInterval(() => attractClock.tick(), ATTRACT_TICK_MS);

  /** One little train in the scene, serving one riding component. */
  interface TrainRig {
    /** The ride anchor this rig serves ('' while resting between rides). */
    anchor: string;
    model: Object3D;
    wagons: Object3D[];
    puffs: SteamPuffEmitter;
    motion: RideMotion;
    /** The ride state the motion last began with — a new state ⇒ re-begin. */
    begunWith: RideState | null;
  }

  const rigs = new Map<string, TrainRig>(); // assigned, keyed by ride anchor
  const spares: TrainRig[] = []; // built rigs resting between rides
  const locomotiveTemplates = new Map<TrainKind, Object3D>();
  const wagonTemplates: Object3D[] = []; // loaded once, cloned per rig

  let spinTarget: Object3D | null = crate.mesh;
  let disposed = false;
  let visibleSteamPuffs = 0;
  let loadedTrain: TrainKind | null = null;

  /** The rig serving the primary (largest) active ride — the camera's star. */
  const primaryRig = (): TrainRig | null => {
    const primary = rides.rides()[0];
    return primary ? (rigs.get(primary.anchor) ?? null) : null;
  };

  /** This rig's live ride state — null while parked or between rides. */
  const rigState = (rig: TrainRig): RideState | null => {
    if (!rig.anchor) return null;
    return rides.rides().find((ride) => ride.anchor === rig.anchor) ?? null;
  };

  /** The one shared chug softens only when every riding train is paused. */
  const pausedRigs = new Set<TrainRig>();
  const setRigPaused = (rig: TrainRig, paused: boolean): void => {
    if (paused) pausedRigs.add(rig);
    else pausedRigs.delete(rig);
    rideAudio.setPaused(pausedRigs.size > 0);
  };

  /** A station stop earns a happy ding-ding (spec FR4), per train. */
  const onStationDing = (): void => {
    audio.ding();
    window.setTimeout(() => {
      if (!disposed) audio.ding();
    }, STATION_DING_GAP_MS);
  };

  /** Builds one train (locomotive + wagons + steam) for the selected kind. */
  const createRig = (): TrainRig | null => {
    const kind = world.train();
    const template = locomotiveTemplates.get(kind);
    if (!template) return null; // assets not ready — ride on without visuals
    const model = template.clone(true);
    scene.add(model);
    const wagons = wagonTemplates.map((wagon) => {
      const clone = wagon.clone(true);
      scene.add(clone);
      return clone;
    });
    const puffs = createSteamPuffEmitter(model, camera, kind);
    scene.add(puffs.group);
    parkFollowersBehind(model, wagons);
    scene.remove(crate.mesh);
    spinTarget = null;
    // Clones share geometry and materials with their cached template. The
    // template owns those GPU resources and disposes them during teardown.
    const rig: TrainRig = {
      anchor: '',
      model,
      wagons,
      puffs,
      motion: null as unknown as RideMotion,
      begunWith: null,
    };
    rig.motion = createRideMotion(
      model,
      world,
      () => rigState(rig),
      (paused) => setRigPaused(rig, paused),
      onStationDing,
      wagons,
    );
    return rig;
  };

  /** Frees a rig's scene objects (kind rebuilds and teardown). */
  const disposeRigVisuals = (rig: TrainRig): void => {
    rig.puffs.dispose();
    scene.remove(rig.puffs.group);
    scene.remove(rig.model);
    for (const wagon of rig.wagons) scene.remove(wagon);
    rig.wagons.length = 0;
    pausedRigs.delete(rig);
  };

  /** Mirrors the active rides: one rig per ride, spares rest where they stopped. */
  const syncRigs = (ridesList: readonly RideState[]): void => {
    const wanted = new Set(ridesList.map((ride) => ride.anchor));
    for (const [anchor, rig] of [...rigs]) {
      if (wanted.has(anchor)) continue;
      rigs.delete(anchor);
      rig.anchor = '';
      spares.push(rig);
    }
    for (const ride of ridesList) {
      let rig = rigs.get(ride.anchor);
      if (!rig) {
        const built = createRig();
        if (!built) continue;
        rig = built;
        rigs.set(ride.anchor, rig);
      }
      rig.anchor = ride.anchor;
      // A new state object means the component changed — re-begin; a running
      // ride keeps its exact state object, so its train never loses progress.
      if (rig.begunWith !== ride) {
        rig.begunWith = ride;
        rig.motion.begin(ride);
      }
    }
    // Before the first ▶, keep one train parked at the meadow's heart — the
    // toy the toddler meets on opening (the old single train's resting spot).
    if (ridesList.length === 0 && rigs.size === 0 && spares.length === 0) {
      const parked = createRig();
      if (parked) spares.push(parked);
    }
  };

  for (const kind of TRAIN_KINDS) {
    loadLocomotive(kind)
      .then((model) => {
        if (disposed) {
          disposeObject(model);
          return;
        }
        locomotiveTemplates.set(kind, model);
        if (kind === world.train()) syncRigs(rides.rides());
      })
      .catch(() => {
        // Kit asset unavailable — the crate remains as the fallback placeholder.
      });
  }

  for (const slot of wagonSlots()) {
    loadWagon(slot)
      .then((wagon) => {
        if (disposed) {
          disposeObject(wagon);
          return;
        }
        wagonTemplates.push(wagon); // Cloned per rig, in pulling order.
        syncRigs(rides.rides());
      })
      .catch(() => {
        // Wagon asset unavailable — the train chugs on without it.
      });
  }

  const unsubscribeBeat = audio.onChugBeat(() => {
    if (rides.mode() !== 'riding') return;
    for (const rig of rigs.values()) rig.puffs.emit();
  });
  const unsubscribeRides = rides.subscribe((mode, ridesList) => {
    syncRigs(ridesList);
    for (const rig of rigs.values()) rig.puffs.setEmitting(mode === 'riding');
  });

  const unsubscribeTrain = world.subscribe(() => {
    const kind = world.train();
    if (kind === loadedTrain) return;
    loadedTrain = kind;
    // Rebuild every train for the new kind; rides re-begin from their start
    // (an in-place mid-ride swap lands with the camera-cycling work).
    for (const rig of [...rigs.values(), ...spares]) {
      rig.motion.dispose();
      disposeRigVisuals(rig);
    }
    rigs.clear();
    spares.length = 0;
    syncRigs(rides.rides());
  });

  // In tall viewports the square meadow's far corners slip out of frame. Pull
  // the overview camera back along the same oblique line until the whole
  // 60×60 meadow fits — landscape always keeps the classic framing untouched.
  const frameOverview = () => {
    if (canvas.clientWidth >= canvas.clientHeight) {
      // Landscape: the original framing already fits — never move it.
      if (overviewBase.equals(OVERVIEW_POSITION)) return;
      overviewBase.copy(OVERVIEW_POSITION);
      camera.position.copy(overviewBase);
      camera.lookAt(OVERVIEW_LOOK);
      return;
    }
    const half = GROUND_SIZE / 2;
    const corners = [-half, half].flatMap((x) => [-half, half].map((z) => ({ x, z })));
    // Iterate camera distance until every projected corner fits inside 92% of
    // the NDC half-width — a screen-space fit, robust to near/far asymmetry.
    let scale = 1;
    for (let i = 0; i < 8; i += 1) {
      camera.position.copy(OVERVIEW_POSITION).multiplyScalar(scale);
      camera.lookAt(OVERVIEW_LOOK);
      camera.updateMatrixWorld();
      let widestHalf = 0;
      for (const corner of corners) {
        const p = new Vector3(corner.x, 0, corner.z).project(camera);
        widestHalf = Math.max(widestHalf, Math.abs(p.x));
      }
      if (widestHalf <= 0.92) break;
      scale *= 1.03;
    }
    overviewBase.copy(OVERVIEW_POSITION).multiplyScalar(scale);
    camera.position.copy(overviewBase);
    camera.lookAt(OVERVIEW_LOOK);
  };

  const resize = () => {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    frameOverview();
  };
  resize();
  window.addEventListener('resize', resize);

  // The camera glides after the train while riding, eases home on stop, and
  // wanders slowly while the meadow sits idle. Reduced-motion users keep the
  // fixed overview — no chase, no drift.
  const camLook = OVERVIEW_LOOK.clone();
  const desiredPosition = new Vector3();
  const desiredLook = new Vector3();
  const updateCamera = (dt: number): void => {
    if (reducedMotion) return;
    const star = primaryRig();
    if (star) {
      desiredPosition.copy(star.model.position).add(FOLLOW_OFFSET);
      desiredLook.copy(star.model.position);
    } else {
      attract.update(dt, desiredPosition, desiredLook);
    }
    const ease = 1 - Math.exp(-CAMERA_EASE * dt);
    camera.position.lerp(desiredPosition, ease);
    camLook.lerp(desiredLook, ease);
    camera.lookAt(camLook);
  };

  const spinLoop = startSpinLoop(
    renderer,
    scene,
    camera,
    () => spinTarget,
    (dt) => {
      visibleSteamPuffs = 0;
      for (const rig of rigs.values()) {
        rig.motion.update(dt);
        rig.puffs.update(dt);
        visibleSteamPuffs += rig.puffs.activeCount();
      }
      // Critters idle always and hop while a riding train passes close.
      // Parked spares report null — hops read as passing, not presence.
      const star = primaryRig();
      tracks.updateCritters(dt, star?.model.position.x ?? null, star?.model.position.z ?? null);
      updateCamera(dt);
    },
  );

  // Tab hidden: stop rendering, quiet the chug (and any ringing one-shot),
  // and pause the attract clock — no sound, no drift, no idle chirps in a
  // hidden tab. Tab visible again: everything resumes on the next sync — one
  // shared controller so a flurry of visibility events never double-fires.
  const visibility = createVisibilityController({
    isHidden: () => document.hidden,
    onPause: () => {
      spinLoop.suspend();
      audio.suspend();
      clearInterval(attractTimer);
      attractTimer = 0;
      attractClock.notifyActivity(); // Resets the idle timer — no drift on return.
    },
    onResume: () => {
      spinLoop.resume();
      audio.resume();
      attractTimer = window.setInterval(() => attractClock.tick(), ATTRACT_TICK_MS);
    },
  });
  const onVisibility = () => visibility.sync();
  document.addEventListener('visibilitychange', onVisibility);

  return {
    // Ground→cell mapping lives in the track renderer, next to cellToWorld.
    cellFromPoint: (clientX, clientY) => tracks.cellFromPoint(clientX, clientY),
    cellToScreen: (cell) => tracks.cellToScreen(cell),
    beginGhost: (type) => tracks.beginGhost(type),
    moveGhost: (cell, rotation, valid) => tracks.moveGhost(cell, rotation, valid),
    endGhost: () => tracks.endGhost(),
    pickPiece: (clientX, clientY) => tracks.pickPiece(clientX, clientY),
    setPieceVisible: (id, visible) => tracks.setPieceVisible(id, visible),
    setGridVisible: (visible) => tracks.setGridVisible(visible),
    wagonCount: () =>
      [...rigs.values(), ...spares].reduce((count, rig) => count + rig.wagons.length, 0),
    steamPuffCount: () => visibleSteamPuffs,
    whistlePuff: () => primaryRig()?.puffs.burst(),
    startRide: () => rides.start(),
    stopRide: () => rides.stop(),
    notifyActivity: () => attractClock.notifyActivity(),
    dispose(): void {
      disposed = true;
      spinLoop.stop();
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(attractTimer);
      unsubscribeAttract();
      window.removeEventListener('resize', resize);
      rideAudio.dispose();
      unsubscribeBeat();
      unsubscribeRides();
      unsubscribeTrain();
      audio.dispose();
      tracks.dispose();
      crate.dispose();
      for (const rig of [...rigs.values(), ...spares]) {
        rig.motion.dispose();
        disposeRigVisuals(rig);
      }
      rigs.clear();
      spares.length = 0;
      for (const model of locomotiveTemplates.values()) disposeObject(model);
      locomotiveTemplates.clear();
      for (const wagon of wagonTemplates) disposeObject(wagon);
      wagonTemplates.length = 0;
      for (const dispose of disposables) dispose();
      renderer.dispose();
    },
  };
}
