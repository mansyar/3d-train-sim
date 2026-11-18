import type { AudioController } from '../audio/audio-controller';
import type { PickedItem } from '../core/meadow-grid';
import { isWater } from '../core/river';
import { type SceneryKind, sceneryFloats } from '../core/scenery';
import { type Cell, type PieceType, type Rotation, terrainErrorFor } from '../core/track-graph';
import type { WorldStore } from '../state/world';
import { isPieceKind } from './toy-icons';

/** Where a dropped piece maps on the meadow, or nowhere. */
export type CellFromPoint = (clientX: number, clientY: number) => Cell | null;

export interface ToyDragDeps {
  root: HTMLElement;
  world: WorldStore;
  audio: AudioController;
  /** Asynchronous startup restoration gate — gestures refuse until ready. */
  isReady?: (() => boolean) | undefined;
  /** Whether trains are rolling — build gestures refuse mid-ride. */
  isRiding(): boolean;
  notifyActivity(): void;
  cellFromPoint: CellFromPoint;
  /** Begin the in-scene ghost preview for a dragged toy. */
  beginGhost(kind: PieceType | SceneryKind): void;
  /** Snap the preview to a cell (null = off-meadow); tint by validity. */
  moveGhost(cell: Cell | null, rotation: Rotation, valid: boolean): void;
  /** End the preview. */
  endGhost(): void;
  /** The placed toy under a screen point, for relocate/removal drags. */
  pickPiece(clientX: number, clientY: number): PickedItem | null;
  /** Hide/show a placed clone (the ghost stands in while it is dragged). */
  setPieceVisible(id: string, visible: boolean): void;
  /** The screen-space center of a meadow cell, for anchoring the ✕ chip. */
  cellToScreen(cell: Cell): { x: number; y: number } | null;
}

export interface ToyDrag {
  /** Start a fresh-from-drawer drag (the toybox slots call this). */
  beginDrag(kind: PieceType | SceneryKind): void;
  /** A ride began mid-gesture: drop the press or drag, commit nothing. */
  cancelForRide(): void;
  hideChip(): void;
  /** Drop-ping feedback anchored at a screen point (the undo hand-off uses it). */
  ping(x: number, y: number): void;
}

