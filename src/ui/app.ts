import type { AudioController } from '../audio/audio-controller';
import { type DrawerTabId, drawerTabs } from '../core/drawer';
import { closesLoop } from '../core/ride-ready';
import { isWater } from '../core/river';
import { SCENERY_KINDS, type SceneryKind, sceneryAria } from '../core/scenery';
import { STARTER_PRESETS } from '../core/starters';
import {
  type Cell,
  MAX_PIECES,
  type PieceType,
  type Rotation,
  terrainErrorFor,
} from '../core/track-graph';
import { TRAIN_KINDS, type TrainKind, trainAria, trainIcon } from '../core/trains';
import { WAGON_PRESETS, type WagonPreset, wagonPresetAria, wagonPresetIcon } from '../core/wagons';
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
  'crossing-gate': 'Railway crossing gate piece',
  bridge: 'Bridge track piece',
  tunnel: 'Tunnel track piece',
  'slope-up': 'Rising slope track piece',
  hill: 'Hilltop track piece',
  'slope-down': 'Falling slope track piece',
  'bump-up': 'Gentle bump-up track piece',
  'hill-half': 'Low hilltop track piece',
  'bump-down': 'Gentle bump-down track piece',
  'corner-up': 'Uphill corner track piece',
  'hill-corner': 'Hilltop corner track piece',
  'corner-down': 'Downhill corner track piece',
  switch: 'Switch track piece',
  'switch-mirror': 'Mirror switch track piece',
};

/** Chunky inline SVGs in the PIECE_ICONS construction: 48×48 viewBox,
 * `var(--toy-*)` fills, brown outlines, steel accents. No emoji in kid UI. */
