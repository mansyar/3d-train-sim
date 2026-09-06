import type { AudioController } from '../audio/audio-controller';
import { TRAIN_KINDS, type TrainKind, trainAria, trainIcon } from '../core/trains';
import { WAGON_PRESETS, type WagonPreset, wagonPresetAria, wagonPresetIcon } from '../core/wagons';
import type { WorldStore } from '../state/world';

export interface TrainPickerDeps {
  world: WorldStore;
  audio: AudioController;
  /** Asynchronous startup restoration gate — selection refuses until ready. */
  isReady?: (() => boolean) | undefined;
  /** Reduced-motion sample (the dressed pair pops only for moving hands). */
  prefersStill: boolean;
}

export interface TrainPicker {
  /** The train drawer element (the wiring toggles it as one of the toybox drawers). */
  readonly element: HTMLDivElement;
  setOpen(open: boolean): void;
  isOpen(): boolean;
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
  root.append(trainDrawer);

  const refreshTrainChoices = () => {
    for (const choice of trainDrawer.querySelectorAll<HTMLButtonElement>('[data-train]')) {
      choice.setAttribute('aria-pressed', String(choice.dataset.train === world.train()));
    }
  };
  // The row always shows the selected locomotive's pair, so loco switches,
  // restores, and undos re-aim it through the same subscription.
  const refreshWagonChoices = () => {
    const consist = world.consistFor(world.train());
    for (const pick of trainDrawer.querySelectorAll<HTMLButtonElement>('[data-wagon]')) {
      pick.setAttribute('aria-pressed', String(pick.dataset.wagon === consist));
    }
  };
  trainDrawer.addEventListener('click', (event) => {
    if (deps.isReady && !deps.isReady()) return;
    // A wagon tap dresses the selected locomotive's pair; the pressed states
    // follow the newly selected loco, so switching locos re-aims the row.
    const wagon = (event.target as Element).closest<HTMLButtonElement>('[data-wagon]');
    if (wagon) {
      world.selectConsist(world.train(), wagon.dataset.wagon as WagonPreset);
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
    world.selectTrain(button.dataset.train as TrainKind);
    refreshTrainChoices();
    refreshWagonChoices();
  });
  wagonRow.addEventListener('animationend', (event) => {
    (event.target as HTMLElement).classList.remove('pop');
  });
  world.subscribe(refreshTrainChoices);
  world.subscribe(refreshWagonChoices);

  return {
    element: trainDrawer,
    setOpen(open) {
      trainDrawer.toggleAttribute('hidden', !open);
    },
    isOpen: () => !trainDrawer.hidden,
  };
}
