import type { AudioController } from '../audio/audio-controller';
import type { SceneryKind } from '../core/scenery';
import { STARTER_PRESETS } from '../core/starters';
import type { Cell, PieceType, Rotation } from '../core/track-graph';
import { TRAIN_KINDS, type TrainKind, trainAria, trainIcon } from '../core/trains';
import { WAGON_PRESETS, type WagonPreset, wagonPresetAria, wagonPresetIcon } from '../core/wagons';
import type { PickedItem } from '../scene/track-renderer';
import type { WorldStore } from '../state/world';
import { createRideControls, RIDE_ICONS } from './ride-controls';
import { type CellFromPoint, createToyDrag } from './toy-drag';
import { createToyDrawer, toyTabPanels, toyTabStrip } from './toy-drawer';
import { PIECE_ICONS, SCENERY_ICONS } from './toy-icons';

export type { CellFromPoint };

export interface AppOptions {
  world: WorldStore;
  /** Whether asynchronous startup restoration has finished. */
  isReady?: () => boolean;
  /** The sound box: whistle toots, placement dings, the big mute switch. */
  audio: AudioController;
  cellFromPoint: CellFromPoint;
  /** Begin the in-scene ghost preview for a dragged track piece or scenery toy. */
  beginGhost(kind: PieceType | SceneryKind): void;
  /** Snap the preview to a cell (null = off-meadow); tint by validity. */
  moveGhost(cell: Cell | null, rotation: Rotation, valid: boolean): void;
  /** End the preview. */
  endGhost(): void;
  /** The placed piece under a screen point, for relocate/trash drags. */
  pickPiece(clientX: number, clientY: number): PickedItem | null;
  /** The screen-space center of a meadow cell, for anchoring the ✕ chip. */
  cellToScreen(cell: Cell): { x: number; y: number } | null;
  /** Hide/show a placed clone (the ghost stands in while it is dragged). */
  setPieceVisible(id: string, visible: boolean): void;
  /** Debug aid: show the meadow's snap-cell boundaries. */
  setGridVisible(visible: boolean): void;
  /** Begin riding the current layout. Refuses an empty meadow. */
  startRide(): boolean;
  /** Gently stop the ride. */
  stopRide(): void;
  /** Tell the scene the toddler is interacting (keeps the attract mode away). */
  notifyActivity(): void;
  /** The big toot: the answering train whistles (echoing inside tunnels) and puffs. */
  tootWhistle(): void;
  /** Each tap cycles the chase camera: filmed train → next train → overview. */
  cycleFilmTarget(): void;
  /** The number of riding trains, pushed on every ride change (🎥 visibility). */
  subscribeFilmCount(listener: (count: number) => void): () => void;
  /** Whether any train is riding, pushed on every ride change (▶/⏹ face). */
  subscribeRideMode(listener: (riding: boolean) => void): () => void;
}

