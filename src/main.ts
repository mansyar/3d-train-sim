import { registerSW } from 'virtual:pwa-register';

import '@fontsource/baloo-2'; // The kid-playful display face — bundled, offline-safe.

import { createAudioController } from './audio/audio-controller';
import { createHowlerVoice } from './audio/howler-voice';
import { deserializeWorld, serializeWorld } from './core/save';
import { cozyOval } from './core/starters';
import {
  BOOT_GUARD_MS,
  PROBE_INTERVAL_MS,
  shouldProbeForUpdate,
  shouldReload,
} from './core/update-state';
import { initScene, type SceneHandle } from './scene/init-scene';
import {
  loadWorldSnapshot,
  restoreMutePreference,
  saveWorldSnapshot,
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
    if (snapshot) {
      world.hydrate(deserializeWorld(snapshot));
    } else {
      // First run: seed a rideable cozy oval so the meadow invites one tap.
      world.hydrate(cozyOval());
    }
    // The sound preference rides in the snapshot; apply it before the
    // persistence watchers attach so boot hydration never rewrites storage.
    restoreMutePreference(snapshot, audio);
    restoring = false;
    watchWorldPersistence(world, () => audio.isMuted());
    watchMutePersistence(audio, world);
    if (!snapshot) {
      // The watchers only save on change — persist the seeded starter once.
      void saveWorldSnapshot(
        serializeWorld(
          world.pieces(),
          world.scenery(),
          world.train(),
          audio.isMuted(),
          world.deliveries(),
          world.consist(),
        ),
      );
    }
  });
  let scene: SceneHandle | null = null;
  // The scene binds after the app mounts — queue subscription listeners until
  // then, so the UI hears every ride change from the very first one.
  const filmCountListeners: ((count: number) => void)[] = [];
  const rideModeListeners: ((riding: boolean) => void)[] = [];

  // ---- PWA self-update: probe quietly, adopt when the table is quiet -----
  // Deployments install a new service worker, but the running page keeps its
  // old precache until it reloads. A fresh `controllerchange` therefore marks
  // the update pending, and the page reloads itself into it only once — and
  // only when no train is riding and the boot guard has passed. The decision
  // logic lives in core/update-state.ts.
  const bootAt = performance.now();
  let lastProbeAt: number | null = null;
  let swRegistration: ServiceWorkerRegistration | null = null;
  let pendingUpdate = false;
  let riding = false;
  // `controllerchange` also fires on first install — only a change after an
  // existing controller means a fresh deployment to adopt.
  let hadController = navigator.serviceWorker.controller !== null;

  /** Applies a pending update if the table is quiet and the guard has passed. */
  const applyPendingUpdate = (): void => {
    if (!pendingUpdate) return;
    if (
      !shouldReload({
        rideActive: riding,
        uptimeMs: performance.now() - bootAt,
        alreadyReloaded: false,
      })
    ) {
      return;
    }
    location.reload();
  };

  /** Asks the service worker to check for a newer deployment. */
  const probeForUpdate = (): void => {
    if (!swRegistration) return;
    const sinceLastProbe = lastProbeAt === null ? null : performance.now() - lastProbeAt;
    if (
      !shouldProbeForUpdate({
        visible: document.visibilityState === 'visible',
        msSinceLastProbe: sinceLastProbe,
      })
    ) {
      return;
    }
    lastProbeAt = performance.now();
    swRegistration.update().catch(() => {
      // Offline or flaky — the next probe retries; never break the quiet.
    });
  };

  void navigator.serviceWorker
    .getRegistration()
    .then((registration) => {
      swRegistration = registration ?? null;
    })
    .catch(() => {
      // Registration lookup is best-effort; the next probe retries.
    });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) {
      hadController = true; // first install — no old page to replace
      return;
    }
    pendingUpdate = true;
    applyPendingUpdate();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    probeForUpdate();
    applyPendingUpdate();
  });
  setInterval(probeForUpdate, PROBE_INTERVAL_MS);

  // An update that lands during the boot guard would otherwise wait for the
  // next visibility change or hourly probe — recheck once when the guard ends.
  setTimeout(applyPendingUpdate, BOOT_GUARD_MS);

  rideModeListeners.push((isRiding) => {
    riding = isRiding;
    if (!isRiding) applyPendingUpdate();
  });

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
    tootWhistle: () => scene?.tootWhistle(),
    cycleFilmTarget: () => scene?.cycleFilmTarget(),
    subscribeFilmCount: (listener) => {
      filmCountListeners.push(listener);
      if (!scene) {
        // Scene not bound yet — unsubscribe must still remove the listener,
        // or it would be replayed into the scene at bind and live forever.
        return () => {
          const index = filmCountListeners.indexOf(listener);
          if (index !== -1) filmCountListeners.splice(index, 1);
        };
      }
      return scene.subscribeFilmCount(listener);
    },
    subscribeRideMode: (listener) => {
      rideModeListeners.push(listener);
      if (!scene) {
        return () => {
          const index = rideModeListeners.indexOf(listener);
          if (index !== -1) rideModeListeners.splice(index, 1);
        };
      }
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
