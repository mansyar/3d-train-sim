import type { AudioController } from '../audio/audio-controller';
import { solvePath } from '../core/pathing';
import { TRAIN_KINDS, type TrainKind, trainAria, trainIcon } from '../core/trains';
import { WAGON_PRESETS, type WagonPreset, wagonPresetAria, wagonPresetIcon } from '../core/wagons';
import {
  createLiveryStore,
  locoVehicleId,
  PAINT_SWATCHES,
  type PaintId,
  STICKER_IDS,
  type StickerId,
} from '../state/liveries';
import { consistFitsLoop, type WorldStore } from '../state/world';

/**
 * The drawer's livery store. It lives at module scope so it survives drawer
 * rebuilds and later phases (scene repaint, persistence) can share the same
 * per-vehicle state instead of keeping a second copy.
 */
export const liveryStore = createLiveryStore();

const STICKER_ARIA: Record<StickerId, string> = {
  star: 'Star sticker',
  heart: 'Heart sticker',
  flower: 'Flower sticker',
  bolt: 'Lightning bolt sticker',
};

const STICKER_GLYPH: Record<StickerId, string> = {
  star: '★',
  heart: '♥',
  flower: '✿',
  bolt: '⚡',
};

export interface TrainPickerDeps {
  world: WorldStore;
  audio: AudioController;
  /** Asynchronous startup restoration gate — selection refuses until ready. */
  isReady?: (() => boolean) | undefined;
  /** Reduced-motion sample (the dressed pair pops only for moving hands). */
  prefersStill: boolean;
}

export interface TrainPicker {
  setOpen(open: boolean): void;
  isOpen(): boolean;
}

function styleLiveryButton(button: HTMLButtonElement): void {
  button.style.alignItems = 'center';
  button.style.background = '#fff8e7';
  button.style.border = '4px solid #6b3f2a';
  button.style.borderRadius = '18px';
  button.style.boxShadow = '0 4px 0 #6b3f2a';
  button.style.boxSizing = 'border-box';
  button.style.cursor = 'pointer';
  button.style.display = 'inline-flex';
  button.style.height = '72px';
  button.style.justifyContent = 'center';
  button.style.minHeight = '72px';
  button.style.minWidth = '72px';
  button.style.padding = '0';
  button.style.touchAction = 'manipulation';
  button.style.transition = 'none';
  button.style.width = '72px';
}

function markSelected(button: HTMLButtonElement, selected: boolean): void {
  button.setAttribute('aria-pressed', String(selected));
  button.style.background = selected ? '#b9e6a8' : '#fff8e7';
  button.style.outline = selected ? '4px solid #3a2312' : 'none';
  button.style.transform = selected ? 'translateY(-3px)' : 'none';
}

