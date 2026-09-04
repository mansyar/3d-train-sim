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
  return { steam: 'classic', diesel: 'classic', tram: 'classic' };
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
