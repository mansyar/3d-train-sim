import { describe, expect, it, vi } from 'vitest';
import {
  createInstallModeDetector,
  type InstallProbe,
  type InstallSignals,
  isInstalled,
} from './install-mode';

/** An injectable probe over mutable signals and a triggerable media listener. */
function makeProbe(initial: InstallSignals) {
  let signals = initial;
  let onChange: (() => void) | null = null;
  const off = vi.fn(() => {
    onChange = null;
  });
  const onDisplayModeChange = vi.fn((listener: () => void) => {
    onChange = listener;
    return off;
  });
  return {
    probe: {
      signals: () => signals,
      onDisplayModeChange,
    } satisfies InstallProbe,
    setSignals(next: InstallSignals) {
      signals = next;
    },
    change() {
      onChange?.();
    },
    off,
    onDisplayModeChange,
  };
}

const BROWSER: InstallSignals = { displayModeStandalone: false, navigatorStandalone: undefined };
const INSTALLED: InstallSignals = { displayModeStandalone: true, navigatorStandalone: undefined };

describe('install-mode classifier', () => {
  it('reports installed when the standalone media query matches', () => {
    expect(isInstalled(INSTALLED)).toBe(true);
  });

  it('reports installed when the legacy navigator.standalone flag is true', () => {
    expect(isInstalled({ displayModeStandalone: null, navigatorStandalone: true })).toBe(true);
  });

  it('reports installed when both signals agree', () => {
    expect(isInstalled({ displayModeStandalone: true, navigatorStandalone: true })).toBe(true);
  });

  it('reports browser when both signals are false', () => {
    expect(isInstalled({ displayModeStandalone: false, navigatorStandalone: false })).toBe(false);
  });

  it('treats missing display-mode support as browser', () => {
    expect(isInstalled({ displayModeStandalone: null, navigatorStandalone: false })).toBe(false);
  });

  it('treats an absent navigator.standalone as browser when media is false', () => {
    expect(isInstalled(BROWSER)).toBe(false);
  });

  it('tolerates a non-browser environment with neither API present', () => {
    expect(isInstalled({ displayModeStandalone: null, navigatorStandalone: undefined })).toBe(
      false,
    );
  });
});

describe('install-mode detector', () => {
  it('reads the signals afresh on every call, capturing no global state', () => {
    const { probe, setSignals } = makeProbe(BROWSER);
    const detector = createInstallModeDetector(probe);

    expect(detector.isInstalled()).toBe(false);
    setSignals(INSTALLED);
    expect(detector.isInstalled()).toBe(true);
  });

  it('notifies subscribers when a runtime media change flips the classification', () => {
    const { probe, setSignals, change } = makeProbe(BROWSER);
    const detector = createInstallModeDetector(probe);
    const listener = vi.fn();
    detector.subscribe(listener);

    setSignals(INSTALLED);
    change();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(true);

    setSignals(BROWSER);
    change();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(false);
  });

  it('ignores a media change that leaves the classification unchanged', () => {
    const { probe, change } = makeProbe(BROWSER);
    const detector = createInstallModeDetector(probe);
    const listener = vi.fn();
    detector.subscribe(listener);

    change();
    change();
    expect(listener).not.toHaveBeenCalled();
  });

  it('fans out to every subscriber and stops notifying one that unsubscribes', () => {
    const { probe, setSignals, change } = makeProbe(BROWSER);
    const detector = createInstallModeDetector(probe);
    const a = vi.fn();
    const b = vi.fn();
    const offA = detector.subscribe(a);
    detector.subscribe(b);

    setSignals(INSTALLED);
    change();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);

    offA();
    setSignals(BROWSER);
    change();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);
  });

  it('shares one probe listener and detaches it only after the last subscriber leaves', () => {
    const { probe, off, onDisplayModeChange } = makeProbe(BROWSER);
    const detector = createInstallModeDetector(probe);
    const offA = detector.subscribe(vi.fn());
    const offB = detector.subscribe(vi.fn());

    expect(onDisplayModeChange).toHaveBeenCalledTimes(1);
    offA();
    expect(off).not.toHaveBeenCalled();
    offB();
    expect(off).toHaveBeenCalledTimes(1);
  });

  it('re-attaches to the probe when a new subscriber arrives after all left', () => {
    const { probe, onDisplayModeChange, change, setSignals } = makeProbe(BROWSER);
    const detector = createInstallModeDetector(probe);
    const first = vi.fn();
    detector.subscribe(first)();
    expect(onDisplayModeChange).toHaveBeenCalledTimes(1);

    const second = vi.fn();
    detector.subscribe(second);
    expect(onDisplayModeChange).toHaveBeenCalledTimes(2);

    setSignals(INSTALLED);
    change();
    expect(second).toHaveBeenCalledWith(true);
  });
});
