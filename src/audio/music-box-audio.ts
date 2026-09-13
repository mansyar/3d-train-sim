import type { Melody, MelodyNote } from '../core/melodies';
import { MUSIC_BOX_BPM, melodyDurationSeconds } from '../core/melodies';
import type { AudioController } from './audio-controller';

/** One beat at the box's gentle tempo, in seconds. */
const SECONDS_PER_BEAT = 60 / MUSIC_BOX_BPM;
/** The whole box stays well under the chug (0.75) — it is a bedtime toy. */
const MASTER_GAIN = 0.5;
/** One chime's peak: soft enough that overlapping notes never clip. */
const NOTE_PEAK = 0.11;
/** Fast, softened attack — a music-box tine, not a plucked string. */
const ATTACK_SECONDS = 0.006;
/** Ring times: short notes still sing, long notes never wash out. */
const RING_MIN_SECONDS = 0.9;
const RING_MAX_SECONDS = 2.4;
const RING_SLACK_SECONDS = 0.7;
/** A small lead so the first note lands cleanly on the audio clock. */
const LEAD_SECONDS = 0.06;
/** Gentle early stop (release) versus instant kill (mute / hidden tab). */
const RELEASE_TAU = 0.15;
const CUT_TAU = 0.02;
/** Timer slack after the last beat, so the final chime fades, not chops. */
const NATURAL_TAIL_MS = 500;
/** Fundamental plus a quiet octave and twelfth — the toy shimmer. */
const PARTIALS: readonly (readonly [number, number])[] = [
  [1, 1],
  [2, 0.2],
  [3, 0.06],
];

export interface MusicBoxPhrase {
  /** Gentle early stop: cancel pending notes and taper the ringing ones. */
  release(): void;
}

export interface MusicBoxVoice {
  /** Schedule one melody — a new winding softly takes over from the previous. */
  play(melody: Melody): MusicBoxPhrase;
  /** Tab hidden / visible — mirrors the audio controller's lifecycle. */
  suspend(): void;
  resume(): void;
  dispose(): void;
}

interface ScheduledNote {
  gain: GainNode;
  oscillators: OscillatorNode[];
}

interface Phrase {
  notes: ScheduledNote[];
  timer: number;
  ended: boolean;
}

/**
 * The music box's voice: soft bell chimes synthesized with Web Audio — no
 * files to download, the offline meadow stays complete. One winding schedules
 * every note of a melody on the audio clock (fast softened attack, gentle
 * exponential decay, a quiet octave + twelfth for the toy shimmer); a new
 * winding softly takes over from the previous one. Silence is instant and
 * total behind the parent mute, the context is created lazily on the first
 * gesture (autoplay unlock) and shares the river-babble lifecycle, and a
 * muted box still winds — silently twirling, tune staying in the box.
 */
export function createMusicBoxVoice(audio: AudioController): MusicBoxVoice {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let muted = audio.isMuted();
  let suspended = false;
  let disposed = false;
  let active: Phrase | null = null;

  function ensureContext(): void {
    if (context || disposed) return;
    try {
      const ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = MASTER_GAIN;
      master.connect(ctx.destination);
      context = ctx;
    } catch {
      // No Web Audio — the box still winds, silently.
      context = null;
    }
  }

  /** First gesture unlocks playback (autoplay policy). */
  const unlock = (): void => {
    ensureContext();
    void context?.resume();
  };
  document.addEventListener('pointerdown', unlock, { once: false });

  function killNote(note: ScheduledNote, now: number, taper: number): void {
    note.gain.gain.cancelScheduledValues(now);
    note.gain.gain.setTargetAtTime(0, now, taper);
    for (const osc of note.oscillators) {
      try {
        // A stop before a pending note's start keeps it from ever sounding;
        // a ringing note gets a short tapered tail instead of a click.
        osc.stop(now + taper * 4 + 0.05);
      } catch {
        // Already stopped — nothing left to silence.
      }
    }
  }

  function endPhrase(phrase: Phrase, taper: number): void {
    if (phrase.ended) return;
    phrase.ended = true;
    window.clearTimeout(phrase.timer);
    if (active === phrase) active = null;
    if (context) {
      const now = context.currentTime;
      for (const note of phrase.notes) killNote(note, now, taper);
    }
    phrase.notes = [];
  }

  function scheduleNote(start: number, note: MelodyNote, into: ScheduledNote[]): void {
    const ctx = context;
    if (!ctx || !master) return;
    const ring = Math.min(
      RING_MAX_SECONDS,
      Math.max(RING_MIN_SECONDS, note.beats * SECONDS_PER_BEAT + RING_SLACK_SECONDS),
    );
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(NOTE_PEAK, start + ATTACK_SECONDS);
    gain.gain.setTargetAtTime(0, start + ATTACK_SECONDS, ring / 4);
    gain.connect(master);

    const frequency = 440 * 2 ** ((note.midi - 69) / 12);
    const oscillators: OscillatorNode[] = [];
    for (const [multiple, level] of PARTIALS) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency * multiple, start);
      const shade = ctx.createGain();
      shade.gain.value = level;
      osc.connect(shade).connect(gain);
      osc.start(start);
      osc.stop(start + ring + 0.25);
      oscillators.push(osc);
    }
    into.push({ gain, oscillators });
  }

  function schedulePhrase(phrase: Phrase, melody: Melody): void {
    const ctx = context;
    if (!ctx) return;
    let at = ctx.currentTime + LEAD_SECONDS;
    for (const note of melody.notes) {
      scheduleNote(at, note, phrase.notes);
      at += note.beats * SECONDS_PER_BEAT;
    }
  }

  const unsubscribeMute = audio.subscribe(() => {
    const wasMuted = muted;
    muted = audio.isMuted();
    if (wasMuted === muted) return;
    if (muted) {
      // Instant and total — no ringing tails behind the mute.
      if (active) endPhrase(active, CUT_TAU);
    } else if (!suspended) {
      void context?.resume().catch(() => undefined);
    }
  });

  return {
    play(melody) {
      // One winding at a time: a new tune gently ends the previous one.
      if (active) endPhrase(active, RELEASE_TAU);
      const phrase: Phrase = { notes: [], timer: 0, ended: false };
      active = phrase;
      phrase.timer = window.setTimeout(
        () => endPhrase(phrase, RELEASE_TAU),
        melodyDurationSeconds(melody) * 1000 + LEAD_SECONDS * 1000 + NATURAL_TAIL_MS,
      );
      // Muted, hidden, or no audio yet: the winding still completes, silently.
      if (!muted && !suspended) {
        ensureContext();
        if (context) schedulePhrase(phrase, melody);
      }
      return { release: () => endPhrase(phrase, RELEASE_TAU) };
    },
    suspend() {
      suspended = true;
      // Hidden tabs: silence the phrase and stop the clock entirely, so a
      // return never finds a stranded tune.
      if (active) endPhrase(active, CUT_TAU);
      void context?.suspend().catch(() => undefined);
    },
    resume() {
      suspended = false;
      if (!muted) void context?.resume().catch(() => undefined);
    },
    dispose() {
      disposed = true;
      if (active) endPhrase(active, CUT_TAU);
      unsubscribeMute();
      document.removeEventListener('pointerdown', unlock);
      void context?.close().catch(() => undefined);
      context = null;
      master = null;
    },
  };
}