const SCENERY_ICONS: Record<SceneryKind, string> = {
  // A round-canopy tree on a stubby trunk.
  tree: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="21" y="28" width="6" height="14" rx="2" fill="var(--toy-brown)"/>
      <circle cx="24" cy="18" r="14" fill="var(--toy-green)"
              stroke="var(--toy-brown)" stroke-width="3"/>
      <circle cx="18" cy="13" r="4" fill="var(--toy-cream)" opacity=".5"/>
    </svg>`,
  // A low garden bush — all canopy, no trunk.
  bush: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <ellipse cx="24" cy="30" rx="17" ry="12" fill="var(--toy-green)"
               stroke="var(--toy-brown)" stroke-width="3"/>
      <circle cx="17" cy="27" r="3.5" fill="var(--toy-cream)" opacity=".5"/>
    </svg>`,
  // A chunky boulder with a sunlit edge.
  rock: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M8 40 L14 20 L30 14 L42 26 L39 40 Z" fill="var(--toy-steel)"
            stroke="var(--toy-brown)" stroke-width="3" stroke-linejoin="round"/>
      <line x1="17" y1="24" x2="28" y2="20" stroke="var(--toy-cream)"
            stroke-width="3" stroke-linecap="round" opacity=".7"/>
    </svg>`,
  // A gabled house with an orange roof and a brown door.
  house: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="12" y="20" width="24" height="20" rx="2" fill="var(--toy-cream)"
            stroke="var(--toy-brown)" stroke-width="3"/>
      <path d="M6 22 L24 6 L42 22 Z" fill="var(--toy-orange)"
            stroke="var(--toy-brown)" stroke-width="3" stroke-linejoin="round"/>
      <rect x="21" y="29" width="6" height="11" rx="1" fill="var(--toy-brown)"/>
    </svg>`,
  // The cottage: round walls, mossy roof, porthole window.
  cottage: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="11" y="22" width="26" height="18" rx="8" fill="var(--toy-cream)"
            stroke="var(--toy-brown)" stroke-width="3"/>
      <path d="M5 24 Q24 4 43 24 Z" fill="var(--toy-green)"
            stroke="var(--toy-brown)" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="24" cy="31" r="5" fill="var(--toy-steel)"
              stroke="var(--toy-brown)" stroke-width="2.5"/>
    </svg>`,
  // The station: orange signboard, clock face, steel platform.
  station: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="10" y="14" width="28" height="18" rx="2" fill="var(--toy-cream)"
            stroke="var(--toy-brown)" stroke-width="3"/>
      <rect x="6" y="8" width="36" height="7" rx="3" fill="var(--toy-orange)"
            stroke="var(--toy-brown)" stroke-width="3"/>
      <circle cx="24" cy="23" r="5" fill="var(--toy-green)"
              stroke="var(--toy-brown)" stroke-width="2.5"/>
      <rect x="10" y="32" width="28" height="6" rx="2" fill="var(--toy-steel)"
            stroke="var(--toy-brown)" stroke-width="2.5"/>
    </svg>`,
  // A round piggy: orange head, cream snout, perky ears.
  pig: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M14 15 L10 5 L21 10 Z" fill="var(--toy-orange)"
            stroke="var(--toy-brown)" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M34 15 L38 5 L27 10 Z" fill="var(--toy-orange)"
            stroke="var(--toy-brown)" stroke-width="2.5" stroke-linejoin="round"/>
      <circle cx="24" cy="26" r="15" fill="var(--toy-orange)"
              stroke="var(--toy-brown)" stroke-width="3"/>
      <circle cx="18" cy="21" r="2" fill="var(--toy-brown)"/>
      <circle cx="30" cy="21" r="2" fill="var(--toy-brown)"/>
      <ellipse cx="24" cy="30" rx="6" ry="5" fill="var(--toy-cream)"
               stroke="var(--toy-brown)" stroke-width="2.5"/>
      <circle cx="22" cy="30" r="1.2" fill="var(--toy-brown)"/>
      <circle cx="26" cy="30" r="1.2" fill="var(--toy-brown)"/>
    </svg>`,
  // A woolly sheep: cream puffs around a brown face.
  sheep: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="15" cy="19" r="7" fill="var(--toy-cream)"
              stroke="var(--toy-brown)" stroke-width="2.5"/>
      <circle cx="24" cy="14" r="8" fill="var(--toy-cream)"
              stroke="var(--toy-brown)" stroke-width="2.5"/>
      <circle cx="33" cy="19" r="7" fill="var(--toy-cream)"
              stroke="var(--toy-brown)" stroke-width="2.5"/>
      <circle cx="17" cy="28" r="7" fill="var(--toy-cream)"
              stroke="var(--toy-brown)" stroke-width="2.5"/>
      <circle cx="31" cy="28" r="7" fill="var(--toy-cream)"
              stroke="var(--toy-brown)" stroke-width="2.5"/>
      <ellipse cx="24" cy="32" rx="7" ry="6" fill="var(--toy-brown)"/>
      <circle cx="22" cy="31" r="1.2" fill="var(--toy-cream)"/>
      <circle cx="26" cy="31" r="1.2" fill="var(--toy-cream)"/>
    </svg>`,
  // A pug: orange crunch-face, cream muzzle, floppy brown ears.
  pug: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <ellipse cx="13" cy="22" rx="5" ry="9" fill="var(--toy-brown)"/>
      <ellipse cx="35" cy="22" rx="5" ry="9" fill="var(--toy-brown)"/>
      <circle cx="24" cy="24" r="14" fill="var(--toy-orange)"
              stroke="var(--toy-brown)" stroke-width="3"/>
      <circle cx="18" cy="20" r="1.8" fill="var(--toy-brown)"/>
      <circle cx="30" cy="20" r="1.8" fill="var(--toy-brown)"/>
      <ellipse cx="24" cy="30" rx="7" ry="6" fill="var(--toy-cream)"
               stroke="var(--toy-brown)" stroke-width="2.5"/>
      <circle cx="24" cy="27" r="2.2" fill="var(--toy-brown)"/>
    </svg>`,
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
  // The railway crossing gate: the straight rail crossed by a grey road,
  // with a red-and-white crossbuck post and two lifted barrier arms.
  'crossing-gate': `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="14" y="3" width="20" height="42" rx="5"
            fill="var(--toy-cream)" stroke="var(--toy-brown)" stroke-width="3"/>
      <line x1="19" y1="4" x2="19" y2="44"
            stroke="var(--toy-steel)" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="29" y1="4" x2="29" y2="44"
            stroke="var(--toy-steel)" stroke-width="3.5" stroke-linecap="round"/>
      <rect x="2" y="19" width="44" height="10" rx="3"
            fill="var(--toy-steel)" stroke="var(--toy-brown)" stroke-width="3"/>
      <line x1="6" y1="24" x2="12" y2="24" stroke="var(--toy-cream)" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="16" y1="24" x2="22" y2="24" stroke="var(--toy-cream)" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="26" y1="24" x2="32" y2="24" stroke="var(--toy-cream)" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="36" y1="24" x2="42" y2="24" stroke="var(--toy-cream)" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="14" y1="21" x2="14" y2="9"
            stroke="var(--toy-brown)" stroke-width="4" stroke-linecap="round"/>
      <circle cx="14" cy="7" r="3" fill="var(--toy-red)" stroke="var(--toy-brown)" stroke-width="2"/>
      <line x1="30" y1="9" x2="40" y2="5"
            stroke="var(--toy-red)" stroke-width="4" stroke-linecap="round"/>
      <line x1="33" y1="10.5" x2="37" y2="8.7"
            stroke="var(--toy-cream)" stroke-width="4" stroke-linecap="round" opacity=".85"/>
    </svg>`,
  // The trestle: a plank deck on stilt legs reaching down into the water.
  bridge: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <line x1="10" y1="22" x2="10" y2="42"
            stroke="var(--toy-brown)" stroke-width="4" stroke-linecap="round"/>
      <line x1="24" y1="22" x2="24" y2="44"
            stroke="var(--toy-brown)" stroke-width="4" stroke-linecap="round"/>
      <line x1="38" y1="22" x2="38" y2="42"
            stroke="var(--toy-brown)" stroke-width="4" stroke-linecap="round"/>
      <rect x="2" y="16" width="44" height="8" rx="3"
            fill="var(--toy-cream)" stroke="var(--toy-brown)" stroke-width="3"/>
      <line x1="4" y1="17.5" x2="44" y2="17.5"
            stroke="var(--toy-steel)" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="4" y1="22.5" x2="44" y2="22.5"
            stroke="var(--toy-steel)" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,
  // The tunnel: a grassy dome with a dark arch the train rides through.
  tunnel: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M2 44 A22 22 0 0 1 46 44 Z"
            fill="var(--toy-green)" stroke="var(--toy-brown)" stroke-width="3"/>
      <path d="M15 44 A9 11 0 0 1 33 44 Z" fill="#3a2c22"/>
      <line x1="17" y1="43" x2="17" y2="36"
            stroke="var(--toy-steel)" stroke-width="3" stroke-linecap="round"/>
      <line x1="31" y1="43" x2="31" y2="36"
            stroke="var(--toy-steel)" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
  // The hill run: a rising slope, the crowned crest, and the mirror descent —
  // drawn as a chunky rail bed climbing left to right (rising), level (crest),
  // and falling.
  'slope-up': `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M2 42 L46 12 L46 44 L2 44 Z"
            fill="var(--toy-cream)" stroke="var(--toy-brown)" stroke-width="3"/>
      <line x1="4" y1="40" x2="44" y2="12"
            stroke="var(--toy-steel)" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="4" y1="45" x2="44" y2="17"
            stroke="var(--toy-steel)" stroke-width="3.5" stroke-linecap="round"/>
    </svg>`,
  hill: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M2 20 Q24 6 46 20 L46 44 L2 44 Z"
            fill="var(--toy-cream)" stroke="var(--toy-brown)" stroke-width="3"/>
      <path d="M4 18 Q24 5 44 18" fill="none"
            stroke="var(--toy-steel)" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M4 24 Q24 11 44 24" fill="none"
            stroke="var(--toy-steel)" stroke-width="3.5" stroke-linecap="round"/>
    </svg>`,
  'slope-down': `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M2 12 L46 42 L46 44 L2 44 Z"
            fill="var(--toy-cream)" stroke="var(--toy-brown)" stroke-width="3"/>
      <line x1="4" y1="12" x2="44" y2="40"
            stroke="var(--toy-steel)" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="4" y1="17" x2="44" y2="45"
            stroke="var(--toy-steel)" stroke-width="3.5" stroke-linecap="round"/>
    </svg>`,
  // The bump run: the hill run's gentle sibling at half height — a shallow
  // wedge up, a low dome, a shallow wedge down.
  'bump-up': `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M2 42 L46 28 L46 44 L2 44 Z"
            fill="var(--toy-cream)" stroke="var(--toy-brown)" stroke-width="3"/>
      <line x1="4" y1="40" x2="44" y2="28"
            stroke="var(--toy-steel)" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="4" y1="45" x2="44" y2="33"
            stroke="var(--toy-steel)" stroke-width="3.5" stroke-linecap="round"/>
    </svg>`,
  'hill-half': `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M2 30 Q24 20 46 30 L46 44 L2 44 Z"
            fill="var(--toy-cream)" stroke="var(--toy-brown)" stroke-width="3"/>
      <path d="M4 28 Q24 19 44 28" fill="none"
            stroke="var(--toy-steel)" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M4 34 Q24 25 44 34" fill="none"
            stroke="var(--toy-steel)" stroke-width="3.5" stroke-linecap="round"/>
    </svg>`,
  'bump-down': `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M2 28 L46 42 L46 44 L2 44 Z"
            fill="var(--toy-cream)" stroke="var(--toy-brown)" stroke-width="3"/>
      <line x1="4" y1="28" x2="44" y2="40"
            stroke="var(--toy-steel)" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="4" y1="33" x2="44" y2="45"
            stroke="var(--toy-steel)" stroke-width="3.5" stroke-linecap="round"/>
    </svg>`,
  // The elevated corner run: the corner's bend on a grassy bank — climbing
  // in, cruising high, rolling back down.
  'corner-up': `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M2 44 L2 30 Q2 20 14 20 L46 20 L46 44 Z"
            fill="var(--toy-cream)" stroke="var(--toy-brown)" stroke-width="3"/>
      <path d="M22 4 Q24 26 46 24" fill="none"
            stroke="var(--toy-steel)" stroke-width="5" stroke-linecap="round"/>
    </svg>`,
  'hill-corner': `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M2 44 L2 24 Q24 10 46 20 L46 44 Z"
            fill="var(--toy-cream)" stroke="var(--toy-brown)" stroke-width="3"/>
      <path d="M22 2 Q24 26 46 24" fill="none"
            stroke="var(--toy-brown)" stroke-width="22" stroke-linecap="round"/>
      <path d="M22 2 Q24 26 46 24" fill="none"
            stroke="var(--toy-cream)" stroke-width="16" stroke-linecap="round"/>
      <path d="M22 2 Q24 26 46 24" fill="none"
            stroke="var(--toy-steel)" stroke-width="5" stroke-linecap="round"/>
    </svg>`,
  'corner-down': `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M2 44 L2 20 L34 20 Q44 20 46 30 L46 44 Z"
            fill="var(--toy-cream)" stroke="var(--toy-brown)" stroke-width="3"/>
      <path d="M22 2 Q24 26 46 24" fill="none"
            stroke="var(--toy-steel)" stroke-width="5" stroke-linecap="round"/>
    </svg>`,
  // The switch: a straight through-road with a curved branch peeling off
  // to the right — the Y a train takes a different way each pass.
  switch: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 46 L24 2" fill="none"
            stroke="var(--toy-brown)" stroke-width="22" stroke-linecap="round"/>
      <path d="M24 27 Q35 25 44 9" fill="none"
            stroke="var(--toy-brown)" stroke-width="18" stroke-linecap="round"/>
      <path d="M24 46 L24 2" fill="none"
            stroke="var(--toy-cream)" stroke-width="15" stroke-linecap="round"/>
      <path d="M24 27 Q35 25 44 9" fill="none"
            stroke="var(--toy-cream)" stroke-width="11" stroke-linecap="round"/>
      <line x1="20.5" y1="44" x2="20.5" y2="4"
            stroke="var(--toy-steel)" stroke-width="3" stroke-linecap="round"/>
      <line x1="27.5" y1="44" x2="27.5" y2="4"
            stroke="var(--toy-steel)" stroke-width="3" stroke-linecap="round"/>
      <path d="M24 27 Q35 25 44 9" fill="none"
            stroke="var(--toy-steel)" stroke-width="3.5" stroke-linecap="round"/>
    </svg>`,
  // The mirror switch: the same Y flipped — the curved branch peels off
  // to the left, so toddlers can tell the two switches apart in the tray.
  'switch-mirror': `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 46 L24 2" fill="none"
            stroke="var(--toy-brown)" stroke-width="22" stroke-linecap="round"/>
      <path d="M24 27 Q13 25 4 9" fill="none"
            stroke="var(--toy-brown)" stroke-width="18" stroke-linecap="round"/>
      <path d="M24 46 L24 2" fill="none"
            stroke="var(--toy-cream)" stroke-width="15" stroke-linecap="round"/>
      <path d="M24 27 Q13 25 4 9" fill="none"
            stroke="var(--toy-cream)" stroke-width="11" stroke-linecap="round"/>
      <line x1="20.5" y1="44" x2="20.5" y2="4"
            stroke="var(--toy-steel)" stroke-width="3" stroke-linecap="round"/>
      <line x1="27.5" y1="44" x2="27.5" y2="4"
            stroke="var(--toy-steel)" stroke-width="3" stroke-linecap="round"/>
      <path d="M24 27 Q13 25 4 9" fill="none"
            stroke="var(--toy-steel)" stroke-width="3.5" stroke-linecap="round"/>
    </svg>`,
};

/** One drawer button per catalog kind on a tab, in tab order. */
const toySlot = (kind: PieceType | SceneryKind): string =>
  isPieceKind(kind)
    ? `<button class="piece-slot" type="button" data-piece="${kind}"
              aria-label="${PIECE_LABELS[kind]}">${PIECE_ICONS[kind]}</button>`
    : `<button class="scenery-slot" type="button" data-scenery="${kind}"
              aria-label="${sceneryAria(kind)}">${SCENERY_ICONS[kind]}</button>`;

/** The five chunky tabs (Rails / Adventure / Nature / Town / Critters) of the toybox. */
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
      <div class="drawer-tabs" role="tablist" aria-label="Toy groups">${tabStrip}</div>
      ${tabPanels}
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
    button.innerHTML = trainIcon(kind);
    trainDrawer.append(button);
  }
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
    pick.setAttribute(
      'aria-pressed',
      String(options.world.consistFor(options.world.train()) === preset),
    );
    pick.innerHTML = wagonPresetIcon(preset);
    wagonRow.append(pick);
  }
  trainDrawer.append(wagonRow);
  root.append(trainDrawer);
  if (!drawer || !toysSlot || !trainSlot) {
    throw new Error('toybox chrome missing from app frame');
  }

  // ---- Tabbed toybox drawer (Rails / Adventure / Nature / Town / Critters) -----------
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
    // Mid-ride the drawers stay shut — the rail hides their triggers, and a
    // ride that begins with one open closes it.
    if (riding && which !== null) return;
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
  // The row always shows the selected locomotive's pair, so loco switches,
  // restores, and undos re-aim it through the same subscription.
  const refreshWagonChoices = () => {
    const consist = options.world.consistFor(options.world.train());
    for (const pick of trainDrawer.querySelectorAll<HTMLButtonElement>('[data-wagon]')) {
      pick.setAttribute('aria-pressed', String(pick.dataset.wagon === consist));
    }
  };
  trainDrawer.addEventListener('click', (event) => {
    if (options.isReady && !options.isReady()) return;
    // A wagon tap dresses the selected locomotive's pair; the pressed states
    // follow the newly selected loco, so switching locos re-aims the row.
    const wagon = (event.target as Element).closest<HTMLButtonElement>('[data-wagon]');
    if (wagon) {
      options.world.selectConsist(options.world.train(), wagon.dataset.wagon as WagonPreset);
      refreshWagonChoices();
      // The newly dressed pair pops with the happy ding — still hands get
      // the ding but no motion, mirroring the loop-closing pop.
      options.audio.ding();
      if (!prefersStill) {
        wagon.classList.remove('pop');
        void wagon.offsetWidth;
        wagon.classList.add('pop');
      }
      return;
    }
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-train]');
    if (!button) return;
    options.world.selectTrain(button.dataset.train as TrainKind);
    refreshTrainChoices();
    refreshWagonChoices();
  });
  wagonRow.addEventListener('animationend', (event) => {
    (event.target as HTMLElement).classList.remove('pop');
  });
  options.world.subscribe(refreshTrainChoices);
  options.world.subscribe(refreshWagonChoices);

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
  let riding = false;

  // Pressing a placed toy does NOT lift it yet: a release without movement is
  // a rotate tap, and only movement past TAP_DRAG_PX turns the press into a
  // lift-drag (relocate or trash). Light taps no longer lift pieces.
  canvas.addEventListener('pointerdown', (event) => {
    if (drag || pressed || riding || (options.isReady && !options.isReady())) return;
    const picked = options.pickPiece(event.clientX, event.clientY);
    if (picked) pressed = { picked, startX: event.clientX, startY: event.clientY };
  });

  // Track pieces and scenery share the meadow: a cell holds at most one toy.
  // The river is part of the deal — land toys sit on the banks, the bridge
  // spans water — and the ghost tints exactly as the drop will commit.
  const canPlaceAt = (cell: Cell, kind: PieceType | SceneryKind): boolean => {
    for (const piece of options.world.pieces()) {
      if (piece.id === drag?.pickedId) continue; // The dragged toy frees its own cell.
      if (piece.cell.x === cell.x && piece.cell.y === cell.y) return false;
    }
    for (const toy of options.world.scenery()) {
      if (toy.id === drag?.pickedId) continue;
      if (toy.cell.x === cell.x && toy.cell.y === cell.y) return false;
    }
    return isPieceKind(kind) ? terrainErrorFor(kind, cell) === null : !isWater(cell);
  };

  const stepRotation = () => {
    if (!drag) return;
    drag.rotation = ((drag.rotation + 90) % 360) as Rotation;
  };

  const rotateBounce = (clientX: number, clientY: number) => {
    const bounce = document.createElement('div');
    bounce.className = 'rotate-bounce';
    bounce.style.translate = `${clientX - 24}px ${clientY - 24}px`;
    root.append(bounce);
    bounce.addEventListener('animationend', () => bounce.remove());
  };

  // A tap on a placed toy turns it 90° in place — same cell, next yaw. The
  // renderer reconciles from the store, so the mesh follows; the click is the
  // rotation's voice and the bounce its visible pop.
  const rotatePlacedToy = (picked: PickedItem, clientX: number, clientY: number) => {
    const rotation = ((picked.rotation + 90) % 360) as Rotation;
    const placed =
      picked.kind === 'piece'
        ? options.world.relocate(picked.id, picked.cell, rotation)
        : options.world.relocateScenery(picked.id, picked.cell, rotation);
    if (placed !== 'placed') return; // Same-cell self-slot — should always land.
    options.audio.click();
    options.notifyActivity();
    rotateBounce(clientX, clientY);
  };

  const moveDrag = (clientX: number, clientY: number) => {
    if (!drag) return;
    // A long, slow drag still counts as activity — the meadow stays awake.
    options.notifyActivity();
    const cell = options.cellFromPoint(clientX, clientY);
    const placeable = cell !== null && canPlaceAt(cell, drag.kind);
    drag.cell = cell;
    options.moveGhost(cell, drag.rotation, placeable);
  };

  const beginDrag = (kind: PieceType | SceneryKind) => {
    if (riding || (options.isReady && !options.isReady())) return;
    drag = { kind, rotation: 0, pickedId: null, cell: null, homeCell: { x: 0, y: 0 } };
    options.beginGhost(kind);
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
    options.setPieceVisible(picked.id, false); // The ghost stands in until the drop.
    options.beginGhost(kind);
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
  root.append(deleteChip);

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
    const screen = options.cellToScreen({ x: cellX, y: cellY });
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
    options.endGhost();
    drag = null;
    hideChip();
    setTrashHover(false);
    if (isPieceKind(kind)) options.world.remove(id);
    else options.world.removeScenery(id);
    options.setPieceVisible(id, true); // Already removed — reconcile is a no-op.
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
  const trashSlot = root.querySelector<HTMLButtonElement>('.trash-slot');
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
    hideChip();
    setTrashHover(false);
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
      const overTrash = nearTrash(clientX, clientY);
      if (overTrash) {
        if (isPieceKind(kind)) options.world.remove(pickedId);
        else options.world.removeScenery(pickedId);
        settled = true; // Binned.
        binned = true;
      } else if (cell && !overToolbarAt(clientX, clientY)) {
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
      options.audio.thunk(); // A soft knock for a drop that bounced home — never a scolding.
    }
    options.endGhost();
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
        if (drag.pickedId) options.setPieceVisible(drag.pickedId, true);
        options.endGhost();
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

  for (const button of root.querySelectorAll<HTMLButtonElement>('.piece-slot, .scenery-slot')) {
    button.addEventListener('pointerdown', (event) => {
      if (button.classList.contains('is-dimmed')) return;
      event.preventDefault();
      const kind = button.dataset.piece ?? button.dataset.scenery ?? ('straight' as PieceType);
      beginDrag(kind as PieceType | SceneryKind);
    });
  }

  // ---- Grid toggle (debug): reveal the snap cells pieces land on. Dev-only —
  // production builds never mount the button, so wire it only when present.
  const gridToggle = root.querySelector<HTMLButtonElement>('.grid-toggle');
  gridToggle?.addEventListener('click', () => {
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
    // The invitation is spent once trains roll, and moot on an empty meadow.
    if (riding || empty) rideToggle.classList.remove('is-ready-pulse');
  };

  // The ▶/⏹ face follows the real ride state pushed by the scene: scoped
  // mid-ride edits and 🚂 kind switches keep trains rolling, so a world
  // change alone never flips the button.
  options.subscribeRideMode((isRiding) => {
    riding = isRiding;
    refreshRide();
    // Ride mode sheds the build tools; the stop hands them back untouched.
    // ⏹, whistle, 🎥, mute, and the parent gate stay on the rail.
    if (riding) setDrawer(null);
    toysSlot.hidden = riding;
    trainSlot.hidden = riding;
    trashSlot.hidden = riding;
    if (gridToggle) gridToggle.hidden = riding;
    hideChip();
    refreshUndo();
  });

  rideToggle.addEventListener('click', () => {
    if (options.isReady && !options.isReady()) return;
    if (riding) options.stopRide();
    else options.startRide();
  });

  // Any world edit refreshes the empty-meadow dim.
  options.world.subscribe(() => refreshRide());
  refreshRide();

  // ---- Ride-ready invitation: ▶ pulses when the meadow turns rideable,
  // and pops with a happy ding when a drop closes a loop ------------------
  // Edit-time only — closesLoop's union-find never touches the render loop.
  // The ding is mute-respecting by construction; reduced-motion hands get
  // the ding but no motion.
  const prefersStill = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let prevPieces = options.world.pieces();
  rideToggle.addEventListener('animationend', () => rideToggle.classList.remove('pop'));
  options.world.subscribe(() => {
    const after = options.world.pieces();
    if (!riding) {
      if (prevPieces.length === 0 && after.length > 0 && !prefersStill) {
        rideToggle.classList.add('is-ready-pulse');
      }
      if (closesLoop(prevPieces, after)) {
        options.audio.ding();
        if (!prefersStill) {
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
    undoToggle.hidden = riding || !options.world.canUndo();
  };
  options.world.subscribe(refreshUndo);
  refreshUndo();
  undoToggle.addEventListener('click', () => {
    const before = new Map<string, Cell>();
    for (const toy of [...options.world.pieces(), ...options.world.scenery()]) {
      before.set(toy.id, toy.cell);
    }
    if (!options.world.undo()) return;
    // undo() notified, so the button already hid itself again.
    options.audio.ding(); // The happy pop, mirror of a placement.
    const after = new Map<string, Cell>();
    for (const toy of [...options.world.pieces(), ...options.world.scenery()]) {
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
    const screen = anchor ? options.cellToScreen(anchor) : null;
    if (screen) ping(screen.x, screen.y);
  });

  // ---- Sound box: a big toot anytime, and a parent-friendly mute ---------
  const whistleToot = root.querySelector<HTMLButtonElement>('.whistle-toot');
  const muteToggle = root.querySelector<HTMLButtonElement>('.mute-toggle');
  if (!whistleToot || !muteToggle) {
    throw new Error('sound box missing from app frame');
  }

  whistleToot.addEventListener('click', () => {
    options.tootWhistle(); // Whistle, echo inside tunnels, and the steam puff.
  });

  // ---- 🎥 camera cycle: joins the rail while two or more trains ride -----
  // Each tap glides the chase camera to the next train, then the overview,
  // then wraps; hidden under reduced motion (no chase to cycle).
  const filmToggle = root.querySelector<HTMLButtonElement>('.film-toggle');
  if (!filmToggle) {
    throw new Error('film toggle missing from app frame');
  }
  filmToggle.addEventListener('click', () => {
    options.audio.click();
    options.cycleFilmTarget();
  });
  options.subscribeFilmCount((count) => {
    filmToggle.hidden = count < 2;
  });

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
  const presetTray = root.querySelector<HTMLDivElement>('.preset-tray');
  if (!presetTray) {
    throw new Error('preset tray missing from app frame');
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
    presetTray.hidden = false;
  };

  const disarmConfirm = () => {
    if (!confirmArmed) return;
    confirmArmed = false;
    parentGate.classList.remove('is-confirm');
    parentGate.setAttribute('aria-label', HOLD_LABEL);
    presetTray.hidden = true;
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

  // ---- Starter gallery: three icon-only presets inside the parent gate --
  // The tray only opens with the armed confirm step, so kid taps can never
  // reach it. A pick lands as ONE undoable mutation — the ↩️ chip appears
  // and one tap restores the prior build.
  for (const pick of presetTray.querySelectorAll<HTMLButtonElement>('.preset-pick')) {
    pick.addEventListener('click', () => {
      const preset = STARTER_PRESETS.find((entry) => entry.id === pick.dataset.preset);
      if (!preset) return;
      disarmConfirm();
      options.world.applyPreset(preset.build());
      options.audio.ding();
    });
  }

  // Any press anywhere is toddler activity: it dismisses the attract drift
  // instantly and keeps the idle clock at arm's length.
  window.addEventListener('pointerdown', () => options.notifyActivity());

  // A tap anywhere outside the armed gate dismisses it silently.
  window.addEventListener('pointerdown', (event) => {
    if (!confirmArmed) return;
    if (event.target instanceof Element && event.target.closest('.parent-gate, .preset-tray'))
      return;
    disarmConfirm();
  });

  return canvas;
}
