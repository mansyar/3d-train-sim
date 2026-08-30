import type { Object3D } from 'three';
import {
  NeutralToneMapping,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { createAmbienceAudio } from '../audio/ambience-audio';
import type { AudioController } from '../audio/audio-controller';
import { bindRideAudio } from '../audio/ride-audio';
import { createAttractClock } from '../core/attract-clock';
import { createDayClock } from '../core/day-clock';
import type { SceneryKind } from '../core/scenery';
import { celestialAt, nightFactorAt, skyColorsAt } from '../core/sky-palette';
import type { Cell, PieceType, Rotation } from '../core/track-graph';
import { TRAIN_KINDS, type TrainKind } from '../core/trains';
import { createVisibilityController } from '../core/visibility-controller';
import { wagonSlots } from '../core/wagons';
import { createWeatherClock, intensityOf, lerpIntensity } from '../core/weather-cycle';
import { createRideController } from '../state/ride';
import type { WorldStore } from '../state/world';
import { createAttractCamera } from './attract-camera';
import { disposeObject } from './dispose-object';
import { createFireflies } from './fireflies';
import { createGround, GROUND_SIZE } from './ground';
import { attachHeadlight, type Headlight } from './headlight';
import { createLights } from './lights';
import { loadLocomotive } from './load-locomotive';
import { loadWagon } from './load-wagons';
import { createPlaceholderCrate } from './placeholder-crate';
import { createRideMotion, parkFollowersBehind } from './ride-motion';
import { createSkyDome } from './sky-dome';
import { startSpinLoop } from './spin-loop';
import { createSteamPuffEmitter, type SteamPuffEmitter } from './steam-puff-emitter';
import { type PickedItem, startTrackRenderer } from './track-renderer';
import { createWeatherParticles } from './weather-particles';
import { disposeWindowGlows, setGlowNight } from './window-glow';

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
  const lights = createLights(scene);
  disposables.push(lights.dispose);
  const ground = createGround(scene);
  disposables.push(ground.dispose);
  const tracks = startTrackRenderer(scene, camera, canvas, world, audio);
  const weather = createWeatherParticles(scene);
  disposables.push(weather.dispose);
  const ambience = createAmbienceAudio(audio);
  const fireflies = createFireflies(scene);
  disposables.push(fireflies.dispose);

  // Time of day + weather: pure clocks (driven per animation frame) recolor
  // the sky, ease the lights, drive particles and whiten the meadow. Painted
  // once up front so the reduced-motion static frame still shows a lit
  // mid-morning meadow (frozen ambience under reduced motion).
  const dayClock = createDayClock({ now: () => performance.now() });
  const weatherClock = createWeatherClock({ now: () => performance.now() });
  const sky = createSkyDome(scene);
  const paintAmbience = (dt = 0.016): void => {
    const fraction = dayClock.fraction;
    sky.update(fraction, skyColorsAt(fraction), celestialAt(fraction));
    const night = nightFactorAt(fraction);
    lights.update(night);
    setGlowNight(night);
    headlight?.update(night);
    // Weather intensity lerps across any active cross-fade.
    const blend = weatherClock.blend;
    const base = blend
      ? lerpIntensity(intensityOf(blend.from), intensityOf(blend.to), blend.t)
      : intensityOf(weatherClock.weather);
    weather.update(dt, base);
    ground.setSnow(base.snow);
    ambience.update(base); // Rain patter + wind follow the weather bed.
    fireflies.update(dt, night, base.rain); // Fireflies own the dry night.
  };
  paintAmbience();
  disposables.push(sky.dispose);

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
      // ...and the critters are asleep at night (fireflies take the shift).
      if (nightFactorAt(dayClock.fraction) >= 0.6) return;
      audio.chirp(event.critter);
      tracks.hopCritter(event.critter);
    }
  });
  let attractTimer = window.setInterval(() => attractClock.tick(), ATTRACT_TICK_MS);

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
  let headlight: Headlight | null = null;
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
    headlight = attachHeadlight(model);
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
    const riding = rides.mode() === 'riding' && locomotive !== null;
    if (riding && locomotive) {
      desiredPosition.copy(locomotive.position).add(FOLLOW_OFFSET);
      desiredLook.copy(locomotive.position);
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
      dayClock.tick();
      weatherClock.tick();
      paintAmbience(dt);
      rideUpdate?.(dt);
      // Critters idle always and hop while the riding train passes close.
      // A parked train reports null — hops read as passing, not presence.
      // Mood: rain shrinks their excitement radius, night is bedtime.
      const riding = rides.mode() === 'riding' && locomotive !== null;
      const trainX = riding && locomotive ? locomotive.position.x : null;
      const trainZ = riding && locomotive ? locomotive.position.z : null;
      const night = nightFactorAt(dayClock.fraction);
      const blend = weatherClock.blend;
      const rainNow = blend
        ? lerpIntensity(intensityOf(blend.from), intensityOf(blend.to), blend.t).rain
        : intensityOf(weatherClock.weather).rain;
      tracks.updateCritters(dt, trainX, trainZ, { rain: rainNow, night });
      steamPuffs?.update(dt);
      visibleSteamPuffs = steamPuffs?.activeCount() ?? 0;
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
      ambience.suspend();
      clearInterval(attractTimer);
      attractTimer = 0;
      attractClock.notifyActivity(); // Resets the idle timer — no drift on return.
    },
    onResume: () => {
      spinLoop.resume();
      audio.resume();
      ambience.resume();
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
    wagonCount: () => wagonSet.filter((wagon) => wagon !== null).length,
    steamPuffCount: () => visibleSteamPuffs,
    whistlePuff: () => steamPuffs?.burst(),
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
      ambience.dispose();
      disposeWindowGlows();
      renderer.dispose();
    },
  };
}
