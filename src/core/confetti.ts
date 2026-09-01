/**
 * The delivery celebration: a small pooled burst of confetti that pops up
 * from the station and flutters down. Pure physics — the scene layer draws
 * the slots (shared geometry and materials, zero steady-state allocation).
 */

export const CONFETTI_POOL_SIZE = 96;
/** Particles per delivery burst — enough to read as a celebration. */
export const CONFETTI_BURST_COUNT = 18;
export const CONFETTI_LIFETIME = 0.9;
export const CONFETTI_GRAVITY = 4.5;
/** How many palettes the scene layer cycles (warm party colors). */
export const CONFETTI_COLORS = 4;

export interface ConfettiSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  /** Scene layer reads this to spin each particle at its own rate. */
  spin: number;
  colorIndex: number;
}

export interface ConfettiPool {
  readonly capacity: number;
  /** Spawns up to `count` particles at a point; returns how many fit. */
  burst(x: number, y: number, z: number, count?: number): number;
  update(dt: number): void;
  activeCount(): number;
  slot(index: number): ConfettiSlot;
}

function createSlot(): ConfettiSlot {
  return {
    active: false,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    age: 0,
    spin: 1,
    colorIndex: 0,
  };
}

export function createConfettiPool(): ConfettiPool {
  const slots: ConfettiSlot[] = [];
  for (let i = 0; i < CONFETTI_POOL_SIZE; i += 1) slots.push(createSlot());
  let active = 0;

  return {
    capacity: CONFETTI_POOL_SIZE,
    burst(x, y, z, count = CONFETTI_BURST_COUNT) {
      let spawned = 0;
      for (const slot of slots) {
        if (spawned >= count) break;
        if (slot.active) continue;
        slot.active = true;
        slot.x = x;
        slot.y = y;
        slot.z = z;
        slot.vx = (Math.random() - 0.5) * 2.4;
        slot.vy = 2.2 + Math.random() * 1.2;
        slot.vz = (Math.random() - 0.5) * 2.4;
        slot.age = 0;
        slot.spin = 4 + Math.random() * 6;
        slot.colorIndex = Math.floor(Math.random() * CONFETTI_COLORS);
        spawned += 1;
        active += 1;
      }
      return spawned;
    },
    update(dt) {
      for (const slot of slots) {
        if (!slot.active) continue;
        slot.age += dt;
        if (slot.age >= CONFETTI_LIFETIME) {
          slot.active = false;
          active -= 1;
          continue;
        }
        slot.vy -= dt * CONFETTI_GRAVITY;
        slot.x += dt * slot.vx;
        slot.y += dt * slot.vy;
        slot.z += dt * slot.vz;
      }
    },
    activeCount: () => active,
    slot: (index) => {
      const slot = slots[index];
      if (!slot) throw new RangeError(`confetti slot out of range: ${index}`);
      return slot;
    },
  };
}
