import type { AudioController } from '../audio/audio-controller';
import { isWater } from '../core/river';
import { type SceneryKind, sceneryFloats } from '../core/scenery';
import { type Cell, type PieceType, type Rotation, terrainErrorFor } from '../core/track-graph';
import type { PickedItem } from '../scene/track-renderer';
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
  /** The placed toy under a screen point, for relocate/trash drags. */
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
  // trash); null ⇒ a fresh toy from the drawer.
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
  /** Fingers stray past the "rotate tap" limit before they may drag/trash. */
  const TAP_DRAG_PX = 12;
  // A just-pressed placed toy, awaiting either a tap (rotate in place) or
  // enough movement to become a relocate drag. null when idle.
  let pressed: { picked: PickedItem; startX: number; startY: number } | null = null;
  // Whether trains are rolling. Declared up top so every build entry point
  // below can refuse work mid-ride; the scene pushes the real value.
  const riding = false;

  // Pressing a placed toy does NOT lift it yet: a release without movement is
  // a rotate tap, and only movement past TAP_DRAG_PX turns the press into a
  // lift-drag (relocate or trash). Light taps no longer lift pieces.
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

  // ---- Delete-on-the-toy: a ✕ chip beside the lifted toy, plus a trash
  // bin that reacts while a lifted toy aims at it ---------------------------
  // Lifting a placed toy shows the chip; tapping it bins the toy silently
  // (same convention as a trash drop — no scolding sounds).
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
    setTrashHover(false);
    if (isPieceKind(kind)) deps.world.remove(id);
    else deps.world.removeScenery(id);
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

  // The trash bin grows while a lifted toy aims at it, and its invisible hit
  // zone widens so a near miss still counts.
  const trashSlot = deps.root.querySelector<HTMLButtonElement>('.trash-slot');
  if (!trashSlot) {
    throw new Error('trash slot missing from app frame');
  }
  const TRASH_ZONE_PX = 24;
  const nearTrash = (clientX: number, clientY: number) => {
    const rect = trashSlot.getBoundingClientRect();
    return (
      clientX >= rect.left - TRASH_ZONE_PX &&
      clientX <= rect.right + TRASH_ZONE_PX &&
      clientY >= rect.top - TRASH_ZONE_PX &&
      clientY <= rect.bottom + TRASH_ZONE_PX
    );
  };
  const setTrashHover = (hovering: boolean) => {
    trashSlot.classList.toggle('is-hovering', hovering);
  };

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

  // A ride began mid-gesture (a second finger on ▶): drop the press or
  // drag, commit nothing, and never stop the train.
  const cancelForRide = () => {
    pressed = null;
    if (drag) {
      if (drag.pickedId) deps.setPieceVisible(drag.pickedId, true);
      deps.endGhost();
      drag = null;
    }
    hideChip();
    setTrashHover(false);
  };
  const endDrag = (clientX: number, clientY: number) => {
    if (!drag) return;
    hideChip();
    setTrashHover(false);
    const { kind, rotation, pickedId } = drag;
    const cell = deps.cellFromPoint(clientX, clientY);
    let settled = false;
    let binned = false;
    if (pickedId === null) {
      settled =
        cell !== null &&
        (isPieceKind(kind)
          ? deps.world.place(kind, cell, rotation)
          : deps.world.placeScenery(kind, cell, rotation)) === 'placed';
    } else {
      const overTrash = nearTrash(clientX, clientY);
      if (overTrash) {
        if (isPieceKind(kind)) deps.world.remove(pickedId);
        else deps.world.removeScenery(pickedId);
        settled = true; // Binned.
        binned = true;
      } else if (cell && !overToolbarAt(clientX, clientY)) {
        // Toolbar drops never relocate — the bottom grid row hides behind the
        // rail, so the toy wobble-returns to its cell instead.
        settled =
          (isPieceKind(kind)
            ? deps.world.relocate(pickedId, cell, rotation)
            : deps.world.relocateScenery(pickedId, cell, rotation)) === 'placed';
      }
      deps.setPieceVisible(pickedId, true); // Reconcile already moved or removed it.
    }
    if (settled) {
      ping(clientX, clientY);
      if (!binned) deps.audio.ding(); // Trash drops stay silent — no scolding sounds.
    } else {
      wobbleReturn(clientX, clientY);
      deps.audio.thunk(); // A soft knock for a drop that bounced home — never a scolding.
    }
    deps.endGhost();
    drag = null;
  };

  /** True when the screen point sits over the toybox rail (toolbar drops wobble home). */
  const overToolbarAt = (clientX: number, clientY: number) => {
    const dropTarget = document.elementFromPoint(clientX, clientY);
    return dropTarget?.closest('.toybox-rail') !== null;
  };

  window.addEventListener('pointermove', (event) => {
    lastPointer = { x: event.clientX, y: event.clientY };
    if (drag) {
      moveDrag(event.clientX, event.clientY);
      if (drag.pickedId) {
        // The ✕ chip stays put beside the toy's home cell — a fixed target the
        // finger can hit; the bin cheers the toy on as it approaches.
        placeChip(drag.homeCell.x, drag.homeCell.y);
        setTrashHover(nearTrash(event.clientX, event.clientY));
      }
      return;
    }
    // A press that wanders past the tap limit becomes a relocate/trash drag.
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
      // A ride began mid-gesture (a second finger on ▶): drop the press or
      // drag, commit nothing, and never stop the train.
      pressed = null;
      if (drag) {
        if (drag.pickedId) deps.setPieceVisible(drag.pickedId, true);
        deps.endGhost();
        drag = null;
      }
      hideChip();
      setTrashHover(false);
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
  window.addEventListener('pointercancel', () => {
    pressed = null;
    if (drag) endDrag(-1000, -1000);
  });
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'r' && event.key !== 'R') return;
    if (!drag) return;
    stepRotation();
    moveDrag(lastPointer.x, lastPointer.y);
  });

  return { beginDrag, cancelForRide, hideChip, ping };
}
