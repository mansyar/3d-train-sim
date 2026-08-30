import { Howl, Howler } from 'howler';

import type { AudioControllerOptions, SoundHandle } from './audio-controller';

/** Every bundled sound, with its loop behaviour and voice level. */
const SOUNDS: Record<string, { base: string; loop: boolean; volume: number }> = {
  chug: { base: 'chug-loop', loop: true, volume: 0.75 },
  whistle: { base: 'whistle', loop: false, volume: 1 },
  ding: { base: 'ding', loop: false, volume: 1 },
  // Critter chirps sit well under the train's voice so a chorus of hops
  // beside a chugging engine never clips (product guidelines: capped volume).
  'oink-pig': { base: 'oink-pig', loop: false, volume: 0.5 },
  'baa-sheep': { base: 'baa-sheep', loop: false, volume: 0.5 },
  'woof-pug': { base: 'woof-pug', loop: false, volume: 0.5 },
};

/** How long a stop eases the chug out. */
const FADE_MS = 600;
/** Fixed visual rhythm: two readable puffs per second while rolling. */
const CHUG_BEAT_MS = 500;

/**
 * The Howler-backed speaker wiring — real sound at last. Built to satisfy the
 * controller's options seam exactly; a different audio engine could swap in
 * behind the same contract.
 */
export function createHowlerVoice(): AudioControllerOptions {
  let chugBeatListener: (() => void) | null = null;
  let chugBeatTimer: ReturnType<typeof setInterval> | null = null;
  /** Every Howl we created, so suspend/resume never touches foreign audio. */
  const voices = new Set<Howl>();

  function startChugBeatClock(): void {
    if (chugBeatTimer !== null) return;
    chugBeatTimer = setInterval(() => {
      chugBeatListener?.();
    }, CHUG_BEAT_MS);
  }

  function stopChugBeatClock(): void {
    if (chugBeatTimer === null) return;
    clearInterval(chugBeatTimer);
    chugBeatTimer = null;
  }

  function createSound(name: string): SoundHandle {
    const sound = SOUNDS[name];
    if (!sound) throw new Error(`unknown sound: ${name}`);
    const howl = new Howl({
      src: [`/audio/${sound.base}.ogg`, `/audio/${sound.base}.mp3`],
      loop: sound.loop,
      volume: sound.volume,
      preload: true,
    });
    voices.add(howl);
    return {
      play: () => {
        // A faded chug holds its breath at volume zero — breathe before
        // playing so a fresh ride always rolls at full voice.
        howl.volume(sound.volume);
        return howl.play();
      },
      stop: () => howl.stop(),
      pause: () => howl.pause(),
      fade: () => {
        howl.fade(howl.volume(), 0, FADE_MS);
        howl.once('fade', (id) => howl.stop(id)); // Stop only the faded voice.
      },
      rate: (value) => howl.rate(value),
      onEnd: (listener) => {
        howl.once('end', listener);
      },
    };
  }
  return {
    createSound,
    setGlobalMute: (muted) => Howler.mute(muted),
    subscribeToChugBeat: (listener) => {
      chugBeatListener = listener;
      return () => {
        if (chugBeatListener === listener) chugBeatListener = null;
      };
    },
    startChugBeatClock,
    stopChugBeatClock,
    suspend: () => {
      // Pause every live voice (the looping chug + any one-shot still
      // ringing) and stop the beat clock — no sound in a hidden tab.
      for (const howl of voices) howl.pause();
      stopChugBeatClock();
    },
    resume: () => {
      for (const howl of voices) howl.play();
      // The beat clock restarts when the controller resumes the chug.
    },
  };
}
