import type { AudioController } from '../audio/audio-controller';
import { type DrawerTabId, drawerTabs } from '../core/drawer';
import { SCENERY_KINDS, type SceneryKind, sceneryAria } from '../core/scenery';
import { type Cell, MAX_PIECES, type PieceType, type Rotation } from '../core/track-graph';
import { TRAIN_KINDS, type TrainKind, trainAria, trainIcon } from '../core/trains';
import type { PickedItem } from '../scene/track-renderer';
import type { WorldStore } from '../state/world';

/** Where a dropped piece maps on the meadow, or nowhere. */
export type CellFromPoint = (clientX: number, clientY: number) => Cell | null;

/** Rails drawer kinds are track pieces; everything else is a scenery toy. */
const isPieceKind = (kind: PieceType | SceneryKind): kind is PieceType =>
  !(SCENERY_KINDS as readonly string[]).includes(kind);

const PIECE_LABELS: Record<PieceType, string> = {
  straight: 'Straight track piece',
  corner: 'Corner track piece',
  crossing: 'Crossing track piece',
};

/** Emoji stand-ins until the toys get their GLB thumbnails. */
const SCENERY_ICONS: Record<SceneryKind, string> = {
  tree: '🌳',
  bush: '🌿',
  rock: '🪨',
  house: '🏠',
  cottage: '🛖',
  station: '🚉',
  pig: '🐷',
  sheep: '🐑',
  pug: '🐶',
};

const PIECE_ICONS: Record<PieceType, string> = {
  straight: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="14" y="3" width="20" height="42" rx="5"
            fill="var(--toy-cream)" stroke="var(--toy-brown)" stroke-width="3"/>
      <rect x="15.5" y="9" width="17" height="4" rx="2"
            fill="var(--toy-brown)" opacity=".55"/>
      <rect x="15.5" y="22" width="17" height="4" rx="2"
            fill="var(--toy-brown)" opacity=".55"/>
      <rect x="15.5" y="35" width="17" height="4" rx="2"
            fill="var(--toy-brown)" opacity=".55"/>
      <line x1="19" y1="4" x2="19" y2="44"
            stroke="var(--toy-steel)" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="29" y1="4" x2="29" y2="44"
            stroke="var(--toy-steel)" stroke-width="3.5" stroke-linecap="round"/>
    </svg>`,
  corner: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M22 2 Q24 26 46 24" fill="none"
            stroke="var(--toy-brown)" stroke-width="22" stroke-linecap="round"/>
      <path d="M22 2 Q24 26 46 24" fill="none"
            stroke="var(--toy-cream)" stroke-width="16" stroke-linecap="round"/>
      <path d="M22 2 Q24 26 46 24" fill="none"
            stroke="var(--toy-steel)" stroke-width="5" stroke-linecap="round"/>
    </svg>`,
  crossing: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="6" y="4" width="36" height="40" rx="6" fill="var(--toy-cream)"/>
      <line x1="24" y1="4" x2="24" y2="44"
            stroke="var(--toy-brown)" stroke-width="14" stroke-linecap="round"/>
      <line x1="8" y1="24" x2="40" y2="24"
            stroke="var(--toy-brown)" stroke-width="14" stroke-linecap="round"/>
      <line x1="24" y1="4" x2="24" y2="44"
            stroke="var(--toy-cream)" stroke-width="9" stroke-linecap="round"/>
      <line x1="8" y1="24" x2="40" y2="24"
            stroke="var(--toy-cream)" stroke-width="9" stroke-linecap="round"/>
      <line x1="24" y1="4" x2="24" y2="44"
            stroke="var(--toy-steel)" stroke-width="3" stroke-linecap="round"/>
      <line x1="8" y1="24" x2="40" y2="24"
            stroke="var(--toy-steel)" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
};

