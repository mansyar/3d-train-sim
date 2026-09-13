import { describe, expect, it } from 'vitest';
import { MELODIES, MUSIC_BOX_BPM, melodyDurationSeconds, pickNextTune } from './melodies';

/** Tiny deterministic PRNG so rotation sequences are reproducible in tests. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('melodies', () => {
  it('ships the four tunes in a stable order', () => {
    expect(MELODIES.map((melody) => melody.id)).toEqual(['abc', 'mary', 'london', 'row']);
  });

  it('opens each tune with its recognizable incipit', () => {
    const incipits: Record<string, number[]> = {
      abc: [60, 60, 67, 67, 69, 69, 67],
      mary: [64, 62, 60, 62, 64, 64, 64],
      london: [67, 69, 67, 65, 64, 65, 67],
      row: [60, 60, 60, 62, 64, 64, 62],
    };
    for (const melody of MELODIES) {
      expect(melody.notes.slice(0, 7).map((note) => note.midi)).toEqual(incipits[melody.id]);
    }
  });

  it('keeps every note in a gentle music-box register with positive beats', () => {
    for (const melody of MELODIES) {
      expect(melody.notes.length).toBeGreaterThan(8);
      for (const note of melody.notes) {
        expect(note.midi).toBeGreaterThanOrEqual(55);
        expect(note.midi).toBeLessThanOrEqual(86);
        expect(note.beats).toBeGreaterThan(0);
      }
    }
  });

  it('plays every phrase for roughly 8 to 12 seconds', () => {
    for (const melody of MELODIES) {
      const seconds = melodyDurationSeconds(melody);
      expect(seconds).toBeGreaterThanOrEqual(8);
      expect(seconds).toBeLessThanOrEqual(12);
    }
  });

  it('computes duration from beats at the music-box tempo', () => {
    const abc = MELODIES[0];
    if (!abc) throw new Error('expected an ABC melody');
    const beats = abc.notes.reduce((sum, note) => sum + note.beats, 0);
    expect(beats).toBe(16);
    expect(melodyDurationSeconds(abc)).toBeCloseTo((beats * 60) / MUSIC_BOX_BPM, 5);
  });

  it('never picks the tune that just played', () => {
    const random = mulberry32(11);
    let previous: number | null = null;
    for (let i = 0; i < 200; i++) {
      const next = pickNextTune(previous, random);
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThan(MELODIES.length);
      if (previous !== null) expect(next).not.toBe(previous);
      previous = next;
    }
  });

  it('can reach every tune through rotation', () => {
    const random = mulberry32(12);
    const seen = new Set<number>();
    let previous: number | null = null;
    for (let i = 0; i < 200; i++) {
      previous = pickNextTune(previous, random);
      seen.add(previous);
    }
    expect(seen.size).toBe(MELODIES.length);
  });

  it('is deterministic for the same seeded RNG', () => {
    const a = mulberry32(13);
    const b = mulberry32(13);
    let previousA: number | null = null;
    let previousB: number | null = null;
    for (let i = 0; i < 50; i++) {
      previousA = pickNextTune(previousA, a);
      previousB = pickNextTune(previousB, b);
      expect(previousA).toBe(previousB);
    }
  });
});
