/**
 * The V1 locomotive fleet. Pure data only: scene and audio wiring consume
 * these stable identities without coupling the catalog to browser or Three.js.
 */
export const TRAIN_KINDS = ['steam', 'diesel', 'tram'] as const;

export type TrainKind = (typeof TRAIN_KINDS)[number];

interface TrainDefinition {
  modelUrl: string;
  icon: string;
  aria: string;
  whistle: string;
}

const TRAINS: Record<TrainKind, TrainDefinition> = {
  steam: {
    modelUrl: '/assets/train-kit/train-locomotive-a.glb',
    icon: '🚂',
    aria: 'Steam locomotive',
    whistle: 'whistle-steam',
  },
  diesel: {
    modelUrl: '/assets/train-kit/train-diesel-a.glb',
    icon: '🚆',
    aria: 'Diesel locomotive',
    whistle: 'whistle-diesel',
  },
  tram: {
    modelUrl: '/assets/train-kit/train-tram-classic.glb',
    icon: '🚋',
    aria: 'Classic tram',
    whistle: 'whistle-tram',
  },
};

export function trainModelUrl(kind: TrainKind): string {
  return TRAINS[kind].modelUrl;
}

export function trainIcon(kind: TrainKind): string {
  return TRAINS[kind].icon;
}

export function trainAria(kind: TrainKind): string {
  return TRAINS[kind].aria;
}

export function trainWhistle(kind: TrainKind): string {
  return TRAINS[kind].whistle;
}
