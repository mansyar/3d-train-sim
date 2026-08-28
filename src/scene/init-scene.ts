import type { Object3D } from 'three';
import { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
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
import { type PickedPiece, startTrackRenderer } from './track-renderer';

/** Pixel ratio cap: tablet GPUs render crisp without melting the battery. */
const MAX_PIXEL_RATIO = 2;

export interface SceneHandle {
  dispose(): void;
  /** The meadow cell under a screen point, or null off-meadow. */
  cellFromPoint(clientX: number, clientY: number): Cell | null;
  /** In-scene ghost preview of the piece being dragged from the drawer. */
  beginGhost(type: PieceType): void;
  moveGhost(cell: Cell | null, rotation: Rotation, valid: boolean): void;
  endGhost(): void;
  /** The placed piece under a screen point, for relocate/return drags. */
  pickPiece(clientX: number, clientY: number): PickedPiece | null;
  /** Hide/show a placed clone (the ghost stands in while it is dragged). */
  setPieceVisible(id: string, visible: boolean): void;
  /** Begin riding the current layout. Refuses an empty meadow. */
  startRide(): boolean;
  /** Gently stop the ride. */
  stopRide(): void;
}

export function initScene(canvas: HTMLCanvasElement, world: WorldStore): SceneHandle {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));

  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 200);
  // Elevated oblique view framing the whole 60-unit meadow.
  camera.position.set(0, 52, 44);
  camera.lookAt(0, 0, 0);

  const disposables: Array<() => void> = [];
  disposables.push(createLights(scene));
  disposables.push(createGround(scene));
  const tracks = startTrackRenderer(scene, camera, canvas, world);
  const crate = createPlaceholderCrate();
  scene.add(crate.mesh);

  const rides = createRideController(world);
  let rideUpdate: ((dt: number) => void) | null = null;

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
      rideUpdate = createRideMotion(model, world, rides).update;
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

  const stopSpin = startSpinLoop(
    renderer,
    scene,
    camera,
    () => spinTarget,
    (dt) => rideUpdate?.(dt),
  );

  return {
    // Ground→cell mapping lives in the track renderer, next to cellToWorld.
    cellFromPoint: (clientX, clientY) => tracks.cellFromPoint(clientX, clientY),
    beginGhost: (type) => tracks.beginGhost(type),
    moveGhost: (cell, rotation, valid) => tracks.moveGhost(cell, rotation, valid),
    endGhost: () => tracks.endGhost(),
    pickPiece: (clientX, clientY) => tracks.pickPiece(clientX, clientY),
    setPieceVisible: (id, visible) => tracks.setPieceVisible(id, visible),
    startRide: () => rides.start(),
    stopRide: () => rides.stop(),
    dispose(): void {
      disposed = true;
      stopSpin();
      window.removeEventListener('resize', resize);
      tracks.dispose();
      crate.dispose();
      for (const dispose of disposables) dispose();
      renderer.dispose();
    },
  };
}
