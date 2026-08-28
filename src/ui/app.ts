import type { AudioController } from '../audio/audio-controller';
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
};

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
}

export function mountApp(root: HTMLElement, options: AppOptions): HTMLCanvasElement {
  root.innerHTML = `
    <canvas class="scene-canvas" aria-label="Tiny Tracks 3D world"></canvas>
    <div class="track-drawer" role="group" aria-label="Track pieces" hidden>
      <button class="piece-slot" type="button" data-piece="straight"
              aria-label="${PIECE_LABELS.straight}">${PIECE_ICONS.straight}</button>
      <button class="piece-slot" type="button" data-piece="corner"
              aria-label="${PIECE_LABELS.corner}">${PIECE_ICONS.corner}</button>
    </div>
    <div class="scenery-drawer" role="group" aria-label="Scenery toys" hidden>
      <button class="scenery-slot" type="button" data-scenery="tree"
              aria-label="${sceneryAria('tree')}">🌳</button>
      <button class="scenery-slot" type="button" data-scenery="bush"
              aria-label="${sceneryAria('bush')}">🌿</button>
      <button class="scenery-slot" type="button" data-scenery="rock"
              aria-label="${sceneryAria('rock')}">🪨</button>
    </div>
    <button class="rotate-knob" type="button" aria-label="Rotate piece" hidden>⟳</button>
    <button class="grid-toggle" type="button" aria-label="Toggle the placement grid"
            aria-pressed="false">#</button>
    <div class="toybox-rail" role="toolbar" aria-label="Toy box">
      <button class="toy-slot" type="button" aria-label="Track pieces"
              aria-expanded="false" data-drawer="track">🛤️</button>
      <button class="toy-slot" type="button" aria-label="Scenery toys"
              aria-expanded="false" data-drawer="scenery">🌳</button>
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

  const drawer = root.querySelector<HTMLDivElement>('.track-drawer');
  const trackSlot = root.querySelector<HTMLButtonElement>('[data-drawer="track"]');
  const sceneryDrawer = root.querySelector<HTMLDivElement>('.scenery-drawer');
  const scenerySlot = root.querySelector<HTMLButtonElement>('[data-drawer="scenery"]');
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
  if (!drawer || !trackSlot || !sceneryDrawer || !scenerySlot || !trainSlot || !rotateKnob) {
    throw new Error('toybox chrome missing from app frame');
  }

  // One drawer open at a time - the toybox flips between rails and scenery.
  const setDrawer = (which: 'track' | 'scenery' | 'trains' | null) => {
    const openTrack = which === 'track';
    const openScenery = which === 'scenery';
    const openTrains = which === 'trains';
    drawer.toggleAttribute('hidden', !openTrack);
    trackSlot.setAttribute('aria-expanded', String(openTrack));
    sceneryDrawer.toggleAttribute('hidden', !openScenery);
    scenerySlot.setAttribute('aria-expanded', String(openScenery));
    trainDrawer.hidden = !openTrains;
    trainSlot.setAttribute('aria-expanded', String(openTrains));
  };
  trackSlot.addEventListener('click', () => {
    setDrawer(drawer.hasAttribute('hidden') ? 'track' : null);
  });
  scenerySlot.addEventListener('click', () => {
    setDrawer(sceneryDrawer.hasAttribute('hidden') ? 'scenery' : null);
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

  whistleToot.addEventListener('click', () => options.audio.whistle());

  const refreshMute = () => {
    const muted = options.audio.isMuted();
    muteToggle.setAttribute('aria-pressed', String(muted));
    muteToggle.textContent = muted ? '🔇' : '🔊';
    muteToggle.setAttribute('aria-label', muted ? 'Unmute the sounds' : 'Mute the sounds');
  };
  muteToggle.addEventListener('click', () => options.audio.toggleMuted());
  options.audio.subscribe(refreshMute);
  refreshMute();

  return canvas;
}
