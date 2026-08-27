import { registerSW } from 'virtual:pwa-register';

import { initScene, type SceneHandle } from './scene/init-scene';
import { createWorldStore } from './state/world';
import { mountApp } from './ui/app';

import './style.css';

registerSW({ immediate: true });

const root = document.getElementById('app');
if (root) {
  const world = createWorldStore();
  let scene: SceneHandle | null = null;
  const canvas = mountApp(root, {
    world,
    // The scene does not exist until the canvas mounts — bind late.
    cellFromPoint: (clientX, clientY) => scene?.cellFromPoint(clientX, clientY) ?? null,
  });
  scene = initScene(canvas, world);
}
