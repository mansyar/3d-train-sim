/**
 * The V1 locomotive fleet. Pure data only: scene and audio wiring consume
 * these stable identities without coupling the catalog to browser or Three.js.
 */
export const TRAIN_KINDS = ['steam', 'diesel', 'tram'] as const;

export type TrainKind = (typeof TRAIN_KINDS)[number];

interface TrainDefinition {
  modelUrl: string;
  /** Chunky inline SVG (48×48 viewBox, toy palette, brown outline). */
  icon: string;
  aria: string;
  whistle: string;
}

function wheel(cx: number): string {
  return `<circle cx="${cx}" cy="37" r="5" fill="var(--toy-brown)"/><circle cx="${cx}" cy="37" r="2" fill="var(--toy-cream)"/>`;
}

const TRAINS: Record<TrainKind, TrainDefinition> = {
  steam: {
    modelUrl: '/assets/train-kit/train-locomotive-a.glb',
    // A classic steamer facing right: chimney and dome on a dark boiler,
    // orange cab, cowcatcher at the nose.
    icon: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="4" y="33" width="34" height="3" fill="var(--toy-brown)"/>
      <rect x="4" y="21" width="22" height="12" rx="4" fill="#3a2c22"
            stroke="var(--toy-brown)" stroke-width="3"/>
      <rect x="26" y="13" width="12" height="20" rx="2" fill="var(--toy-orange)"
            stroke="var(--toy-brown)" stroke-width="3"/>
      <rect x="28.5" y="16" width="7" height="6" rx="1" fill="var(--toy-cream)"/>
      <rect x="19" y="12" width="5" height="10" rx="1" fill="var(--toy-steel)"
            stroke="var(--toy-brown)" stroke-width="2.5"/>
      <circle cx="11" cy="15" r="3" fill="var(--toy-steel)"
              stroke="var(--toy-brown)" stroke-width="2"/>
      <path d="M38 33 L44 33 L38 26 Z" fill="var(--toy-steel)"
            stroke="var(--toy-brown)" stroke-width="2.5" stroke-linejoin="round"/>
      ${wheel(12)}${wheel(30)}
    </svg>`,
    aria: 'Steam locomotive',
    whistle: 'whistle-steam',
  },
  diesel: {
    modelUrl: '/assets/train-kit/train-diesel-a.glb',
    // A boxy diesel: steel long hood, cream stripe, cab hump, no chimney.
    icon: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="4" y="33" width="36" height="3" fill="var(--toy-brown)"/>
      <rect x="4" y="17" width="36" height="16" rx="3" fill="var(--toy-steel)"
            stroke="var(--toy-brown)" stroke-width="3"/>
      <rect x="4" y="23" width="36" height="5" fill="var(--toy-cream)"/>
      <rect x="27" y="9" width="10" height="9" rx="1" fill="var(--toy-steel)"
            stroke="var(--toy-brown)" stroke-width="2.5"/>
      <rect x="29" y="11" width="6" height="5" rx="1" fill="var(--toy-cream)"
            stroke="var(--toy-brown)" stroke-width="2"/>
      <line x1="9" y1="19" x2="9" y2="22" stroke="var(--toy-brown)"
            stroke-width="2" stroke-linecap="round"/>
      <line x1="13" y1="19" x2="13" y2="22" stroke="var(--toy-brown)"
            stroke-width="2" stroke-linecap="round"/>
      ${wheel(12)}${wheel(32)}
    </svg>`,
    aria: 'Diesel locomotive',
    whistle: 'whistle-diesel',
  },
  tram: {
    modelUrl: '/assets/train-kit/train-tram-classic.glb',
    // A friendly tram: green rounded car, three windows, roof pantograph.
    icon: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M18 21 L24 11 L30 21" fill="none" stroke="var(--toy-brown)"
            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="4" y="33" width="36" height="3" fill="var(--toy-brown)"/>
      <rect x="4" y="21" width="36" height="12" rx="6" fill="var(--toy-green)"
            stroke="var(--toy-brown)" stroke-width="3"/>
      <rect x="9" y="24" width="6" height="6" rx="1" fill="var(--toy-cream)"
            stroke="var(--toy-brown)" stroke-width="2"/>
      <rect x="18" y="24" width="6" height="6" rx="1" fill="var(--toy-cream)"
            stroke="var(--toy-brown)" stroke-width="2"/>
      <rect x="27" y="24" width="6" height="6" rx="1" fill="var(--toy-cream)"
            stroke="var(--toy-brown)" stroke-width="2"/>
      ${wheel(13)}${wheel(31)}
    </svg>`,
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
