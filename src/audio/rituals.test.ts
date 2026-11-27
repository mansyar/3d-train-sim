import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DayPhase } from '../core/day-clock';
import { MELODIES } from '../core/melodies';
import { createRitualDirector, SETTLE_MS } from '../state/rituals';
import type { AudioController } from './audio-controller';

/** The music-box seam the ritual voice reuses, recorded as fakes. */
const mocks = vi.hoisted(() => ({
  play: vi.fn(),
  suspend: vi.fn(),
  resume: vi.fn(),
  dispose: vi.fn(),
  createMusicBoxVoice: vi.fn(),
}));

vi.mock('./music-box-audio', () => ({ createMusicBoxVoice: mocks.createMusicBoxVoice }));

import { createRitualAudio, RITUAL_MOTIFS } from './rituals';

const GREETINGS = [
  'dawn-chorus',
  'morning-butterflies',
  'noon-full-sun',
  'dusk-windows',
  'night-fireflies',
] as const;

/** A fully-shaped controller fake — mutable mute, with real subscriber fan-out. */
function fakeAudio(): AudioController {
  let muted = false;
  const listeners = new Set<() => void>();
  const notify = (): void => {
    for (const listener of listeners) listener();
  };
  const noop = (): void => undefined;
  return {
    isMuted: () => muted,
    setMuted: (next) => {
      muted = next;
      notify();
    },
    toggleMuted: () => {
      muted = !muted;
      notify();
      return muted;
    },
    isChugging: () => false,
    startChug: noop,
    stopChug: noop,
    setChugSoftened: noop,
    setChugRate: noop,
    whistle: noop,
    ding: noop,
    click: noop,
    thunk: noop,
    chirp: noop,
    setCrossingBell: noop,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    onChugBeat: () => () => undefined,
    suspend: noop,
    resume: noop,
    dispose: noop,
  };
}

describe('ritual motifs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createMusicBoxVoice.mockReturnValue({
      play: mocks.play,
      suspend: mocks.suspend,
      resume: mocks.resume,
      dispose: mocks.dispose,
    });
  });

  it('defines one distinct motif for every greeting', () => {
    const entries = Object.entries(RITUAL_MOTIFS);
    expect(entries.map(([greeting]) => greeting).sort()).toEqual([...GREETINGS].sort());
    const contours = entries.map(([, motif]) => JSON.stringify(motif.notes));
    expect(new Set(contours).size).toBe(5); // no phase borrows another's tune
  });

  it('reuses the music-box lullaby phrase for the night greeting', () => {
    const lullaby = MELODIES.find((melody) => melody.id === 'abc');
    expect(lullaby, 'the music-box songbook ships Twinkle').toBeDefined();
    expect(RITUAL_MOTIFS['night-fireflies'].notes).toEqual(lullaby?.notes);
  });

  it('keeps every motif in the gentle register and under a music-box phrase long', () => {
    for (const motif of Object.values(RITUAL_MOTIFS)) {
      expect(motif.notes.length).toBeGreaterThan(4);
      const beats = motif.notes.reduce((sum, note) => sum + note.beats, 0);
      expect(beats * 0.6).toBeGreaterThan(3);
      expect(beats * 0.6).toBeLessThanOrEqual(12);
      for (const note of motif.notes) {
        expect(note.midi).toBeGreaterThanOrEqual(55);
        expect(note.midi).toBeLessThanOrEqual(86);
        expect(note.beats).toBeGreaterThan(0);
      }
    }
  });

  it('ships only pure note data — no asset path or network reference', () => {
    expect(JSON.stringify(RITUAL_MOTIFS)).not.toMatch(/https?:|\.ogg|\.mp3|data:/i);
  });
});

describe('createRitualAudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createMusicBoxVoice.mockReturnValue({
      play: mocks.play,
      suspend: mocks.suspend,
      resume: mocks.resume,
      dispose: mocks.dispose,
    });
  });

  it('sends the motif through the shared music-box voice', () => {
    const audio = fakeAudio();
    const motifs = createRitualAudio({ audio });
    motifs.play('dawn-chorus');

    expect(mocks.createMusicBoxVoice).toHaveBeenCalledWith(audio);
    expect(mocks.play).toHaveBeenCalledWith({
      id: 'abc',
      notes: RITUAL_MOTIFS['dawn-chorus'].notes,
    });
    expect(mocks.play).toHaveBeenCalledTimes(1);
    expect(motifs.probe().audiblePlays).toBe(1);
  });

  it('winds silently behind an instant mute — no notes reach the voice', () => {
    const audio = fakeAudio();
    const motifs = createRitualAudio({ audio });
    audio.setMuted(true);

    motifs.play('night-fireflies');
    expect(mocks.play).not.toHaveBeenCalled();
    expect(motifs.probe().muted).toBe(true);
    expect(motifs.probe().plays).toBe(1);
    expect(motifs.probe().audiblePlays).toBe(0);
  });

  it('reflects an unmute immediately and lets the next motif sound', () => {
    const audio = fakeAudio();
    const motifs = createRitualAudio({ audio });
    audio.setMuted(true);
    audio.setMuted(false);

    expect(motifs.probe().muted).toBe(false);
    motifs.play('noon-full-sun');
    expect(mocks.play).toHaveBeenCalledTimes(1);
    expect(motifs.probe().audiblePlays).toBe(1);
  });

  it('plays the four settled day motifs and leaves night to the lullaby hook', () => {
    const director = createRitualDirector();
    const motifs = createRitualAudio({ audio: fakeAudio(), director });
    const phases: DayPhase[] = ['dawn', 'morning', 'noon', 'dusk', 'night'];

    for (const phase of phases) {
      director.observe(phase);
      director.tick(SETTLE_MS);
    }

    expect(mocks.play).toHaveBeenCalledTimes(4);
    expect(motifs.probe().lastMotif).toBe('dusk-windows');
    motifs.play('night-fireflies'); // the scene's hook owns this one voice
    expect(mocks.play).toHaveBeenCalledTimes(5);
    expect(motifs.probe().lastMotif).toBe('night-fireflies');
  });

  it('follows the scene lifecycle and goes inert after disposal', () => {
    const motifs = createRitualAudio({ audio: fakeAudio() });
    motifs.suspend();
    motifs.resume();
    motifs.dispose();

    expect(mocks.suspend).toHaveBeenCalledTimes(1);
    expect(mocks.resume).toHaveBeenCalledTimes(1);
    expect(mocks.dispose).toHaveBeenCalledTimes(1);
    expect(motifs.probe().suspended).toBe(false);

    mocks.play.mockClear();
    motifs.play('dusk-windows');
    expect(mocks.play).not.toHaveBeenCalled();
  });
});
