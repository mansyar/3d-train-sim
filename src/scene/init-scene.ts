import type { Object3D } from 'three';
import {
  Box3,
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
import { createRiverBabble } from '../audio/river-babble';
import { createAttractClock } from '../core/attract-clock';
import { actionAtStop, type CargoLoad, loadAfterAction } from '../core/cargo';
import { createDayClock } from '../core/day-clock';
import { createPerfMonitor, createQualityController } from '../core/perf-monitor';
import { riverProximity } from '../core/river';
import type { SceneryKind } from '../core/scenery';
import {
  type Celestial,
  celestialAt,
  nightFactorAt,
  type SkyColors,
  skyColorsAt,
} from '../core/sky-palette';
import {
  type Cell,
  type Edge,
  MEADOW_CELLS,
  neighbourOf,
  type PieceType,
  type Rotation,
} from '../core/track-graph';
import { TRAIN_KINDS, type TrainKind } from '../core/trains';
import { type PortalGlow, portalGlowAt, tunnelRunsOf } from '../core/tunnels';
import { createVisibilityController } from '../core/visibility-controller';
import { WAGON_PRESETS, type WagonPreset, wagonPresetUrls, wagonSlots } from '../core/wagons';
import {
  createWeatherClock,
  intensityOf,
  lerpIntensity,
  type WeatherIntensity,
} from '../core/weather-cycle';
import { createRideController, type RideState } from '../state/ride';
import type { WorldStore } from '../state/world';
import { createAttractCamera } from './attract-camera';
import { createConfetti } from './confetti';
import { disposeObject } from './dispose-object';
import { createDuck, FROZEN_SNOW } from './duck';
import { createFireflies } from './fireflies';
import { createGround, GROUND_SIZE } from './ground';
import { attachHeadlight, type Headlight } from './headlight';
import { createLights, SHADOW_MAP_SIZE } from './lights';
import { loadLocomotive } from './load-locomotive';
import { loadCrate, loadWagon } from './load-wagons';
import { mountPerfDebugOverlay } from './perf-debug-overlay';
import { createPlaceholderCrate } from './placeholder-crate';
import { createPortalGlow } from './portal-glow';
import { createQualityApplier } from './quality-applier';
import { createRenderScale } from './render-scale';
import { createRideMotion, parkFollowersBehind, type RideMotion } from './ride-motion';
import { createRiverWater } from './river-water';
import { createSkyDome } from './sky-dome';
import { startSpinLoop } from './spin-loop';
import { createSteamPuffEmitter, type SteamPuffEmitter } from './steam-puff-emitter';
import { cellToWorld, type PickedItem, startTrackRenderer } from './track-renderer';
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
/** How long the wagon crates take to pop aboard at a station load. */
const CARGO_POP_SECONDS = 0.25;
/** The breath between the two dings of a station welcome. */
const STATION_DING_GAP_MS = 350;
/** Inactivity before the meadow comes alive with a slow camera drift. */
const ATTRACT_IDLE_MS = 25_000;
/** How often the attract clock re-checks its timers (cheap, timer-driven). */
const ATTRACT_TICK_MS = 250;
/** Portal glow reach in cell units — the mouth flares as the engine nears. */
const PORTAL_GLOW_RADIUS = 2.5;

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
  /** The toddler's big toot: the answering train whistles (echoing inside
   *  tunnels) and puffs steam. No-op before a train shows. */
  tootWhistle(): void;
  /** Debug aid: how many trains are riding right now. */
  ridingTrainCount(): number;
  /** Debug aid: the ride anchor the camera films, or null for the overview. */
  filmedAnchor(): string | null;
  /** Begin riding the current layout. Refuses an empty meadow. */
  startRide(): boolean;
  /** Gently stop the ride. */
  stopRide(): void;
  /** Notify the idle-attract clock of toddler activity (touch, press, drag). */
  notifyActivity(): void;
  /** Each tap cycles the chase camera: filmed train → next train → overview. */
  cycleFilmTarget(): void;
  /** The number of riding trains, pushed on every ride change (🎥 visibility). */
  subscribeFilmCount(listener: (count: number) => void): () => void;
  /** Whether any train is riding, pushed on every ride change (▶/⏹ face). */
  subscribeRideMode(listener: (riding: boolean) => void): () => void;
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
  const babble = createRiverBabble(audio);
  const fireflies = createFireflies(scene);
  disposables.push(fireflies.dispose);
  const duck = createDuck(scene, cellToWorld);
  disposables.push(duck.dispose);

  // Performance guardrails: a per-frame FPS probe feeds a quality controller
  // that trims the heaviest effects when frame rate sags (render scale,
  // shadow maps, weather particles). Invisible to the toddler; the only
  // trace is the ?perf=debug overlay for parents debugging a slow device.
  const perfMonitor = createPerfMonitor();
  const qualityApplier = createQualityApplier({
    shadowLight: lights.sun,
    basePixelRatio: Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO),
    baseShadowMapSize: SHADOW_MAP_SIZE,
  });
  const renderScale = createRenderScale(renderer);
  disposables.push(renderScale.dispose);
  const qualityController = createQualityController({
    onLevelChange: (level) => qualityApplier.apply(level),
  });
  const perfDebug = mountPerfDebugOverlay();
  disposables.push(() => perfDebug?.dispose());
  // First paint: reduced-motion users get one static frame, so seed the HUD
  // now (reads honest "—" until the first sample) instead of leaving '…'.
  perfDebug?.update(perfMonitor.averageFps(), qualityController.level);

  // Time of day + weather: pure clocks (driven per animation frame) recolor
  // the sky, ease the lights, drive particles and whiten the meadow. Painted
  // once up front so the reduced-motion static frame still shows a lit
  // mid-morning meadow (frozen ambience under reduced motion).
  const dayClock = createDayClock({ now: () => performance.now() });
  const weatherClock = createWeatherClock({ now: () => performance.now() });
  const sky = createSkyDome(scene);
  const water = createRiverWater(scene);
  /** One night beam per little train — parked spares included. */
  const headlights: Headlight[] = [];
  /** The portals catching those beams at night (one shared warm light). */
  const portalGlowVisual = createPortalGlow(scene);
  disposables.push(portalGlowVisual.dispose);
  /** Open portal mouths in flat [x, z, ...] cell units — rebuilt on edits. */
  const openPortals: number[] = [];
  /** Scratch for the per-frame proximity lookup (zero-alloc frame path). */
  const portalGlow: PortalGlow = { x: 0, z: 0, intensity: 0 };
  const rebuildPortalCache = (): void => {
    openPortals.length = 0;
    const byId = new Map(world.pieces().map((p) => [p.id, p] as const));
    for (const run of tunnelRunsOf(world.pieces())) {
      const piece = byId.get(run.pieceId);
      if (!piece) continue;
      for (const edge of run.openPortals) {
        const n = neighbourOf(piece.cell, edge);
        openPortals.push((piece.cell.x + n.x) / 2, (piece.cell.y + n.y) / 2);
      }
    }
  };
  rebuildPortalCache();
  const unsubscribePortals = world.subscribe(rebuildPortalCache);
  // Scratch objects for the frame path — the palette/intensity calls write
  // into these instead of allocating (spec NFR: no per-frame allocation).
  const skyColors: SkyColors = { top: 0, horizon: 0 };
  const celestial: Celestial = { sun: 0, moon: 0 };
  const intensity: WeatherIntensity = { rain: 0, snow: 0, cloud: 0 };
  /** Quality-scaled copy of the weather bed fed to the particle emitter. */
  const scaledWeather: WeatherIntensity = { rain: 0, snow: 0, cloud: 0 };
  /** Scratch cell for the river-proximity lookup (zero-alloc frame path). */
  const proximityCell: Cell = { x: 0, y: 0 };
  /** World units per meadow cell — matches the track renderer's grid. */
  const cellSize = GROUND_SIZE / MEADOW_CELLS;
  const paintAmbience = (dt = 0.016): void => {
    const fraction = dayClock.fraction;
    sky.update(fraction, skyColorsAt(fraction, skyColors), celestialAt(fraction, celestial));
    const night = nightFactorAt(fraction);
    lights.update(night);
    setGlowNight(night);
    for (const light of headlights) light.update(night);
    // Weather intensity lerps across any active cross-fade.
    const blend = weatherClock.blend;
    const base = blend
      ? lerpIntensity(intensityOf(blend.from), intensityOf(blend.to), blend.t, intensity)
      : intensityOf(weatherClock.weather);
    // The guardrail's L2 halves the particle bed; the emitter's opacity
    // easing makes the trim fade in, and snow accumulation stays full.
    const weatherScale = qualityApplier.weatherScale;
    scaledWeather.rain = base.rain * weatherScale;
    scaledWeather.snow = base.snow * weatherScale;
    scaledWeather.cloud = base.cloud * weatherScale;
    weather.update(dt, scaledWeather);
    ground.setSnow(base.snow);
    tracks.setTunnelSnow(base.snow >= FROZEN_SNOW); // The hill wears winter, like the river.
    tracks.setHillSnow(base.snow >= FROZEN_SNOW); // The hill run's crowns share the gate.
    water.update(skyColors, base.snow, dt); // The river mirrors the sky and ices over.
    ambience.update(base); // Rain patter + wind follow the weather bed.
    // River babble whispers near the water; a frozen river stands the babble
    // down with the duck (same snow gate).
    proximityCell.x = Math.floor((camera.position.x + GROUND_SIZE / 2) / cellSize);
    proximityCell.y = Math.floor((camera.position.z + GROUND_SIZE / 2) / cellSize);
    babble.update(base.snow >= FROZEN_SNOW ? 0 : riverProximity(proximityCell));
    fireflies.update(dt, night, base.rain); // Fireflies own the dry night.
  };
  paintAmbience();
  disposables.push(sky.dispose);
  disposables.push(water.dispose);

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
  // The delivery celebration: a pooled burst at the station. Reduced motion
  // keeps the delivery (crates, count) but skips the flying particles.
  const confetti = createConfetti(scene, () => !reducedMotion);
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

  /** One little train in the scene, serving one riding component. */
  interface TrainRig {
    /** The ride anchor this rig serves ('' while resting between rides). */
    anchor: string;
    /** The locomotive kind this rig's model was built from. */
    kind: TrainKind;
    model: Object3D;
    wagons: Object3D[];
    puffs: SteamPuffEmitter;
    /** The engine's night beam, updated by the ambience paint. */
    headlight: Headlight;
    /** The wagon cargo cycle: empty loads at a stop, loaded delivers. */
    cargo: CargoLoad;
    /** Load pop-in progress, 1 = settled. Sits at 1 unless animating. */
    cargoPop: number;
    motion: RideMotion;
    /** The ride state the motion last began with — a new state ⇒ re-begin. */
    begunWith: RideState | null;
    /** One-shot: where a reused train sits, so it rolls on from there. */
    startNear: { x: number; z: number } | null;
  }

  const rigs = new Map<string, TrainRig>(); // assigned, keyed by ride anchor
  const spares: TrainRig[] = []; // built rigs resting between rides
  const locomotiveTemplates = new Map<TrainKind, Object3D>();
  // Wagon templates by preset, each pair in slot (pulling) order — clones per rig.
  const wagonTemplates = new Map<WagonPreset, (Object3D | null)[]>();
  let crateTemplate: Object3D | null = null; // the wagon-load delivery crate

  /** The cached template pair for one preset, created on first use. */
  const templatesFor = (preset: WagonPreset): (Object3D | null)[] => {
    let pair = wagonTemplates.get(preset);
    if (!pair) {
      pair = wagonSlots().map(() => null);
      wagonTemplates.set(preset, pair);
    }
    return pair;
  };

  /** Clones of one kind's chosen wagon pair, added to the scene in pulling order. */
  const clonePresetWagons = (kind: TrainKind): Object3D[] => {
    const clones: Object3D[] = [];
    for (const template of templatesFor(world.consistFor(kind))) {
      if (!template) continue;
      const clone = template.clone(true);
      scene.add(clone);
      clones.push(clone);
    }
    return clones;
  };

  let spinTarget: Object3D | null = crate.mesh;
  let disposed = false;
  let visibleSteamPuffs = 0;
  let loadedTrain: TrainKind | null = null;
  let loadedPreset: WagonPreset | null = null;

  /** What the chase camera films: one riding train, or the whole meadow. */
  type FilmedTarget = { kind: 'train'; anchor: string } | { kind: 'overview' };
  let filmed: FilmedTarget = { kind: 'overview' };

  /** The rig serving the primary (largest) active ride. */
  const primaryRig = (): TrainRig | null => {
    const primary = rides.rides()[0];
    return primary ? (rigs.get(primary.anchor) ?? null) : null;
  };

  /** The rig the camera is currently filming, or null for the overview. */
  const filmedRig = (): TrainRig | null =>
    filmed.kind === 'train' ? (rigs.get(filmed.anchor) ?? null) : null;

  /**
   * Keeps the camera's chosen star sticky: a running ride keeps the camera
   * even as more trains join (a second ▶ never yanks the view), and a filmed
   * train that stops hands the camera to the next riding train — or eases
   * home to the overview when the last ride ends. An overview the kid chose
   * with 🎥 stays put until the rides themselves end.
   */
  let ridesWereActive = false;
  const syncFilmed = (ridesList: readonly RideState[]): void => {
    const active = ridesList.length > 0;
    if (filmed.kind === 'train') {
      const anchor = filmed.anchor;
      if (ridesList.some((ride) => ride.anchor === anchor)) {
        ridesWereActive = active;
        return; // Still filming a running train.
      }
    } else if (ridesWereActive && active) {
      ridesWereActive = active;
      return; // The kid chose the overview mid-ride — keep it.
    }
    filmed = ridesList[0] ? { kind: 'train', anchor: ridesList[0].anchor } : { kind: 'overview' };
    ridesWereActive = active;
  };

  /** Each 🎥 tap: filmed train → next train → overview → wrap. */
  const cycleFilmTarget = (): void => {
    const ridesList = rides.rides();
    if (filmed.kind === 'train') {
      const anchor = filmed.anchor;
      const index = ridesList.findIndex((ride) => ride.anchor === anchor);
      const next = ridesList[index + 1];
      filmed = next ? { kind: 'train', anchor: next.anchor } : { kind: 'overview' };
      return;
    }
    filmed = ridesList[0] ? { kind: 'train', anchor: ridesList[0].anchor } : { kind: 'overview' };
  };

  /** The UI shows the 🎥 button only while two or more trains ride. */
  const filmCountListeners = new Set<(count: number) => void>();

  /** The UI's ▶/⏹ face follows the real ride state (scoped edits keep riding). */
  const rideModeListeners = new Set<(riding: boolean) => void>();

  /** This rig's live ride state — null while parked or between rides. */
  const rigState = (rig: TrainRig): RideState | null => {
    if (!rig.anchor) return null;
    return rides.rides().find((ride) => ride.anchor === rig.anchor) ?? null;
  };

  /** The train nearest the meadow's heart (where the overview camera looks). */
  const nearestRig = (candidates: Iterable<TrainRig>): TrainRig | null => {
    let nearest: TrainRig | null = null;
    for (const rig of candidates) {
      if (!nearest || rig.model.position.lengthSq() < nearest.model.position.lengthSq()) {
        nearest = rig;
      }
    }
    return nearest;
  };

  /** The one shared chug softens when a riding train pauses at a dead end —
   *  and it ducks gently whenever a train is under the hill. */
  const pausedRigs = new Set<TrainRig>();
  const tunnelRigs = new Set<TrainRig>();
  const syncChugSoftened = (): void => {
    rideAudio.setPaused(pausedRigs.size > 0 || tunnelRigs.size > 0);
  };
  const setRigPaused = (rig: TrainRig, paused: boolean): void => {
    if (paused) pausedRigs.add(rig);
    else pausedRigs.delete(rig);
    syncChugSoftened();
  };
  const setRigInTunnel = (rig: TrainRig, inside: boolean): void => {
    if (inside) tunnelRigs.add(rig);
    else tunnelRigs.delete(rig);
    syncChugSoftened();
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
    const wagons = clonePresetWagons(kind);
    const puffs = createSteamPuffEmitter(model, camera, kind);
    scene.add(puffs.group);
    const headlight = attachHeadlight(model);
    headlights.push(headlight);
    parkFollowersBehind(model, wagons);
    scene.remove(crate.mesh);
    spinTarget = null;
    // Clones share geometry and materials with their cached template. The
    // template owns those GPU resources and disposes them during teardown.
    const rig: TrainRig = {
      anchor: '',
      kind,
      model,
      wagons,
      cargo: 'empty',
      cargoPop: 1,
      puffs,
      headlight,
      motion: null as unknown as RideMotion,
      begunWith: null,
      startNear: null,
    };
    for (const wagon of wagons) attachCrateToWagon(wagon);
    rig.motion = createRideMotion(
      model,
      world,
      () => rigState(rig),
      (paused) => setRigPaused(rig, paused),
      onStationDing,
      wagons,
      (inside) => setRigInTunnel(rig, inside),
      (stationId) => handleStationCargo(rig, stationId),
      (pieceId: string, exit: Edge) => tracks.setSwitchRoad(pieceId, exit),
    );
    return rig;
  };

  /** The delivery crates riding this rig's wagons (attached lazily). */
  const cratesOf = (rig: TrainRig): Object3D[] => {
    const found: Object3D[] = [];
    for (const wagon of rig.wagons) {
      const crate = wagon.getObjectByName('cargo_crate');
      if (crate) found.push(crate);
    }
    return found;
  };

  /** Mounts a delivery crate on a wagon's cargo bed, hidden until loaded. */
  const attachCrateToWagon = (wagon: Object3D): void => {
    if (!crateTemplate || wagon.getObjectByName('cargo_crate')) return;
    const crate = crateTemplate.clone(true);
    crate.visible = false;
    crate.name = 'cargo_crate';
    // max.y is yaw-invariant, so the bed height is exact at any heading;
    // the wagon root is scaled, so the world offset converts to local units.
    const bedTop = new Box3().setFromObject(wagon).max.y;
    crate.position.y = (bedTop - wagon.position.y) / (wagon.scale.y || 1) + 0.02;
    wagon.add(crate);
  };

  /** The load pop-in: a quick ease-out-back so crates bounce aboard. */
  const advanceCargoPop = (rig: TrainRig, dt: number): void => {
    rig.cargoPop = Math.min(1, rig.cargoPop + dt / CARGO_POP_SECONDS);
    const t = rig.cargoPop - 1;
    const overshoot = 1 + 2.70158 * t * t * t + 1.70158 * t * t;
    const scale = Math.max(overshoot, 0.01);
    for (const crate of cratesOf(rig)) crate.scale.setScalar(scale);
  };

  /** Shows the wagons' crates, popping them aboard when loading. */
  const setCargoLoaded = (rig: TrainRig, loaded: boolean): void => {
    rig.cargoPop = 1;
    for (const crate of cratesOf(rig)) {
      crate.visible = loaded;
      crate.scale.setScalar(1);
    }
    if (loaded && !reducedMotion) {
      rig.cargoPop = 0; // The next frames pop them up to full size.
      for (const crate of cratesOf(rig)) crate.scale.setScalar(0.01);
    }
  };

  /**
   * Re-dresses one rig's wagons from its kind's chosen preset. The engine,
   * the ride, and the cargo state stay — only the wagon meshes change. The
   * array refills in place so the ride motion (which holds the reference)
   * keeps posing the new wagons with today's spacing; a riding train's
   * wagons re-pose on the next tick, a spare re-parks behind its engine.
   */
  const dressRigWagons = (rig: TrainRig): void => {
    for (const old of rig.wagons) scene.remove(old);
    rig.wagons.length = 0;
    for (const wagon of clonePresetWagons(rig.kind)) {
      attachCrateToWagon(wagon);
      rig.wagons.push(wagon);
    }
    // New meshes arrive with hidden crates — restore whatever was aboard.
    setCargoLoaded(rig, rig.cargo !== 'empty');
    if (!rig.anchor) parkFollowersBehind(rig.model, rig.wagons);
  };

  /**
   * One stop of the cargo cycle: empty wagons load, loaded wagons deliver.
   * Delivery bumps the station's persisted count (the platform gains a
   * crate via the world subscription) and pops the confetti.
   */
  const handleStationCargo = (rig: TrainRig, stationId: string): void => {
    const action = actionAtStop(rig.cargo);
    rig.cargo = loadAfterAction(action);
    setCargoLoaded(rig, action === 'load');
    if (action !== 'deliver') return;
    // A station lifted mid-ride cannot receive the delivery — the crates
    // simply come off; no orphan count, no celebration.
    const station = world.scenery().find((item) => item.id === stationId);
    if (station) {
      world.deliverCrate(stationId);
      const at = cellToWorld(station.cell);
      confetti.burst(at.x, 0.5, at.z);
    }
  };

  /** Frees a rig's scene objects (kind rebuilds and teardown). */
  const disposeRigVisuals = (rig: TrainRig): void => {
    rig.puffs.dispose();
    scene.remove(rig.puffs.group);
    scene.remove(rig.model);
    for (const wagon of rig.wagons) scene.remove(wagon);
    rig.wagons.length = 0;
    const lightIndex = headlights.indexOf(rig.headlight);
    if (lightIndex !== -1) headlights.splice(lightIndex, 1);
    pausedRigs.delete(rig);
    tunnelRigs.delete(rig);
  };

  /**
   * The spare parked nearest this ride's track — a train already sitting on
   * the loop simply rolls on from where it stopped, and the meadow never
   * gathers two trains on one loop when a farther spare would do.
   */
  const nearestSpareTo = (ride: RideState): TrainRig | null => {
    if (spares.length === 0) return null;
    const piecesById = new Map(world.pieces().map((piece) => [piece.id, piece]));
    let sumX = 0;
    let sumZ = 0;
    let count = 0;
    for (const step of ride.path.steps) {
      const piece = piecesById.get(step.pieceId);
      if (!piece) continue;
      const at = cellToWorld(piece.cell);
      sumX += at.x;
      sumZ += at.z;
      count += 1;
    }
    let nearest: TrainRig | null = null;
    let nearestDist = Infinity;
    for (const spare of spares) {
      const dx = spare.model.position.x - (count > 0 ? sumX / count : 0);
      const dz = spare.model.position.z - (count > 0 ? sumZ / count : 0);
      const d = dx * dx + dz * dz;
      if (d < nearestDist) {
        nearestDist = d;
        nearest = spare;
      }
    }
    return nearest;
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
        // Prefer a spare already parked on this ride's track — it rolls on
        // from where it sits; otherwise build a fresh train.
        const reused = nearestSpareTo(ride);
        if (reused) {
          spares.splice(spares.indexOf(reused), 1);
          rig = reused;
          rig.startNear = { x: rig.model.position.x, z: rig.model.position.z };
        } else {
          const built = createRig();
          if (!built) continue;
          rig = built;
        }
        rigs.set(ride.anchor, rig);
      }
      rig.anchor = ride.anchor;
      // A new state object means the component changed — re-begin; a running
      // ride keeps its exact state object, so its train never loses progress.
      if (rig.begunWith !== ride) {
        rig.begunWith = ride;
        rig.motion.begin(ride, rig.startNear ?? undefined);
        rig.startNear = null;
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
        if (kind === world.train()) {
          // Late-arriving assets complete any swap that was still waiting.
          for (const rig of [...rigs.values(), ...spares]) swapRigKind(rig, kind);
          syncRigs(rides.rides());
        }
      })
      .catch(() => {
        // Kit asset unavailable — the crate remains as the fallback placeholder.
      });
  }

  loadCrate()
    .then((crateModel) => {
      if (disposed) {
        disposeObject(crateModel);
        return;
      }
      crateTemplate = crateModel;
      // Rigs built before the crate arrived get their cargo now.
      for (const rig of [...rigs.values(), ...spares]) {
        for (const wagon of rig.wagons) attachCrateToWagon(wagon);
      }
    })
    .catch(() => {
      // Crate asset unavailable — trains ride without cargo visuals.
    });

  for (const preset of WAGON_PRESETS) {
    const urls = wagonPresetUrls(preset);
    for (const [index, slot] of wagonSlots().entries()) {
      loadWagon(urls[slot])
        .then((wagon) => {
          if (disposed) {
            disposeObject(wagon);
            return;
          }
          templatesFor(preset)[index] = wagon; // Slot order — pulling order preserved.
          // Rigs pulling this preset gain their new wagons now (the parked
          // opener included); a riding train's wagons re-pose on the next tick.
          for (const rig of [...rigs.values(), ...spares]) {
            if (world.consistFor(rig.kind) !== preset) continue;
            dressRigWagons(rig);
          }
          syncRigs(rides.rides());
        })
        .catch(() => {
          // Wagon asset unavailable — the train chugs on without it.
        });
    }
  }

  const unsubscribeBeat = audio.onChugBeat(() => {
    if (rides.mode() !== 'riding') return;
    for (const rig of rigs.values()) rig.puffs.emit();
  });
  const unsubscribeRides = rides.subscribe((mode, ridesList) => {
    syncFilmed(ridesList);
    syncRigs(ridesList);
    for (const rig of rigs.values()) rig.puffs.setEmitting(mode === 'riding');
    for (const listener of filmCountListeners) listener(ridesList.length);
    for (const listener of rideModeListeners) listener(mode === 'riding');
  });

  /** Swaps one rig's locomotive in place — rides keep rolling (spec R3). */
  const swapRigKind = (rig: TrainRig, kind: TrainKind): void => {
    if (rig.kind === kind) return;
    const template = locomotiveTemplates.get(kind);
    if (!template) return; // new kind's assets not ready — keep the current model
    rig.puffs.dispose();
    scene.remove(rig.puffs.group);
    scene.remove(rig.model); // The old engine leaves the meadow — no ghosts.
    const lightIndex = headlights.indexOf(rig.headlight);
    if (lightIndex !== -1) headlights.splice(lightIndex, 1);
    const model = template.clone(true);
    scene.add(model);
    rig.kind = kind;
    rig.model = model;
    rig.headlight = attachHeadlight(model);
    headlights.push(rig.headlight);
    rig.puffs = createSteamPuffEmitter(model, camera, kind);
    scene.add(rig.puffs.group);
    rig.puffs.setEmitting(rides.mode() === 'riding');
    // The motion re-poses the new engine (and its wagons) exactly where the
    // old one stood — same path distance, same direction, no restart.
    rig.motion.setModel(model);
  };

  const unsubscribeTrain = world.subscribe(() => {
    const kind = world.train();
    const preset = world.consistFor(kind);
    if (kind === loadedTrain && preset === loadedPreset) return;
    const kindChanged = kind !== loadedTrain;
    const presetChanged = preset !== loadedPreset;
    loadedTrain = kind;
    loadedPreset = preset;
    for (const rig of [...rigs.values(), ...spares]) {
      if (kindChanged) swapRigKind(rig, kind);
      if (presetChanged) dressRigWagons(rig);
    }
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
    const star = filmedRig();
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
      perfMonitor.sample(dt);
      qualityController.update(perfMonitor.verdict(), dt);
      qualityApplier.update(dt);
      // The HUD is the only consumer of the window average — skip the scan
      // when the overlay isn't mounted.
      if (perfDebug) perfDebug.update(perfMonitor.averageFps(), qualityController.level);
      dayClock.tick();
      weatherClock.tick();
      paintAmbience(dt);
      visibleSteamPuffs = 0;
      // Every little train ticks — parked spares too, so a pre-ride whistle
      // burst still puffs from the meadow's resting train.
      for (const rig of [...rigs.values(), ...spares]) {
        rig.motion.update(dt);
        rig.puffs.update(dt);
        if (rig.cargoPop < 1) advanceCargoPop(rig, dt);
        visibleSteamPuffs += rig.puffs.activeCount();
      }
      confetti.update(dt);
      // Critters idle always and hop while a riding train passes close.
      // Parked spares report null — hops read as passing, not presence.
      // Mood: rain shrinks their excitement radius, night is bedtime.
      const star = primaryRig();
      const night = nightFactorAt(dayClock.fraction);
      const blend = weatherClock.blend;
      const weatherNow = blend
        ? lerpIntensity(intensityOf(blend.from), intensityOf(blend.to), blend.t)
        : intensityOf(weatherClock.weather);
      tracks.updateCritters(dt, star?.model.position.x ?? null, star?.model.position.z ?? null, {
        rain: weatherNow.rain,
        night,
      });
      // The duck drifts the S-curve and wiggles for passing trains; night is
      // bedtime, and a frozen river (snow) parks it on the ice.
      duck.update(dt, star?.model.position.x ?? null, star?.model.position.z ?? null, {
        night,
        snow: weatherNow.snow,
      });
      // The headlight catches the portals at night: a warm glow at the open
      // arch mouth nearest the engine, keyed to night factor and proximity.
      if (star && night > 0 && openPortals.length > 0) {
        portalGlowAt(
          openPortals,
          (star.model.position.x + GROUND_SIZE / 2) / cellSize - 0.5,
          (star.model.position.z + GROUND_SIZE / 2) / cellSize - 0.5,
          PORTAL_GLOW_RADIUS,
          portalGlow,
        );
      } else {
        portalGlow.intensity = 0;
      }
      portalGlowVisual.update(portalGlow, night);
      updateCamera(dt);
    },
    // Render-scale trims go through the offscreen blit — the canvas drawing
    // buffer never resizes, so the compositor keeps presenting frames.
    () => renderScale.render(scene, camera, qualityApplier.renderScale),
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
      babble.suspend();
      perfMonitor.setPaused(true); // Hidden tab ≠ device strain (spec FR1).
      clearInterval(attractTimer);
      attractTimer = 0;
      attractClock.notifyActivity(); // Resets the idle timer — no drift on return.
    },
    onResume: () => {
      spinLoop.resume();
      audio.resume();
      ambience.resume();
      babble.resume();
      perfMonitor.setPaused(false);
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
    tootWhistle: () => {
      // The filmed train answers; from the overview the nearest riding train
      // does; before any ride, the parked opener train answers. Inside a
      // tunnel run the toot trails its soft echo.
      const target = filmedRig() ?? nearestRig(rigs.values()) ?? nearestRig(spares);
      audio.whistle(world.train(), target !== null && tunnelRigs.has(target));
      target?.puffs.burst();
    },
    startRide: () => rides.start(),
    stopRide: () => rides.stop(),
    notifyActivity: () => attractClock.notifyActivity(),
    cycleFilmTarget: () => cycleFilmTarget(),
    ridingTrainCount: () => rigs.size,
    filmedAnchor: () => (filmed.kind === 'train' ? filmed.anchor : null),
    subscribeFilmCount(listener) {
      filmCountListeners.add(listener);
      return () => {
        filmCountListeners.delete(listener);
      };
    },
    subscribeRideMode(listener) {
      rideModeListeners.add(listener);
      return () => {
        rideModeListeners.delete(listener);
      };
    },
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
      unsubscribePortals();
      audio.dispose();
      tracks.dispose();
      crate.dispose();
      confetti.dispose();
      if (crateTemplate) disposeObject(crateTemplate);
      for (const rig of [...rigs.values(), ...spares]) {
        rig.motion.dispose();
        disposeRigVisuals(rig);
      }
      rigs.clear();
      spares.length = 0;
      for (const model of locomotiveTemplates.values()) disposeObject(model);
      locomotiveTemplates.clear();
      for (const pair of wagonTemplates.values()) {
        for (const wagon of pair) {
          if (wagon) disposeObject(wagon);
        }
      }
      wagonTemplates.clear();
      for (const dispose of disposables) dispose();
      ambience.dispose();
      babble.dispose();
      disposeWindowGlows();
      renderer.dispose();
    },
  };
}