/** One drawer button per catalog kind on a tab, in tab order. */
const toySlot = (kind: PieceType | SceneryKind): string =>
  isPieceKind(kind)
    ? `<button class="piece-slot" type="button" data-piece="${kind}"
              aria-label="${PIECE_LABELS[kind]}">${PIECE_ICONS[kind]}</button>`
    : `<button class="scenery-slot" type="button" data-scenery="${kind}"
              aria-label="${sceneryAria(kind)}">${SCENERY_ICONS[kind]}</button>`;

/** The four chunky tabs (Rails / Nature / Town / Critters) of the toybox. */
const TOY_TABS = drawerTabs();
const tabStrip = TOY_TABS.map(
  (tab) => `<button class="drawer-tab" type="button" data-tab="${tab.id}"
              aria-label="${tab.aria}" aria-pressed="false">${tab.icon}</button>`,
).join('');
const tabPanels = TOY_TABS.map(
  (tab) =>
    `<div class="drawer-panel" data-panel="${tab.id}" hidden>${tab.kinds
      .map(toySlot)
      .join('')}</div>`,
).join('');

const RIDE_ICONS = {
  play: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M17 9 L39 24 L17 39 Z" fill="currentColor"
            stroke="var(--toy-brown)" stroke-width="3" stroke-linejoin="round"/>
    </svg>`,
  stop: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="11" y="11" width="26" height="26" rx="6" fill="currentColor"
            stroke="var(--toy-brown)" stroke-width="3"/>
    </svg>`,
};

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
}

