import { registerSW } from 'virtual:pwa-register';

import { mountApp } from './ui/app';

import './style.css';

registerSW({ immediate: true });

const root = document.getElementById('app');
if (root) {
  mountApp(root);
}
