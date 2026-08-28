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

  it('gently stops when a piece is placed mid-ride', () => {
    const world = loopPieces();
    const ride = createRideController(world);
    ride.start();

    world.place('straight', { x: 3, y: 3 }, 0);

    expect(ride.mode()).toBe('idle');
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
    world.place('straight', { x: 3, y: 3 }, 0); // auto-stops
    expect(ride.mode()).toBe('idle');

    ride.start();

    expect(ride.mode()).toBe('riding');
    // The stray straight is its own component; the loop (smallest cell) still wins.
    expect(ride.ride()?.path.steps).toHaveLength(4);
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
