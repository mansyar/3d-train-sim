/**
 * The paint reward voice. A livery tap gets a soft pop followed by a happy
 * ding, both from the sound box's already-cached voices — no new downloads,
 * no second audio backend. Mute is the persisted one from the controller and
 * takes effect on this very tap: a muted reward winds (for the witness) but
 * says nothing at all.
 */

import type { AudioController } from './audio-controller';

export type LiveryReward = 'paint' | 'stamp';

/** Dev/e2e witness — audio is proved through state, never a microphone. */
export interface LiveryAudioWitness {
  lastReward: LiveryReward | null;
  /** Rewards asked for, including the silent ones behind a mute. */
  plays: number;
  /** Rewards that actually reached the speaker. */
  audiblePlays: number;
  muted: boolean;
}

export interface LiveryAudio {
  reward(kind: LiveryReward): void;
  probe(): LiveryAudioWitness;
  dispose(): void;
}

/** One dedicated reward voice, reusing the established click/ding Howler path. */
export function createLiveryAudio(audio: AudioController): LiveryAudio {
  let lastReward: LiveryReward | null = null;
  let plays = 0;
  let audiblePlays = 0;
  let muted = audio.isMuted();
  let disposed = false;

  const unsubscribeMute = audio.subscribe(() => {
    // Mirror the switch immediately so a probe right after a mute is honest.
    muted = audio.isMuted();
  });

  return {
    reward(kind) {
      if (disposed) return;
      plays += 1;
      lastReward = kind;
      // Read the live switch too: a mute flipped since the last notify still
      // kills this reward before either voice speaks (AC-5).
      if (muted || audio.isMuted()) return;
      audiblePlays += 1;
      audio.click(); // soft pop
      audio.ding(); // happy ding
    },
    probe: () => ({ lastReward, plays, audiblePlays, muted }),
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribeMute();
    },
  };
}
