import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

/** The Howl surface the voice module touches, as recorded fakes. */
interface FakeHowl {
  play: Mock;
  stop: Mock;
  fade: Mock;
  once: Mock;
  rate: Mock;
  volume: Mock;
}

// Howler is mocked wholesale: the voice module is the only place that speaks
// to it, so these tests pin the exact wiring (sources, loop, mute, fades).
const mocks = vi.hoisted(() => {
  const instances: FakeHowl[] = [];
  // A constructible fake: Howler's Howl is created with `new`, so the mock
  // must be a real function (arrow functions cannot be constructed).
  const Howl = vi.fn(function (this: FakeHowl) {
    this.play = vi.fn(() => 1);
    this.stop = vi.fn();
    this.fade = vi.fn();
    this.once = vi.fn();
    this.rate = vi.fn();
    this.volume = vi.fn(() => 0.75);
    instances.push(this);
  });
  return {
    Howl,
    instances,
    Howler: { mute: vi.fn() },
  };
});

vi.mock('howler', () => ({ Howl: mocks.Howl, Howler: mocks.Howler }));

import { createHowlerVoice } from './howler-voice';

/** The single Howl the test created, failing loudly if none. */
function onlyInstance(): FakeHowl {
  const instance = mocks.instances[0];
  if (!instance) throw new Error('no Howl was created');
  return instance;
}

describe('createHowlerVoice', () => {
  beforeEach(() => {
    mocks.instances.length = 0;
    mocks.Howl.mockClear();
    mocks.Howler.mute.mockClear();
  });

  it('loops the chug softly', () => {
    createHowlerVoice().createSound('chug');

    expect(mocks.Howl).toHaveBeenCalledWith({
      src: ['/audio/chug-loop.ogg', '/audio/chug-loop.mp3'],
      loop: true,
      volume: 0.75,
      preload: true,
    });
  });

  it('one-shots ring out at full voice', () => {
    const voice = createHowlerVoice();
    voice.createSound('whistle');
    voice.createSound('ding');

    expect(mocks.Howl).toHaveBeenNthCalledWith(1, {
      src: ['/audio/whistle.ogg', '/audio/whistle.mp3'],
      loop: false,
      volume: 1,
      preload: true,
    });
    expect(mocks.Howl).toHaveBeenNthCalledWith(2, {
      src: ['/audio/ding.ogg', '/audio/ding.mp3'],
      loop: false,
      volume: 1,
      preload: true,
    });
  });

  it('play restores the chug after a fade silenced it', () => {
    const handle = createHowlerVoice().createSound('chug');
    handle.fade();
    handle.play();

    const chug = onlyInstance();
    expect(chug.volume).toHaveBeenCalledWith(0.75);
    expect(chug.play).toHaveBeenCalled();
  });

  it('fades glide to silence and then settle', () => {
    const handle = createHowlerVoice().createSound('chug');
    handle.fade();

    const chug = onlyInstance();
    expect(chug.fade).toHaveBeenCalledWith(0.75, 0, 600);
    expect(chug.once).toHaveBeenCalledWith('fade', expect.any(Function));
    chug.once.mock.calls[0]?.[1]?.();
    expect(chug.stop).toHaveBeenCalled();
  });

  it('resets a one-shot rate only after the sound ends', () => {
    const handle = createHowlerVoice().createSound('whistle');
    handle.onEnd?.(() => undefined);

    expect(onlyInstance().once).toHaveBeenCalledWith('end', expect.any(Function));
  });

  it('rate nudges playback tempo without restarting', () => {
    const handle = createHowlerVoice().createSound('chug');
    handle.rate(0.85);

    expect(onlyInstance().rate).toHaveBeenCalledWith(0.85);
  });

  it('mute rides the global kill switch', () => {
    const voice = createHowlerVoice();
    voice.setGlobalMute(true);
    voice.setGlobalMute(false);

    expect(mocks.Howler.mute.mock.calls).toEqual([[true], [false]]);
  });

  it('rejects unknown sound names loudly', () => {
    expect(() => createHowlerVoice().createSound('boop')).toThrow('unknown sound');
  });
});
