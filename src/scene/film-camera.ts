import { type PerspectiveCamera, Vector3 } from 'three';
import type { RideController, RideState } from '../state/ride';
import { createAttractCamera } from './attract-camera';
import { GROUND_SIZE } from './ground';
import type { TrainRig } from './train-fleet';

/** Elevated oblique view framing the whole 60-unit meadow in landscape. */
const OVERVIEW_POSITION = new Vector3(0, 52, 44);
const OVERVIEW_LOOK = new Vector3(0, 0, 0);
/** Chase offset over/behind the locomotive while riding (world-relative). */
const FOLLOW_OFFSET = new Vector3(0, 9, 11);
/** Higher = snappier chase. Chosen for a gentle, toy-like glide. */
const CAMERA_EASE = 2.5;
/** Driver eye height above the model origin (cab eye, world units).
 * The kit loco is ~2.7 tall, so the eye must sit above the cab (3.4)
 * or it lands inside the model once the train moves. */
const DRIVER_EYE_HEIGHT = 3.4;
/** Driver eye ahead of the model origin along the heading, world units. */
const DRIVER_EYE_FORWARD = 0.6;
/** Driver look-ahead distance along the heading, world units. */
const DRIVER_LOOK_DISTANCE = 12;

/** What the camera films: chase, driver, or the whole meadow. */
type FilmedTarget =
  | { kind: 'train'; anchor: string }
  | { kind: 'driver'; anchor: string }
  | { kind: 'overview' };

export interface FilmCamera {
  /** Keeps the camera's chosen star sticky across ride changes. */
  sync(ridesList: readonly RideState[]): void;
  /** Each 🎥 tap: overview → chase → driver → overview → wrap. */
  cycle(): void;
  /** The rig the camera is currently filming, or null for the overview. */
  filmedRig(): TrainRig | null;
  /** The ride anchor the camera films, or null for the overview. */
  filmedAnchor(): string | null;
  /** The camera's current view: overview, chase, or driver (e2e witness). */
  filmedView(): 'overview' | 'chase' | 'driver';
  /** The camera's live world position (e2e driver-view witness). */
  cameraSpot(): { x: number; y: number; z: number };
  /** Begin easing into the idle drift (fired by the attract clock). */
  enterIdle(): void;
  /** Begin easing back to the plain overview (fired by activity). */
  exitIdle(): void;
  /** Re-fit the overview framing to the viewport (called on resize). */
  frameOverview(): void;
  /** The per-frame glide: chase while riding, drift while idle, else home. */
  update(dt: number): void;
}

export interface FilmCameraOptions {
  camera: PerspectiveCamera;
  canvas: HTMLCanvasElement;
  rides: RideController;
  /** Reduced motion keeps the fixed overview — no chase, no drift. */
  reducedMotion: boolean;
  /** The fleet's live rig lookup — the chase camera reads it per frame. */
  rigFor(anchor: string): TrainRig | null;
}

export function createFilmCamera({
  camera,
  canvas,
  rides,
  reducedMotion,
  rigFor,
}: FilmCameraOptions): FilmCamera {
  /** The live overview home — stays at OVERVIEW_POSITION in landscape, pulls
   * back in tall viewports so the square meadow still fits the frame. */
  const overviewBase = OVERVIEW_POSITION.clone();
  const attract = createAttractCamera(overviewBase, OVERVIEW_LOOK, { reducedMotion });

  let filmed: FilmedTarget = { kind: 'overview' };

  /** The rig the camera is currently filming, or null for the overview. */
  const filmedRig = (): TrainRig | null =>
    filmed.kind === 'overview' ? null : rigFor(filmed.anchor);
  /**
   * Keeps the camera's chosen star sticky: a running ride keeps the camera
   * even as the rider re-presses ▶ (a second press never yanks the view), and
   * a filmed train that stops hands the camera to the next riding train — or
   * eases home to the overview when the last ride ends. An overview the kid
   * chose with 🎥 stays put until the rides themselves end.
   */
  let ridesWereActive = false;
  const syncFilmed = (ridesList: readonly RideState[]): void => {
    const active = ridesList.length > 0;
    if (filmed.kind === 'train' || filmed.kind === 'driver') {
      const anchor = filmed.anchor;
      if (ridesList.some((ride) => ride.anchor === anchor)) {
        ridesWereActive = active;
        return; // Still filming a running train (chase or driver).
      }
    } else if (ridesWereActive && active) {
      ridesWereActive = active;
      return; // The kid chose the overview mid-ride — keep it.
    }
    filmed = ridesList[0] ? { kind: 'train', anchor: ridesList[0].anchor } : { kind: 'overview' };
    ridesWereActive = active;
  };

  /**
   * Each 🎥 tap: overview → chase → driver → overview → wrap. A fresh ride
   * always re-films the chase view (sync lands on 'train'); the driver rides
   * the same anchor the chase was already filming.
   */
  const cycleFilmTarget = (): void => {
    const ridesList = rides.rides();
    if (filmed.kind === 'train') {
      filmed = { kind: 'driver', anchor: filmed.anchor };
      return;
    }
    if (filmed.kind === 'driver') {
      filmed = { kind: 'overview' };
      return;
    }
    filmed = ridesList[0] ? { kind: 'train', anchor: ridesList[0].anchor } : { kind: 'overview' };
  };

  // In tall viewports the square meadow's far corners slip out of frame. Pull
  // the overview camera back along the same oblique line until the whole
  // 60×60 meadow fits — landscape always keeps the classic framing untouched.
  const frameOverview = (): void => {
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

  // The camera glides after the train while riding, eases home on stop, and
  // wanders slowly while the meadow sits idle. Reduced-motion users keep the
  // fixed overview — no chase, no drift.
  const camLook = OVERVIEW_LOOK.clone();
  const desiredPosition = new Vector3();
  const desiredLook = new Vector3();
  const updateCamera = (dt: number): void => {
    if (reducedMotion) return;
    const star = filmedRig();
    if (star && filmed.kind === 'driver') {
      // Driver eye: the cab, derived from the rig model the ride motion just
      // posed — position ahead of the origin, up at cab height, looking level
      // along the model's current heading (no separate path math).
      // No easing/delay: the driver view snaps to the train every frame so
      // it never trails behind or into the model while moving.
      const yaw = star.model.rotation.y;
      const forwardX = Math.sin(yaw);
      const forwardZ = Math.cos(yaw);
      desiredPosition.set(
        star.model.position.x + forwardX * DRIVER_EYE_FORWARD,
        star.model.position.y + DRIVER_EYE_HEIGHT,
        star.model.position.z + forwardZ * DRIVER_EYE_FORWARD,
      );
      desiredLook.set(
        desiredPosition.x + forwardX * DRIVER_LOOK_DISTANCE,
        desiredPosition.y,
        desiredPosition.z + forwardZ * DRIVER_LOOK_DISTANCE,
      );
      camera.position.copy(desiredPosition);
      camLook.copy(desiredLook);
      camera.lookAt(camLook);
      return;
    } else if (star) {
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

  return {
    sync: syncFilmed,
    cycle: cycleFilmTarget,
    filmedRig,
    filmedAnchor: () => (filmed.kind === 'overview' ? null : filmed.anchor),
    filmedView: () =>
      filmed.kind === 'overview' ? 'overview' : filmed.kind === 'driver' ? 'driver' : 'chase',
    cameraSpot: () => ({
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    }),
    enterIdle: () => attract.enterIdle(),
    exitIdle: () => attract.exitIdle(),
    frameOverview,
    update: updateCamera,
  };
}
