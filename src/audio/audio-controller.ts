/**
 * The Tiny Tracks sound box — the audio brain behind the choo-choo.
 *
 * Owns *when* sounds happen, never *how* they are made. Real speakers arrive
 * through the injected `createSound`/`setGlobalMute` seam (Howler at the wiring
 * site), which keeps this controller framework-free and unit-testable, in the
 * same spirit as the world and ride stores.
 *
 * Rules of the house:
 *  - The chug belongs to the ride: started with it, eased out with it, and it
 *    softens when the train pauses at a dead end.
 *  - Mute is instant and total. A chug asked for while muted still *counts*
 *    (the train believes it is chugging) but says nothing until unmuted.
 *  - One-shots (whistle, ding) are fire-and-forget; muted, they are silent.
 */

import type { TrainKind } from '../core/trains';
import { whistleRate } from '../core/whistle-profiles';

export interface SoundHandle {
  /** Starts (or resumes) the sound. */
  play: () => number;
  /** Halts the sound immediately. */
  stop: () => void;
  /** Glides the sound out gently (fade to silence, then settle). */
  fade: () => void;
  /** Nudges playback tempo/character without restarting. */
  rate: (value: number) => void;
  /** Runs after the one-shot finishes, if the backend supports completion hooks. */
  onEnd?: (listener: () => void) => void;
}

export interface AudioControllerOptions {
  /** Builds a handle for a named sound, lazily, at most once per name. */
  createSound: (name: string) => SoundHandle;
  /** Mutes or unmutes every sound at once (the global kill switch). */
  setGlobalMute: (muted: boolean) => void;
}

export interface AudioController {
  isMuted(): boolean;
  /** Sets the mute state directly. */
  setMuted(muted: boolean): void;
  /** Flips the mute state and returns the new value. */
  toggleMuted(): boolean;
  isChugging(): boolean;
  /** Begins the chug loop (silently while muted — it still counts). */
  startChug(): void;
  /** Eases the chug out. Idempotent. */
  stopChug(): void;
  /** Dips the chug while the train pauses, restores it when rolling again. */
  setChugSoftened(softened: boolean): void;
  /** One toot, anytime. Silent while muted. */
  whistle(train?: TrainKind): void;
  /** One happy blip for a successful drop. Silent while muted. */
  ding(): void;
  /** Observes state changes (mute or chug). Returns an unsubscribe fn. */
  subscribe(listener: () => void): () => void;
}

/** Tempo dip while the train catches its breath at a dead end. */
const SOFTEN_RATE = 0.85;
/** Full-steam-ahead tempo. */
const ROLLING_RATE = 1;

export function createAudioController(options: AudioControllerOptions): AudioController {
  const { createSound, setGlobalMute } = options;

  const sounds = new Map<string, SoundHandle>();
  const listeners = new Set<() => void>();
  let muted = false;
  let chugging = false;
  let softened = false;

  function sound(name: string): SoundHandle {
    let handle = sounds.get(name);
    if (!handle) {
      handle = createSound(name);
      sounds.set(name, handle);
    }
    return handle;
  }

  function notify(): void {
    for (const listener of listeners) listener();
  }

  /** A chug that was requested while muted speaks up as soon as we unmute. */
  function speakIfDue(): void {
    if (chugging && !muted) sound('chug').play();
  }

  function applyMuted(next: boolean): void {
    if (next === muted) return;
    muted = next;
    setGlobalMute(muted);
    speakIfDue();
    notify();
  }

  return {
    isMuted: () => muted,

    setMuted: (next) => applyMuted(next),

    toggleMuted: () => {
      applyMuted(!muted);
      return muted;
    },

    isChugging: () => chugging,

    startChug: () => {
      if (chugging) return;
      chugging = true;
      // Materialise the handle even while muted: the chug exists, it just
      // holds its breath until the mute lifts.
      const chug = sound('chug');
      if (!muted) chug.play();
      notify();
    },

    stopChug: () => {
      if (!chugging) return;
      chugging = false;
      softened = false;
      sound('chug').fade();
      notify();
    },

    setChugSoftened: (next) => {
      if (next === softened) return;
      softened = next;
      if (!chugging) return;
      sound('chug').rate(softened ? SOFTEN_RATE : ROLLING_RATE);
    },

    whistle: (train = 'steam') => {
      if (muted) return;
      const whistle = sound('whistle');
      whistle.rate(whistleRate(train));
      whistle.onEnd?.(() => whistle.rate(ROLLING_RATE));
      whistle.play();
    },

    ding: () => {
      if (muted) return;
      sound('ding').play();
    },

    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
