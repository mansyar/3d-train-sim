import type { TrainKind } from './trains';

/** Gentle whistle-rate variations that keep every train recognizable and safe. */
const WHISTLE_RATES: Record<TrainKind, number> = {
  steam: 1,
  diesel: 0.92,
  tram: 1.08,
};

export function whistleRate(kind: TrainKind): number {
  return WHISTLE_RATES[kind];
}
