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
 *  - One-shots (whistle, ding, thunk) are fire-and-forget; muted, they are silent.
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
  /** Sets the loudness of one playback instance, if the backend supports it. */
  volume?: (value: number, id?: number) => void;
  /** Runs after the one-shot finishes, if the backend supports completion hooks. */
  onEnd?: (listener: () => void) => void;
}

export interface AudioControllerOptions {
  /** Builds a handle for a named sound, lazily, at most once per name. */
  createSound: (name: string) => SoundHandle;
  /** Mutes or unmutes every sound at once (the global kill switch). */
  setGlobalMute: (muted: boolean) => void;
  /** Connects the controller to the established chug rhythm. */
  subscribeToChugBeat?: (listener: () => void) => () => void;
  /** Starts the visual rhythm clock when the chug becomes active. */
  startChugBeatClock?: () => void;
  /** Stops the visual rhythm clock when the chug ends. */
  stopChugBeatClock?: () => void;
  /** Tab hidden: pause every live voice and the beat clock (no audio in a hidden tab). */
  suspend?: () => void;
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
  /** One toot, anytime. Inside a tunnel run it trails a soft echo. Silent while muted. */
  whistle(train?: TrainKind, echo?: boolean): void;
  /** One happy blip for a successful drop. Silent while muted. */
  ding(): void;
  /** One soft tick for a rotation step. Silent while muted. */
  click(): void;
  /** One soft low knock for a drop that wobbled home. Silent while muted. */
  thunk(): void;
  /** One critter chirp for a passing train (a voice id from the catalog). Silent while muted. */
  chirp(voice: string): void;
  /** Observes state changes (mute or chug). Returns an unsubscribe fn. */
  subscribe(listener: () => void): () => void;
  /** Observes chug beats while the chug is active. Returns an unsubscribe fn. */
  onChugBeat(listener: () => void): () => void;
  /** Tab hidden: pause the chug and its beat clock (no sound in a hidden tab). */
  suspend(): void;
  /** Tab visible again: resume the chug if it was rolling. */
  resume(): void;
  /** Releases rhythm listeners and any injected clock resources. */
  dispose(): void;
}

/** Tempo dip while the train catches its breath at a dead end. */
const SOFTEN_RATE = 0.85;
/** Full-steam-ahead tempo. */
const ROLLING_RATE = 1;
/** A slowed tick reads as a soft wooden knock. */
const THUNK_RATE = 0.55;
/** Echo tail on inside whistles: two quick, quiet replays of the same voice. */
const ECHO_DELAY_MS = 220;
const ECHO_TAPS = 2;
const ECHO_GAIN = 0.35;

export function createAudioController(options: AudioControllerOptions): AudioController {
  const { createSound, setGlobalMute, startChugBeatClock, stopChugBeatClock } = options;

  const sounds = new Map<string, SoundHandle>();
  const listeners = new Set<() => void>();
  const beatListeners = new Set<() => void>();
  let muted = false;
  let chugging = false;
  let softened = false;
  let suspended = false;
  let disposed = false;

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

  function notifyChugBeat(): void {
    if (!chugging) return;
    for (const listener of beatListeners) listener();
  }

  /** A chug that was requested while muted speaks up as soon as we unmute. */
  function speakIfDue(): void {
    if (chugging && !muted) sound('chug').play();
  }

  options.subscribeToChugBeat?.(notifyChugBeat);

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
      startChugBeatClock?.();
      notify();
    },

    stopChug: () => {
      if (!chugging) return;
      chugging = false;
      softened = false;
      stopChugBeatClock?.();
      sound('chug').fade();
      notify();
    },

    setChugSoftened: (next) => {
      if (next === softened) return;
      softened = next;
      if (!chugging) return;
      sound('chug').rate(softened ? SOFTEN_RATE : ROLLING_RATE);
    },

    whistle: (train = 'steam', echo = false) => {
      if (muted || disposed) return;
      const rate = whistleRate(train);
      const whistle = sound('whistle');
      whistle.rate(rate);
      whistle.onEnd?.(() => whistle.rate(ROLLING_RATE));
      whistle.play();
      if (!echo) return;
      // The tunnel answers: a short delay/feedback tail synthesized from the
      // same voice — quieter replays, no new audio downloaded. Each tap
      // re-checks mute, suspension, and disposal so the echo dies instantly
      // with the switch, the hidden tab, or the teardown.
      for (let tap = 1; tap <= ECHO_TAPS; tap += 1) {
        setTimeout(() => {
          if (muted || suspended || disposed) return;
          const echoVoice = sound('whistle');
          echoVoice.rate(rate);
          const id = echoVoice.play();
          echoVoice.volume?.(ECHO_GAIN ** tap, id);
        }, ECHO_DELAY_MS * tap);
      }
    },

    ding: () => {
      if (muted) return;
      sound('ding').play();
    },

    click: () => {
      if (muted) return;
      sound('click').play();
    },

    thunk: () => {
      if (muted) return;
      // No new audio downloads: the rotation tick slowed down is a low
      // wooden knock — distinct from the happy ding, never a scolding sound.
      const knock = sound('click');
      knock.rate(THUNK_RATE);
      knock.onEnd?.(() => knock.rate(ROLLING_RATE));
      knock.play();
    },

    chirp: (voice) => {
      if (muted) return;
      sound(voice).play();
    },

    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    onChugBeat: (listener) => {
      beatListeners.add(listener);
      return () => {
        beatListeners.delete(listener);
      };
    },

    suspend: () => {
      if (suspended) return;
      suspended = true;
      // The controller owns the rhythm clock (it started it with the chug);
      // the seam pauses every live voice (chug + any ringing one-shot), so a
      // hidden tab is fully silent.
      stopChugBeatClock?.();
      options.suspend?.();
      notify();
    },

    resume: () => {
      if (!suspended) return;
      suspended = false;
      if (chugging) {
        startChugBeatClock?.();
        speakIfDue(); // Resumes the paused chug (respects mute); one-shots are discarded.
      }
      notify();
    },

    dispose: () => {
      stopChugBeatClock?.();
      beatListeners.clear();
      listeners.clear();
      chugging = false;
      disposed = true;
    },
  };
}
