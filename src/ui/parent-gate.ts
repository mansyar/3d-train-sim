import type { AudioController } from '../audio/audio-controller';
import { buildExport, exportFileName, MAX_IMPORT_BYTES, readImport } from '../core/portable';
import { STARTER_PRESETS } from '../core/starters';
import type { WorldStore } from '../state/world';
import { readWorldFile, saveWorldFile } from './portable-file';

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

  const HOLD_MS = 2000;
  const DRIFT_PX = 48;
  const HOLD_LABEL = 'Parent gate — press and hold to reset the world';
  const CONFIRM_LABEL = 'Confirm: tap again to clear the whole meadow';
  let holdOrigin = { x: 0, y: 0 };
  let holdRaf: number | null = null;
  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  let confirmArmed = false;
  let suppressNextClick = false; // The hold's own release must not confirm.

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
    refreshRecoveryNote();
    clearPortableNote();
  };

  const disarmConfirm = () => {
    if (!confirmArmed) return;
    confirmArmed = false;
    parentGate.classList.remove('is-confirm');
    parentGate.setAttribute('aria-label', HOLD_LABEL);
    presetTray.hidden = true;
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
  };
  const clearPortableReport = () => {
    if (!presetTray.classList.contains('is-reporting')) return;
    presetTray.classList.remove('is-reporting');
    presetTray.hidden = true;
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
