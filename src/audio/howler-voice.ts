import { Howl, Howler } from 'howler';

import type { AudioControllerOptions, SoundHandle } from './audio-controller';

/** Every bundled sound, with its loop behaviour and voice level. */
const SOUNDS: Record<string, { base: string; loop: boolean; volume: number }> = {
  chug: { base: 'chug-loop', loop: true, volume: 0.75 },
  whistle: { base: 'whistle', loop: false, volume: 1 },
  ding: { base: 'ding', loop: false, volume: 1 },
};

/** How long a stop eases the chug out. */
const FADE_MS = 600;

/**
 * The Howler-backed speaker wiring — real sound at last. Built to satisfy the
 * controller's options seam exactly; a different audio engine could swap in
 * behind the same contract.
 */
export function createHowlerVoice(): AudioControllerOptions {
  function createSound(name: string): SoundHandle {
    const sound = SOUNDS[name];
    if (!sound) throw new Error(`unknown sound: ${name}`);
    const howl = new Howl({
      src: [`/audio/${sound.base}.ogg`, `/audio/${sound.base}.mp3`],
      loop: sound.loop,
      volume: sound.volume,
      preload: true,
    });
    return {
      play: () => {
        // A faded chug holds its breath at volume zero — breathe before
        // playing so a fresh ride always rolls at full voice.
        howl.volume(sound.volume);
        return howl.play();
      },
      stop: () => howl.stop(),
      fade: () => {
        howl.fade(howl.volume(), 0, FADE_MS);
        howl.once('fade', (id) => howl.stop(id)); // Stop only the faded voice.
      },
      rate: (value) => howl.rate(value),
    };
  }
  return {
    createSound,
    setGlobalMute: (muted) => Howler.mute(muted),
  };
}
