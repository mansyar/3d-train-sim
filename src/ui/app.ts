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
      <rect x="17" y="2" width="14" height="44" rx="5" fill="var(--toy-brown)"/>
      <rect x="21" y="5" width="6" height="38" rx="3" fill="var(--toy-steel)"/>
    </svg>`,
  corner: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M17 2 H31 V10 A24 24 0 0 1 46 31 H38 A16 16 0 0 0 24 10 Z"
            fill="var(--toy-brown)"/>
      <path d="M21 6 H27 V9 A21 21 0 0 1 42 27 H34 A15 15 0 0 0 21 9 Z"
            fill="var(--toy-steel)"/>
    </svg>`,
};

export interface AppOptions {
  world: WorldStore;
  cellFromPoint: CellFromPoint;
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

  // ---- Drag-from-drawer ghost -------------------------------------------
  let drag: { type: PieceType; ghost: HTMLDivElement; rotation: Rotation } | null = null;

  const canPlaceAt = (cell: Cell): boolean => {
    for (const piece of options.world.pieces()) {
      if (piece.cell.x === cell.x && piece.cell.y === cell.y) return false;
    }
    return true;
  };

  const moveDrag = (clientX: number, clientY: number) => {
    if (!drag) return;
    drag.ghost.style.translate = `${clientX - 48}px ${clientY - 48}px`;
    const cell = options.cellFromPoint(clientX, clientY);
    const placeable = cell !== null && canPlaceAt(cell);
    drag.ghost.classList.toggle('is-placeable', placeable);
    drag.ghost.classList.toggle('is-blocked', !placeable);
  };

  const beginDrag = (type: PieceType, clientX: number, clientY: number) => {
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.innerHTML = PIECE_ICONS[type];
    root.append(ghost);
    drag = { type, ghost, rotation: 0 };
    moveDrag(clientX, clientY);
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
    const { type, ghost, rotation } = drag;
    const cell = options.cellFromPoint(clientX, clientY);
    const placed = cell !== null && options.world.place(type, cell, rotation) === 'placed';
    if (placed) ping(clientX, clientY);
    else wobbleReturn(clientX, clientY);
    ghost.remove();
    drag = null;
    rotateKnob.setAttribute('hidden', '');
  };

  window.addEventListener('pointermove', (event) => {
    if (drag) moveDrag(event.clientX, event.clientY);
  });
  window.addEventListener('pointerup', (event) => {
    if (drag) endDrag(event.clientX, event.clientY);
  });
  window.addEventListener('pointercancel', () => {
    if (drag) endDrag(-1000, -1000);
  });

  for (const button of root.querySelectorAll<HTMLButtonElement>('.piece-slot')) {
    button.addEventListener('pointerdown', (event) => {
      if (button.classList.contains('is-dimmed')) return;
      event.preventDefault();
      const type = (button.dataset.piece ?? 'straight') as PieceType;
      beginDrag(type, event.clientX, event.clientY);
    });
  }

  rotateKnob.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (!drag) return;
    drag.rotation = ((drag.rotation + 90) % 360) as Rotation;
    drag.ghost.style.rotate = `${drag.rotation}deg`;
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
