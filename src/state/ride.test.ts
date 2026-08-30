import { describe, expect, it, vi } from 'vitest';
import { createRideController } from './ride';
import { createWorldStore } from './world';

/** A tiny closed loop on the meadow. */
function loopPieces() {
  const world = createWorldStore();
  world.place('corner', { x: 0, y: 0 }, 90);
  world.place('corner', { x: 1, y: 0 }, 180);
  world.place('corner', { x: 1, y: 1 }, 270);
  world.place('corner', { x: 0, y: 1 }, 0);
  return world;
}

describe('createRideController', () => {
  it('starts idle with no ride', () => {
    const ride = createRideController(createWorldStore());

    expect(ride.mode()).toBe('idle');
    expect(ride.ride()).toBeNull();
  });

  it('start() solves the current layout and begins riding', () => {
    const world = loopPieces();
    const ride = createRideController(world);

    expect(ride.start()).toBe(true);

    expect(ride.mode()).toBe('riding');
    const rideState = ride.ride();
    expect(rideState?.path.closed).toBe(true);
    expect(rideState?.path.steps).toHaveLength(4);
    expect(rideState?.direction).toBe(1);
  });

  it('refuses to ride an empty meadow (stays idle)', () => {
    const ride = createRideController(createWorldStore());

    expect(ride.start()).toBe(false);
    expect(ride.mode()).toBe('idle');
  });

  it('stop() returns to idle but keeps the last solved path', () => {
    const ride = createRideController(loopPieces());
    ride.start();

    ride.stop();

    expect(ride.mode()).toBe('idle');
    expect(ride.ride()?.path.steps).toHaveLength(4);
  });

  it('soft-stops only the ride whose component an edit touches', () => {
    const world = createWorldStore();
    // Loop A on the left, an open line on the right — two components.
    world.place('corner', { x: 0, y: 0 }, 90);
    world.place('corner', { x: 1, y: 0 }, 180);
    world.place('corner', { x: 1, y: 1 }, 270);
    world.place('corner', { x: 0, y: 1 }, 0);
    world.place('straight', { x: 4, y: 0 }, 90);
    world.place('straight', { x: 5, y: 0 }, 90);
    const ride = createRideController(world);
    ride.startAll();
    expect(ride.rides()).toHaveLength(2);

    world.place('straight', { x: 6, y: 0 }, 90); // extends the line only

    expect(ride.rides()).toHaveLength(1);
    expect(ride.rides()[0]?.anchor).toBe('0,0');
    expect(ride.mode()).toBe('riding');
  });

  it('keeps riding when an edit touches only another component', () => {
    const world = loopPieces();
    const ride = createRideController(world);
    ride.start();

    world.place('straight', { x: 3, y: 3 }, 0); // a stray, disjoint piece

    expect(ride.mode()).toBe('riding');
    expect(ride.ride()?.path.steps).toHaveLength(4);
  });

  it('gently stops when a piece is removed mid-ride', () => {
    const world = loopPieces();
    const ride = createRideController(world);
    ride.start();
    const [first] = world.pieces();
    if (!first) throw new Error('loop world should hold pieces');

    world.remove(first.id);

    expect(ride.mode()).toBe('idle');
  });

  it('re-solves the path on the next start after a mid-ride edit', () => {
    const world = loopPieces();
    const ride = createRideController(world);
    ride.start();
    const [first] = world.pieces();
    if (!first) throw new Error('loop world should hold pieces');
    world.remove(first.id); // breaks the loop — its ride softly stops
    expect(ride.mode()).toBe('idle');

    ride.start();

    expect(ride.mode()).toBe('riding');
    // The broken loop re-solves as a three-piece open path.
    expect(ride.ride()?.path.steps).toHaveLength(3);
  });

  it('notifies listeners on mode changes', () => {
    const ride = createRideController(loopPieces());
    const listener = vi.fn();
    ride.subscribe(listener);

    ride.start();
    ride.stop();

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('supports unsubscribing from ride changes', () => {
    const ride = createRideController(loopPieces());
    const listener = vi.fn();
    const unsubscribe = ride.subscribe(listener);
    unsubscribe();

    ride.start();

    expect(listener).not.toHaveBeenCalled();
  });

  it('ignores world edits while idle (no notifications)', () => {
    const world = loopPieces();
    const ride = createRideController(world);
    const listener = vi.fn();
    ride.subscribe(listener);

    world.place('straight', { x: 3, y: 3 }, 0);

    expect(ride.mode()).toBe('idle');
    expect(listener).not.toHaveBeenCalled();
  });

  it('stop() while already idle is a no-op', () => {
    const ride = createRideController(loopPieces());
    const listener = vi.fn();
    ride.subscribe(listener);

    ride.stop();

    expect(ride.mode()).toBe('idle');
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('reset and rides', () => {
  it('gently stops an active ride as the first consequence of a reset', () => {
    const world = loopPieces();
    const ride = createRideController(world);
    expect(ride.start()).toBe(true);

    // Fakes log the reset's observable consequences in the order they land.
    const events: string[] = [];
    world.subscribe(() => events.push('world-cleared'));
    ride.subscribe((mode) => {
      if (mode === 'idle') events.push('ride-stopped');
    });

    world.reset();

    expect(events).toEqual(['ride-stopped', 'world-cleared']);
    expect(ride.mode()).toBe('idle');
    expect(ride.ride()?.path).toBeTruthy();
  });

  it('emits no ride event when a reset hits an idle train', () => {
    const world = loopPieces();
    const ride = createRideController(world);
    const listener = vi.fn();
    ride.subscribe(listener);

    world.reset();

    expect(ride.mode()).toBe('idle');
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('multi-ride — one ride per track component', () => {
  function loopAt(world: ReturnType<typeof createWorldStore>, ox: number, oy: number): void {
    world.place('corner', { x: ox, y: oy }, 90);
    world.place('corner', { x: ox + 1, y: oy }, 180);
    world.place('corner', { x: ox + 1, y: oy + 1 }, 270);
    world.place('corner', { x: ox, y: oy + 1 }, 0);
  }

  function twoLoopsWorld(): ReturnType<typeof createWorldStore> {
    const world = createWorldStore();
    loopAt(world, 0, 0);
    loopAt(world, 5, 5);
    return world;
  }

  it('startAll() starts one ride per component, ranked most pieces first', () => {
    const world = twoLoopsWorld();
    const ride = createRideController(world);

    expect(ride.startAll()).toBe(true);

    expect(ride.mode()).toBe('riding');
    expect(ride.rides()).toHaveLength(2);
    expect(ride.rides().map((r) => r.anchor)).toEqual(['0,0', '5,5']);
    expect(ride.rides().every((r) => r.path.closed)).toBe(true);
  });

  it('a second ▶ press re-solves and starts only the missing rides', () => {
    const world = twoLoopsWorld();
    const ride = createRideController(world);
    ride.startAll();
    const first = ride.rides()[0];
    expect(first).toBeDefined();

    // A fresh disjoint loop appears: nothing auto-starts, and the running
    // rides keep their exact state.
    loopAt(world, 10, 0);
    expect(ride.rides()).toHaveLength(2);
    expect(ride.rides()[0]).toBe(first);

    // The next ▶ re-solves and starts only the missing ride.
    expect(ride.startAll()).toBe(true);
    expect(ride.rides()).toHaveLength(3);
    expect(ride.rides()[0]).toBe(first);
  });

  it('stops every ride at once', () => {
    const world = twoLoopsWorld();
    const ride = createRideController(world);
    ride.startAll();

    ride.stopAll();

    expect(ride.rides()).toEqual([]);
    expect(ride.mode()).toBe('idle');
    // The camera keeps easing along the last primary path.
    expect(ride.ride()?.path.closed).toBe(true);
  });

  it('caps concurrent rides at 4; beyond-cap components stay idle', () => {
    const world = createWorldStore();
    for (const ox of [0, 2, 4, 6, 8]) loopAt(world, ox, 0);
    const ride = createRideController(world);

    expect(ride.startAll()).toBe(true);

    expect(ride.rides()).toHaveLength(4);
    expect(ride.rides().map((r) => r.anchor)).not.toContain('8,0');
  });

  it("an edit to one component soft-stops only that component's ride", () => {
    const world = twoLoopsWorld();
    const ride = createRideController(world);
    ride.startAll();

    // Removing a piece breaks loop A's component — only its own ride stops.
    const victim = world.pieces().find((p) => p.cell.x <= 1);
    if (!victim) throw new Error('loop A piece missing');
    world.remove(victim.id);

    expect(ride.rides()).toHaveLength(1);
    expect(ride.rides()[0]?.anchor).toBe('5,5');
    expect(ride.mode()).toBe('riding');
  });

  it('starting rides never nudges the camera target of running ones', () => {
    const world = twoLoopsWorld();
    const ride = createRideController(world);
    ride.startAll();
    const before = ride.rides().slice();

    loopAt(world, 10, 0);

    expect(ride.rides()[0]).toBe(before[0]);
    expect(ride.rides()[1]).toBe(before[1]);
  });

  it('selecting another locomotive mid-ride keeps every ride running (R3)', () => {
    const world = twoLoopsWorld();
    const ride = createRideController(world);
    ride.startAll();
    const listener = vi.fn();
    ride.subscribe(listener);

    world.selectTrain('diesel');

    expect(ride.rides()).toHaveLength(2);
    expect(ride.mode()).toBe('riding');
    expect(listener).not.toHaveBeenCalled();
  });

  it('placing scenery mid-ride keeps every ride running', () => {
    const world = twoLoopsWorld();
    const ride = createRideController(world);
    ride.startAll();

    world.placeScenery('tree', { x: 3, y: 3 }, 0);

    expect(ride.rides()).toHaveLength(2);
    expect(ride.mode()).toBe('riding');
  });
});
