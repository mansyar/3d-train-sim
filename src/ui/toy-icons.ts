import { SCENERY_KINDS, type SceneryKind, sceneryAria } from '../core/scenery';
import type { PieceType } from '../core/track-graph';

/** Rails drawer kinds are track pieces; everything else is a scenery toy. */
export const isPieceKind = (kind: PieceType | SceneryKind): kind is PieceType =>
  !(SCENERY_KINDS as readonly string[]).includes(kind);

export const PIECE_LABELS: Record<PieceType, string> = {
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
export const SCENERY_ICONS: Record<SceneryKind, string> = {
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
  // A windmill: cream tower, orange cap, four crossed sails.
  windmill: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M18 44 L21 18 L27 18 L30 44 Z" fill="var(--toy-cream)"
            stroke="var(--toy-brown)" stroke-width="3" stroke-linejoin="round"/>
      <rect x="20" y="10" width="8" height="10" rx="2" fill="var(--toy-orange)"
            stroke="var(--toy-brown)" stroke-width="3"/>
      <line x1="24" y1="4" x2="24" y2="28" stroke="var(--toy-brown)"
            stroke-width="3" stroke-linecap="round"/>
      <line x1="12" y1="16" x2="36" y2="16" stroke="var(--toy-brown)"
            stroke-width="3" stroke-linecap="round"/>
      <line x1="15.2" y1="7.2" x2="32.8" y2="24.8" stroke="var(--toy-brown)"
            stroke-width="3" stroke-linecap="round"/>
      <line x1="32.8" y1="7.2" x2="15.2" y2="24.8" stroke="var(--toy-brown)"
            stroke-width="3" stroke-linecap="round"/>
      <circle cx="24" cy="16" r="3" fill="var(--toy-brown)"/>
    </svg>`,
  // A carousel: striped canopy on steel poles over a cream base.
  carousel: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M4 20 Q24 2 44 20 Z" fill="var(--toy-orange)"
            stroke="var(--toy-brown)" stroke-width="3" stroke-linejoin="round"/>
      <rect x="10" y="20" width="4" height="16" fill="var(--toy-steel)"/>
      <rect x="22" y="20" width="4" height="16" fill="var(--toy-steel)"/>
      <rect x="34" y="20" width="4" height="16" fill="var(--toy-steel)"/>
      <rect x="6" y="36" width="36" height="7" rx="3" fill="var(--toy-cream)"
            stroke="var(--toy-brown)" stroke-width="3"/>
      <circle cx="24" cy="7" r="3" fill="var(--toy-green)"
              stroke="var(--toy-brown)" stroke-width="2.5"/>
    </svg>`,
  // A hot-air balloon: striped envelope over a woven basket.
  balloon: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 4 C33 4 39 11 39 19 C39 28 30 32 27 36 L21 36 C18 32 9 28 9 19 C9 11 15 4 24 4 Z"
            fill="var(--toy-orange)" stroke="var(--toy-brown)" stroke-width="3"/>
      <path d="M24 4 C19 4 16 11 16 19 C16 28 20 32 21 36 L27 36 C28 32 32 28 32 19 C32 11 29 4 24 4 Z"
            fill="var(--toy-cream)" opacity=".8"/>
      <line x1="20" y1="36" x2="19" y2="41" stroke="var(--toy-brown)" stroke-width="2"/>
      <line x1="28" y1="36" x2="29" y2="41" stroke="var(--toy-brown)" stroke-width="2"/>
      <rect x="17" y="41" width="14" height="5" rx="1.5" fill="var(--toy-brown)"/>
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
  // A frog on a lily pad: green round head, cream eye bumps, notch-cut pad.
  frog: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <ellipse cx="24" cy="36" rx="19" ry="9" fill="var(--toy-green)"
               stroke="var(--toy-brown)" stroke-width="3"/>
      <path d="M24 36 L36 30" stroke="var(--toy-brown)" stroke-width="2.5"
            stroke-linecap="round"/>
      <circle cx="17" cy="16" r="4.5" fill="var(--toy-cream)"
              stroke="var(--toy-brown)" stroke-width="2.5"/>
      <circle cx="31" cy="16" r="4.5" fill="var(--toy-cream)"
              stroke="var(--toy-brown)" stroke-width="2.5"/>
      <circle cx="17" cy="16" r="1.6" fill="var(--toy-brown)"/>
      <circle cx="31" cy="16" r="1.6" fill="var(--toy-brown)"/>
      <ellipse cx="24" cy="26" rx="14" ry="11" fill="var(--toy-green)"
               stroke="var(--toy-brown)" stroke-width="3"/>
      <path d="M17 30 Q24 35 31 30" fill="none" stroke="var(--toy-brown)"
            stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,
};

export const PIECE_ICONS: Record<PieceType, string> = {
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
export const toySlot = (kind: PieceType | SceneryKind): string =>
  isPieceKind(kind)
    ? `<button class="piece-slot" type="button" data-piece="${kind}"
              aria-label="${PIECE_LABELS[kind]}">${PIECE_ICONS[kind]}</button>`
    : `<button class="scenery-slot" type="button" data-scenery="${kind}"
              aria-label="${sceneryAria(kind)}">${SCENERY_ICONS[kind]}</button>`;
