/**
 * Install mode — pure classification of installed (standalone PWA) vs browser.
 *
 * iOS Safari has no `beforeinstallprompt`, so the only usable signals are the
 * standards `display-mode: standalone` media query and the legacy iOS
 * `navigator.standalone` flag. Both are injected here: this module captures no
 * browser globals, so it runs unchanged in a headless unit test. The DOM and
 * media-query wiring belongs to the UI layer; this file is data and logic only.
 */

/** The two standalone signals a classification reads. */
export interface InstallSignals {
  /** `matchMedia('(display-mode: standalone)').matches`, or null when unavailable. */
  readonly displayModeStandalone: boolean | null;
  /** `navigator.standalone` on iOS, or undefined when the property is absent. */
  readonly navigatorStandalone: boolean | undefined;
}

/** True when the toy is installed; a missing API never counts as installed. */
export function isInstalled(signals: InstallSignals): boolean {
  return signals.displayModeStandalone === true || signals.navigatorStandalone === true;
}

/** Injectable probe: reads the signals afresh and observes display-mode changes. */
export interface InstallProbe {
  signals(): InstallSignals;
  onDisplayModeChange(listener: () => void): () => void;
}

/** A live classifier: current state plus change notifications. */
export interface InstallModeDetector {
  /** Reads the current signals — no cached global state. */
  isInstalled(): boolean;
  /** Notifies with the new classification when it actually changes. */
  subscribe(listener: (installed: boolean) => void): () => void;
}

/**
 * Wraps a probe so the UI can react to an install that happens while the page
 * is open. Only real classification flips notify: redundant media events with
 * an unchanged result are ignored. One probe listener is shared by all
 * subscribers and detached when the last one leaves, then reattached if a new
 * subscriber arrives.
 */
export function createInstallModeDetector(probe: InstallProbe): InstallModeDetector {
  const listeners = new Set<(installed: boolean) => void>();
  let last = isInstalled(probe.signals());
  let off: (() => void) | null = null;

  const onMediaChange = (): void => {
    const next = isInstalled(probe.signals());
    if (next === last) return;
    last = next;
    for (const listener of listeners) listener(next);
  };

  return {
    isInstalled: () => isInstalled(probe.signals()),
    subscribe(listener) {
      listeners.add(listener);
      if (off === null) off = probe.onDisplayModeChange(onMediaChange);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && off !== null) {
          off();
          off = null;
        }
      };
    },
  };
}
