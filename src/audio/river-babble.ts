import type { AudioController } from './audio-controller';

/** Whisper-quiet bed — the babble must never compete with chug or chatter. */
const BABBLE_MAX_GAIN = 0.05;
/** Noise loop length — short enough to build fast, long enough to not pulse. */
const LOOP_SECONDS = 2;

export interface RiverBabble {
  /** Fade the babble toward this level (0 silent … 1 full) — near-water proximity. */
  update(target: number): void;
  /** Tab hidden / visible — mirrors the audio controller's lifecycle. */
  suspend(): void;
  resume(): void;
  dispose(): void;
}

/**
 * Synthesized river babble: a looping noise bed, band-passed into a watery
 * gurgle and wobbled by two slow LFOs so it babbles instead of hissing. No
 * audio assets to download — the offline meadow stays complete. The context
 * is created lazily on the first user gesture (autoplay unlock) and respects
 * the parent's mute switch via the audio controller; the same lifecycle as
 * the weather ambience bed.
 */
export function createRiverBabble(audio: AudioController): RiverBabble {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let babbleGain: GainNode | null = null;
  let muted = audio.isMuted();
  let suspended = false;
  let target = 0;
  let disposed = false;

  function ensureContext(): void {
    if (context || disposed) return;
    try {
      const ctx = new AudioContext();
      // One shared loop of white noise feeds the gurgle.
      const length = Math.floor(ctx.sampleRate * LOOP_SECONDS);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const gurgle = ctx.createBiquadFilter();
      gurgle.type = 'bandpass';
      gurgle.frequency.value = 1000;
      gurgle.Q.value = 0.8;

      // Two detuned LFOs wobble a series gain — the amplitude modulation
      // that turns steady hiss into a babbling stream.
      const shimmer = ctx.createGain();
      shimmer.gain.value = 0.6;
      const lfo1 = ctx.createOscillator();
      lfo1.frequency.value = 9;
      const lfo2 = ctx.createOscillator();
      lfo2.frequency.value = 14;
      const shimmerDepth = ctx.createGain();
      shimmerDepth.gain.value = 0.2;
      lfo1.connect(shimmerDepth);
      lfo2.connect(shimmerDepth);
      shimmerDepth.connect(shimmer.gain);

      babbleGain = ctx.createGain();
      babbleGain.gain.value = 0;

      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;

      noise.connect(gurgle).connect(shimmer).connect(babbleGain).connect(master);
      master.connect(ctx.destination);
      noise.start();
      lfo1.start();
      lfo2.start();

      context = ctx;
      applyTargets();
    } catch {
      // No Web Audio — the meadow stays silent but fully playable.
      context = null;
    }
  }

  /** First gesture unlocks playback (autoplay policy). */
  const unlock = (): void => {
    ensureContext();
    void context?.resume();
  };
  document.addEventListener('pointerdown', unlock, { once: false });

  function applyTargets(): void {
    if (!context || !babbleGain || !master) return;
    const now = context.currentTime;
    const level = Math.min(1, Math.max(0, target));
    babbleGain.gain.setTargetAtTime(level * BABBLE_MAX_GAIN, now, 1);
    master.gain.setTargetAtTime(muted ? 0 : 1, now, 0.2);
  }

  const unsubscribeMute = audio.subscribe(() => {
    const wasMuted = muted;
    muted = audio.isMuted();
    // Unmuting while the tab is visible must wake a suspended context —
    // otherwise a hide-while-muted session stays silent forever.
    if (wasMuted && !muted && !suspended) void context?.resume().catch(() => undefined);
    applyTargets();
  });

  return {
    update(next) {
      target = next;
      if (!context) return;
      applyTargets();
    },
    suspend() {
      suspended = true;
      // A truly suspended context stops rendering the noise graph — not just
      // a silent master (hidden tabs shouldn't burn cycles on the river).
      void context?.suspend().catch(() => undefined);
    },
    resume() {
      suspended = false;
      if (!muted) void context?.resume().catch(() => undefined);
      applyTargets();
    },
    dispose() {
      disposed = true;
      unsubscribeMute();
      document.removeEventListener('pointerdown', unlock);
      void context?.close().catch(() => undefined);
      context = null;
    },
  };
}
