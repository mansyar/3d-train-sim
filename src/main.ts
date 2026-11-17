import { registerSW } from 'virtual:pwa-register';

import '@fontsource/baloo-2'; // The kid-playful display face — bundled, offline-safe.

import { createAudioController } from './audio/audio-controller';
import { createHowlerVoice } from './audio/howler-voice';
import type { DayPhase } from './core/day-clock';
import { applyGrandfather, parseDisclosureState } from './core/disclosure';
import {
  createInsights,
  endSession,
  formatSaveOutcome,
  formatStorageEstimate,
  type InsightsState,
  noteBoot,
  noteCleanExit,
  noteReset,
  noteSaveOutcome,
  startSession,
} from './core/insights';
import { buildExport, exportFileName } from './core/portable';
import { recoveryNotice } from './core/recovery';
import { deserializeWorld, serializeWorld, type WorldSnapshot } from './core/save';
import { cozyOval } from './core/starters';
import {
  BOOT_GUARD_MS,
  PROBE_INTERVAL_MS,
  shouldProbeForUpdate,
  shouldReload,
} from './core/update-state';
import { initScene } from './scene/init-scene';
import { loadInsights, readStorageEstimate, saveInsights } from './state/insights-store';
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
import { type InsightsView, mountControls, mountShell } from './ui/app';

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

  // Diagnostics state lives only at this boundary; the pure rules in
  // core/insights decide every value. Storage helpers swallow their own
  // failures, so none of this can break play.
  let insights: InsightsState = createInsights();

  /** Parent words for the longest foreground session; no invented categories. */
  const formatLongestSession = (ms: number): string => {
    if (!Number.isFinite(ms) || ms <= 0) return 'No sessions yet.';
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds} seconds.`;
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return rest === 0 ? `${minutes} minutes.` : `${minutes} minutes ${rest} seconds.`;
  };

  /**
   * The parent tray reads a fresh snapshot only when the 2 s hold arms it. The
   * quota probe is async; every value is plain data built from the closure
   * insights state, with none of the audit's human-observed measures inferred.
   */
  const insightsProvider = async (): Promise<InsightsView> => {
    const estimate = await readStorageEstimate();
    return {
      sessions: insights.sessions,
      longestSession: formatLongestSession(insights.longestSessionMs),
      resets: insights.resets,
      uncleanExits: insights.uncleanExits,
      storage: formatStorageEstimate(estimate),
      lastSave: formatSaveOutcome(insights.lastSaveOutcome),
    };
  };

  const bootReady = (async () => {
    const recovery = await recoveryRead;

    // ---- Local insights: boundary-only capture ---------------------------
    // Load the counters once, then record this boot. A running marker left by
    // a killed tab counts as one unclean exit. `sessionStartedAt` is a live,
    // in-page timestamp: never carry it across a page load, or a stale value
    // would suppress the next session and inflate its duration.
    const loaded = await loadInsights();
    let booted = noteBoot({ ...loaded, sessionStartedAt: null });
    if (recovery.status === 'restored') {
      booted = noteSaveOutcome(booted, 'restored from backup');
    }
    insights = booted;
    void saveInsights(insights);

    /** Records each world save's outcome without ever throwing. */
    const recordSave = async (snapshot: WorldSnapshot): Promise<boolean> => {
      const ok = await saveWorldSnapshot(snapshot);
      insights = noteSaveOutcome(insights, ok ? 'ok' : 'failed');
      void saveInsights(insights);
      return ok;
    };

    /** Opens a foreground session when the page is visible. */
    const beginSession = (): void => {
      if (document.visibilityState !== 'visible') return;
      insights = startSession(insights, performance.now());
    };

    /** Closes any open session, marks a clean exit and persists once. */
    const endInsights = (): void => {
      const ended = endSession(insights, performance.now());
      let next: InsightsState;
      if (ended === insights) {
        // Hidden and unload both fire on a tab close: once the session is
        // closed and the marker is clear, skip the duplicate write.
        if (!insights.running) return;
        next = noteCleanExit(insights);
      } else {
        next = noteCleanExit(ended);
      }
      insights = next;
      void saveInsights(insights);
    };

    // Wire the boundaries only after the boot read settles, so no event can
    // be lost to a load race.
    beginSession();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') beginSession();
      else endInsights();
    });
    window.addEventListener('pagehide', endInsights);
    window.addEventListener('beforeunload', endInsights);
    world.onReset(() => {
      insights = noteReset(insights);
      void saveInsights(insights);
    });

    // ---- World boot hydration --------------------------------------------
    const snapshot = recovery.snapshot;
    recoveryLine = recoveryNotice(
      recovery.status,
      recovery.droppedPieces,
      recovery.droppedScenery,
      recovery.droppedDuplicates,
    );
    if (snapshot) {
      const data = deserializeWorld(snapshot);
      world.hydrate(data);
      // The stored count and flag survive reload exactly: worlds without
      // advanced pieces keep their stored state, while a stored world already
      // holding one unlocks with every piece kept. Kinds come from the
      // validated world (never raw storage), so a salvaged entry cannot crash
      // the boot. Fresh installs never pass through here, so the seeded oval —
      // which parks a station by the track — still opens on the basics tier.
      world.restoreDisclosure(
        applyGrandfather(parseDisclosureState(snapshot.disclosure), [
          ...data.pieces.map((piece) => piece.type),
          ...data.scenery.map((item) => item.kind),
        ]),
      );
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
    watchDayPhasePersistence(dayClock, world, () => audio.isMuted(), recordSave);
    watchWorldPersistence(
      world,
      () => audio.isMuted(),
      recordSave,
      () => dayClock.phase,
    );
    watchMutePersistence(audio, world, recordSave);
    if (!snapshot) {
      // The watchers only save on change — persist the seeded starter once.
      // Kept as a plain save so a first boot still reports "No save yet."
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
  })();

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
    insights: insightsProvider,
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
    // Reuse the single boot flow instead of probing storage a second time, so
    // readiness means hydration AND the insights boot have both settled.
    void bootReady.then(() => {
      devWindow.__tinyTracksReady = true;
    });
  }
}
