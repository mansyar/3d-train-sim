/**
 * Music-box life: the town's wind-up toy. Any riding train passing within
 * ~1.5 cells winds the box once — the voice plays the next tune from the
 * rotation and the figurine pirouettes until the phrase rings out. A wound
 * box plays out on its own (⏹ never cuts it); removing the box releases the
 * tune gently; muted boxes still twirl (the tune stays in the box); reduced
 * motion keeps the tune but rests the figurine. Day and night both play.
 *
 * Scene layer only: the songbook is pure core (`melodies.ts`) and the chimes
 * are synthesized by `audio/music-box-audio.ts`. One applier record per
 * placed box, keyed by scenery id — the track renderer attaches/detaches on
 * reconcile and pumps `update` per frame (the delight-motion precedent).
 */
import type { Object3D } from 'three';
import type { MusicBoxPhrase, MusicBoxVoice } from '../audio/music-box-audio';
import type { MelodyId } from '../core/melodies';
import { MELODIES, melodyDurationSeconds, pickNextTune } from '../core/melodies';
import { MEADOW_CELLS } from '../core/track-graph';
import { GROUND_SIZE } from './ground';

const CELL_SIZE = GROUND_SIZE / MEADOW_CELLS;
/** A passing train winds the box from about one and a half cells away. */
const WIND_RADIUS = 1.5 * CELL_SIZE;
const WIND_RADIUS_SQ = WIND_RADIUS * WIND_RADIUS;
/** Rest after a winding before the same box may wind again. */
const COOLDOWN_SECONDS = 3;
/** The figurine's full-wind pirouette (~0.5 rev/s, the windmill's rate). */
const TWIRL_RATE = Math.PI;
/** Exponential ease rates for winding up and resting back down. */
const TWIRL_EASE_IN = 2.5;
const TWIRL_EASE_OUT = 1.2;

type BoxState = 'resting' | 'winding' | 'cooldown';

interface MusicBox {
  figure: Object3D | undefined;
  x: number;
  z: number;
  state: BoxState;
  /** Seconds left in the current winding or cooldown. */
  timer: number;
  /** 0..1 eased pirouette factor. */
  twirl: number;
  phrase: MusicBoxPhrase | null;
  tune: MelodyId | null;
}

export interface MusicBoxScene {
  /** Watch a placed box (no-op when the model hasn't loaded yet). */
  attach(id: string, model: Object3D | undefined, x: number, z: number): void;
  /** Stop watching a removed box — its in-flight tune releases gently. */
  detach(id: string): void;
  /** Advance every box one frame; `spots` are riding trains' world spots. */
  update(dt: number, spots: ReadonlyArray<{ x: number; z: number }>, reducedMotion: boolean): void;
  /** Dev/e2e witness: the first box's winding state. */
  probe(): { state: BoxState; tune: MelodyId | null; twirl: number } | null;
  dispose(): void;
}

export function createMusicBoxScene(
  voice: MusicBoxVoice,
  random: () => number = Math.random,
): MusicBoxScene {
  const boxes = new Map<string, MusicBox>();
  /** The rotation cursor: the index that played last, never repeated. */
  let previous: number | null = null;
  let disposed = false;

  function attach(id: string, model: Object3D | undefined, x: number, z: number): void {
    if (!model || boxes.has(id) || disposed) return;
    boxes.set(id, {
      figure: model.getObjectByName('musicbox_figure'),
      x,
      z,
      state: 'resting',
      timer: 0,
      twirl: 0,
      phrase: null,
      tune: null,
    });
  }

  function detach(id: string): void {
    const box = boxes.get(id);
    if (!box) return;
    // The box left the meadow mid-tune: let the chimes fade, not cut.
    box.phrase?.release();
    boxes.delete(id);
  }

  function wind(box: MusicBox): void {
    const index = pickNextTune(previous, random);
    const melody = MELODIES[index];
    if (!melody) return; // pickNextTune always stays in bounds.
    previous = index;
    box.state = 'winding';
    box.timer = melodyDurationSeconds(melody);
    box.tune = melody.id;
    box.phrase = voice.play(melody);
  }

  function update(
    dt: number,
    spots: ReadonlyArray<{ x: number; z: number }>,
    reducedMotion: boolean,
  ): void {
    if (disposed) return;
    for (const box of boxes.values()) {
      if (box.state === 'resting') {
        for (const spot of spots) {
          const dx = spot.x - box.x;
          const dz = spot.z - box.z;
          if (dx * dx + dz * dz <= WIND_RADIUS_SQ) {
            wind(box);
            break;
          }
        }
      } else {
        box.timer -= dt;
        if (box.timer <= 0) {
          if (box.state === 'winding') {
            box.state = 'cooldown';
            box.timer = COOLDOWN_SECONDS;
            box.phrase = null; // The phrase rang out on its own schedule.
          } else {
            box.state = 'resting';
          }
        }
      }
      // The figurine pirouettes while the tune rings; eases in and out.
      if (!reducedMotion && box.figure) {
        const target = box.state === 'winding' ? 1 : 0;
        const rate = target > box.twirl ? TWIRL_EASE_IN : TWIRL_EASE_OUT;
        box.twirl += (target - box.twirl) * Math.min(1, rate * dt);
        box.figure.rotation.y += TWIRL_RATE * dt * box.twirl;
      }
    }
  }

  function probe(): { state: BoxState; tune: MelodyId | null; twirl: number } | null {
    for (const box of boxes.values()) {
      return { state: box.state, tune: box.tune, twirl: box.twirl };
    }
    return null;
  }

  function dispose(): void {
    disposed = true;
    for (const box of boxes.values()) box.phrase?.release();
    boxes.clear();
  }

  return { attach, detach, update, probe, dispose };
}
