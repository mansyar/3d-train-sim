export const STEAM_PUFF_POOL_SIZE = 16;
export const STEAM_PUFF_LIFETIME = 1;

export interface SteamPuffSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  age: number;
  scale: number;
  opacity: number;
}

export interface SteamPuffPool {
  readonly capacity: number;
  emit(x: number, y: number, z: number): boolean;
  update(dt: number): void;
  setEmitting(emitting: boolean): void;
  activeCount(): number;
  slot(index: number): SteamPuffSlot;
}

function createSlot(): SteamPuffSlot {
  return {
    active: false,
    x: 0,
    y: 0,
    z: 0,
    age: 0,
    scale: 1,
    opacity: 0,
  };
}

export function createSteamPuffPool(): SteamPuffPool {
  const slots: SteamPuffSlot[] = [];
  for (let i = 0; i < STEAM_PUFF_POOL_SIZE; i += 1) slots.push(createSlot());
  let emitting = true;
  let active = 0;

  return {
    capacity: STEAM_PUFF_POOL_SIZE,
    emit(x, y, z) {
      if (!emitting) return false;
      for (const puff of slots) {
        if (puff.active) continue;
        puff.active = true;
        puff.x = x;
        puff.y = y;
        puff.z = z;
        puff.age = 0;
        puff.scale = 1;
        puff.opacity = 1;
        active += 1;
        return true;
      }
      return false;
    },
    update(dt) {
      for (const puff of slots) {
        if (!puff.active) continue;
        puff.age += dt;
        if (puff.age >= STEAM_PUFF_LIFETIME) {
          puff.active = false;
          puff.opacity = 0;
          active -= 1;
          continue;
        }
        const progress = puff.age / STEAM_PUFF_LIFETIME;
        puff.y += dt * 0.8;
        puff.scale = 1 + progress * 0.5;
        puff.opacity = 1 - progress;
      }
    },
    setEmitting(next) {
      emitting = next;
    },
    activeCount: () => active,
    slot: (index) => {
      const puff = slots[index];
      if (!puff) throw new RangeError(`steam puff slot out of range: ${index}`);
      return puff;
    },
  };
}
