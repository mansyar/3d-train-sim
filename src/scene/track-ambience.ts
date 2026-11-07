/**
 * Meadow ambience: the critters that breathe and hop, the delight toys
 * (windmill, carousel, balloon), the music boxes and their three snow
 * toggles, plus the tunnel domes' snow cap. Everything here reacts to what
 * placement published — it is not part of the placement pipeline.
 *
 * The live render maps arrive through the small structural interface below,
 * so this module watches placement's output without importing (or being able
 * to reach into) the placement module itself.
 */
import type { Object3D } from 'three';
import type { AudioController } from '../audio/audio-controller';
import { createMusicBoxVoice } from '../audio/music-box-audio';
import { cellToWorld } from '../core/meadow-grid';
import type { PieceType } from '../core/pieces';
import { type SceneryKind, sceneryCategory, sceneryVoice } from '../core/scenery';
import { type CritterMood, createCritterLife } from './critter-life';
import { createDelightMotion, isDelightKind } from './delight-motion';
import { createMusicBoxScene, type MusicBoxScene } from './music-box';
import { DELIGHT_CAPS, isPiece, type MeadowItem } from './track-catalog';

/** The live render maps ambience watches, read-only and structural. */
export interface AmbienceSource {
  /** Loaded templates keyed by kind (read for the live snow-cap state). */
  readonly templates: ReadonlyMap<PieceType | SceneryKind, Object3D>;
  /** Placed clones by item id. */
  readonly rendered: ReadonlyMap<string, Object3D>;
  /** Meadow records by id. */
  readonly tracked: ReadonlyMap<string, MeadowItem>;
}

/** The ambient actors and their snow toggles, owned by one module. */
export interface TrackAmbience {
  /** Placement hook: settle a piece template's winter snow cap. */
  pieceTemplate(type: PieceType, model: Object3D): void;
  /** Placement hook: settle an ambient scenery template's snow caps. */
  sceneryTemplate(kind: SceneryKind, model: Object3D): void;
  /** Placement hook: drop a swapped clone's live motion state. */
  modelReplaced(id: string): void;
  /** Placement hook: drop a removed clone's live motion state. */
  modelRemoved(id: string): void;
  /** Placement hook: re-attach motion to a newly applied item's model. */
  itemAttached(id: string, model: Object3D | undefined, item: MeadowItem): void;
  /** Placement hook: refresh the critter roster after a reconcile. */
  syncCritters(wanted: ReadonlyMap<string, MeadowItem>): void;

  updateCritters(
    dt: number,
    trainX: number | null,
    trainZ: number | null,
    mood?: CritterMood,
  ): void;
  hopCritter(voice: string): void;
  updateDelight(dt: number): void;
  setDelightSnow(visible: boolean): void;
  delightBalloonDrift(): { x: number; z: number; altitude: number } | null;
  updateMusicBox(dt: number, trains: ReadonlyArray<{ x: number; z: number }>): void;
  suspendMusicBox(): void;
  resumeMusicBox(): void;
  musicBoxProbe(): ReturnType<MusicBoxScene['probe']>;
  setTunnelSnow(visible: boolean): void;
  dispose(): void;
}

