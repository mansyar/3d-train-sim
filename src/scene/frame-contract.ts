/**
 * The frame contract: every per-frame subsystem, named, in the one order that
 * ships. `init-scene.ts` wires the systems; `createFrameRunner` refuses a
 * wiring that drifts from the order below at construction, so a reorder fails
 * at boot instead of silently changing which value a system sees.
 *
 * Each entry says why it sits where it does. Where a slot is historical and
 * nothing depends on moving it, the reason says so rather than inventing a
 * dependency. This is the shipping order: moving a system is a behaviour
 * change, not a refactor.
 *
 * No three.js import (not even types): the runner is data and one loop, so its
 * unit test runs headless (NFR-3).
 */

/**
 * The per-frame systems, in the order they run. Each reason is load-bearing:
 * a later system may read what an earlier one just wrote.
 */
export const FRAME_SYSTEM_ORDER = [
  // Clock and weather advance first; lighting is painted before night is read.
  'day-ambience',
  // Trains move; every later system reads their spots.
  'fleet',
  // Needs the fleet's pace for this frame (the filmed or primary train).
  'chug',
  // Independent; keeps its historical slot.
  'confetti',
  // Reads the primary train's spot and the weather.
  'critters',
  // Reads riding spots and the night factor.
  'crossings',
  // Independent; historical slot.
  'delight',
  // Reads riding spots.
  'music-box',
  // Reads the primary spot and weather.
  'duck',
  // Reads weather.
  'barge',
  // Reads the primary spot and the night factor.
  'portal-glow',
  // Last: the camera frames the world everyone else just moved.
  'film-camera',
] as const;

export type FrameSystemName = (typeof FRAME_SYSTEM_ORDER)[number];

/**
 * The values the orchestrator computes once per frame and every system reads.
 * One object, mutated in place — a system sees the same inputs its neighbours
 * saw, never a per-system copy.
 */
export interface FrameInputs {
  /** The primary (largest) riding train's spot, or null while nothing rides. */
  starSpot: { x: number; z: number } | null;
  /** 0..1 night factor from the ambience paint. */
  night: number;
  /** 0..1 live rain intensity — weather eases between states, so not a flag. */
  rain: number;
  /** 0..1 live snow intensity. */
  snow: number;
}

/** One named subsystem update; none returns a value (the runner counts). */
export interface FrameSystem {
  readonly name: FrameSystemName;
  update(inputs: FrameInputs, dt: number): void;
}

/** The runner's face: one call per frame plus on-demand probes. */
export interface FrameRunner {
  /** Advance every system once, in the documented order, allocating nothing. */
  run(inputs: FrameInputs, dt: number): void;
  /** A fresh `{ name, ticks }[]` in documented order — probe time only. */
  snapshot(): Array<{ name: FrameSystemName; ticks: number }>;
  /** The wired names in order, for tests and boot-time diagnostics. */
  systemNames(): FrameSystemName[];
}

/** The first documented name the wiring lacks, or null when all are present. */
function firstMissing(systems: readonly FrameSystem[]): FrameSystemName | null {
  for (const name of FRAME_SYSTEM_ORDER) {
    if (!systems.some((system) => system.name === name)) return name;
  }
  return null;
}

/** The first wired name with no documented slot, or null when there is none. */
function firstUnexpected(systems: readonly FrameSystem[]): string | null {
  for (const system of systems) {
    if (!FRAME_SYSTEM_ORDER.includes(system.name)) return system.name;
  }
  return null;
}

/**
 * Fail fast at construction: the same length, the same names, the same order.
 * The first violation names the offending system, so a bad wiring reads as a
 * sentence in the boot console rather than a mistimed first frame.
 */
function assertWiredOrder(systems: readonly FrameSystem[]): void {
  const missing = firstMissing(systems);
  if (missing) throw new Error(`frame contract: missing system "${missing}"`);
  const unexpected = firstUnexpected(systems);
  if (unexpected) throw new Error(`frame contract: unexpected system "${unexpected}"`);
  for (let index = 0; index < FRAME_SYSTEM_ORDER.length; index++) {
    const expected = FRAME_SYSTEM_ORDER[index];
    const wired = systems[index];
    if (!wired) throw new Error(`frame contract: missing system "${expected}"`);
    if (wired.name !== expected) {
      throw new Error(
        `frame contract: expected "${expected}" at index ${index}, got "${wired.name}"`,
      );
    }
  }
  // Equal length plus every name present still leaves room for a duplicate
  // past the documented end; the positional check above caught mid-list ones.
  if (systems.length > FRAME_SYSTEM_ORDER.length) {
    const extra = systems[FRAME_SYSTEM_ORDER.length];
    throw new Error(`frame contract: unexpected system "${extra?.name ?? 'unknown'}"`);
  }
}

/**
 * Build the runner for a wired systems array. Validation runs once, here, so a
 * mismatched order can never reach the first animation frame.
 */
export function createFrameRunner(systems: readonly FrameSystem[]): FrameRunner {
  assertWiredOrder(systems);
  // Sized once; each run writes the same slots — the frame path allocates
  // nothing (NFR-2). Snapshots read these counters on demand.
  const ticks = new Array<number>(systems.length).fill(0);

  return {
    run(inputs, dt) {
      for (let index = 0; index < systems.length; index++) {
        const system = systems[index];
        if (!system) continue;
        ticks[index] = (ticks[index] ?? 0) + 1;
        system.update(inputs, dt);
      }
    },
    snapshot() {
      const result: Array<{ name: FrameSystemName; ticks: number }> = [];
      for (let index = 0; index < systems.length; index++) {
        const system = systems[index];
        if (!system) continue;
        result.push({ name: system.name, ticks: ticks[index] ?? 0 });
      }
      return result;
    },
    systemNames: () => systems.map((system) => system.name),
  };
}