export function mountApp(root: HTMLElement, options: AppOptions): HTMLCanvasElement {
  root.innerHTML = `
    <canvas class="scene-canvas" aria-label="Tiny Tracks 3D world"></canvas>
    <div class="toy-drawer" role="group" aria-label="Toybox" hidden>
      <div class="drawer-tabs" role="tablist" aria-label="Toy groups">${tabStrip}</div>
      ${tabPanels}
    </div>
    <button class="rotate-knob" type="button" aria-label="Rotate piece" hidden>⟳</button>
    <button class="grid-toggle" type="button" aria-label="Toggle the placement grid"
            aria-pressed="false">#</button>
    <button class="parent-gate" type="button"
            aria-label="Parent gate — press and hold to reset the world">
      <span class="gate-icon" aria-hidden="true">♻️</span>
    </button>
    <div class="toybox-rail" role="toolbar" aria-label="Toy box">
      <button class="toy-slot" type="button" aria-label="Toybox"
              aria-expanded="false" data-drawer="toys">🧸</button>
      <button class="toy-slot" type="button" aria-label="Train collection"
              aria-expanded="false" data-drawer="trains">🚂</button>
      <button class="whistle-toot" type="button" aria-label="Toot the whistle">🎺</button>
      <button class="ride-toggle" type="button"
              aria-label="Ride the train">${RIDE_ICONS.play}</button>
      <button class="mute-toggle" type="button" aria-pressed="false"
              aria-label="Mute the sounds">🔊</button>
      <button class="trash-slot" type="button"
              aria-label="Trash bin — drop a track piece here to remove it">🗑️</button>
    </div>
  `;
  const canvas = root.querySelector<HTMLCanvasElement>('.scene-canvas');
  if (!canvas) {
    throw new Error('scene canvas missing from app frame');
  }

  const drawer = root.querySelector<HTMLDivElement>('.toy-drawer');
  const toysSlot = root.querySelector<HTMLButtonElement>('[data-drawer="toys"]');
  const trainSlot = root.querySelector<HTMLButtonElement>('[data-drawer="trains"]');
  const trainDrawer = document.createElement('div');
  trainDrawer.className = 'train-drawer';
  trainDrawer.setAttribute('role', 'group');
  trainDrawer.setAttribute('aria-label', 'Train collection');
  trainDrawer.hidden = true;
  for (const kind of TRAIN_KINDS) {
    const button = document.createElement('button');
    button.className = 'train-slot';
    button.type = 'button';
    button.dataset.train = kind;
    button.setAttribute('aria-label', trainAria(kind));
    button.setAttribute('aria-pressed', String(options.world.train() === kind));
    button.textContent = trainIcon(kind);
    trainDrawer.append(button);
  }
  root.append(trainDrawer);
  const rotateKnob = root.querySelector<HTMLButtonElement>('.rotate-knob');
  if (!drawer || !toysSlot || !trainSlot || !rotateKnob) {
    throw new Error('toybox chrome missing from app frame');
  }

  // ---- Tabbed toybox drawer (Rails / Nature / Town / Critters) -----------
  // One tab active at a time; the drawer itself is one of the three
  // toybox drawers (toys / trains) — never two at once.
  const tabButtons = new Map(
    [...root.querySelectorAll<HTMLButtonElement>('.drawer-tab')].map((button) => [
      button.dataset.tab as DrawerTabId,
      button,
    ]),
  );
  const panels = new Map(
    [...root.querySelectorAll<HTMLDivElement>('.drawer-panel')].map((panel) => [
      panel.dataset.panel as DrawerTabId,
      panel,
    ]),
  );
  let activeTab: DrawerTabId | null = null;

  const showTab = (tab: DrawerTabId | null) => {
    activeTab = tab;
    for (const [id, button] of tabButtons) {
      button.setAttribute('aria-pressed', String(id === tab));
      button.classList.toggle('is-active', id === tab);
    }
    for (const [id, panel] of panels) panel.toggleAttribute('hidden', id !== tab);
  };

  for (const button of tabButtons.values()) {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab as DrawerTabId;
      // A tap on the active tab closes the whole drawer — no empty strip state.
      if (activeTab === tab) setDrawer(null);
      else showTab(tab);
    });
  }

  // One drawer open at a time — the toybox flips between toys and trains.
  // The single 🧸 toggle remembers the tab you were on (Rails first time).
  const setDrawer = (which: 'toys' | 'trains' | null) => {
    const openToys = which === 'toys';
    const openTrains = which === 'trains';
    drawer.toggleAttribute('hidden', !openToys);
    toysSlot.setAttribute('aria-expanded', String(openToys));
    trainDrawer.toggleAttribute('hidden', !openTrains);
    trainSlot.setAttribute('aria-expanded', String(openTrains));
    if (openToys) showTab(activeTab ?? 'rails');
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
  trainDrawer.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-train]');
    if (!button || (options.isReady && !options.isReady())) return;
    options.world.selectTrain(button.dataset.train as TrainKind);
    refreshTrainChoices();
  });
  options.world.subscribe(refreshTrainChoices);

  // ---- Drag-from-drawer: the real model previews in the 3D scene ---------
  // pickedId set ⇒ the drag moves an existing placed toy (relocate or
  // trash); null ⇒ a fresh toy from the drawer.
  let drag: { kind: PieceType | SceneryKind; rotation: Rotation; pickedId: string | null } | null =
    null;
  let lastPointer = { x: -1000, y: -1000 };

  // Pressing a placed toy lifts it as a ghost (relocate / trash drags).
  // A plain tap releases on the same cell — relocate is a no-op snap-back.
  canvas.addEventListener('pointerdown', (event) => {
    if (drag || (options.isReady && !options.isReady())) return;
    const picked = options.pickPiece(event.clientX, event.clientY);
    if (picked) beginPlacedDrag(picked);
  });

  // Track pieces and scenery share the meadow: a cell holds at most one toy.
  const canPlaceAt = (cell: Cell): boolean => {
    for (const piece of options.world.pieces()) {
      if (piece.id === drag?.pickedId) continue; // The dragged toy frees its own cell.
      if (piece.cell.x === cell.x && piece.cell.y === cell.y) return false;
    }
    for (const toy of options.world.scenery()) {
      if (toy.id === drag?.pickedId) continue;
      if (toy.cell.x === cell.x && toy.cell.y === cell.y) return false;
    }
    return true;
  };

  const stepRotation = () => {
    if (!drag) return;
    drag.rotation = ((drag.rotation + 90) % 360) as Rotation;
  };

  const moveDrag = (clientX: number, clientY: number) => {
    if (!drag) return;
    // A long, slow drag still counts as activity — the meadow stays awake.
    options.notifyActivity();
    const cell = options.cellFromPoint(clientX, clientY);
    const placeable = cell !== null && canPlaceAt(cell);
    options.moveGhost(cell, drag.rotation, placeable);
  };

  const beginDrag = (kind: PieceType | SceneryKind) => {
    if (options.isReady && !options.isReady()) return;
    drag = { kind, rotation: 0, pickedId: null };
    options.beginGhost(kind);
    rotateKnob.removeAttribute('hidden');
  };

  const beginPlacedDrag = (picked: PickedItem) => {
    const kind = picked.kind === 'piece' ? picked.type : picked.scenery;
    drag = { kind, rotation: picked.rotation, pickedId: picked.id };
    options.setPieceVisible(picked.id, false); // The ghost stands in until the drop.
    options.beginGhost(kind);
    rotateKnob.removeAttribute('hidden');
  };

  const ping = (clientX: number, clientY: number) => {
    const ping = document.createElement('div');
    ping.className = 'drop-ping';
    ping.style.translate = `${clientX - 24}px ${clientY - 24}px`;
    root.append(ping);
    ping.addEventListener('animationend', () => ping.remove());
  };

  const wobbleReturn = (clientX: number, clientY: number) => {
    const wobble = document.createElement('div');
    wobble.className = 'wobble-return';
    wobble.style.translate = `${clientX - 24}px ${clientY - 24}px`;
    root.append(wobble);
    wobble.addEventListener('animationend', () => wobble.remove());
  };

  const endDrag = (clientX: number, clientY: number) => {
    if (!drag) return;
    const { kind, rotation, pickedId } = drag;
    const cell = options.cellFromPoint(clientX, clientY);
    let settled = false;
    let binned = false;
    if (pickedId === null) {
      settled =
        cell !== null &&
        (isPieceKind(kind)
          ? options.world.place(kind, cell, rotation)
          : options.world.placeScenery(kind, cell, rotation)) === 'placed';
    } else {
      const dropTarget = document.elementFromPoint(clientX, clientY);
      const overTrash = dropTarget?.closest('.trash-slot') !== null;
      const overToolbar = dropTarget?.closest('.toybox-rail') !== null;
      if (overTrash) {
        if (isPieceKind(kind)) options.world.remove(pickedId);
        else options.world.removeScenery(pickedId);
        settled = true; // Binned.
        binned = true;
      } else if (cell && !overToolbar) {
        // Toolbar drops never relocate — the bottom grid row hides behind the
        // rail, so the toy wobble-returns to its cell instead.
        settled =
          (isPieceKind(kind)
            ? options.world.relocate(pickedId, cell, rotation)
            : options.world.relocateScenery(pickedId, cell, rotation)) === 'placed';
      }
      options.setPieceVisible(pickedId, true); // Reconcile already moved or removed it.
    }
    if (settled) {
      ping(clientX, clientY);
      if (!binned) options.audio.ding(); // Trash drops stay silent — no scolding sounds.
    } else {
      wobbleReturn(clientX, clientY);
    }
    options.endGhost();
    drag = null;
    rotateKnob.setAttribute('hidden', '');
  };

  // Releases over the rotate knob are a rotation tap, never a drop.
  const isKnob = (event: Event): boolean =>
    event.target instanceof Element && event.target.closest('.rotate-knob') !== null;

  window.addEventListener('pointermove', (event) => {
    lastPointer = { x: event.clientX, y: event.clientY };
    if (drag) moveDrag(event.clientX, event.clientY);
  });
  window.addEventListener('pointerup', (event) => {
    if (drag && !isKnob(event)) endDrag(event.clientX, event.clientY);
  });
  window.addEventListener('pointercancel', () => {
    if (drag) endDrag(-1000, -1000);
  });
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'r' && event.key !== 'R') return;
    if (!drag) return;
    stepRotation();
    moveDrag(lastPointer.x, lastPointer.y);
  });

  for (const button of root.querySelectorAll<HTMLButtonElement>('.piece-slot, .scenery-slot')) {
    button.addEventListener('pointerdown', (event) => {
      if (button.classList.contains('is-dimmed')) return;
      event.preventDefault();
      const kind = button.dataset.piece ?? button.dataset.scenery ?? ('straight' as PieceType);
      beginDrag(kind as PieceType | SceneryKind);
    });
  }

  rotateKnob.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (!drag) return;
    stepRotation();
    moveDrag(lastPointer.x, lastPointer.y);
  });

  // ---- Grid toggle (debug): reveal the snap cells pieces land on ----------
  const gridToggle = root.querySelector<HTMLButtonElement>('.grid-toggle');
  if (!gridToggle) {
    throw new Error('grid toggle missing from app frame');
  }
  gridToggle.addEventListener('click', () => {
    const show = gridToggle.getAttribute('aria-pressed') !== 'true';
    gridToggle.setAttribute('aria-pressed', String(show));
    gridToggle.classList.toggle('is-active', show);
    options.setGridVisible(show);
  });

  // ---- Cap dimming -------------------------------------------------------
  const refreshCap = () => {
    const full = options.world.pieces().length + options.world.scenery().length >= MAX_PIECES;
    for (const button of root.querySelectorAll<HTMLButtonElement>('.piece-slot, .scenery-slot')) {
      button.classList.toggle('is-dimmed', full);
      button.toggleAttribute('disabled', full);
    }
  };
  options.world.subscribe(refreshCap);
  refreshCap();

  // ---- Ride trigger: one chunky button, ▶ or ⏹ ---------------------------
  const rideToggle = root.querySelector<HTMLButtonElement>('.ride-toggle');
  if (!rideToggle) {
    throw new Error('ride toggle missing from app frame');
  }

  let riding = false;
  const refreshRide = () => {
    const empty = options.world.pieces().length === 0;
    // An empty meadow dims the button — but a train easing to a stop (a
    // mid-ride edit just emptied the world) keeps its ⏹ face until parked.
    const parked = empty && !riding;
    rideToggle.classList.toggle('is-dimmed', parked);
    rideToggle.toggleAttribute('disabled', parked);
    rideToggle.classList.toggle('is-riding', riding);
    rideToggle.innerHTML = riding ? RIDE_ICONS.stop : RIDE_ICONS.play;
    rideToggle.setAttribute('aria-label', riding ? 'Stop the train' : 'Ride the train');
  };

  rideToggle.addEventListener('click', () => {
    if (options.isReady && !options.isReady()) return;
    if (riding) {
      options.stopRide();
      riding = false;
    } else {
      riding = options.startRide();
    }
    refreshRide();
  });

  // Any world edit gently stops the ride — the button follows.
  options.world.subscribe(() => {
    riding = false;
    refreshRide();
  });
  refreshRide();

  // ---- Sound box: a big toot anytime, and a parent-friendly mute ---------
  const whistleToot = root.querySelector<HTMLButtonElement>('.whistle-toot');
  const muteToggle = root.querySelector<HTMLButtonElement>('.mute-toggle');
  if (!whistleToot || !muteToggle) {
    throw new Error('sound box missing from app frame');
  }

  whistleToot.addEventListener('click', () => options.audio.whistle(options.world.train()));

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
  };

  const disarmConfirm = () => {
    if (!confirmArmed) return;
    confirmArmed = false;
    parentGate.classList.remove('is-confirm');
    parentGate.setAttribute('aria-label', HOLD_LABEL);
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

  // Any press anywhere is toddler activity: it dismisses the attract drift
  // instantly and keeps the idle clock at arm's length.
  window.addEventListener('pointerdown', () => options.notifyActivity());

  // A tap anywhere outside the armed gate dismisses it silently.
  window.addEventListener('pointerdown', (event) => {
    if (!confirmArmed) return;
    if (event.target instanceof Element && event.target.closest('.parent-gate')) return;
    disarmConfirm();
  });

  return canvas;
}