export function mountApp(root: HTMLElement, options: AppOptions): HTMLCanvasElement {
  root.innerHTML = `
    <canvas class="scene-canvas" aria-label="Tiny Tracks 3D world"></canvas>
    <div class="toy-drawer" role="group" aria-label="Toybox" hidden>
      <div class="drawer-tabs" role="tablist" aria-label="Toy groups">${toyTabStrip}</div>
      ${toyTabPanels}
    </div>
    ${import.meta.env.DEV ? '<button class="grid-toggle" type="button" aria-label="Toggle the placement grid" aria-pressed="false">#</button>' : ''}
    <button class="parent-gate" type="button"
            aria-label="Parent gate — press and hold to reset the world">
      <span class="gate-icon" aria-hidden="true">♻️</span>
    </button>
    <div class="preset-tray" role="group" aria-label="Starter railways" hidden>
      <button class="preset-pick" type="button" data-preset="cozy-oval"
              aria-label="Build the cozy oval starter railway">${PIECE_ICONS.corner}</button>
      <button class="preset-pick" type="button" data-preset="station-village"
              aria-label="Build the station village starter railway">${SCENERY_ICONS.station}</button>
      <button class="preset-pick" type="button" data-preset="river-crossing"
              aria-label="Build the river crossing starter railway">${PIECE_ICONS.bridge}</button>
      <button class="preset-pick" type="button" data-preset="hilltop-junction"
              aria-label="Build the hilltop junction starter railway">${PIECE_ICONS.switch}</button>
      <span class="app-version">v${__APP_VERSION__}</span>
    </div>
    <div class="toybox-rail" role="toolbar" aria-label="Toy box">
      <button class="toy-slot" type="button" aria-label="Toybox"
              aria-expanded="false" data-drawer="toys">🧸</button>
      <button class="toy-slot" type="button" aria-label="Train collection"
              aria-expanded="false" data-drawer="trains">🚂</button>
      <button class="whistle-toot" type="button" aria-label="Toot the whistle">🎺</button>
      <button class="film-toggle" type="button" aria-label="Switch the camera between trains" hidden>🎥</button>
      <button class="ride-toggle" type="button"
              aria-label="Ride the train">${RIDE_ICONS.play}</button>
      <button class="mute-toggle" type="button" aria-pressed="false"
              aria-label="Mute the sounds">🔊</button>
      <button class="trash-slot" type="button"
              aria-label="Trash bin — drop a track piece here to remove it">🗑️</button>
      <button class="undo-toggle" type="button"
              aria-label="Take back the last change" hidden>↩️</button>
    </div>
  `;
  const canvas = root.querySelector<HTMLCanvasElement>('.scene-canvas');
  if (!canvas) {
    throw new Error('scene canvas missing from app frame');
  }

  const drawer = root.querySelector<HTMLDivElement>('.toy-drawer');
  const toysSlot = root.querySelector<HTMLButtonElement>('[data-drawer="toys"]');
  const trainSlot = root.querySelector<HTMLButtonElement>('[data-drawer="trains"]');
  const trashSlot = root.querySelector<HTMLButtonElement>('.trash-slot');
  const trainDrawer = document.createElement('div');
  trainDrawer.className = 'train-drawer';
  trainDrawer.setAttribute('role', 'group');
  trainDrawer.setAttribute('aria-label', 'Train collection');
  trainDrawer.hidden = true;
  // The loco row scrolls sideways like the drawer panels: six chunky engine
  // buttons stay one tap-easy row on phones instead of wrapping.
  const locoRow = document.createElement('div');
  locoRow.className = 'loco-row';
  locoRow.setAttribute('role', 'group');
  locoRow.setAttribute('aria-label', 'Locomotives');
  for (const kind of TRAIN_KINDS) {
    const button = document.createElement('button');
    button.className = 'train-slot';
    button.type = 'button';
    button.dataset.train = kind;
    button.setAttribute('aria-label', trainAria(kind));
    button.setAttribute('aria-pressed', String(options.world.train() === kind));
    button.innerHTML = trainIcon(kind);
    locoRow.append(button);
  }
  trainDrawer.append(locoRow);
  // The wagon row: one chunky pair-preset per button, dressing the selected
  // locomotive. It lives inside the train drawer, so it hides mid-ride and
  // on drawer close with the loco slots — no separate visibility logic.
  const wagonRow = document.createElement('div');
  wagonRow.className = 'wagon-row';
  wagonRow.setAttribute('role', 'group');
  wagonRow.setAttribute('aria-label', 'Wagon styles');
  for (const preset of WAGON_PRESETS) {
    const pick = document.createElement('button');
    pick.className = 'wagon-slot';
    pick.type = 'button';
    pick.dataset.wagon = preset;
    pick.setAttribute('aria-label', wagonPresetAria(preset));
    pick.setAttribute(
      'aria-pressed',
      String(options.world.consistFor(options.world.train()) === preset),
    );
    pick.innerHTML = wagonPresetIcon(preset);
    wagonRow.append(pick);
  }
  trainDrawer.append(wagonRow);
  root.append(trainDrawer);
  if (!drawer || !toysSlot || !trainSlot || !trashSlot) {
    throw new Error('toybox chrome missing from app frame');
  }

  // ---- Tabbed toybox drawer (Rails / Adventure / Nature / Town / Critters) -----------
  // One tab active at a time; the drawer itself is one of the three
  // toybox drawers (toys / trains) — never two at once.
  // Whether trains are rolling. Declared up top so every build entry point
  // below can refuse work mid-ride; the scene pushes the real value.
  let riding = false;

  // Reduced motion: no pop/bounce animation, dings stay. Sampled once.
  const prefersStill = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const toyDrawer = createToyDrawer(root, drawer, {
    world: options.world,
    beginDrag: (kind) => toyDrag.beginDrag(kind),
    requestClose: () => setDrawer(null),
  });

  // One drawer open at a time — the toybox flips between toys and trains.
  // The single 🧸 toggle remembers the tab you were on (Rails first time).
  const setDrawer = (which: 'toys' | 'trains' | null) => {
    // Mid-ride the drawers stay shut — the rail hides their triggers, and a
    // ride that begins with one open closes it.
    if (riding && which !== null) return;
    const openToys = which === 'toys';
    const openTrains = which === 'trains';
    toyDrawer.setOpen(openToys);
    toysSlot.setAttribute('aria-expanded', String(openToys));
    trainDrawer.toggleAttribute('hidden', !openTrains);
    trainSlot.setAttribute('aria-expanded', String(openTrains));
  };
  toysSlot.addEventListener('click', () => {
    setDrawer(drawer.hasAttribute('hidden') ? 'toys' : null);
  });
  trainSlot.addEventListener('click', () => {
    setDrawer(trainDrawer.hidden ? 'trains' : null);
  });
  const refreshTrainChoices = () => {
    for (const choice of trainDrawer.querySelectorAll<HTMLButtonElement>('[data-train]')) {
      choice.setAttribute('aria-pressed', String(choice.dataset.train === options.world.train()));
    }
  };
  // The row always shows the selected locomotive's pair, so loco switches,
  // restores, and undos re-aim it through the same subscription.
  const refreshWagonChoices = () => {
    const consist = options.world.consistFor(options.world.train());
    for (const pick of trainDrawer.querySelectorAll<HTMLButtonElement>('[data-wagon]')) {
      pick.setAttribute('aria-pressed', String(pick.dataset.wagon === consist));
    }
  };
  trainDrawer.addEventListener('click', (event) => {
    if (options.isReady && !options.isReady()) return;
    // A wagon tap dresses the selected locomotive's pair; the pressed states
    // follow the newly selected loco, so switching locos re-aims the row.
    const wagon = (event.target as Element).closest<HTMLButtonElement>('[data-wagon]');
    if (wagon) {
      options.world.selectConsist(options.world.train(), wagon.dataset.wagon as WagonPreset);
      refreshWagonChoices();
      // The newly dressed pair pops with the happy ding — still hands get
      // the ding but no motion, mirroring the loop-closing pop.
      options.audio.ding();
      if (!prefersStill) {
        wagon.classList.remove('pop');
        void wagon.offsetWidth;
        wagon.classList.add('pop');
      }
      return;
    }
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-train]');
    if (!button) return;
    options.world.selectTrain(button.dataset.train as TrainKind);
    refreshTrainChoices();
    refreshWagonChoices();
  });
  wagonRow.addEventListener('animationend', (event) => {
    (event.target as HTMLElement).classList.remove('pop');
  });
  options.world.subscribe(refreshTrainChoices);
  options.world.subscribe(refreshWagonChoices);

  // ---- Drag-from-drawer: the real model previews in the 3D scene ---------
  // pickedId set ⇒ the drag moves an existing placed toy (relocate or
  // trash); null ⇒ a fresh toy from the drawer.
  const toyDrag = createToyDrag(canvas, {
    root,
    world: options.world,
    audio: options.audio,
    isReady: options.isReady,
    isRiding: () => riding,
    notifyActivity: options.notifyActivity,
    cellFromPoint: options.cellFromPoint,
    beginGhost: options.beginGhost,
    moveGhost: options.moveGhost,
    endGhost: options.endGhost,
    pickPiece: options.pickPiece,
    setPieceVisible: options.setPieceVisible,
    cellToScreen: options.cellToScreen,
  });

  // ---- Grid toggle (debug): reveal the snap cells pieces land on. Dev-only —
  // production builds never mount the button, so wire it only when present.
  const gridToggle = root.querySelector<HTMLButtonElement>('.grid-toggle');
  gridToggle?.addEventListener('click', () => {
    const show = gridToggle.getAttribute('aria-pressed') !== 'true';
    gridToggle.setAttribute('aria-pressed', String(show));
    gridToggle.classList.toggle('is-active', show);
    options.setGridVisible(show);
  });

  // ---- Ride trigger: one chunky button, ▶ or ⏹ ---------------------------
  // The ▶/⏹ face follows the real ride state pushed by the scene: scoped
  // mid-ride edits and 🚂 kind switches keep trains rolling, so a world
  // change alone never flips the button.
  const rideControls = createRideControls({
    root,
    world: options.world,
    audio: options.audio,
    isRiding: () => riding,
    isReady: options.isReady,
    prefersStill,
    startRide: options.startRide,
    stopRide: options.stopRide,
    tootWhistle: options.tootWhistle,
    cycleFilmTarget: options.cycleFilmTarget,
    subscribeFilmCount: options.subscribeFilmCount,
    cellToScreen: options.cellToScreen,
    ping: (x, y) => toyDrag.ping(x, y),
  });
  options.subscribeRideMode((isRiding) => {
    riding = isRiding;
    rideControls.refreshRide();
    // Ride mode sheds the build tools; the stop hands them back untouched.
    // ⏹, whistle, 🎥, mute, and the parent gate stay on the rail.
    if (riding) setDrawer(null);
    toysSlot.hidden = riding;
    trainSlot.hidden = riding;
    trashSlot.hidden = riding;
    if (gridToggle) gridToggle.hidden = riding;
    toyDrag.hideChip();
    rideControls.refreshUndo();
  });

  // ---- Sound box: a big toot anytime, and a parent-friendly mute ---------
  const muteToggle = root.querySelector<HTMLButtonElement>('.mute-toggle');
  if (!muteToggle) {
    throw new Error('mute toggle missing from app frame');
  }

  const refreshMute = () => {
    const muted = options.audio.isMuted();
    muteToggle.setAttribute('aria-pressed', String(muted));
    muteToggle.textContent = muted ? '🔇' : '🔊';
    muteToggle.setAttribute('aria-label', muted ? 'Unmute the sounds' : 'Mute the sounds');
  };
  muteToggle.addEventListener('click', () => options.audio.toggleMuted());
  options.audio.subscribe(refreshMute);
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
    if (options.isReady && !options.isReady()) return;
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
    options.world.reset();
    options.audio.ding();
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
      options.world.applyPreset(preset.build());
      options.audio.ding();
    });
  }

  // Any press anywhere is toddler activity: it dismisses the attract drift
  // instantly and keeps the idle clock at arm's length.
  window.addEventListener('pointerdown', () => options.notifyActivity());

  // A tap anywhere outside the armed gate dismisses it silently.
  window.addEventListener('pointerdown', (event) => {
    if (!confirmArmed) return;
    if (event.target instanceof Element && event.target.closest('.parent-gate, .preset-tray'))
      return;
    disarmConfirm();
  });

  return canvas;
}
