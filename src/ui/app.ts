import type { AudioController } from '../audio/audio-controller';
import type { SceneryKind } from '../core/scenery';
import type { Cell, PieceType, Rotation } from '../core/track-graph';
import type { PickedItem } from '../scene/track-renderer';
import type { WorldStore } from '../state/world';
import { createParentGate } from './parent-gate';
import { createRideControls, RIDE_ICONS } from './ride-controls';
import { type CellFromPoint, createToyDrag } from './toy-drag';
import { createToyDrawer, toyTabPanels, toyTabStrip } from './toy-drawer';
import { PIECE_ICONS, SCENERY_ICONS } from './toy-icons';
import { createTrainPicker } from './train-picker';

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
  // Reduced motion: no pop/bounce animation, dings stay. Sampled once.
  const prefersStill = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const trainPicker = createTrainPicker(root, {
    world: options.world,
    audio: options.audio,
    isReady: options.isReady,
    prefersStill,
  });
  if (!drawer || !toysSlot || !trainSlot || !trashSlot) {
    throw new Error('toybox chrome missing from app frame');
  }

  // ---- Tabbed toybox drawer (Rails / Adventure / Nature / Town / Critters) -----------
  // One tab active at a time; the drawer itself is one of the three
  // toybox drawers (toys / trains) — never two at once.
  // Whether trains are rolling. Declared up top so every build entry point
  // below can refuse work mid-ride; the scene pushes the real value.
  let riding = false;

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
    trainPicker.setOpen(openTrains);
    trainSlot.setAttribute('aria-expanded', String(openTrains));
  };
  toysSlot.addEventListener('click', () => {
    setDrawer(drawer.hasAttribute('hidden') ? 'toys' : null);
  });
  trainSlot.addEventListener('click', () => {
    setDrawer(!trainPicker.isOpen() ? 'trains' : null);
  });
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

  createParentGate(root, {
    world: options.world,
    audio: options.audio,
    isReady: options.isReady,
  });

  // Any press anywhere is toddler activity: it dismisses the attract drift
  // instantly and keeps the idle clock at arm's length.
  window.addEventListener('pointerdown', () => options.notifyActivity());

  return canvas;
}
