import type { AudioController } from '../audio/audio-controller';
import { buildExport, exportFileName, MAX_IMPORT_BYTES, readImport } from '../core/portable';
import { STARTER_PRESETS } from '../core/starters';
import type { WorldStore } from '../state/world';
import { readWorldFile, saveWorldFile } from './portable-file';

/**
 * The plain, read-only values the parent panel renders. Every field is a string
 * or number built at the boundary by `main.ts`; no mutable state and no error
 * content ever crosses into the UI layer.
 */
export interface InsightsView {
  sessions: number;
  longestSession: string;
  resets: number;
  uncleanExits: number;
  storage: string;
  lastSave: string;
}

/** The install classification the gated tray reads; no DOM or globals here. */
export interface InstallModeView {
  isInstalled(): boolean;
  subscribe(listener: (installed: boolean) => void): () => void;
}

/** The parent's install-hint dismissal state and action. */
export interface InstallHintView {
  isDismissed(): boolean;
  subscribe(listener: () => void): () => void;
  dismiss(): void;
}

/**
 * Evented dismissal state for the parent's hint. It lives here, not in
 * `main.ts`, because the boot-order guard forbids listener collections there.
 * `restore` applies a persisted value without saving; `dismiss` is the one
 * parent action and notifies both the tray and the storage watcher.
 */
export function createInstallHintDismissal(initial = false) {
  let dismissed = initial;
  const listeners = new Set<() => void>();
  const notify = (): void => {
    for (const listener of listeners) listener();
  };
  return {
    isDismissed: () => dismissed,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    restore(value: boolean) {
      if (dismissed === value) return;
      dismissed = value;
      notify();
    },
    dismiss() {
      if (dismissed) return;
      dismissed = true;
      notify();
    },
  };
}

/**
 * The parent-only install hint, inserted into the gated tray only while the
 * toy is browsing and undismissed. Text is literal — no data is interpolated.
 */
export const INSTALL_HINT_MARKUP = `
  <div class="install-hint" role="status">
    <span class="install-hint-icon" aria-hidden="true">📲</span>
    <span class="install-hint-text">On iPhone or iPad: tap Share, then Add to Home Screen.</span>
    <button class="install-hint-dismiss" type="button"
            aria-label="Dismiss the Add to Home Screen hint">OK</button>
  </div>
`;

export interface ParentGateDeps {
  world: WorldStore;
  audio: AudioController;
  /** Gently stops any ride before an import replaces the meadow it ran through. */
  stopRide?: (() => void) | undefined;
  /** Whether any train is riding right now. */
  isRiding?: (() => boolean) | undefined;
  /** Asynchronous startup restoration gate — resets refuse until ready. */
  isReady?: (() => boolean) | undefined;
  /** Supplies the grown-up recovery line; read as the tray opens. */
  recoveryNote?: (() => string | null) | undefined;
  /**
   * Lazy source for the read-only on-device diagnostics. Called only when the
   * 2 s hold arms the tray — never on boot, never per frame.
   */
  insights?: (() => Promise<InsightsView> | InsightsView) | undefined;
  /** Install mode: the hint element is absent from the DOM while standalone. */
  installMode?: InstallModeView | undefined;
  /** Parent's dismissal state; dismissing hides the hint at once. */
  installHint?: InstallHintView | undefined;
}