/** Owns the critter, delight, music-box and tunnel-snow actors. */
export function startTrackAmbience(
  audio: AudioController,
  reducedMotion: boolean,
  source: AmbienceSource,
): TrackAmbience {
  /** Placed critter ids with live idle/hop animation (see critter-life). */
  const animatedCritters = new Set<string>();
  const critterLife = createCritterLife((voice) => audio.chirp(voice));
  /** Delight toys (windmill/carousel/balloon) with live motion appliers. */
  const delight = createDelightMotion();
  let delightSnow = false;
  /** Music boxes: winding state, figurine twirl, and the synthesized voice. */
  const musicBoxVoice = createMusicBoxVoice(audio);
  const musicBox = createMusicBoxScene(musicBoxVoice);
  let tunnelSnow = false;
  let disposed = false;

  /** Keeps the critter animator's roster matched to the placed critters. */
  function syncCritters(wanted: ReadonlyMap<string, MeadowItem>): void {
    const next = new Set<string>();
    for (const [id, item] of wanted) {
      if (!isPiece(item) && sceneryCategory(item.kind) === 'critter') next.add(id);
    }
    for (const id of next) {
      if (animatedCritters.has(id)) continue;
      const model = source.rendered.get(id);
      const item = wanted.get(id);
      if (model && item && !isPiece(item)) {
        critterLife.track(model, id, sceneryVoice(item.kind) ?? undefined);
        animatedCritters.add(id);
      }
    }
    for (const id of animatedCritters) {
      if (!next.has(id)) {
        critterLife.forget(id);
        animatedCritters.delete(id);
      }
    }
  }

  /** Settles a tunnel template's snow cap to the winter state at load time. */
  function pieceTemplate(type: PieceType, model: Object3D): void {
    if (type !== 'tunnel') return;
    // The snow cap is a winter-only tell — hidden unless snow already
    // settled while the asset was in flight (setTunnelSnow is
    // change-driven, so the template must honor the live state).
    // Clones inherit the template's state.
    const cap = model.getObjectByName('tunnel_snow_cap');
    if (cap) cap.visible = tunnelSnow;
  }

  /** Settles a delight/music-box template's snow caps to the winter state. */
  function sceneryTemplate(kind: SceneryKind, model: Object3D): void {
    if (!isDelightKind(kind) && kind !== 'music-box') return;
    // Snow caps author visible; settle them to the winter state known
    // at load time (the asset race, as in syncTunnelPortals).
    const capName = kind === 'music-box' ? 'musicbox_snow_cap' : `${kind}_snow_cap`;
    const cap = model.getObjectByName(capName);
    if (cap) cap.visible = delightSnow;
  }

  /** Re-attaches the ambient motion a newly applied item's model carries. */
  function itemAttached(id: string, model: Object3D | undefined, item: MeadowItem): void {
    if (!isPiece(item) && isDelightKind(item.kind)) delight.attach(id, item.kind, model);
    if (!isPiece(item) && item.kind === 'music-box') {
      const spot = cellToWorld(item.cell);
      musicBox.attach(id, model, spot.x, spot.z);
    }
  }

  function setTunnelSnow(visible: boolean): void {
    if (visible === tunnelSnow) return;
    tunnelSnow = visible;
    const setCap = (model: Object3D): void => {
      const cap = model.getObjectByName('tunnel_snow_cap');
      if (cap) cap.visible = visible;
    };
    const template = source.templates.get('tunnel');
    if (template) setCap(template);
    for (const [id, model] of source.rendered) {
      const item = source.tracked.get(id);
      if (item && isPiece(item) && item.type === 'tunnel') setCap(model);
    }
  }

  /** Winter tell: the toys wear snow caps like the tunnel domes. */
  function setDelightSnow(visible: boolean): void {
    if (visible === delightSnow) return;
    delightSnow = visible;
    const setCap = (model: Object3D): void => {
      for (const name of DELIGHT_CAPS) {
        const cap = model.getObjectByName(name);
        if (cap) cap.visible = visible;
      }
    };
    for (const kind of ['windmill', 'carousel', 'balloon', 'music-box'] as const) {
      const template = source.templates.get(kind);
      if (template) setCap(template);
    }
    for (const [id, model] of source.rendered) {
      const item = source.tracked.get(id);
      if (item && !isPiece(item) && (isDelightKind(item.kind) || item.kind === 'music-box')) {
        setCap(model);
      }
    }
  }

  return {
    pieceTemplate,
    sceneryTemplate,
    modelReplaced: (id): void => {
      delight.detach(id);
      musicBox.detach(id);
    },
    modelRemoved: (id): void => {
      delight.detach(id);
      musicBox.detach(id);
    },
    itemAttached,
    syncCritters,
    updateCritters(dt, trainX, trainZ, mood): void {
      if (disposed) return;
      critterLife.update(dt, trainX, trainZ, mood);
    },
    hopCritter(voice): void {
      if (disposed) return;
      critterLife.hopByVoice(voice);
    },
    updateDelight: (dt: number): void => {
      if (disposed) return;
      delight.update(dt, reducedMotion);
    },
    setDelightSnow,
    delightBalloonDrift: () => delight.probe(),
    updateMusicBox: (dt: number, trains: ReadonlyArray<{ x: number; z: number }>): void => {
      if (disposed) return;
      musicBox.update(dt, trains, reducedMotion);
    },
    suspendMusicBox: (): void => {
      musicBoxVoice.suspend();
    },
    resumeMusicBox: (): void => {
      musicBoxVoice.resume();
    },
    musicBoxProbe: () => musicBox.probe(),
    setTunnelSnow,
    dispose(): void {
      disposed = true;
      critterLife.dispose();
      animatedCritters.clear();
      delight.dispose();
      musicBox.dispose();
      musicBoxVoice.dispose();
    },
  };
}
