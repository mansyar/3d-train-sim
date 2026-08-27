import type { Object3D } from 'three';
import { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { createGround } from './ground';
import { createLights } from './lights';
import { loadLocomotive } from './load-locomotive';
import { createPlaceholderCrate } from './placeholder-crate';
import { startSpinLoop } from './spin-loop';

/** Pixel ratio cap: tablet GPUs render crisp without melting the battery. */
const MAX_PIXEL_RATIO = 2;

export interface SceneHandle {
  dispose(): void;
}

export function initScene(canvas: HTMLCanvasElement): SceneHandle {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));

  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(6, 7, 9);
  camera.lookAt(0, 0, 0);

  const disposables: Array<() => void> = [];
  disposables.push(createLights(scene));
  disposables.push(createGround(scene));
  const crate = createPlaceholderCrate();
  scene.add(crate.mesh);

  let spinTarget: Object3D = crate.mesh;
  let disposed = false;
  loadLocomotive()
    .then((model) => {
      if (disposed) return;
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

  return {
    dispose(): void {
      disposed = true;
      stopSpin();
      window.removeEventListener('resize', resize);
      crate.dispose();
      for (const dispose of disposables) dispose();
      renderer.dispose();
    },
  };
}
