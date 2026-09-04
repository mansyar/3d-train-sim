/**
 * Hill-grade pace — pure core, no three.js.
 *
 * The ride used to run at one constant speed while hills were visual-only.
 * This module answers "how fast here?" as a factor: personality (who pulls)
 * times grade (what the rails do under the wheels). The scene layer eases
 * the live factor toward its target so pace shifts read as gentle effort,
 * never a jump — and flat track stays exactly 1.0, byte-identical to before.
 */

import { HILL_HEIGHT } from './elevation';
import type { TrainKind } from './trains';

/** A full climb labors 35% slower (Moderate grade feel). */
export const PACE_CLIMB_FACTOR = 0.65;
/** A full descent breezes 25% faster. */
export const PACE_DESCENT_FACTOR = 1.25;
/** The floor: pace never drops here, so the train never stalls or rolls back. */
export const PACE_MIN_FACTOR = 0.5;
/** Pace eases toward a new target over this long — a gentle shift, never a pop. */
export const PACE_EASE_SECONDS = 0.5;

/** Wide per-loco personalities: steam steady, tram middle, diesel zippy. */
const PERSONALITY_PACE: Record<TrainKind, number> = {
  steam: 0.9,
  tram: 1.0,
  diesel: 1.2,
};

/** The base personality factor for one locomotive. Pure and total. */
export function personalityPace(kind: TrainKind): number {
  return PERSONALITY_PACE[kind];
}

/**
 * The grade factor for one step ridden from `entryHeight` to `exitHeight`
 * (heights above the flat rail plane, in travel direction — the caller swaps
 * them when shuttling back, so climbs mirror to descents for free).
 * Full-crest climbs ride at 0.65x, full descents at 1.25x, partial blends
 * scale linearly between, and flat is exactly 1.0. Clamped and total.
 */
export function gradePaceFactor(entryHeight: number, exitHeight: number): number {
  if (!Number.isFinite(entryHeight) || !Number.isFinite(exitHeight)) return 1;
  const delta = exitHeight - entryHeight;
  if (delta === 0) return 1;
  const bounded = Math.min(HILL_HEIGHT, Math.max(-HILL_HEIGHT, delta));
  const ratio = bounded / HILL_HEIGHT;
  const factor = ratio > 0 ? 1 - 0.35 * ratio : 1 - 0.25 * ratio;
  const capped = Math.min(PACE_DESCENT_FACTOR, factor);
  return Math.max(PACE_MIN_FACTOR, capped);
}

/** Personality × grade: the pace target for one loco on one step. */
export function livePaceFactor(kind: TrainKind, entryHeight: number, exitHeight: number): number {
  return personalityPace(kind) * gradePaceFactor(entryHeight, exitHeight);
}

/**
 * Ease the live factor toward its target over PACE_EASE_SECONDS with a gentle
 * s-curve. dt <= 0 holds current; dt past the window lands on target. Pure.
 */
export function easePaceFactor(current: number, target: number, dt: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(target)) return current;
  if (!(dt > 0)) return current;
  if (dt >= PACE_EASE_SECONDS) return target;
  const u = dt / PACE_EASE_SECONDS;
  const s = u * u * (3 - 2 * u);
  return current + (target - current) * s;
}