export function createParentGate(root: HTMLElement, deps: ParentGateDeps): void {
  const { world, audio } = deps;

  // ---- Sound box: a big toot anytime, and a parent-friendly mute ---------
  const muteToggle = root.querySelector<HTMLButtonElement>('.mute-toggle');
  if (!muteToggle) {
    throw new Error('mute toggle missing from app frame');
  }

  const refreshMute = () => {
    const muted = audio.isMuted();
    muteToggle.setAttribute('aria-pressed', String(muted));
    muteToggle.textContent = muted ? '🔇' : '🔊';
    muteToggle.setAttribute('aria-label', muted ? 'Unmute the sounds' : 'Mute the sounds');
  };
  muteToggle.addEventListener('click', () => audio.toggleMuted());
  audio.subscribe(refreshMute);
  refreshMute();

  // ---- Parent gate: hold, then confirm — destruction is parent-gated -----
  // A toddler taps; only a deliberate ~2s hold (with drift tolerance) arms
  // the icon-only confirm step, and a tap anywhere else dismisses it.
  const parentGate = root.querySelector<HTMLButtonElement>('.parent-gate');
  if (!parentGate) {
    throw new Error('parent gate missing from app frame');
  }
  const presetTray = root.querySelector<HTMLDivElement>('.preset-tray');
  if (!presetTray) {
    throw new Error('preset tray missing from app frame');
  }

  // ---- Recovery note: a quiet grown-up line inside the gated tray --------
  // The note only appears when the loader had to salvage or restore a save,
  // and dismissal lasts for this session — nothing is written to storage.
  const recoveryNote = root.querySelector<HTMLDivElement>('.recovery-note');
  const recoveryNoteText = recoveryNote?.querySelector<HTMLSpanElement>('.recovery-note-text');
  const recoveryDismiss = recoveryNote?.querySelector<HTMLButtonElement>('.recovery-dismiss');
  let recoveryDismissed = false;

  const refreshRecoveryNote = () => {
    if (!recoveryNote || !recoveryNoteText) return;
    const text = recoveryDismissed ? null : (deps.recoveryNote?.() ?? null);
    if (!text) {
      recoveryNote.hidden = true;
      return;
    }
    // Plain text only: the line is built by core/recovery.ts, never HTML.
    recoveryNoteText.textContent = text;
    recoveryNote.hidden = false;
  };

  recoveryDismiss?.addEventListener('click', () => {
    recoveryDismissed = true;
    if (recoveryNote) recoveryNote.hidden = true;
  });

  // ---- Install hint: parent-only, and absent from the DOM when installed --
  // The element is created on demand inside the gated tray. Removing it (not
  // merely hiding it) is what keeps it out of the DOM in standalone mode and
  // after a dismissal, so the kid-facing surface never gains a word.
  const installMode = deps.installMode;
  const installHint = deps.installHint;
  let hintElement = presetTray.querySelector<HTMLElement>('.install-hint');

  const hintWanted = (): boolean =>
    !!installMode && !!installHint && !installMode.isInstalled() && !installHint.isDismissed();

  const refreshInstallHint = (): void => {
    if (!hintWanted()) {
      hintElement?.remove();
      hintElement = null;
      return;
    }
    if (hintElement) return;
    presetTray.insertAdjacentHTML('beforeend', INSTALL_HINT_MARKUP);
    hintElement = presetTray.querySelector<HTMLElement>('.install-hint');
    hintElement
      ?.querySelector<HTMLButtonElement>('.install-hint-dismiss')
      ?.addEventListener('click', () => installHint?.dismiss());
  };

  installMode?.subscribe(() => refreshInstallHint());
  installHint?.subscribe(() => refreshInstallHint());
  refreshInstallHint();

  // ---- On-device insights: read-only, filled only as the tray opens --------
  // The panel lives inside the 2 s-hold tray, so a toddler can never reach it.
  // Its provider is lazy and async: the browser quota estimate is probed only
  // here, never on boot or per frame. A stale resolve (tray closed or reopened
  // since) is ignored, and a rejection shows one plain unavailable line.
  const insightsPanel = presetTray.querySelector<HTMLDivElement>('.insights-panel');
  const insightsList = insightsPanel?.querySelector<HTMLElement>('[data-insights="list"]');
  const insightsUnavailable = insightsPanel?.querySelector<HTMLElement>(
    '[data-insights="unavailable"]',
  );
  let insightsGeneration = 0;

  const insightValue = (key: string): HTMLElement | null =>
    insightsPanel?.querySelector<HTMLElement>(`[data-insights="${key}"]`) ?? null;

  const renderInsights = (view: InsightsView): void => {
    if (!insightsList || !insightsUnavailable) return;
    const rows: Array<[string, string | number]> = [
      ['sessions', view.sessions],
      ['longestSession', view.longestSession],
      ['resets', view.resets],
      ['uncleanExits', view.uncleanExits],
      ['storage', view.storage],
      ['lastSave', view.lastSave],
    ];
    // textContent only — diagnostics are plain data, never markup.
    for (const [key, value] of rows) {
      const element = insightValue(key);
      if (element) element.textContent = String(value);
    }
    insightsList.hidden = false;
    insightsUnavailable.hidden = true;
  };

  const showInsightsUnavailable = (): void => {
    if (!insightsList || !insightsUnavailable) return;
    insightsList.hidden = true;
    insightsUnavailable.hidden = false;
  };

  const refreshInsights = (): void => {
    if (!deps.insights) return;
    const generation = ++insightsGeneration;
    let result: Promise<InsightsView> | InsightsView;
    try {
      result = deps.insights();
    } catch {
      showInsightsUnavailable();
      return;
    }
    void Promise.resolve(result).then(
      (view) => {
        if (generation !== insightsGeneration || presetTray.hidden) return;
        renderInsights(view);
      },
      () => {
        if (generation !== insightsGeneration || presetTray.hidden) return;
        showInsightsUnavailable();
      },
    );
  };

  const HOLD_MS = 2000;
  const DRIFT_PX = 48;
  const HOLD_LABEL = 'Parent gate — press and hold to reset the world';
  const CONFIRM_LABEL = 'Confirm: tap again to clear the whole meadow';
  let holdOrigin = { x: 0, y: 0 };
  let holdRaf: number | null = null;
  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  let confirmArmed = false;
  let suppressNextClick = false; // The hold's own release must not confirm.

  // ---- Parent-only zoom --------------------------------------------------
  // The viewport stays kid-safe except while the 2 s-hold tray is on screen.
  // A reload boots from index.html's no-zoom meta, so nothing is persisted.
  const viewportMeta = root.ownerDocument.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  const KID_VIEWPORT =
    'width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover';
  const PARENT_VIEWPORT =
    'width=device-width, initial-scale=1.0, user-scalable=yes, viewport-fit=cover';
  const setParentZoom = (enabled: boolean) => {
    if (viewportMeta) viewportMeta.content = enabled ? PARENT_VIEWPORT : KID_VIEWPORT;
  };

  const cancelHold = () => {
    if (holdRaf !== null) cancelAnimationFrame(holdRaf);
    if (holdTimer !== null) clearTimeout(holdTimer);
    holdRaf = holdTimer = null;
    parentGate.style.setProperty('--hold', '0');
    parentGate.classList.remove('is-holding');
  };

  const armConfirm = () => {
    holdRaf = holdTimer = null;
    parentGate.classList.remove('is-holding');
    parentGate.style.setProperty('--hold', '0');
    confirmArmed = true;
    suppressNextClick = true;
    parentGate.classList.add('is-confirm');
    parentGate.setAttribute('aria-label', CONFIRM_LABEL);
    presetTray.hidden = false;
    presetTray.classList.remove('is-reporting');
    setParentZoom(true);
    refreshRecoveryNote();
    clearPortableNote();
    refreshInsights();
  };

  const disarmConfirm = () => {
    if (!confirmArmed) return;
    confirmArmed = false;
    parentGate.classList.remove('is-confirm');
    parentGate.setAttribute('aria-label', HOLD_LABEL);
    presetTray.hidden = true;
    setParentZoom(false);
  };

  parentGate.addEventListener('pointerdown', (event) => {
    if (confirmArmed) {
      suppressNextClick = false; // A fresh tap always confirms for real.
      return;
    }
    if (deps.isReady && !deps.isReady()) return;
    event.preventDefault();
    holdOrigin = { x: event.clientX, y: event.clientY };
    parentGate.classList.add('is-holding');
    const begin = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - begin) / HOLD_MS, 1);
      parentGate.style.setProperty('--hold', String(progress));
      if (progress < 1) holdRaf = requestAnimationFrame(tick);
    };
    holdRaf = requestAnimationFrame(tick);
    holdTimer = setTimeout(armConfirm, HOLD_MS);
  });

  // A wandering hand is not a reset: only small drift keeps the hold alive.
  parentGate.addEventListener('pointermove', (event) => {
    if (holdRaf === null && holdTimer === null) return;
    const drift = Math.hypot(event.clientX - holdOrigin.x, event.clientY - holdOrigin.y);
    if (drift > DRIFT_PX) cancelHold();
  });

  const endHold = () => {
    if (!confirmArmed) cancelHold();
  };
  parentGate.addEventListener('pointerup', endHold);
  parentGate.addEventListener('pointerleave', endHold);
  parentGate.addEventListener('pointercancel', endHold);

  parentGate.addEventListener('click', () => {
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    if (!confirmArmed) return;
    disarmConfirm();
    world.reset();
    audio.ding();
  });

  // ---- Starter gallery: four icon-only presets inside the parent gate ---
  // The tray only opens with the armed confirm step, so kid taps can never
  // reach it. A pick lands as ONE undoable mutation — the ↩️ chip appears
  // and one tap restores the prior build.
  for (const pick of presetTray.querySelectorAll<HTMLButtonElement>('.preset-pick')) {
    pick.addEventListener('click', () => {
      const preset = STARTER_PRESETS.find((entry) => entry.id === pick.dataset.preset);
      if (!preset) return;
      disarmConfirm();
      world.applyPreset(preset.build());
      audio.ding();
    });
  }

  // ---- Saving and loading the meadow as a file ---------------------------
  // Both controls sit inside the 2 s-hold tray, so a toddler can never reach
  // them. Their note is transient — every attempt writes it afresh — which is
  // why it is not the session-dismissible recovery line above.
  const exportButton = presetTray.querySelector<HTMLButtonElement>('.portable-export');
  const importButton = presetTray.querySelector<HTMLButtonElement>('.portable-import');
  const importInput = presetTray.querySelector<HTMLInputElement>('.portable-import-input');
  const portableNote = presetTray.querySelector<HTMLDivElement>('.portable-note');
  const portableNoteText = portableNote?.querySelector<HTMLSpanElement>('.portable-note-text');
  if (!exportButton || !importButton || !importInput || !portableNote || !portableNoteText) {
    throw new Error('portable file controls missing from the preset tray');
  }

  const TOO_LARGE_NOTE = 'That file is too big to be a meadow. Tiny Tracks saves stay under 1 MB.';
  const UNREADABLE_NOTE = 'That file is not a Tiny Tracks meadow, so nothing changed.';

  // Plain text only: a note may carry a file name, never markup.
  const showPortableNote = (text: string) => {
    portableNoteText.textContent = text;
    portableNote.hidden = false;
  };
  const clearPortableNote = () => {
    portableNoteText.textContent = '';
    portableNote.hidden = true;
  };

  // A file action closes the tray, so the outcome line outlives it: the tray
  // stays open in a report-only state (its controls are hidden by CSS) until a
  // tap elsewhere dismisses it. Nothing interactive is left within reach.
  const showPortableReport = (text: string) => {
    showPortableNote(text);
    presetTray.hidden = false;
    presetTray.classList.add('is-reporting');
    setParentZoom(true);
  };
  const clearPortableReport = () => {
    if (!presetTray.classList.contains('is-reporting')) return;
    presetTray.classList.remove('is-reporting');
    presetTray.hidden = true;
    setParentZoom(false);
    clearPortableNote();
  };

  // A refusal can land after the tray was dismissed (the read is async, and a
  // tap outside disarms at once), so it cannot assume the tray is on screen.
  const refuseImport = (text: string) => {
    if (presetTray.hidden) {
      disarmConfirm();
      showPortableReport(text);
      return;
    }
    if (recoveryNote) recoveryNote.hidden = true;
    showPortableNote(text);
  };

  exportButton.addEventListener('click', () => {
    disarmConfirm();
    const fileName = exportFileName(new Date());
    saveWorldFile(
      fileName,
      buildExport({
        pieces: world.pieces(),
        scenery: world.scenery(),
        train: world.train(),
        consist: world.consist(),
        deliveries: world.deliveries(),
      }),
    );
    audio.ding();
    showPortableReport(`Saved ${fileName}`);
  });

  importButton.addEventListener('click', () => importInput.click());

  importInput.addEventListener('change', async () => {
    // Capture before clearing: re-picking the same file must fire change again.
    const file = importInput.files?.[0];
    importInput.value = '';
    if (!file) return; // Picker dismissed — no note, nothing changes.

    // Refuse on the file's own byte count before decoding it: a mistaken
    // 300 MB pick must never be materialised on a tablet. `readImport` keeps
    // its own check as defence in depth for callers that bypass this handler.
    if (file.size > MAX_IMPORT_BYTES) {
      refuseImport(TOO_LARGE_NOTE);
      return;
    }

    let text: string;
    let byteLength: number;
    try {
      ({ text, byteLength } = await readWorldFile(file));
    } catch {
      refuseImport(UNREADABLE_NOTE);
      return;
    }

    const result = readImport(text, byteLength);
    if (result.status === 'too-large') {
      refuseImport(TOO_LARGE_NOTE);
      return;
    }
    if (result.status === 'unreadable') {
      refuseImport(UNREADABLE_NOTE);
      return;
    }

    // Stop any ride first: the meadow it was running through is about to go.
    if (deps.isRiding?.()) deps.stopRide?.();
    world.importWorld(result.world);
    audio.ding();
    disarmConfirm();
    const skipped = result.droppedPieces + result.droppedScenery + result.droppedDuplicates;
    const skippedNote =
      skipped > 0 ? ` Skipped ${skipped} broken toy${skipped === 1 ? '' : 's'}.` : '';
    showPortableReport(`Loaded the meadow.${skippedNote}`);
  });

  // A tap anywhere outside the armed gate dismisses it silently.
  window.addEventListener('pointerdown', (event) => {
    if (!confirmArmed) {
      clearPortableReport();
      return;
    }
    if (event.target instanceof Element && event.target.closest('.parent-gate, .preset-tray'))
      return;
    disarmConfirm();
  });
}
