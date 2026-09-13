/**
 * The music box's songbook. Four public-domain nursery tunes as plain note
 * tables — MIDI pitch plus duration in beats — so both the synthesized voice
 * and the scene's winding state machine read from one source of truth. Pure
 * data and math: no DOM, no Web Audio, no clock.
 *
 * Each tune is a short signature phrase (~8–12 seconds at MUSIC_BOX_BPM),
 * not a full song, so a winding always ends before the next train pass feels
 * due. Rotation picks a different tune every winding and never repeats the
 * one that just played.
 */

/** One step of a melody: a MIDI pitch held for a whole number of beats. */
export interface MelodyNote {
  midi: number;
  beats: number;
}

export type MelodyId = 'abc' | 'mary' | 'london' | 'row';

export interface Melody {
  id: MelodyId;
  /** The signature phrase, in order. */
  notes: readonly MelodyNote[];
}

/** A gentle music-box tempo: unhurried, never sleepy. */
export const MUSIC_BOX_BPM = 100;

/**
 * ABC / Twinkle — "Twinkle, twinkle, little star" through "up above the
 * world so high" (C major, 16 beats).
 */
const ABC: readonly MelodyNote[] = [
  { midi: 60, beats: 1 },
  { midi: 60, beats: 1 },
  { midi: 67, beats: 1 },
  { midi: 67, beats: 1 },
  { midi: 69, beats: 1 },
  { midi: 69, beats: 1 },
  { midi: 67, beats: 2 },
  { midi: 65, beats: 1 },
  { midi: 65, beats: 1 },
  { midi: 64, beats: 1 },
  { midi: 64, beats: 1 },
  { midi: 62, beats: 1 },
  { midi: 62, beats: 1 },
  { midi: 60, beats: 2 },
];

/**
 * Mary Had a Little Lamb — "Mary had a little lamb, its fleece was white as
 * snow" (C major, 16 beats).
 */
const MARY: readonly MelodyNote[] = [
  { midi: 64, beats: 1 },
  { midi: 62, beats: 1 },
  { midi: 60, beats: 1 },
  { midi: 62, beats: 1 },
  { midi: 64, beats: 1 },
  { midi: 64, beats: 1 },
  { midi: 64, beats: 2 },
  { midi: 62, beats: 1 },
  { midi: 62, beats: 1 },
  { midi: 62, beats: 2 },
  { midi: 64, beats: 1 },
  { midi: 67, beats: 1 },
  { midi: 67, beats: 2 },
];

/**
 * London Bridge — the first two "falling down" lines (C major, 15 beats).
 */
const LONDON: readonly MelodyNote[] = [
  { midi: 67, beats: 1.5 },
  { midi: 69, beats: 0.5 },
  { midi: 67, beats: 1 },
  { midi: 65, beats: 1 },
  { midi: 64, beats: 1 },
  { midi: 65, beats: 1 },
  { midi: 67, beats: 2 },
  { midi: 62, beats: 1.5 },
  { midi: 64, beats: 0.5 },
  { midi: 65, beats: 1 },
  { midi: 64, beats: 1 },
  { midi: 65, beats: 1 },
  { midi: 67, beats: 2 },
];

/**
 * Row Row Row Your Boat — "Row, row, row your boat, gently down the stream"
 * plus the "merrily" descent (C major, 15.5 beats).
 */
const ROW: readonly MelodyNote[] = [
  { midi: 60, beats: 1 },
  { midi: 60, beats: 1 },
  { midi: 60, beats: 1 },
  { midi: 62, beats: 0.5 },
  { midi: 64, beats: 1.5 },
  { midi: 64, beats: 0.5 },
  { midi: 62, beats: 0.5 },
  { midi: 64, beats: 0.5 },
  { midi: 65, beats: 0.5 },
  { midi: 67, beats: 2.5 },
  { midi: 60, beats: 0.5 },
  { midi: 60, beats: 0.5 },
  { midi: 60, beats: 0.5 },
  { midi: 67, beats: 0.5 },
  { midi: 67, beats: 0.5 },
  { midi: 67, beats: 0.5 },
  { midi: 64, beats: 0.5 },
  { midi: 64, beats: 0.5 },
  { midi: 64, beats: 0.5 },
  { midi: 60, beats: 0.5 },
  { midi: 60, beats: 0.5 },
  { midi: 60, beats: 0.5 },
];

export const MELODIES: readonly Melody[] = [
  { id: 'abc', notes: ABC },
  { id: 'mary', notes: MARY },
  { id: 'london', notes: LONDON },
  { id: 'row', notes: ROW },
];

/** How long a melody takes to play, in seconds, at MUSIC_BOX_BPM. */
export function melodyDurationSeconds(melody: Melody): number {
  const beats = melody.notes.reduce((sum, note) => sum + note.beats, 0);
  return (beats * 60) / MUSIC_BOX_BPM;
}

/**
 * Pick the index of the next tune to play. `previous` is the index that just
 * played (null for the very first winding); the result is never `previous`,
 * so two windings in a row always sound different. Randomness is injected
 * for deterministic tests.
 */
export function pickNextTune(previous: number | null, random: () => number): number {
  const count = MELODIES.length;
  if (previous === null) {
    return Math.min(count - 1, Math.floor(random() * count));
  }
  const offset = 1 + Math.floor(random() * (count - 1));
  return (previous + offset) % count;
}
