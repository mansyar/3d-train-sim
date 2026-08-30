import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SoundHandle } from './audio-controller';
import { createAudioController } from './audio-controller';

/**
 * Fakes a Howler sound handle. Records the calls the controller makes so tests
 * can assert on play/stop/fade/rate behaviour without a real audio backend.
 */
function fakeHandle(): SoundHandle & { calls: string[]; finish: () => void } {
  const calls: string[] = [];
  let endListener: (() => void) | undefined;
  return {
    calls,
    finish: () => endListener?.(),
    play: vi.fn(() => {
      calls.push('play');
      return 1;
    }),
    stop: vi.fn(() => {
      calls.push('stop');
    }),
    fade: vi.fn(() => {
      calls.push('fade');
    }),
    rate: vi.fn((value: number) => {
      calls.push(`rate:${value}`);
    }),
    onEnd: vi.fn((listener: () => void) => {
      calls.push('onEnd');
      endListener = listener;
    }),
  };
}

/** Builds a controller wired to fake handles, one per requested sound name. */
function makeWired() {
  const handles = new Map<string, ReturnType<typeof fakeHandle>>();
  const created: string[] = [];
  const beatListeners: Array<() => void> = [];
  const startBeatClock = vi.fn();
  const stopBeatClock = vi.fn();
  const controller = createAudioController({
    createSound: (name: string) => {
      created.push(name);
      const handle = fakeHandle();
      handles.set(name, handle);
      return handle;
    },
    setGlobalMute: vi.fn(),
    startChugBeatClock: startBeatClock,
    stopChugBeatClock: stopBeatClock,
    subscribeToChugBeat: (listener: () => void) => {
      beatListeners.push(listener);
      return () => {
        const index = beatListeners.indexOf(listener);
        if (index >= 0) beatListeners.splice(index, 1);
      };
    },
  });
  return {
    controller,
    handles,
    created,
    emitChugBeat: () => {
      for (const listener of beatListeners) listener();
    },
    startBeatClock,
    stopBeatClock,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createAudioController', () => {
  it('defaults to unmuted', () => {
    const { controller } = makeWired();
    expect(controller.isMuted()).toBe(false);
  });

  it('toggles mute and notifies the new state', () => {
    const { controller } = makeWired();
    const seen: boolean[] = [];
    controller.subscribe(() => seen.push(controller.isMuted()));

    expect(controller.toggleMuted()).toBe(true);
    expect(controller.isMuted()).toBe(true);
    expect(controller.toggleMuted()).toBe(false);
    expect(seen).toEqual([true, false]);
  });

  it('mute is instant and global', () => {
    const globalMute = vi.fn();
    const controller = createAudioController({
      createSound: () => fakeHandle(),
      setGlobalMute: globalMute,
    });
    controller.setMuted(true);
    controller.setMuted(false);
    expect(globalMute.mock.calls).toEqual([[true], [false]]);
  });

  it('startChug plays the loop once and is idempotent', () => {
    const { controller, handles, created } = makeWired();
    controller.startChug();
    controller.startChug();

    expect(created).toEqual(['chug']);
    expect(handles.get('chug')?.calls).toEqual(['play']);
    expect(controller.isChugging()).toBe(true);
  });

  it('starts and stops the beat clock with the chug lifecycle', () => {
    const { controller, startBeatClock, stopBeatClock } = makeWired();

    controller.startChug();
    controller.startChug();
    controller.stopChug();
    controller.stopChug();

    expect(startBeatClock).toHaveBeenCalledOnce();
    expect(stopBeatClock).toHaveBeenCalledOnce();
  });

  it('stopChug eases the loop out and is idempotent', () => {
    const { controller, handles } = makeWired();
    controller.startChug();
    controller.stopChug();
    controller.stopChug();

    const handle = handles.get('chug');
    expect(handle?.calls[handle.calls.length - 1]).toBe('fade');
    expect(controller.isChugging()).toBe(false);
  });

  it('startChug after stopChug replays the same handle', () => {
    const { controller, handles, created } = makeWired();
    controller.startChug();
    controller.stopChug();
    controller.startChug();

    expect(created).toEqual(['chug']);
    expect(handles.get('chug')?.calls.filter((c) => c === 'play')).toHaveLength(2);
  });

  it('softening dips the chug and restoring brings it back', () => {
    const { controller, handles } = makeWired();
    controller.startChug();
    controller.setChugSoftened(true);
    controller.setChugSoftened(false);

    const handle = handles.get('chug');
    expect(handle?.calls.filter((c) => c.startsWith('rate:'))).toHaveLength(2);
  });

  it('one-shots play whistle and ding sounds', () => {
    const { controller, handles } = makeWired();
    controller.whistle();
    controller.ding();

    handles.get('whistle')?.finish();
    expect(handles.get('whistle')?.calls).toEqual(['rate:1', 'onEnd', 'play', 'rate:1']);
    expect(handles.get('ding')?.calls).toEqual(['play']);
  });

  it('plays each train whistle at its profile rate and resets to baseline', () => {
    const { controller, handles } = makeWired();
    controller.whistle('diesel');
    handles.get('whistle')?.finish();
    controller.whistle('tram');
    handles.get('whistle')?.finish();
    expect(handles.get('whistle')?.calls).toEqual([
      'rate:0.92',
      'onEnd',
      'play',
      'rate:1',
      'rate:1.08',
      'onEnd',
      'play',
      'rate:1',
    ]);
  });

  it('mutes keep every train whistle silent', () => {
    const { controller, handles } = makeWired();
    controller.setMuted(true);
    controller.startChug();
    controller.whistle();
    controller.ding();

    for (const name of ['chug', 'whistle', 'ding']) {
      expect(handles.get(name)?.calls ?? []).not.toContain('play');
    }
    expect(controller.isChugging()).toBe(true);
  });

  it('unmuting resumes a chug that was started while muted', () => {
    const { controller, handles } = makeWired();
    controller.setMuted(true);
    controller.startChug();
    expect(handles.get('chug')?.calls).not.toContain('play');

    controller.setMuted(false);
    expect(handles.get('chug')?.calls).toContain('play');
  });

  it('stopping the chug while muted stays silent on unmute', () => {
    const { controller, handles } = makeWired();
    controller.setMuted(true);
    controller.startChug();
    controller.stopChug();
    controller.setMuted(false);

    expect(handles.get('chug')?.calls).not.toContain('play');
  });

  it('suspend silences every voice via the seam; resume replays only the chug', () => {
    const suspendSeam = vi.fn();
    const startBeatClock = vi.fn();
    const stopBeatClock = vi.fn();
    const controller = createAudioController({
      createSound: () => fakeHandle(),
      setGlobalMute: vi.fn(),
      startChugBeatClock: startBeatClock,
      stopChugBeatClock: stopBeatClock,
      subscribeToChugBeat: () => () => undefined,
      suspend: suspendSeam,
    });
    controller.startChug();

    controller.suspend();
    // The seam (Howler pause-all) is the silencing mechanism — no handle-level
    // pause involved — and the beat clock stops with it.
    expect(suspendSeam).toHaveBeenCalledOnce();
    expect(stopBeatClock).toHaveBeenCalledTimes(1);
    // Still "chugging" from the controller's point of view — the ride state
    // survives the tab being hidden.
    expect(controller.isChugging()).toBe(true);

    controller.resume();
    // The chug handle resumes (Howler resumes a paused sound on play()) and
    // the beat clock restarts — one-shots are discarded, never replayed.
    expect(controller.isChugging()).toBe(true);
    expect(startBeatClock).toHaveBeenCalledTimes(2);
  });

  it('suspend without a seam or chug is a safe no-op', () => {
    const controller = createAudioController({
      createSound: () => fakeHandle(),
      setGlobalMute: vi.fn(),
    });
    controller.suspend(); // Not chugging.
    controller.resume(); // Not suspended (nothing to resume).
    expect(controller.isChugging()).toBe(false);
  });

  it('chirps play the critter one-shot for a passing train', () => {
    const { controller, handles, created } = makeWired();
    controller.chirp('oink-pig');

    expect(created).toEqual(['oink-pig']);
    expect(handles.get('oink-pig')?.calls).toEqual(['play']);
  });

  it('mute keeps every chirp silent', () => {
    const { controller, handles } = makeWired();
    controller.setMuted(true);
    controller.chirp('baa-sheep');

    expect(handles.get('baa-sheep')?.calls ?? []).not.toContain('play');
  });

  it('chirps speak again after the mute lifts', () => {
    const { controller, handles } = makeWired();
    controller.setMuted(true);
    controller.chirp('woof-pug');
    controller.setMuted(false);
    controller.chirp('woof-pug');

    expect(handles.get('woof-pug')?.calls).toEqual(['play']);
  });

  it('notifies chug-beat listeners once for each beat while chugging', () => {
    const { controller, emitChugBeat } = makeWired();
    const beats: number[] = [];
    controller.onChugBeat(() => beats.push(beats.length));

    emitChugBeat();
    controller.startChug();
    emitChugBeat();
    emitChugBeat();
    controller.stopChug();
    emitChugBeat();

    expect(beats).toHaveLength(2);
  });

  it('unsubscribes a chug-beat listener cleanly', () => {
    const { controller, emitChugBeat } = makeWired();
    const beats: number[] = [];
    const unsubscribe = controller.onChugBeat(() => beats.push(1));

    unsubscribe();
    controller.startChug();
    emitChugBeat();

    expect(beats).toEqual([]);
  });

  it('mute does not change chug-beat state', () => {
    const { controller, emitChugBeat } = makeWired();
    let beats = 0;
    controller.onChugBeat(() => {
      beats += 1;
    });

    controller.setMuted(true);
    controller.startChug();
    emitChugBeat();
    controller.setMuted(false);
    emitChugBeat();

    expect(beats).toBe(2);
    expect(controller.isChugging()).toBe(true);
  });

  it('dispose stops the beat clock and clears beat listeners', () => {
    const { controller, emitChugBeat, startBeatClock, stopBeatClock } = makeWired();
    let beats = 0;
    controller.onChugBeat(() => {
      beats += 1;
    });
    controller.startChug();
    controller.dispose();
    emitChugBeat();

    expect(stopBeatClock).toHaveBeenCalledOnce();
    expect(beats).toBe(0);
    expect(controller.isChugging()).toBe(false);
    expect(startBeatClock).toHaveBeenCalledOnce();
  });

  it('notifications announce chug state changes', () => {
    const { controller } = makeWired();
    const seen: boolean[] = [];
    controller.subscribe(() => seen.push(controller.isChugging()));

    controller.startChug();
    controller.stopChug();
    expect(seen).toEqual([true, false]);
  });

  it('unsubscribing stops notifications', () => {
    const { controller } = makeWired();
    const seen: boolean[] = [];
    const unsubscribe = controller.subscribe(() => seen.push(controller.isMuted()));
    unsubscribe();
    controller.toggleMuted();
    expect(seen).toEqual([]);
  });
});
