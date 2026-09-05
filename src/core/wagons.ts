/**
 * The little train's cargo wagons. Every locomotive pulls the same two
 * bundled cargo wagons — pure data only, mirroring the locomotive catalog:
 * scene wiring consumes stable identities without coupling to Three.js or
 * the browser. The composition is fixed, so nothing here touches world
 * state or persistence.
 */
import type { TrainKind } from './trains';

export const WAGON_SLOTS = ['lead', 'rear'] as const;

export type WagonSlot = (typeof WAGON_SLOTS)[number];

/** Fixed little-train composition: every locomotive pulls both wagons. */
export const WAGON_COUNT = WAGON_SLOTS.length;

interface WagonDefinition {
  modelUrl: string;
}

const WAGONS: Record<WagonSlot, WagonDefinition> = {
  lead: { modelUrl: '/assets/train-kit/train-carriage-lumber.glb' },
  rear: { modelUrl: '/assets/train-kit/train-carriage-box.glb' },
};

/** The wagon slots in pulling order, first behind the locomotive. */
export function wagonSlots(): readonly WagonSlot[] {
  return WAGON_SLOTS;
}

export function wagonModelUrl(slot: WagonSlot): string {
  return WAGONS[slot].modelUrl;
}

/**
 * A curated wagon pair preset. Each preset names both wagon slots at once so
 * toddlers never face a broken half-consist.
 */
export const WAGON_PRESETS = ['classic', 'coal', 'tank', 'container'] as const;
export type WagonPreset = (typeof WAGON_PRESETS)[number];
export const DEFAULT_WAGON_PRESET: WagonPreset = 'classic';

/** Which preset pair each locomotive pulls. */
export type TrainConsist = Record<TrainKind, WagonPreset>;

const WAGON_PRESET_URLS: Record<WagonPreset, Record<WagonSlot, string>> = {
  classic: { lead: WAGONS.lead.modelUrl, rear: WAGONS.rear.modelUrl },
  coal: {
    lead: '/assets/train-kit/train-carriage-coal.glb',
    rear: '/assets/train-kit/train-carriage-coal.glb',
  },
  tank: {
    lead: '/assets/train-kit/train-carriage-tank.glb',
    rear: '/assets/train-kit/train-carriage-tank-large.glb',
  },
  container: {
    lead: '/assets/train-kit/train-carriage-container-red.glb',
    rear: '/assets/train-kit/train-carriage-container-blue.glb',
  },
};

/** Returns true only for the curated presets. */
export function isWagonPreset(value: unknown): value is WagonPreset {
  for (const preset of WAGON_PRESETS) {
    if (value === preset) {
      return true;
    }
  }
  return false;
}

/** Forgives unknown presets back to classic so loading never fails. */
export function resolveWagonPreset(value: unknown): WagonPreset {
  return isWagonPreset(value) ? value : DEFAULT_WAGON_PRESET;
}

/** Model URLs for both slots of a preset; returns a copy. */
export function wagonPresetUrls(preset: WagonPreset): Record<WagonSlot, string> {
  return { ...WAGON_PRESET_URLS[preset] };
}

/** Fresh consist with every locomotive on the classic pair. */
export function defaultConsist(): TrainConsist {
  return {
    steam: 'classic',
    diesel: 'classic',
    tram: 'classic',
    express: 'classic',
    freight: 'classic',
    bullet: 'classic',
  };
}

/** Reads one train's preset, forgiving corrupt entries back to classic. */
export function consistPreset(consist: TrainConsist, train: TrainKind): WagonPreset {
  return resolveWagonPreset(consist[train]);
}

/** Returns a new consist with one train switched; the input is untouched. */
export function withConsistPreset(
  consist: TrainConsist,
  train: TrainKind,
  preset: WagonPreset,
): TrainConsist {
  return { ...consist, [train]: preset };
}

interface WagonPresetLook {
  /** Chunky inline SVG (48×48 viewBox, toy palette, brown outline). */
  icon: string;
  aria: string;
}

function miniWheel(cx: number): string {
  return `<circle cx="${cx}" cy="36" r="3.5" fill="var(--toy-brown)"/><circle cx="${cx}" cy="36" r="1.4" fill="var(--toy-cream)"/>`;
}

function miniRail(): string {
  return '<rect x="3" y="38" width="42" height="3" rx="1.5" fill="var(--toy-brown)"/>';
}

