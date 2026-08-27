import type { Cell, PieceType, Rotation } from '../core/track-graph';
import { MAX_PIECES } from '../core/track-graph';
import type { WorldStore } from '../state/world';

/** Where a dropped piece maps on the meadow, or nowhere. */
export type CellFromPoint = (clientX: number, clientY: number) => Cell | null;

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

export interface AppOptions {
  world: WorldStore;
  cellFromPoint: CellFromPoint;
  /** Begin the in-scene ghost preview for a dragged piece type. */
  beginGhost(type: PieceType): void;
  /** Snap the preview to a cell (null = off-meadow); tint by validity. */
  moveGhost(cell: Cell | null, rotation: Rotation, valid: boolean): void;
  /** End the preview. */
  endGhost(): void;
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
    <button class="rotate-knob" type="button" aria-label="Rotate piece" hidden>⟳</button>
    <div class="toybox-rail" role="toolbar" aria-label="Toy box">
      <button class="toy-slot" type="button" aria-label="Track pieces"
              aria-expanded="false" data-drawer="track">🛤️</button>
      <button class="toy-slot" type="button" aria-label="Scenery (coming soon)">🌳</button>
      <button class="toy-slot" type="button" aria-label="Trains (coming soon)">🚂</button>
    </div>
  `;
  const canvas = root.querySelector<HTMLCanvasElement>('.scene-canvas');
  if (!canvas) {
    throw new Error('scene canvas missing from app frame');
  }

  const drawer = root.querySelector<HTMLDivElement>('.track-drawer');
  const trackSlot = root.querySelector<HTMLButtonElement>('[data-drawer="track"]');
  const rotateKnob = root.querySelector<HTMLButtonElement>('.rotate-knob');
  if (!drawer || !trackSlot || !rotateKnob) {
    throw new Error('toybox chrome missing from app frame');
  }

  trackSlot.addEventListener('click', () => {
    const open = drawer.hasAttribute('hidden');
    drawer.toggleAttribute('hidden', !open);
    trackSlot.setAttribute('aria-expanded', String(open));
  });

  // ---- Drag-from-drawer: the real model previews in the 3D scene ---------
  let drag: { type: PieceType; rotation: Rotation } | null = null;
  let lastPointer = { x: -1000, y: -1000 };

  const canPlaceAt = (cell: Cell): boolean => {
    for (const piece of options.world.pieces()) {
      if (piece.cell.x === cell.x && piece.cell.y === cell.y) return false;
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
  const beginDrag = (type: PieceType) => {
    drag = { type, rotation: 0 };
    options.beginGhost(type);
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
    const { type, rotation } = drag;
    const cell = options.cellFromPoint(clientX, clientY);
    const placed = cell !== null && options.world.place(type, cell, rotation) === 'placed';
    if (placed) ping(clientX, clientY);
    else wobbleReturn(clientX, clientY);
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

  for (const button of root.querySelectorAll<HTMLButtonElement>('.piece-slot')) {
    button.addEventListener('pointerdown', (event) => {
      if (button.classList.contains('is-dimmed')) return;
      event.preventDefault();
      const type = (button.dataset.piece ?? 'straight') as PieceType;
      beginDrag(type);
    });
  }

  rotateKnob.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (!drag) return;
    stepRotation();
    moveDrag(lastPointer.x, lastPointer.y);
  });

  // ---- Cap dimming -------------------------------------------------------
  const refreshCap = () => {
    const full = options.world.pieces().length >= MAX_PIECES;
    for (const button of root.querySelectorAll<HTMLButtonElement>('.piece-slot')) {
      button.classList.toggle('is-dimmed', full);
      button.toggleAttribute('disabled', full);
    }
  };
  options.world.subscribe(refreshCap);
  refreshCap();

  return canvas;
}
