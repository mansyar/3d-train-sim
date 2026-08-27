import type { Object3D } from 'three';
import { PerspectiveCamera, Plane, Raycaster, Scene, Vector2, Vector3, WebGLRenderer } from 'three';
import type { Cell } from '../core/track-graph';
import { MEADOW_CELLS } from '../core/track-graph';
import type { WorldStore } from '../state/world';
import { disposeObject } from './dispose-object';
import { createGround, GROUND_SIZE } from './ground';
import { createLights } from './lights';
import { loadLocomotive } from './load-locomotive';
import { createPlaceholderCrate } from './placeholder-crate';
import { startSpinLoop } from './spin-loop';
import { startTrackRenderer } from './track-renderer';

/** Pixel ratio cap: tablet GPUs render crisp without melting the battery. */
const MAX_PIXEL_RATIO = 2;

/** World units per grid cell — the 16×16 meadow tiles the 60-unit mat. */
const CELL_SIZE = GROUND_SIZE / MEADOW_CELLS;

export interface SceneHandle {
  dispose(): void;
  /** The meadow cell under a screen point, or null off-meadow. */
  cellFromPoint(clientX: number, clientY: number): Cell | null;
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
  const tracks = startTrackRenderer(scene, world);
  const crate = createPlaceholderCrate();
  scene.add(crate.mesh);

  let spinTarget: Object3D = crate.mesh;
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
      spinTarget = model;
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

  const stopSpin = startSpinLoop(renderer, scene, camera, () => spinTarget);

  // ---- Screen point → meadow cell ---------------------------------------
  const raycaster = new Raycaster();
  const groundPlane = new Plane(new Vector3(0, 1, 0), 0);
  const pointerNdc = new Vector2();
  const groundHit = new Vector3();

  const cellFromPoint = (clientX: number, clientY: number): Cell | null => {
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
  };

  return {
    cellFromPoint,
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
