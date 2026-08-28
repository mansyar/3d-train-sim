import type { Object3D } from 'three';
import { PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import type { AudioController } from '../audio/audio-controller';
import { bindRideAudio } from '../audio/ride-audio';
import type { SceneryKind } from '../core/scenery';
import type { Cell, PieceType, Rotation } from '../core/track-graph';
import { createRideController } from '../state/ride';
import type { WorldStore } from '../state/world';
import { disposeObject } from './dispose-object';
import { createGround } from './ground';
import { createLights } from './lights';
import { loadLocomotive } from './load-locomotive';
import { createPlaceholderCrate } from './placeholder-crate';
import { createRideMotion } from './ride-motion';
import { startSpinLoop } from './spin-loop';
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

  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.copy(OVERVIEW_POSITION);
  camera.lookAt(OVERVIEW_LOOK);

  const disposables: Array<() => void> = [];
  disposables.push(createLights(scene));
  disposables.push(createGround(scene));
  const tracks = startTrackRenderer(scene, camera, canvas, world);
  const crate = createPlaceholderCrate();
  scene.add(crate.mesh);

  const rides = createRideController(world);
  // Motion and sound stay married: ride starts → chug starts, always.
  const rideAudio = bindRideAudio(rides, audio);
  let rideUpdate: ((dt: number) => void) | null = null;
  let locomotive: Object3D | null = null;

  let spinTarget: Object3D | null = crate.mesh;
  let disposed = false;
  loadLocomotive()
    .then((model) => {
      if (disposed) {
        // Tore down before the model arrived — release its GPU resources.
        disposeObject(model);
        return;
      }
      scene.remove(crate.mesh);
      crate.dispose();
      scene.add(model);
      // The ride owns the locomotive from here; the showcase spin pauses.
      spinTarget = null;
      locomotive = model;
      rideUpdate = createRideMotion(model, world, rides, rideAudio.setPaused).update;
    })
    .catch(() => {
      // Kit asset unavailable — the crate remains as the fallback placeholder.
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
    startRide: () => rides.start(),
    stopRide: () => rides.stop(),
    dispose(): void {
      disposed = true;
      stopSpin();
      window.removeEventListener('resize', resize);
      rideAudio.dispose();
      tracks.dispose();
      crate.dispose();
      for (const dispose of disposables) dispose();
      renderer.dispose();
    },
  };
}