// Each icon shows the preset's pair side by side, facing right like the
// locomotive icons, so toddlers see both wagons they are choosing.
const WAGON_PRESET_LOOKS: Record<WagonPreset, WagonPresetLook> = {
  classic: {
    icon: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="4" y="30" width="19" height="4" rx="1" fill="var(--toy-brown)"/>
      <circle cx="9" cy="27" r="3.2" fill="#d9a066"
              stroke="var(--toy-brown)" stroke-width="2"/>
      <circle cx="14" cy="27" r="3.2" fill="#d9a066"
              stroke="var(--toy-brown)" stroke-width="2"/>
      <circle cx="19" cy="27" r="3.2" fill="#d9a066"
              stroke="var(--toy-brown)" stroke-width="2"/>
      ${miniWheel(8)}${miniWheel(19)}
      <rect x="25" y="22" width="19" height="12" rx="2" fill="var(--toy-orange)"
            stroke="var(--toy-brown)" stroke-width="2.5"/>
      <line x1="34.5" y1="22" x2="34.5" y2="34" stroke="var(--toy-brown)"
            stroke-width="2"/>
      ${miniWheel(29)}${miniWheel(40)}
      ${miniRail()}
    </svg>`,
    aria: 'Classic lumber and box wagons',
  },
  coal: {
    icon: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <ellipse cx="13.5" cy="24" rx="8" ry="5" fill="#3a2c22"
               stroke="var(--toy-brown)" stroke-width="2"/>
      <rect x="4" y="24" width="19" height="10" rx="2" fill="var(--toy-brown)"/>
      ${miniWheel(8)}${miniWheel(19)}
      <ellipse cx="34.5" cy="24" rx="8" ry="5" fill="#3a2c22"
               stroke="var(--toy-brown)" stroke-width="2"/>
      <rect x="25" y="24" width="19" height="10" rx="2" fill="var(--toy-brown)"/>
      ${miniWheel(29)}${miniWheel(40)}
      ${miniRail()}
    </svg>`,
    aria: 'Two coal wagons',
  },
  tank: {
    icon: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="11" y="19" width="5" height="5" rx="1" fill="var(--toy-steel)"
            stroke="var(--toy-brown)" stroke-width="2"/>
      <rect x="4" y="23" width="19" height="11" rx="5.5" fill="var(--toy-steel)"
            stroke="var(--toy-brown)" stroke-width="2.5"/>
      <line x1="10" y1="24" x2="10" y2="33" stroke="var(--toy-brown)"
            stroke-width="1.6"/>
      <line x1="17" y1="24" x2="17" y2="33" stroke="var(--toy-brown)"
            stroke-width="1.6"/>
      ${miniWheel(8)}${miniWheel(19)}
      <rect x="32" y="19" width="5" height="5" rx="1" fill="var(--toy-steel)"
            stroke="var(--toy-brown)" stroke-width="2"/>
      <rect x="25" y="23" width="19" height="11" rx="5.5" fill="var(--toy-steel)"
            stroke="var(--toy-brown)" stroke-width="2.5"/>
      <line x1="31" y1="24" x2="31" y2="33" stroke="var(--toy-brown)"
            stroke-width="1.6"/>
      <line x1="38" y1="24" x2="38" y2="33" stroke="var(--toy-brown)"
            stroke-width="1.6"/>
      ${miniWheel(29)}${miniWheel(40)}
      ${miniRail()}
    </svg>`,
    aria: 'Two tank wagons',
  },
  container: {
    icon: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="5.5" y="21" width="16" height="10" rx="1" fill="#d64545"
            stroke="var(--toy-brown)" stroke-width="2.5"/>
      <line x1="13.5" y1="21" x2="13.5" y2="31" stroke="var(--toy-brown)"
            stroke-width="1.6"/>
      <rect x="4" y="31" width="19" height="3.5" rx="1" fill="var(--toy-brown)"/>
      ${miniWheel(8)}${miniWheel(19)}
      <rect x="26.5" y="21" width="16" height="10" rx="1" fill="#2e86ab"
            stroke="var(--toy-brown)" stroke-width="2.5"/>
      <line x1="34.5" y1="21" x2="34.5" y2="31" stroke="var(--toy-brown)"
            stroke-width="1.6"/>
      <rect x="25" y="31" width="19" height="3.5" rx="1" fill="var(--toy-brown)"/>
      ${miniWheel(29)}${miniWheel(40)}
      ${miniRail()}
    </svg>`,
    aria: 'Red and blue container wagons',
  },
};

export function wagonPresetIcon(preset: WagonPreset): string {
  return WAGON_PRESET_LOOKS[preset].icon;
}

export function wagonPresetAria(preset: WagonPreset): string {
  return WAGON_PRESET_LOOKS[preset].aria;
}
