import type { AudioController } from '../audio/audio-controller';
import { closesLoop } from '../core/ride-ready';
import type { Cell } from '../core/track-graph';
import type { WorldStore } from '../state/world';

export const RIDE_ICONS = {
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

export interface RideControlsDeps {
  root: HTMLElement;
  world: WorldStore;
  audio: AudioController;
  /** Whether trains are rolling — the app pushes the scene's ride mode. */
  isRiding(): boolean;
  /** Asynchronous startup restoration gate — the ride button refuses until ready. */
  isReady?: (() => boolean) | undefined;
  /** Reduced-motion sample taken once by the wiring (no motion, dings stay). */
  prefersStill: boolean;
  startRide(): void;
  stopRide(): void;
  /** Whistle, echo inside tunnels, and the steam puff. */
  tootWhistle(): void;
  cycleFilmTarget(): void;
  subscribeFilmCount(listener: (count: number) => void): void;
  /** The screen-space center of a meadow cell (the undo pop anchor). */
  cellToScreen(cell: Cell): { x: number; y: number } | null;
  /** Drop-ping anchor for the undo pop (the toy-drag api). */
  ping(x: number, y: number): void;
}

export interface RideControls {
  /** Re-aim ▶/⏹ to the current ride mode (the app calls this on its push). */
  refreshRide(): void;
  refreshUndo(): void;
}

export function createRideControls(deps: RideControlsDeps): RideControls {
  const { root, world, audio } = deps;

  // ---- Ride trigger: one chunky button, ▶ or ⏹ ---------------------------
  const rideToggle = root.querySelector<HTMLButtonElement>('.ride-toggle');
  if (!rideToggle) {
    throw new Error('ride toggle missing from app frame');
  }

  const refreshRide = () => {
    const empty = world.pieces().length === 0;
    // An empty meadow dims the button — but a train easing to a stop (a
    // mid-ride edit just emptied the world) keeps its ⏹ face until parked.
    const parked = empty && !deps.isRiding();
    rideToggle.classList.toggle('is-dimmed', parked);
    rideToggle.toggleAttribute('disabled', parked);
    rideToggle.classList.toggle('is-riding', deps.isRiding());
    rideToggle.innerHTML = deps.isRiding() ? RIDE_ICONS.stop : RIDE_ICONS.play;
    rideToggle.setAttribute('aria-label', deps.isRiding() ? 'Stop the train' : 'Ride the train');
    // The invitation is spent once trains roll, and moot on an empty meadow.
    if (deps.isRiding() || empty) rideToggle.classList.remove('is-ready-pulse');
  };

  rideToggle.addEventListener('click', () => {
    if (deps.isReady && !deps.isReady()) return;
    if (deps.isRiding()) deps.stopRide();
    else deps.startRide();
  });

  // Any world edit refreshes the empty-meadow dim.
  world.subscribe(() => refreshRide());
  refreshRide();

  // ---- Ride-ready invitation: ▶ pulses when the meadow turns rideable,
  // and pops with a happy ding when a drop closes a loop ------------------
  // Edit-time only — closesLoop's union-find never touches the render loop.
  // The ding is mute-respecting by construction; reduced-motion hands get
  // the ding but no motion.
  let prevPieces = world.pieces();
  rideToggle.addEventListener('animationend', () => rideToggle.classList.remove('pop'));
  world.subscribe(() => {
    const after = world.pieces();
    if (!deps.isRiding()) {
      if (prevPieces.length === 0 && after.length > 0 && !deps.prefersStill) {
        rideToggle.classList.add('is-ready-pulse');
      }
      if (closesLoop(prevPieces, after)) {
        audio.ding();
        if (!deps.prefersStill) {
          // Restart the pop when loops close back-to-back.
          rideToggle.classList.remove('pop');
          void rideToggle.offsetWidth;
          rideToggle.classList.add('pop');
        }
      }
    }
    prevPieces = after;
  });

  // ---- Undo: joins the rail after a change, takes back the last one -----
  // Session-only by construction: a reload restores the exact world but arms
  // no undo, so the button stays hidden until the next change.
  const undoToggle = root.querySelector<HTMLButtonElement>('.undo-toggle');
  if (!undoToggle) {
    throw new Error('undo toggle missing from app frame');
  }
  const refreshUndo = () => {
    undoToggle.hidden = deps.isRiding() || !world.canUndo();
  };
  world.subscribe(refreshUndo);
  refreshUndo();
  undoToggle.addEventListener('click', () => {
    const before = new Map<string, Cell>();
    for (const toy of [...world.pieces(), ...world.scenery()]) {
      before.set(toy.id, toy.cell);
    }
    if (!world.undo()) return;
    // undo() notified, so the button already hid itself again.
    audio.ding(); // The happy pop, mirror of a placement.
    const after = new Map<string, Cell>();
    for (const toy of [...world.pieces(), ...world.scenery()]) {
      after.set(toy.id, toy.cell);
    }
    // A restored toy pops where it came back; a taken-back placement pops
    // where it vanished. A same-cell rotate has no anchor — ding only.
    const moved = [...after.entries()].find(([id, cell]) => {
      const was = before.get(id);
      return !was || was.x !== cell.x || was.y !== cell.y;
    });
    const gone = moved ? undefined : [...before.entries()].find(([id]) => !after.has(id));
    const anchor = moved?.[1] ?? gone?.[1];
    const screen = anchor ? deps.cellToScreen(anchor) : null;
    if (screen) deps.ping(screen.x, screen.y);
  });

  // ---- Sound box: a big toot anytime --------------------------------------
  const whistleToot = root.querySelector<HTMLButtonElement>('.whistle-toot');
  if (!whistleToot) {
    throw new Error('whistle missing from app frame');
  }

  whistleToot.addEventListener('click', () => {
    deps.tootWhistle(); // Whistle, echo inside tunnels, and the steam puff.
  });

  // ---- 🎥 camera cycle: joins the rail while two or more trains ride -----
  // Each tap glides the chase camera to the next train, then the overview,
  // then wraps; hidden under reduced motion (no chase to cycle).
  const filmToggle = root.querySelector<HTMLButtonElement>('.film-toggle');
  if (!filmToggle) {
    throw new Error('film toggle missing from app frame');
  }
  filmToggle.addEventListener('click', () => {
    audio.click();
    deps.cycleFilmTarget();
  });
  deps.subscribeFilmCount((count) => {
    filmToggle.hidden = count < 2;
  });

  return { refreshRide, refreshUndo };
}
