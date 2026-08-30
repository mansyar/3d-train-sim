import type { WeatherIntensity } from '../core/weather-cycle';
import type { AudioController } from './audio-controller';

/** Soft bed volumes — ambience should whisper, never compete with the chug. */
const RAIN_MAX_GAIN = 0.22;
const WIND_MAX_GAIN = 0.12;
/** Noise loop length — short enough to build fast, long enough to not pulse. */
const LOOP_SECONDS = 2;

export interface AmbienceAudio {
  /** Fade the weather bed toward these intensities (0..1 each). */
  update(intensity: WeatherIntensity): void;
  /** Tab hidden / visible — mirrors the audio controller's lifecycle. */
  suspend(): void;
  resume(): void;
  dispose(): void;
}

/**
 * Synthesized weather ambience: a looping noise buffer shaped into rain
 * (lowpassed hiss) and wind (slow-breathing bandpass). No audio assets to
 * download — the offline meadow stays complete. The context is created
 * lazily on the first user gesture (autoplay unlock) and respects the
 * parent's mute switch via the audio controller.
 */
export function createAmbienceAudio(audio: AudioController): AmbienceAudio {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let rainGain: GainNode | null = null;
  let windGain: GainNode | null = null;
  let muted = audio.isMuted();
  let suspended = false;
  let target = { rain: 0, snow: 0, cloud: 0 };
  let disposed = false;

  function ensureContext(): void {
    if (context || disposed) return;
    try {
      const ctx = new AudioContext();
      // One shared loop of white noise feeds both beds.
      const length = Math.floor(ctx.sampleRate * LOOP_SECONDS);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.value = 1400;
      rainGain = ctx.createGain();
      rainGain.gain.value = 0;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 420;
      windFilter.Q.value = 0.6;
      windGain = ctx.createGain();
      windGain.gain.value = 0;

      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;

      noise.connect(rainFilter).connect(rainGain).connect(master);
      noise.connect(windFilter).connect(windGain).connect(master);
      master.connect(ctx.destination);
      noise.start();

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
    if (!context || !rainGain || !windGain || !master) return;
    const now = context.currentTime;
    // Wind breathes with rain, snow, and heavy cloud — never on a clear day.
    const wind = Math.min(
      1,
      target.rain * 0.55 + target.snow * 0.4 + Math.max(target.cloud - 0.4, 0) * 0.5,
    );
    rainGain.gain.setTargetAtTime(target.rain * RAIN_MAX_GAIN, now, 0.8);
    windGain.gain.setTargetAtTime(wind * WIND_MAX_GAIN, now, 1.2);
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
    update(intensity) {
      target = intensity;
      if (!context) return;
      applyTargets();
    },
    suspend() {
      suspended = true;
      // A truly suspended context stops rendering the noise graph — not just
      // a silent master (hidden tabs shouldn't burn cycles on weather).
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
