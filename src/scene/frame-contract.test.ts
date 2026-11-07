import { describe, expect, it } from 'vitest';
import {
  createFrameRunner,
  FRAME_SYSTEM_ORDER,
  type FrameInputs,
  type FrameSystem,
  type FrameSystemName,
} from './frame-contract';

/**
 * The contract's headless proof: the documented order (AC-1), the fail-fast
 * check that refuses a mismatched wiring (AC-2), and the once-per-run tick
 * counters (AC-3). Plain data and one loop — no three.js, no DOM.
 */

/** The twelve names, written out so the tuple cannot drift unnoticed. */
const DOCUMENTED_ORDER: readonly FrameSystemName[] = [
  'day-ambience',
  'fleet',
  'chug',
  'confetti',
  'critters',
  'crossings',
  'delight',
  'music-box',
  'duck',
  'barge',
  'portal-glow',
  'film-camera',
];

function fakeSystem(name: FrameSystemName, calls?: FrameSystemName[]): FrameSystem {
  return {
    name,
    update() {
      calls?.push(name);
    },
  };
}

function wiredInOrder(): FrameSystem[] {
  return FRAME_SYSTEM_ORDER.map((name) => fakeSystem(name));
}

const inputs: FrameInputs = { starSpot: null, night: 0, rain: 0, snow: 0 };

describe('FRAME_SYSTEM_ORDER', () => {
  it('names the twelve systems in the shipping order', () => {
    expect([...FRAME_SYSTEM_ORDER]).toEqual([...DOCUMENTED_ORDER]);
  });
});

describe('createFrameRunner — construction', () => {
  it('accepts systems wired in the documented order and reports them', () => {
    const runner = createFrameRunner(wiredInOrder());

    expect(runner.systemNames()).toEqual([...FRAME_SYSTEM_ORDER]);
  });

  it('throws and names the missing system', () => {
    const systems = wiredInOrder().filter((system) => system.name !== 'portal-glow');

    expect(() => createFrameRunner(systems)).toThrow('missing system "portal-glow"');
  });

  it('throws and names an unexpected system', () => {
    // A name outside the contract can only reach the runner through a cast —
    // the failure mode a future system without a documented slot hits.
    const air = { name: 'air', update() {} } as unknown as FrameSystem;

    expect(() => createFrameRunner([...wiredInOrder(), air])).toThrow('unexpected system "air"');
  });

  it('throws on a swapped pair, naming the misplaced system and the index', () => {
    const systems = wiredInOrder();
    const crossings = systems[5];
    const delight = systems[6];
    if (!crossings || !delight) throw new Error('test wiring is short');
    systems[5] = delight;
    systems[6] = crossings;

    expect(() => createFrameRunner(systems)).toThrow(
      'expected "crossings" at index 5, got "delight"',
    );
  });
});

describe('createFrameRunner — running', () => {
  it('ticks every system once per run, in the documented order', () => {
    const calls: FrameSystemName[] = [];
    const runner = createFrameRunner(FRAME_SYSTEM_ORDER.map((name) => fakeSystem(name, calls)));

    runner.run(inputs, 1 / 60);
    runner.run(inputs, 1 / 60);
    runner.run(inputs, 1 / 60);

    expect(runner.snapshot().map((entry) => entry.ticks)).toEqual(FRAME_SYSTEM_ORDER.map(() => 3));
    expect(calls.slice(0, FRAME_SYSTEM_ORDER.length)).toEqual([...FRAME_SYSTEM_ORDER]);
    expect(calls.length).toBe(FRAME_SYSTEM_ORDER.length * 3);
  });

  it('hands every system the same FrameInputs object', () => {
    const seen: FrameInputs[] = [];
    const systems = FRAME_SYSTEM_ORDER.map((name) => ({
      name,
      update(received: FrameInputs) {
        seen.push(received);
      },
    }));
    const runner = createFrameRunner(systems);
    const frameInputs: FrameInputs = {
      starSpot: { x: 1, z: 2 },
      night: 0.5,
      rain: 0.25,
      snow: 0,
    };

    runner.run(frameInputs, 1 / 60);

    expect(seen).toHaveLength(FRAME_SYSTEM_ORDER.length);
    for (const received of seen) expect(received).toBe(frameInputs);
  });

  it('lets an earlier system publish values a later one reads', () => {
    // This is how `day-ambience` hands the frame's night factor and weather to
    // critters, the duck and the barge: the producer writes, the consumers read
    // later in the same run, so nobody sees last frame's mood.
    const seen: number[] = [];
    const systems = FRAME_SYSTEM_ORDER.map((name, index) => ({
      name,
      update(received: FrameInputs) {
        if (name === 'day-ambience') received.night = 0.75;
        if (name === 'critters') seen.push(received.night);
        if (index === FRAME_SYSTEM_ORDER.length - 1) seen.push(received.night);
      },
    }));
    const runner = createFrameRunner(systems);
    const frameInputs: FrameInputs = { starSpot: null, night: 0, rain: 0, snow: 0 };

    runner.run(frameInputs, 1 / 60);

    expect(seen).toEqual([0.75, 0.75]);
  });

  it('snapshots a fresh array whose names and ticks match the counters', () => {
    const runner = createFrameRunner(wiredInOrder());
    runner.run(inputs, 1 / 60);
    runner.run(inputs, 1 / 60);

    const first = runner.snapshot();
    const second = runner.snapshot();

    expect(first).not.toBe(second);
    expect(first.map((entry) => entry.name)).toEqual([...FRAME_SYSTEM_ORDER]);
    expect(first.every((entry) => entry.ticks === 2)).toBe(true);
  });
});
