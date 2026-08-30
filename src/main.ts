import { registerSW } from 'virtual:pwa-register';

import '@fontsource/baloo-2'; // The kid-playful display face — bundled, offline-safe.

import { createAudioController } from './audio/audio-controller';
import { createHowlerVoice } from './audio/howler-voice';
import { deserializeWorld } from './core/save';
import { initScene, type SceneHandle } from './scene/init-scene';
import {
  loadWorldSnapshot,
  restoreMutePreference,
  watchMutePersistence,
  watchWorldPersistence,
} from './state/persistence';
import { createWorldStore } from './state/world';
import { mountApp } from './ui/app';

import './style.css';

registerSW({ immediate: true });

const root = document.getElementById('app');
if (root) {
  const world = createWorldStore();
  // The sound box: ride-synced chug, whistle, dings, global mute.
  const audio = createAudioController(createHowlerVoice());
  let restoring = true;
  void loadWorldSnapshot().then((snapshot) => {
    if (snapshot) world.hydrate(deserializeWorld(snapshot));
    // The sound preference rides in the snapshot; apply it before the
    // persistence watchers attach so boot hydration never rewrites storage.
    restoreMutePreference(snapshot, audio);
    restoring = false;
    watchWorldPersistence(world, () => audio.isMuted());
    watchMutePersistence(audio, world);
  });
  let scene: SceneHandle | null = null;
  // The scene binds after the app mounts — queue subscription listeners until
  // then, so the UI hears every ride change from the very first one.
  const filmCountListeners: ((count: number) => void)[] = [];
  const rideModeListeners: ((riding: boolean) => void)[] = [];
  const canvas = mountApp(root, {
    isReady: () => !restoring,
    world,
    audio,
    // The scene does not exist until the canvas mounts — bind late.
    cellFromPoint: (clientX, clientY) => scene?.cellFromPoint(clientX, clientY) ?? null,
    beginGhost: (type) => scene?.beginGhost(type),
    moveGhost: (cell, rotation, valid) => scene?.moveGhost(cell, rotation, valid),
    endGhost: () => scene?.endGhost(),
    pickPiece: (clientX, clientY) => scene?.pickPiece(clientX, clientY) ?? null,
    cellToScreen: (cell) => scene?.cellToScreen(cell) ?? null,
    setPieceVisible: (id, visible) => scene?.setPieceVisible(id, visible),
    setGridVisible: (visible) => scene?.setGridVisible(visible),
    startRide: () => scene?.startRide() ?? false,
    stopRide: () => scene?.stopRide(),
    notifyActivity: () => scene?.notifyActivity(),
    whistlePuff: () => scene?.whistlePuff(),
    cycleFilmTarget: () => scene?.cycleFilmTarget(),
    subscribeFilmCount: (listener) => {
      filmCountListeners.push(listener);
      if (!scene) return () => {};
      return scene.subscribeFilmCount(listener);
    },
    subscribeRideMode: (listener) => {
      rideModeListeners.push(listener);
      if (!scene) return () => {};
      return scene.subscribeRideMode(listener);
    },
  });
  scene = initScene(canvas, world, audio);
  // Replay the queued listeners into the freshly bound scene.
  for (const listener of filmCountListeners) scene.subscribeFilmCount(listener);
  for (const listener of rideModeListeners) scene.subscribeRideMode(listener);

  // Dev-only handle: lets Playwright smoke tests place pieces directly and
  // probe the live scene (e.g. the cargo wagon count).
  if (import.meta.env.DEV) {
    const devWindow = window as unknown as {
      __tinyTracksWorld: unknown;
      __tinyTracksScene: unknown;
      __tinyTracksReady: boolean;
    };
    devWindow.__tinyTracksWorld = world;
    devWindow.__tinyTracksScene = scene;
    devWindow.__tinyTracksReady = false;
    void loadWorldSnapshot().then(() => {
      devWindow.__tinyTracksReady = true;
    });
  }
}
