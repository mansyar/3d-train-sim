import { registerSW } from 'virtual:pwa-register';

import '@fontsource/baloo-2'; // The kid-playful display face — bundled, offline-safe.

import { createAudioController } from './audio/audio-controller';
import { createHowlerVoice } from './audio/howler-voice';
import type { DayPhase } from './core/day-clock';
import { buildExport, exportFileName } from './core/portable';
import { recoveryNotice } from './core/recovery';
import { deserializeWorld, serializeWorld } from './core/save';
import { cozyOval } from './core/starters';
import {
  BOOT_GUARD_MS,
  PROBE_INTERVAL_MS,
  shouldProbeForUpdate,
  shouldReload,
} from './core/update-state';
import { initScene } from './scene/init-scene';
import {
  loadWorldRecovery,
  restoreDayPhasePreference,
  restoreMutePreference,
  saveWorldSnapshot,
  watchDayPhasePersistence,
  watchMutePersistence,
  watchWorldPersistence,
} from './state/persistence';
import { createWorldStore } from './state/world';
import { mountControls, mountShell } from './ui/app';

import './style.css';

registerSW({ immediate: true });

const root = document.getElementById('app');
if (root) {
  const world = createWorldStore();
  // The sound box: ride-synced chug, whistle, dings, global mute.
  const audio = createAudioController(createHowlerVoice());
  let restoring = true;
  // One storage read serves both the boot hydration and the parent-gate note.
  // The line is filled when the read settles; the gate reads it lazily as it
  // opens (behind the 2 s hold, long after this resolves).
  let recoveryLine: string | null = null;
  const recoveryRead = loadWorldRecovery();

  // ---- Boot order: shell → scene → controls ------------------------------
  // The frame is markup only, so the canvas exists before the scene binds and
  // every control below wires against a live SceneHandle — no queue, no
  // late-bind unsubscribe, no fallback. The type checker enforces the order.
  const canvas = mountShell(root);
  const scene = initScene(canvas, world, audio);

  /**
   * The scene owns the day clock, but storage wants a clock-shaped view of it.
   * Every read goes straight to the bound scene, so there is no pre-bind gap.
   */
  const dayClock = {
    get phase(): DayPhase {
      return scene.dayPhase();
    },
    setPhase: (phase: DayPhase): void => {
      scene.setDayPhase(phase);
    },
    subscribe: (listener: (event: { phase: DayPhase }) => void): (() => void) =>
      scene.subscribeDayPhase((phase) => listener({ phase })),
  };

  void recoveryRead.then((recovery) => {
    const snapshot = recovery.snapshot;
    recoveryLine = recoveryNotice(
      recovery.status,
      recovery.droppedPieces,
      recovery.droppedScenery,
      recovery.droppedDuplicates,
    );
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
    // The chosen time of day rides in the snapshot too, and the scene is
    // already bound by the time storage answers — so restore it here, before
    // the watchers attach, or boot hydration could rewrite the phase.
    restoreDayPhasePreference(snapshot, dayClock);
    watchDayPhasePersistence(dayClock, world, () => audio.isMuted());
    watchWorldPersistence(
      world,
      () => audio.isMuted(),
      saveWorldSnapshot,
      () => dayClock.phase,
    );
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

  // Ride state gates the reload. The scene is bound, so it pushes every change
  // from the first one — no queue stands between the two.
  scene.subscribeRideMode((isRiding) => {
    riding = isRiding;
    if (!isRiding) applyPendingUpdate();
  });

  mountControls(root, {
    world,
    audio,
    scene,
    isReady: () => !restoring,
    recoveryNote: () => recoveryLine,
  });

  // Dev-only handle: lets Playwright smoke tests place pieces directly and
  // probe the live scene (e.g. the cargo wagon count).
  if (import.meta.env.DEV) {
    const devWindow = window as unknown as {
      __tinyTracksWorld: unknown;
      __tinyTracksScene: unknown;
      __tinyTracksReady: boolean;
      __tinyTracksExport: () => { name: string; json: string };
    };
    devWindow.__tinyTracksWorld = world;
    devWindow.__tinyTracksScene = scene;
    devWindow.__tinyTracksReady = false;
    // The same path the tray's Save button takes, without the download, so a
    // spec can assert the payload byte-for-byte.
    devWindow.__tinyTracksExport = () => ({
      name: exportFileName(new Date()),
      json: buildExport({
        pieces: world.pieces(),
        scenery: world.scenery(),
        train: world.train(),
        consist: world.consist(),
        deliveries: world.deliveries(),
      }),
    });
    // Reuse the boot read instead of probing storage a second time.
    void recoveryRead.then(() => {
      devWindow.__tinyTracksReady = true;
    });
  }
}
