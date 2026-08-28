import type { RideController } from '../state/ride';

import type { AudioController } from './audio-controller';

/** Just the chug controls the ride sync needs. */
export type ChugCommands = Pick<AudioController, 'startChug' | 'stopChug' | 'setChugSoftened'>;

export interface RideAudioBinding {
  /** The motion loop reports dead-end pauses; the chug softens to match. */
  setPaused(paused: boolean): void;
  /** Detaches from the ride controller. */
  dispose(): void;
}

/**
 * Wires the chug to the ride so motion and sound never disagree: the ride
 * controller is the single source of truth, and a mid-ride edit ends the
 * ride — and with it, the chug.
 */
export function bindRideAudio(ride: RideController, audio: ChugCommands): RideAudioBinding {
  let paused = false;
  const unsubscribe = ride.subscribe((mode) => {
    if (mode === 'riding') {
      audio.startChug();
      return;
    }
    paused = false;
    audio.stopChug();
  });
  return {
    setPaused(next) {
      if (next === paused) return;
      paused = next;
      audio.setChugSoftened(next);
    },
    dispose: unsubscribe,
  };
}
