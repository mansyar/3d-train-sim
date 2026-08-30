import type { QualityLevel } from '../core/perf-monitor';

/** Refresh cadence for the debug numbers — readable without flicker. */
const UPDATE_INTERVAL_MS = 250;

export interface PerfDebugOverlay {
  update(averageFps: number, level: QualityLevel): void;
  dispose(): void;
}

/**
 * The ?perf=debug overlay: a tiny read-only fps + quality-level readout for
 * parents debugging a slow device. Mounts only when the URL carries the
 * param; otherwise returns null and nothing exists in the DOM.
 */
export function mountPerfDebugOverlay(): PerfDebugOverlay | null {
  if (new URLSearchParams(window.location.search).get('perf') !== 'debug') return null;
  const element = document.createElement('div');
  element.className = 'perf-debug';
  element.textContent = '…';
  document.body.appendChild(element);
  let lastRenderMs = -Infinity;
  return {
    update(averageFps, level) {
      const now = performance.now();
      if (now - lastRenderMs < UPDATE_INTERVAL_MS) return;
      lastRenderMs = now;
      const fps = Number.isFinite(averageFps) ? String(Math.round(averageFps)) : '—';
      element.textContent = `${fps} fps · Q${level}`;
    },
    dispose() {
      element.remove();
    },
  };
}
