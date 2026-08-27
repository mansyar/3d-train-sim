import { registerSW } from 'virtual:pwa-register';

import { initScene } from './scene/init-scene';
import { mountApp } from './ui/app';

import './style.css';

registerSW({ immediate: true });

const root = document.getElementById('app');
if (root) {
  const canvas = mountApp(root);
  initScene(canvas);
}