export function createTrainPicker(root: HTMLElement, deps: TrainPickerDeps): TrainPicker {
  const { world, audio } = deps;

  // ---- Train collection drawer: six engines + the wagon workshop row ----
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
    button.setAttribute('aria-pressed', String(world.train() === kind));
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
    pick.setAttribute('aria-pressed', String(world.consistFor(world.train()) === preset));
    pick.innerHTML = wagonPresetIcon(preset);
    wagonRow.append(pick);
  }
  trainDrawer.append(wagonRow);

  // ---- Consist strip: one chip per wagon, a compact + slot, a tiny tally ----
  // The four chips are created once and hidden past the current count, so the
  // drawer is updated in place — no rebuild, no second event listener.
  const MAX_WAGONS = 4;
  const consistRow = document.createElement('div');
  consistRow.className = 'consist-row';
  consistRow.setAttribute('role', 'group');
  consistRow.setAttribute('aria-label', 'Wagons');

  const wagonChips: HTMLButtonElement[] = [];
  for (let index = 0; index < MAX_WAGONS; index += 1) {
    const chip = document.createElement('button');
    chip.className = 'wagon-chip';
    chip.type = 'button';
    chip.dataset.wagonIndex = String(index);
    chip.setAttribute('aria-label', `Wagon ${index + 1}`);
    chip.setAttribute('aria-pressed', 'false');
    chip.innerHTML =
      '<svg viewBox="0 0 48 48" aria-hidden="true">' +
      '<rect x="4" y="17" width="40" height="17" rx="3" fill="#f4c95d" stroke="#6b3f2a" stroke-width="3"/>' +
      '<circle cx="15" cy="36" r="4" fill="#6b3f2a"/>' +
      '<circle cx="33" cy="36" r="4" fill="#6b3f2a"/>' +
      '</svg>';
    wagonChips.push(chip);
    consistRow.append(chip);
  }

  const addWagon = document.createElement('button');
  addWagon.className = 'add-wagon';
  addWagon.type = 'button';
  addWagon.dataset.addWagon = '';
  addWagon.setAttribute('aria-label', 'Add a wagon');
  addWagon.setAttribute('aria-disabled', 'true');
  addWagon.innerHTML =
    '<svg viewBox="0 0 48 48" aria-hidden="true">' +
    '<path d="M24 9v30M9 24h30" fill="none" stroke="#6b3f2a" stroke-width="6" stroke-linecap="round"/>' +
    '</svg>';
  consistRow.append(addWagon);

  const wagonTally = document.createElement('span');
  wagonTally.className = 'wagon-tally';
  wagonTally.dataset.wagonTally = '';
  wagonTally.setAttribute('aria-hidden', 'true');
  wagonTally.textContent = String(world.wagonCount(world.train()));
  consistRow.append(wagonTally);
  trainDrawer.append(consistRow);

  // ---- Livery tray: six paints, four stickers, one restore, all icon-only ----
  // Inline styles because the kid UI stylesheet is intentionally untouched by
  // this phase; the section wraps onto its own row inside the flex drawer.
  const liverySection = document.createElement('section');
  liverySection.className = 'livery-section';
  liverySection.setAttribute('role', 'group');
  liverySection.setAttribute('aria-label', 'Paint and stickers');
  liverySection.dataset.armed = '';
  liverySection.style.alignItems = 'center';
  liverySection.style.display = 'flex';
  liverySection.style.flexBasis = '100%';
  liverySection.style.flexShrink = '0';
  liverySection.style.flexWrap = 'wrap';
  liverySection.style.gap = '12px';
  liverySection.style.justifyContent = 'center';

  const paintButtons = new Map<PaintId, HTMLButtonElement>();
  for (const swatch of PAINT_SWATCHES) {
    const button = document.createElement('button');
    button.className = 'livery-swatch';
    button.type = 'button';
    button.dataset.paint = swatch.id;
    button.setAttribute('aria-label', swatch.aria);
    button.setAttribute('aria-pressed', 'false');
    styleLiveryButton(button);
    const disc = document.createElement('span');
    disc.setAttribute('aria-hidden', 'true');
    disc.style.background = swatch.hex;
    disc.style.border = '3px solid rgba(255, 255, 255, 0.9)';
    disc.style.borderRadius = '50%';
    disc.style.boxSizing = 'border-box';
    disc.style.display = 'block';
    disc.style.height = '48px';
    disc.style.width = '48px';
    button.append(disc);
    paintButtons.set(swatch.id, button);
    liverySection.append(button);
  }

  const stickerButtons = new Map<StickerId, HTMLButtonElement>();
  for (const sticker of STICKER_IDS) {
    const button = document.createElement('button');
    button.className = 'livery-sticker';
    button.type = 'button';
    button.dataset.sticker = sticker;
    button.setAttribute('aria-label', STICKER_ARIA[sticker]);
    button.setAttribute('aria-pressed', 'false');
    styleLiveryButton(button);
    const glyph = document.createElement('span');
    glyph.setAttribute('aria-hidden', 'true');
    glyph.style.fontSize = '34px';
    glyph.style.lineHeight = '1';
    glyph.textContent = STICKER_GLYPH[sticker];
    button.append(glyph);
    stickerButtons.set(sticker, button);
    liverySection.append(button);
  }

  const restoreButton = document.createElement('button');
  restoreButton.className = 'livery-restore';
  restoreButton.type = 'button';
  restoreButton.dataset.restore = '';
  restoreButton.setAttribute('aria-label', 'Restore original look');
  restoreButton.setAttribute('aria-pressed', 'false');
  styleLiveryButton(restoreButton);
  const restoreGlyph = document.createElement('span');
  restoreGlyph.setAttribute('aria-hidden', 'true');
  restoreGlyph.style.fontSize = '34px';
  restoreGlyph.style.lineHeight = '1';
  restoreGlyph.textContent = '↺';
  restoreButton.append(restoreGlyph);
  liverySection.append(restoreButton);

  // A wordless row of dots makes "stickers are on" visible without reading.
  const tally = document.createElement('div');
  tally.dataset.liveryTally = '';
  tally.setAttribute('aria-hidden', 'true');
  tally.style.alignItems = 'center';
  tally.style.display = 'flex';
  tally.style.flexBasis = '100%';
  tally.style.gap = '6px';
  tally.style.justifyContent = 'center';
  tally.style.minHeight = '20px';
  liverySection.append(tally);
  trainDrawer.append(liverySection);
  root.append(trainDrawer);

  const currentVehicleId = () => locoVehicleId(world.train());
  /** The shape waiting for a vehicle tap — a sticker tap never stamps alone. */
  let armedSticker: StickerId | null = null;
  /** Which chip the next preset dresses; null means the old pair-preset tap. */
  let selectedWagon: number | null = null;
  /** Selection and pressed states belong to this locomotive only. */
  let trayTrain = world.train();

  /** Re-aim the whole tray at the selected locomotive, reading only the store. */
  const refreshLivery = () => {
    const livery = liveryStore.liveryFor(currentVehicleId());
    liverySection.dataset.target = currentVehicleId();
    liverySection.dataset.stickerCount = String(livery.stickers.length);
    const newest = livery.stickers[livery.stickers.length - 1];
    for (const [paint, button] of paintButtons) markSelected(button, livery.paint === paint);
    for (const [sticker, button] of stickerButtons) {
      markSelected(button, armedSticker === sticker || newest === sticker);
    }
    markSelected(restoreButton, livery.paint === null && livery.stickers.length === 0);
    tally.replaceChildren(
      ...livery.stickers.map(() => {
        const dot = document.createElement('span');
        dot.style.background = '#8a5a33';
        dot.style.borderRadius = '50%';
        dot.style.display = 'block';
        dot.style.height = '14px';
        dot.style.width = '14px';
        return dot;
      }),
    );
  };

  const disarmSticker = (): void => {
    armedSticker = null;
    liverySection.dataset.armed = '';
    refreshLivery();
  };

  /** Same-task bounce, so the tap is answered before the next frame. */
  const bounce = (button: HTMLButtonElement) => {
    if (deps.prefersStill || typeof button.animate !== 'function') return;
    button.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(0.86)' }, { transform: 'scale(1)' }],
      { duration: 220, easing: 'ease-out' },
    );
  };

  const refreshTrainChoices = () => {
    const train = world.train();
    if (train !== trayTrain) {
      trayTrain = train;
      selectedWagon = null;
    }
    for (const choice of trainDrawer.querySelectorAll<HTMLButtonElement>('[data-train]')) {
      choice.setAttribute('aria-pressed', String(choice.dataset.train === train));
    }
    // The tray always belongs to the locomotive currently selected above it.
    refreshLivery();
  };
  // One refresh keeps the chips, the + gate, the tally, and the pair presets
  // in sync. Loco switches, wagon taps, and track edits all arrive here via
  // the same two subscriptions — the tray is never rebuilt.
  const refreshWagonChoices = () => {
    const train = world.train();
    const count = world.wagonCount(train);
    const path = solvePath(world.pieces());
    const loopLength = path.closed ? path.steps.length : 0;
    const canAdd = count < MAX_WAGONS && consistFitsLoop(loopLength, count);
    addWagon.setAttribute('aria-disabled', String(!canAdd));
    addWagon.classList.toggle('is-dimmed', !canAdd);
    wagonTally.textContent = String(count);
    wagonTally.dataset.count = String(count);
    if (selectedWagon !== null && selectedWagon >= count) selectedWagon = null;
    wagonChips.forEach((chip, index) => {
      chip.hidden = index >= count;
      chip.setAttribute('aria-pressed', String(index < count && selectedWagon === index));
    });
    // No chip picked yet: show the shared pair preset (the old behaviour).
    // With a chip picked: show that wagon's own outfit.
    const consist = world.consistFor(train);
    const outfit =
      selectedWagon === null ? consist : (world.wagonOutfits(train)[selectedWagon] ?? consist);
    for (const pick of trainDrawer.querySelectorAll<HTMLButtonElement>('[data-wagon]')) {
      pick.setAttribute('aria-pressed', String(pick.dataset.wagon === outfit));
    }
  };
  trainDrawer.addEventListener('click', (event) => {
    if (deps.isReady && !deps.isReady()) return;
    const paint = (event.target as Element).closest<HTMLButtonElement>('[data-paint]');
    if (paint?.dataset.paint) {
      liveryStore.setPaint(currentVehicleId(), paint.dataset.paint as PaintId);
      if (armedSticker) disarmSticker();
      bounce(paint);
      return;
    }
    const sticker = (event.target as Element).closest<HTMLButtonElement>('[data-sticker]');
    if (sticker?.dataset.sticker) {
      // Pick up a shape first; it lands only when a drawer vehicle is tapped.
      armedSticker =
        armedSticker === sticker.dataset.sticker ? null : (sticker.dataset.sticker as StickerId);
      liverySection.dataset.armed = armedSticker ?? '';
      refreshLivery();
      bounce(sticker);
      return;
    }
    if ((event.target as Element).closest('[data-restore]')) {
      liveryStore.restoreDefault(currentVehicleId());
      if (armedSticker) disarmSticker();
      bounce(restoreButton);
      return;
    }
    const add = (event.target as Element).closest<HTMLButtonElement>('[data-add-wagon]');
    if (add) {
      if (add.getAttribute('aria-disabled') !== 'true') {
        const train = world.train();
        world.setWagonCount(train, world.wagonCount(train) + 1);
      }
      refreshWagonChoices();
      return;
    }
    // Tapping the last chip unhitches it; any earlier chip just picks which
    // wagon the next preset dresses. The final wagon never leaves the train.
    const chip = (event.target as Element).closest<HTMLButtonElement>('[data-wagon-index]');
    if (chip) {
      const train = world.train();
      const count = world.wagonCount(train);
      const index = Number(chip.dataset.wagonIndex);
      if (index === count - 1) {
        if (count > 1) world.setWagonCount(train, count - 1);
      } else {
        selectedWagon = index;
      }
      refreshWagonChoices();
      return;
    }
    // A wagon tap dresses the chosen chip, or the whole pair when no chip is
    // picked — the old behaviour stays exactly as it was for pair presets.
    const wagon = (event.target as Element).closest<HTMLButtonElement>('[data-wagon]');
    if (wagon) {
      if (armedSticker) {
        liveryStore.stamp(currentVehicleId(), armedSticker);
        disarmSticker();
      }
      if (selectedWagon === null) {
        world.selectConsist(world.train(), wagon.dataset.wagon as WagonPreset);
      } else {
        world.selectWagonOutfit(world.train(), selectedWagon, wagon.dataset.wagon as WagonPreset);
      }
      refreshWagonChoices();
      // The newly dressed pair pops with the happy ding — still hands get
      // the ding but no motion, mirroring the loop-closing pop.
      audio.ding();
      if (!deps.prefersStill) {
        wagon.classList.remove('pop');
        void wagon.offsetWidth;
        wagon.classList.add('pop');
      }
      return;
    }
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-train]');
    if (!button) return;
    // The drawer is the whole "sticker book": tapping an engine while holding
    // a shape stamps that engine, then arms nothing so the next tap is safe.
    if (armedSticker) {
      const vehicle = locoVehicleId(button.dataset.train as TrainKind);
      liveryStore.stamp(vehicle, armedSticker);
      disarmSticker();
    }
    world.selectTrain(button.dataset.train as TrainKind);
    refreshTrainChoices();
    refreshWagonChoices();
  });
  wagonRow.addEventListener('animationend', (event) => {
    (event.target as HTMLElement).classList.remove('pop');
  });
  world.subscribe(refreshTrainChoices);
  world.subscribe(refreshWagonChoices);
  // One listener for the drawer's whole lifetime. The tray is updated in place,
  // never rebuilt, so subscriptions cannot pile up on a re-render.
  liveryStore.subscribe((id) => {
    if (id === currentVehicleId()) refreshLivery();
  });
  refreshLivery();
  refreshWagonChoices();

  return {
    setOpen(open) {
      trainDrawer.toggleAttribute('hidden', !open);
    },
    isOpen: () => !trainDrawer.hidden,
  };
}
