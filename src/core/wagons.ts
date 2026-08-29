/**
 * The little train's cargo wagons. Every locomotive pulls the same two
 * bundled cargo wagons — pure data only, mirroring the locomotive catalog:
 * scene wiring consumes stable identities without coupling to Three.js or
 * the browser. The composition is fixed, so nothing here touches world
 * state or persistence.
 */
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
