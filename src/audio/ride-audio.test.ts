import { describe, expect, it, vi } from 'vitest';

import { createRideController } from '../state/ride';
import { createWorldStore } from '../state/world';

import { bindRideAudio } from './ride-audio';

/** A tiny closed loop on the meadow. */
function loopWorld() {
  const world = createWorldStore();
  world.place('corner', { x: 0, y: 0 }, 90);
  world.place('corner', { x: 1, y: 0 }, 180);
  world.place('corner', { x: 1, y: 1 }, 270);
  world.place('corner', { x: 0, y: 1 }, 0);
  return world;
}

/** Records every chug command the binding issues. */
function fakeChugCommands() {
  const commands: string[] = [];
  return {
    commands,
    startChug: vi.fn(() => {
      commands.push('startChug');
    }),
    stopChug: vi.fn(() => {
      commands.push('stopChug');
    }),
    setChugSoftened: vi.fn((softened: boolean) => {
      commands.push(softened ? 'soften' : 'restore');
    }),
  };
}

describe('bindRideAudio', () => {
  it('starts the chug with the ride', () => {
    const world = loopWorld();
    const ride = createRideController(world);
    const audio = fakeChugCommands();
    bindRideAudio(ride, audio);

    expect(ride.start()).toBe(true);

    expect(audio.commands).toEqual(['startChug']);
  });

  it('eases the chug out when the ride stops', () => {
    const world = loopWorld();
    const ride = createRideController(world);
    const audio = fakeChugCommands();
    bindRideAudio(ride, audio);

    ride.start();
    ride.stop();

    expect(audio.commands).toEqual(['startChug', 'stopChug']);
  });

  it('stops the chug when a mid-ride edit ends the ride', () => {
    const world = loopWorld();
    const ride = createRideController(world);
    const audio = fakeChugCommands();
    bindRideAudio(ride, audio);

    ride.start();
    // Removing a piece breaks the loop — its ride softly stops.
    const [first] = world.pieces();
    if (!first) throw new Error('loop world should hold pieces');
    world.remove(first.id);

    expect(ride.mode()).toBe('idle');
    expect(audio.commands).toEqual(['startChug', 'stopChug']);
  });

  it('stays silent when the ride refuses an empty meadow', () => {
    const ride = createRideController(createWorldStore());
    const audio = fakeChugCommands();
    bindRideAudio(ride, audio);

    expect(ride.start()).toBe(false);

    expect(audio.commands).toEqual([]);
  });

  it('softens the chug during dead-end pauses and restores it rolling', () => {
    const ride = createRideController(loopWorld());
    const audio = fakeChugCommands();
    const binding = bindRideAudio(ride, audio);

    binding.setPaused(true);
    binding.setPaused(true); // Already paused — no repeated dip.
    binding.setPaused(false);

    expect(audio.commands).toEqual(['soften', 'restore']);
  });

  it('a fresh ride always rolls at full tempo', () => {
    const world = loopWorld();
    const ride = createRideController(world);
    const audio = fakeChugCommands();
    const binding = bindRideAudio(ride, audio);

    ride.start();
    binding.setPaused(true);
    ride.stop();
    ride.start();

    // The softened state never leaks into the next ride.
    expect(audio.commands).toEqual(['startChug', 'soften', 'stopChug', 'startChug']);
  });

  it('dispose detaches from the ride', () => {
    const world = loopWorld();
    const ride = createRideController(world);
    const audio = fakeChugCommands();
    const binding = bindRideAudio(ride, audio);

    ride.start();
    binding.dispose();
    ride.stop();

    expect(audio.commands).toEqual(['startChug']);
  });
});
