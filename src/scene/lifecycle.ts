import type { Object3D } from 'three';
import type { PerfMonitor, QualityController } from '../core/perf-monitor';
import { createVisibilityController } from '../core/visibility-controller';
import type { PerfDebugOverlay } from './perf-debug-overlay';
import type { SceneContext } from './scene-context';
import { startSpinLoop } from './spin-loop';

export interface SceneLifecycle {
  dispose(): void;
}

export interface SceneLifecycleOptions {
  context: SceneContext;
  /** The placeholder crate, until the first real train replaces it. */
  spinTarget(): Object3D | null;
  /** The subsystem updates for one animation frame (scene choreography). */
  onFrame(dt: number): void;
  perfMonitor: PerfMonitor;
  qualityController: QualityController;
  /** The ?perf=debug overlay for parents, or null when not mounted. */
  perfDebug: PerfDebugOverlay | null;
  /** Hidden-tab side effects outside the loop (audio duck, attract pause). */
  onPause(): void;
  onResume(): void;
}

/**
 * The scene's frame loop: the spin RAF loop stays suspended while the tab is
 * hidden, quality tiers trim the heaviest effects on sag, and every frame
 * blits through the render scale (the canvas drawing buffer never resizes,
 * so the compositor keeps presenting frames).
 */
export function createSceneLifecycle({
  context,
  spinTarget,
  onFrame,
  perfMonitor,
  qualityController,
  perfDebug,
  onPause,
  onResume,
}: SceneLifecycleOptions): SceneLifecycle {
  const spinLoop = startSpinLoop(
    context.renderer,
    context.scene,
    context.camera,
    spinTarget,
    (dt) => {
      perfMonitor.sample(dt);
      qualityController.update(perfMonitor.verdict(), dt);
      context.qualityApplier.update(dt);
      // The HUD is the only consumer of the window average — skip the scan
      // when the overlay isn't mounted.
      if (perfDebug) perfDebug.update(perfMonitor.averageFps(), qualityController.level);
      onFrame(dt);
    },
    () =>
      context.renderScale.render(context.scene, context.camera, context.qualityApplier.renderScale),
  );

  // Tab hidden: stop rendering and let the host duck audio, pause the attract
  // clock, and release the perf probe — no sound, no drift, no idle chirps in
  // a hidden tab, and hidden tab ≠ device strain (spec FR1). Tab visible
  // again: everything resumes on the next sync — one shared controller so a
  // flurry of visibility events never double-fires.
  const visibility = createVisibilityController({
    isHidden: () => document.hidden,
    onPause: () => {
      spinLoop.suspend();
      perfMonitor.setPaused(true);
      onPause();
    },
    onResume: () => {
      spinLoop.resume();
      perfMonitor.setPaused(false);
      onResume();
    },
  });
  const onVisibility = () => visibility.sync();
  document.addEventListener('visibilitychange', onVisibility);

  return {
    dispose(): void {
      spinLoop.stop();
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