export function createToyDrag(canvas: HTMLCanvasElement, deps: ToyDragDeps): ToyDrag {
  // ---- Drag-from-drawer: the real model previews in the 3D scene ---------
  // pickedId set ⇒ the drag moves an existing placed toy (relocate or
  // remove beyond the board); null ⇒ a fresh toy from the drawer.
  let drag: {
    kind: PieceType | SceneryKind;
    rotation: Rotation;
    pickedId: string | null;
    /** The ghost's current cell (null off-meadow). */
    cell: Cell | null;
    /** Where the toy was lifted from — anchors the fixed ✕ chip target. */
    homeCell: Cell;
  } | null = null;
  let lastPointer = { x: -1000, y: -1000 };
  /** Fingers stray past the "rotate tap" limit before they may drag/remove. */
  const TAP_DRAG_PX = 12;
  // A just-pressed placed toy, awaiting either a tap (rotate in place) or
  // enough movement to become a relocate drag. null when idle.
  let pressed: { picked: PickedItem; startX: number; startY: number } | null = null;
  // Whether trains are rolling. Declared up top so every build entry point
  // below can refuse work mid-ride; the scene pushes the real value.
  const riding = false;

  // Pressing a placed toy does NOT lift it yet: a release without movement is
  // a rotate tap, and only movement past TAP_DRAG_PX turns the press into a
  // lift-drag (relocate or remove). Light taps no longer lift pieces.
  canvas.addEventListener('pointerdown', (event) => {
    if (drag || pressed || deps.isRiding() || (deps.isReady && !deps.isReady())) return;
    const picked = deps.pickPiece(event.clientX, event.clientY);
    if (picked) pressed = { picked, startX: event.clientX, startY: event.clientY };
  });

  // Track pieces and scenery share the meadow: a cell holds at most one toy.
  // The river is part of the deal — land toys sit on the banks, the bridge
  // spans water — and the ghost tints exactly as the drop will commit.
  const canPlaceAt = (cell: Cell, kind: PieceType | SceneryKind): boolean => {
    for (const piece of deps.world.pieces()) {
      if (piece.id === drag?.pickedId) continue; // The dragged toy frees its own cell.
      if (piece.cell.x === cell.x && piece.cell.y === cell.y) return false;
    }
    for (const toy of deps.world.scenery()) {
      if (toy.id === drag?.pickedId) continue;
      if (toy.cell.x === cell.x && toy.cell.y === cell.y) return false;
    }
    return isPieceKind(kind)
      ? terrainErrorFor(kind, cell) === null
      : !isWater(cell) || sceneryFloats(kind);
  };

  const stepRotation = () => {
    if (!drag) return;
    drag.rotation = ((drag.rotation + 90) % 360) as Rotation;
  };

  const rotateBounce = (clientX: number, clientY: number) => {
    const bounce = document.createElement('div');
    bounce.className = 'rotate-bounce';
    bounce.style.translate = `${clientX - 24}px ${clientY - 24}px`;
    deps.root.append(bounce);
    bounce.addEventListener('animationend', () => bounce.remove());
  };

  // A tap on a placed toy turns it 90° in place — same cell, next yaw. The
  // renderer reconciles from the store, so the mesh follows; the click is the
  // rotation's voice and the bounce its visible pop.
  const rotatePlacedToy = (picked: PickedItem, clientX: number, clientY: number) => {
    const rotation = ((picked.rotation + 90) % 360) as Rotation;
    const placed =
      picked.kind === 'piece'
        ? deps.world.relocate(picked.id, picked.cell, rotation)
        : deps.world.relocateScenery(picked.id, picked.cell, rotation);
    if (placed !== 'placed') return; // Same-cell self-slot — should always land.
    deps.audio.click();
    deps.notifyActivity();
    rotateBounce(clientX, clientY);
  };

  const moveDrag = (clientX: number, clientY: number) => {
    if (!drag) return;
    // A long, slow drag still counts as activity — the meadow stays awake.
    deps.notifyActivity();
    const cell = deps.cellFromPoint(clientX, clientY);
    const placeable = cell !== null && canPlaceAt(cell, drag.kind);
    drag.cell = cell;
    deps.moveGhost(cell, drag.rotation, placeable);
  };

  const beginDrag = (kind: PieceType | SceneryKind) => {
    if (deps.isRiding() || (deps.isReady && !deps.isReady())) return;
    drag = { kind, rotation: 0, pickedId: null, cell: null, homeCell: { x: 0, y: 0 } };
    deps.beginGhost(kind);
  };

  const beginPlacedDrag = (picked: PickedItem) => {
    const kind = picked.kind === 'piece' ? picked.type : picked.scenery;
    drag = {
      kind,
      rotation: picked.rotation,
      pickedId: picked.id,
      cell: picked.cell,
      homeCell: picked.cell,
    };
    deps.setPieceVisible(picked.id, false); // The ghost stands in until the drop.
    deps.beginGhost(kind);
    // Anchor the ✕ chip to the toy's home cell — a fixed target while held.
    placeChip(picked.cell.x, picked.cell.y);
  };

  // ---- Delete-on-the-toy: a ✕ chip beside the lifted toy -------------------
  // Lifting a placed toy shows the chip; tapping it removes the toy silently
  // (same convention as an outside-board drop — no scolding sounds).
  const deleteChip = document.createElement('button');
  deleteChip.className = 'delete-chip';
  deleteChip.type = 'button';
  deleteChip.setAttribute('aria-label', 'Delete this toy');
  deleteChip.textContent = '✕';
  deleteChip.hidden = true;
  deps.root.append(deleteChip);

  /** Offset so the chip floats beside the toy, never under the finger. */
  const CHIP_OFFSET = { x: -46, y: -78 };
  const hideChip = () => {
    deleteChip.hidden = true;
  };
  /** Anchor the chip to the dragged toy's current cell (stable while held). */
  const placeChip = (cellX: number | null, cellY: number | null) => {
    if (cellX === null || cellY === null) {
      hideChip();
      return;
    }
    const screen = deps.cellToScreen({ x: cellX, y: cellY });
    if (!screen) {
      hideChip();
      return;
    }
    deleteChip.hidden = false;
    deleteChip.style.translate = `${screen.x + CHIP_OFFSET.x}px ${screen.y + CHIP_OFFSET.y}px`;
  };

  const deleteDraggedToy = () => {
    if (!drag?.pickedId) return;
    const id = drag.pickedId;
    const kind = drag.kind;
    // Clear the drag state first: a trailing pointerup must not endDrag on
    // the already-deleted toy.
    deps.endGhost();
    drag = null;
    hideChip();
    hideRemovalPreview();
    if (isPieceKind(kind)) deps.world.remove(id);
    else deps.world.removeScenery(id);
    removalPuff(lastPointer.x, lastPointer.y);
    deps.setPieceVisible(id, true); // Already removed — reconcile is a no-op.
  };

  deleteChip.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    event.preventDefault();
    deleteDraggedToy();
  });
  // Keyboard/mouse clicks on a button fire a trailing click — delete there too
  // (drag is already null by then, so the window pointerup above is a no-op).
  deleteChip.addEventListener('click', (event) => {
    event.stopPropagation();
    event.preventDefault();
    deleteDraggedToy();
  });

  const ping = (clientX: number, clientY: number) => {
    const ping = document.createElement('div');
    ping.className = 'drop-ping';
    ping.style.translate = `${clientX - 24}px ${clientY - 24}px`;
    deps.root.append(ping);
    ping.addEventListener('animationend', () => ping.remove());
  };

  const wobbleReturn = (clientX: number, clientY: number) => {
    const wobble = document.createElement('div');
    wobble.className = 'wobble-return';
    wobble.style.translate = `${clientX - 24}px ${clientY - 24}px`;
    deps.root.append(wobble);
    wobble.addEventListener('animationend', () => wobble.remove());
  };

  // A lifted placed toy beyond the board gets a soft ring. Re-entry before
  // release puts the ring away — the toy is only removed on an outside drop.
  const removalPreview = document.createElement('div');
  removalPreview.className = 'removal-preview';
  removalPreview.hidden = true;
  deps.root.append(removalPreview);

  const hideRemovalPreview = () => {
    removalPreview.hidden = true;
  };

  /** True when the point sits over the toybox chrome, never a drop target. */
  const overUiAt = (clientX: number, clientY: number) => {
    const dropTarget = document.elementFromPoint(clientX, clientY);
    return dropTarget?.closest('.toybox-rail, .toy-drawer, .train-drawer') !== null;
  };

  /** A lifted placed toy, past the board edge → the removable preview shows. */
  const isBeyondBoard = (clientX: number, clientY: number) =>
    deps.cellFromPoint(clientX, clientY) === null && !overUiAt(clientX, clientY);

  const updateRemovalPreview = (clientX: number, clientY: number) => {
    if (!drag?.pickedId || !isBeyondBoard(clientX, clientY)) {
      hideRemovalPreview();
      return;
    }
    removalPreview.hidden = false;
    removalPreview.style.translate = `${clientX - 48}px ${clientY - 48}px`;
  };

  const removalPuff = (clientX: number, clientY: number) => {
    const puff = document.createElement('div');
    puff.className = 'removal-puff';
    puff.style.translate = `${clientX - 48}px ${clientY - 48}px`;
    deps.root.append(puff);
    puff.addEventListener('animationend', () => puff.remove());
  };

  /** Abandon a gesture without committing — ride start, pointer loss or blur. */
  const cancelDrag = () => {
    pressed = null;
    if (drag) {
      if (drag.pickedId) deps.setPieceVisible(drag.pickedId, true);
      deps.endGhost();
      drag = null;
    }
    hideChip();
    hideRemovalPreview();
  };

  // A ride began mid-gesture (a second finger on ▶): drop the press or
  // drag, commit nothing, and never stop the train.
  const cancelForRide = cancelDrag;

  const endDrag = (clientX: number, clientY: number) => {
    if (!drag) return;
    hideChip();
    hideRemovalPreview();
    const { kind, rotation, pickedId } = drag;
    const cell = deps.cellFromPoint(clientX, clientY);
    let settled = false;
    let removed = false;
    if (pickedId === null) {
      // A fresh toy outside the board is simply cancelled — never removed.
      settled =
        cell !== null &&
        (isPieceKind(kind)
          ? deps.world.place(kind, cell, rotation)
          : deps.world.placeScenery(kind, cell, rotation)) === 'placed';
    } else if (cell === null && !overUiAt(clientX, clientY)) {
      // Beyond the board: the same remove path the bin used, with undo intact.
      if (isPieceKind(kind)) deps.world.remove(pickedId);
      else deps.world.removeScenery(pickedId);
      settled = true;
      removed = true;
      deps.setPieceVisible(pickedId, true); // Reconcile already removed it.
    } else if (cell && !overUiAt(clientX, clientY)) {
      // Chrome drops never relocate — the bottom row hides behind the rail.
      settled =
        (isPieceKind(kind)
          ? deps.world.relocate(pickedId, cell, rotation)
          : deps.world.relocateScenery(pickedId, cell, rotation)) === 'placed';
      deps.setPieceVisible(pickedId, true);
    } else {
      deps.setPieceVisible(pickedId, true);
    }
    if (settled) {
      if (removed) {
        removalPuff(clientX, clientY); // Soft puff; removals stay silent.
      } else {
        ping(clientX, clientY);
        deps.audio.ding();
      }
    } else {
      wobbleReturn(clientX, clientY);
      deps.audio.thunk(); // A soft knock for a drop that bounced home — never a scolding.
    }
    deps.endGhost();
    drag = null;
  };

  window.addEventListener('pointermove', (event) => {
    lastPointer = { x: event.clientX, y: event.clientY };
    if (drag) {
      moveDrag(event.clientX, event.clientY);
      if (drag.pickedId) {
        // The ✕ chip stays put beside the toy's home cell — a fixed target the
        // finger can hit; the ring appears only past the board edge.
        placeChip(drag.homeCell.x, drag.homeCell.y);
        updateRemovalPreview(event.clientX, event.clientY);
      }
      return;
    }
    // A press that wanders past the tap limit becomes a relocate/removal drag.
    if (!pressed) return;
    const distance = Math.hypot(event.clientX - pressed.startX, event.clientY - pressed.startY);
    if (distance > TAP_DRAG_PX) {
      const { picked } = pressed;
      pressed = null;
      beginPlacedDrag(picked);
      moveDrag(event.clientX, event.clientY);
    }
  });
  window.addEventListener('pointerup', (event) => {
    if (riding) {
      cancelDrag();
      return;
    }
    if (pressed) {
      // Released where it started: a rotate tap on the placed toy.
      const { picked } = pressed;
      pressed = null;
      rotatePlacedToy(picked, event.clientX, event.clientY);
      return;
    }
    // A tap on the ✕ chip deletes the toy — it must not also end the drag.
    if (drag && !(event.target instanceof Element && event.target.closest('.delete-chip'))) {
      endDrag(event.clientX, event.clientY);
    }
  });
  window.addEventListener('pointercancel', cancelDrag);
  window.addEventListener('blur', cancelDrag);
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'r' && event.key !== 'R') return;
    if (!drag) return;
    stepRotation();
    moveDrag(lastPointer.x, lastPointer.y);
    if (drag.pickedId) updateRemovalPreview(lastPointer.x, lastPointer.y);
  });

  return { beginDrag, cancelForRide, hideChip, ping };
}
