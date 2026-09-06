import type { Object3D } from 'three';
import {
  NeutralToneMapping,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { createAmbienceAudio } from '../audio/ambience-audio';
import type { AudioController } from '../audio/audio-controller';
import { bindRideAudio } from '../audio/ride-audio';
import { createRiverBabble } from '../audio/river-babble';
import { createAttractClock } from '../core/attract-clock';
import { createPerfMonitor, createQualityController } from '../core/perf-monitor';
import type { SceneryKind } from '../core/scenery';
import type { Cell, PieceType, Rotation } from '../core/track-graph';
import { createVisibilityController } from '../core/visibility-controller';
import { createRideController } from '../state/ride';
import type { WorldStore } from '../state/world';
import { createBarge } from './barge';
import { createConfetti } from './confetti';
import { createDayAmbience } from './day-ambience';
import { createDuck } from './duck';
import { createFilmCamera } from './film-camera';
import { createGround } from './ground';
import type { Headlight } from './headlight';
import { createLights, SHADOW_MAP_SIZE } from './lights';
import { mountPerfDebugOverlay } from './perf-debug-overlay';
import { createPlaceholderCrate } from './placeholder-crate';
import { createQualityApplier } from './quality-applier';
import { createRenderScale } from './render-scale';
import { createRigCargo } from './rig-cargo';
import type { SceneContext } from './scene-context';
import { startSpinLoop } from './spin-loop';
import { cellToWorld, type PickedItem, startTrackRenderer } from './track-renderer';
import { createTrainFleet } from './train-fleet';

/** Pixel ratio cap: tablet GPUs render crisp without melting the battery. */
const MAX_PIXEL_RATIO = 2;
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
  /** Debug aid: the filmed (or primary) train's live pace factor. */
  trainPace(): number;
  /** The toddler's big toot: the answering train whistles (echoing inside
   *  tunnels) and puffs steam. No-op before a train shows. */
  tootWhistle(): void;
  /** Debug aid: how many trains are riding right now. */
  ridingTrainCount(): number;
  /** Debug aid: the live crossing phases ('idle'|'closing'|'active'|'lifting'). */
  crossingPhases(): string[];
  /** Debug aid: whether the crossing bell edge is ringing right now. */
  bellRinging(): boolean;
  /** Debug aid: the first balloon's drift from its base, in cells. */
  delightBalloonDrift(): { x: number; z: number; altitude: number } | null;
  /** Debug aid: force the delight toys' winter state (e2e determinism). */
  setDelightSnow(visible: boolean): void;
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

  const disposables: Array<() => void> = [];
  const lights = createLights(scene);
  disposables.push(lights.dispose);
  const ground = createGround(scene);
  disposables.push(ground.dispose);
  const tracks = startTrackRenderer(scene, camera, canvas, world, audio);
  const ambience = createAmbienceAudio(audio);
  const babble = createRiverBabble(audio);
  const duck = createDuck(scene, cellToWorld);
  disposables.push(duck.dispose);
  const barge = createBarge(scene, cellToWorld);
  disposables.push(barge.dispose);

  // Performance guardrails: a per-frame FPS probe feeds a quality controller
  // that trims the heaviest effects when frame rate sags (render scale,
  // shadow maps, weather particles). Invisible to the toddler; the only
  // trace is the ?perf=debug overlay for parents debugging a slow device.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const perfMonitor = createPerfMonitor();
  const qualityApplier = createQualityApplier({
    shadowLight: lights.sun,
    basePixelRatio: Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO),
    baseShadowMapSize: SHADOW_MAP_SIZE,
  });
  const renderScale = createRenderScale(renderer);
  disposables.push(renderScale.dispose);
  /** The shared refs every scene subsystem reads (built once, passed down). */
  const context: SceneContext = {
    renderer,
    scene,
    camera,
    canvas,
    world,
    audio,
    tracks,
    lights,
    qualityApplier,
    renderScale,
    reducedMotion,
  };
  const qualityController = createQualityController({
    onLevelChange: (level) => context.qualityApplier.apply(level),
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
  /** One night beam per little train — parked spares included. */
  const headlights: Headlight[] = [];
  const dayAmbience = createDayAmbience({ context, headlights, ambience, babble, ground });
  dayAmbience.paint();
  disposables.push(dayAmbience.dispose);

  const crate = createPlaceholderCrate();
  scene.add(crate.mesh);
  let spinTarget: Object3D | null = crate.mesh;

  const rides = createRideController(world);
  // Motion and sound stay married: ride starts → chug starts, always.
  const rideAudio = bindRideAudio(rides, audio);

  // Attract life: after a quiet 25 s the meadow stirs — a slow camera drift
  // (the film camera's idle phase) and, later in the track, quiet critter
  // chirps. The clock is pure logic driven by a cheap interval, so it stays
  // alive even under reduced motion (static frame, no RAF loop). Any toddler
  // touch calls notifyActivity() through the SceneHandle.
  // The delivery celebration: a pooled burst at the station. Reduced motion
  // keeps the delivery (crates, count) but skips the flying particles.
  const confetti = createConfetti(scene, () => !reducedMotion);
  const attractClock = createAttractClock(ATTRACT_IDLE_MS, {
    now: () => performance.now(),
    reducedMotion,
  });
  let attractTimer = window.setInterval(() => attractClock.tick(), ATTRACT_TICK_MS);

  // The little-train fleet: rigs, template loading, the cargo cycle. The
  // assembler hands it the shared context and stays out of its internals.
  const cargo = createRigCargo({ world, confetti, reducedMotion, cellToWorld });
  const fleet = createTrainFleet({
    context,
    rides,
    rideAudio,
    headlights,
    cargo,
    onFirstTrain: () => {
      // A real train replaces the spinning placeholder crate.
      scene.remove(crate.mesh);
      spinTarget = null;
    },
  });

  /** The UI shows the 🎥 button only while two or more trains ride. */
  const filmCountListeners = new Set<(count: number) => void>();

  /** The UI's ▶/⏹ face follows the real ride state (scoped edits keep riding). */
  const rideModeListeners = new Set<(riding: boolean) => void>();

  // The chase camera: film-target stickiness, the 🎥 cycle, the overview
  // framing, the follow glide, and the idle drift (one module, one job).
  const filmCamera = createFilmCamera({
    camera,
    canvas,
    rides,
    reducedMotion,
    rigFor: (anchor) => fleet.rigFor(anchor),
  });

  const unsubscribeAttract = attractClock.subscribe((event) => {
    if (event.kind === 'drift') filmCamera.enterIdle();
    else if (event.kind === 'state' && event.state === 'active') filmCamera.exitIdle();
    else if (event.kind === 'chirp') {
      // Quiet meadow chirps stay out of the train's moment — no chirping mid-ride.
      if (rides.mode() === 'riding') return;
      // ...and the critters are asleep at night (fireflies take the shift).
      if (dayAmbience.nightFactor() >= 0.6) return;
      audio.chirp(event.critter);
      tracks.hopCritter(event.critter);
    }
  });

  const unsubscribeRides = rides.subscribe((mode, ridesList) => {
    filmCamera.sync(ridesList);
    fleet.sync(ridesList);
    fleet.setEmitting(mode === 'riding');
    for (const listener of filmCountListeners) listener(ridesList.length);
    for (const listener of rideModeListeners) listener(mode === 'riding');
  });

  const resize = () => {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    filmCamera.frameOverview();
  };
  resize();
  window.addEventListener('resize', resize);

  let visibleSteamPuffs = 0;

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
      dayAmbience.tick();
      dayAmbience.paint(dt);
      visibleSteamPuffs = fleet.update(dt);
      // One capped chug loop, riding the filmed train's live pace — the
      // camera's train sets the tempo. The rate glides with the pace ramp
      // (never a jump) and waits silently while muted or parked.
      const voice = filmCamera.filmedRig() ?? fleet.primary();
      audio.setChugRate(voice?.motion.pace() ?? 1);
      confetti.update(dt);
      // Critters idle always and hop while a riding train passes close.
      // Parked spares report null — hops read as passing, not presence.
      // Mood: rain shrinks their excitement radius, night is bedtime.
      const star = fleet.primary();
      const night = dayAmbience.nightFactor();
      const weatherNow = dayAmbience.weather();
      tracks.updateCritters(dt, star?.model.position.x ?? null, star?.model.position.z ?? null, {
        rain: weatherNow.rain,
        night,
      });
      // The gates watch every riding train: arms swing, lanterns blink, the
      // bell rings while any crossing is awake.
      tracks.updateCrossings(dt, fleet.crossingSpots(), night);
      // The delight toys keep their charm loop: sails turn, the carousel
      // spins, balloons wander their neighborhood (frozen in reduced motion).
      tracks.updateDelight(dt);
      // The duck drifts the S-curve and wiggles for passing trains; night is
      // bedtime, and a frozen river (snow) parks it on the ice.
      duck.update(dt, star?.model.position.x ?? null, star?.model.position.z ?? null, {
        night,
        snow: weatherNow.snow,
      });
      // The barge drifts the same S-curve, slower and heavier — night is
      // bedtime and a frozen river ices it in; the swell never stops.
      barge.update(dt, { night, snow: weatherNow.snow });
      // The headlight catches the portals at night: a warm glow at the open
      // arch mouth nearest the engine, keyed to night factor and proximity.
      dayAmbience.updatePortalGlow(
        star ? { x: star.model.position.x, z: star.model.position.z } : null,
      );
      filmCamera.update(dt);
    },
    // Render-scale trims go through the offscreen blit — the canvas drawing
    // buffer never resizes, so the compositor keeps presenting frames.
    () => context.renderScale.render(scene, camera, context.qualityApplier.renderScale),
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
    wagonCount: () => fleet.wagonCount(),
    steamPuffCount: () => visibleSteamPuffs,
    // Dev/e2e witness: the filmed (or primary) train's live pace factor —
    // personality × grade, eased. Lets specs prove labor/breeze directly.
    trainPace: () => (filmCamera.filmedRig() ?? fleet.primary())?.motion.pace() ?? 1,
    tootWhistle: () => {
      // The filmed train answers; from the overview the nearest riding train
      // does; before any ride, the parked opener train answers. Inside a
      // tunnel run the toot trails its soft echo.
      const target = filmCamera.filmedRig() ?? fleet.nearest();
      audio.whistle(world.train(), target !== null && fleet.inTunnel(target));
      target?.puffs.burst();
    },
    startRide: () => rides.start(),
    stopRide: () => rides.stop(),
    notifyActivity: () => attractClock.notifyActivity(),
    cycleFilmTarget: () => filmCamera.cycle(),
    ridingTrainCount: () => fleet.ridingCount(),
    crossingPhases: () => tracks.crossingPhases(),
    bellRinging: () => tracks.bellRinging(),
    delightBalloonDrift: () => tracks.delightBalloonDrift(),
    setDelightSnow: (visible: boolean) => tracks.setDelightSnow(visible),
    filmedAnchor: () => filmCamera.filmedAnchor(),
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
      spinLoop.stop();
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(attractTimer);
      unsubscribeAttract();
      window.removeEventListener('resize', resize);
      rideAudio.dispose();
      unsubscribeRides();
      audio.dispose();
      tracks.dispose();
      crate.dispose();
      confetti.dispose();
      cargo.dispose();
      fleet.dispose();
      for (const dispose of disposables) dispose();
      ambience.dispose();
      babble.dispose();
      renderer.dispose();
    },
  };
}
