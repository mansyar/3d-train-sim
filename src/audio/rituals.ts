/**
 * The five settled-phase greeting motifs — one short signature phrase per
 * clock phase, all synthesized by the music-box voice the toy already ships.
 *
 * This module owns *which* notes a greeting plays and *when* (the four day
 * motifs follow the settled director; night follows the scene's lullaby hook).
 * It reuses `createMusicBoxVoice` for *how* they sound: no audio files, no
 * network, and the same gesture-unlocked, instantly-muted voice as the boxes
 * beside the rails. The visual greeting never waits for a note to land.
 */

import { MELODIES, type Melody, type MelodyNote } from '../core/melodies';
import type { Greeting, RitualDirector } from '../state/rituals';
import type { AudioController } from './audio-controller';
import { createMusicBoxVoice } from './music-box-audio';

/** One greeting's signature phrase — pure note data, no asset or clock. */
export interface RitualMotif {
  readonly greeting: Greeting;
  readonly notes: readonly MelodyNote[];
}

/**
 * Night borrows the music box's own Twinkle lullaby rather than inventing a
 * sixth tune — the phrase the toys already play beside a passing train.
 */
function lullabyNotes(): readonly MelodyNote[] {
  const phrase = MELODIES.find((melody) => melody.id === 'abc');
  if (!phrase) throw new Error('the music-box songbook has no Twinkle lullaby');
  return phrase.notes;
}

/** The one motif per greeting; adding a phase becomes a type error here. */
export const RITUAL_MOTIFS: Readonly<Record<Greeting, RitualMotif>> = {
  // Dawn: a wide, rising "here comes the sun" chime.
  'dawn-chorus': {
    greeting: 'dawn-chorus',
    notes: [
      { midi: 60, beats: 1 },
      { midi: 64, beats: 1 },
      { midi: 67, beats: 1 },
      { midi: 72, beats: 2 },
      { midi: 71, beats: 0.5 },
      { midi: 67, beats: 0.5 },
      { midi: 64, beats: 1 },
      { midi: 67, beats: 1 },
    ],
  },
  // Morning: quick paired flutter, like wings just above the meadow.
  'morning-butterflies': {
    greeting: 'morning-butterflies',
    notes: [
      { midi: 72, beats: 0.5 },
      { midi: 76, beats: 0.5 },
      { midi: 74, beats: 0.5 },
      { midi: 72, beats: 0.5 },
      { midi: 76, beats: 1 },
      { midi: 79, beats: 1 },
      { midi: 76, beats: 1 },
      { midi: 72, beats: 1 },
    ],
  },
  // Noon: the brightest, most playful figure — a full-sun arpeggio.
  'noon-full-sun': {
    greeting: 'noon-full-sun',
    notes: [
      { midi: 60, beats: 0.5 },
      { midi: 64, beats: 0.5 },
      { midi: 67, beats: 0.5 },
      { midi: 72, beats: 0.5 },
      { midi: 76, beats: 1 },
      { midi: 72, beats: 0.5 },
      { midi: 67, beats: 0.5 },
      { midi: 64, beats: 0.5 },
      { midi: 60, beats: 1 },
    ],
  },
  // Dusk: a slow, settling descent as the windows warm.
  'dusk-windows': {
    greeting: 'dusk-windows',
    notes: [
      { midi: 72, beats: 1 },
      { midi: 69, beats: 1 },
      { midi: 67, beats: 1 },
      { midi: 65, beats: 1 },
      { midi: 64, beats: 1 },
      { midi: 62, beats: 1 },
      { midi: 60, beats: 2 },
    ],
  },
  // Night: the shared lullaby phrase, verbatim from the songbook.
  'night-fireflies': {
    greeting: 'night-fireflies',
    notes: lullabyNotes(),
  },
};

/**
 * The voice reads only `notes`; `id` is the songbook's catalog label and has
 * no say in what is heard. Greeting identity is tracked by the witness below.
 */
function asSongbookMelody(motif: RitualMotif): Melody {
  return { id: 'abc', notes: motif.notes };
}

/** Dev/e2e witness — audio is proved through state, never a microphone. */
export interface RitualAudioWitness {
  lastMotif: Greeting | null;
  /** Motifs asked for, including the silent ones behind a mute. */
  plays: number;
  /** Motifs that actually reached the speaker. */
  audiblePlays: number;
  muted: boolean;
  suspended: boolean;
}

export interface RitualAudio {
  play(greeting: Greeting): void;
  probe(): RitualAudioWitness;
  suspend(): void;
  resume(): void;
  dispose(): void;
}

export interface RitualAudioOptions {
  audio: AudioController;
  /** Supplied by the scene so settled day phases get their motif for free. */
  director?: RitualDirector;
}

/**
 * One dedicated music-box voice for greetings, separate from the toys beside
 * the rails so a passing train cannot cut a greeting short. A new motif takes
 * over from the last one, so a phase change never stacks two voices.
 */
export function createRitualAudio(options: RitualAudioOptions): RitualAudio {
  const { audio, director } = options;
  const box = createMusicBoxVoice(audio);
  let lastMotif: Greeting | null = null;
  let plays = 0;
  let audiblePlays = 0;
  let muted = audio.isMuted();
  let suspended = false;
  let disposed = false;

  function play(greeting: Greeting): void {
    if (disposed) return;
    const motif = RITUAL_MOTIFS[greeting];
    if (!motif) return;
    plays += 1;
    lastMotif = greeting;
    // Muted or hidden: the winding still counts, silently, and the visual
    // greeting is already on stage — nothing waits on Web Audio.
    if (muted || suspended) return;
    audiblePlays += 1;
    box.play(asSongbookMelody(motif));
  }

  const unsubscribeMute = audio.subscribe(() => {
    // The music box itself cuts any ringing phrase on this same notification;
    // the witness only mirrors the switch so a probe sees mute instantly.
    muted = audio.isMuted();
  });

  const unsubscribeDirector = director?.subscribe((event) => {
    // Night belongs to the scene's lullaby hook (the Phase 3 attachment point)
    // so it fires exactly once — also on the reduced-motion resting pose.
    if (event.greeting !== 'night-fireflies') play(event.greeting);
  });

  return {
    play,
    probe: () => ({ lastMotif, plays, audiblePlays, muted, suspended }),
    suspend() {
      if (suspended) return;
      suspended = true;
      box.suspend();
    },
    resume() {
      if (!suspended) return;
      suspended = false;
      box.resume();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      box.dispose();
      unsubscribeMute();
      unsubscribeDirector?.();
    },
  };
}
