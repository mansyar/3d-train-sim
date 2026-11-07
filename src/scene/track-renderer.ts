import type { Object3D, PerspectiveCamera, Scene } from 'three';
import type { AudioController } from '../audio/audio-controller';
import { createMusicBoxVoice } from '../audio/music-box-audio';
import { cellToWorld, type PickedItem } from '../core/meadow-grid';
import type { PieceType } from '../core/pieces';
import { type SceneryKind, sceneryCategory, sceneryVoice } from '../core/scenery';
import type { Cell, Edge, Rotation } from '../core/track-graph';
import type { WorldStore } from '../state/world';
import { type CritterMood, createCritterLife } from './critter-life';
import { createDelightMotion, isDelightKind } from './delight-motion';
import { createMusicBoxScene, type MusicBoxScene } from './music-box';
import { DELIGHT_CAPS, isPiece, type MeadowItem } from './track-catalog';
import { startTrackCrossings } from './track-crossings';
import { startTrackGhost } from './track-ghost';
import { startTrackPicking } from './track-picking';
import { startTrackPlacement } from './track-placement';

// The frozen projection export: `init-scene` and the e2e probes reach
// `cellToScreen` through this module, so the wrapper stays exported here.
export { cellToScreen } from './track-picking';

export interface TrackRenderer {
  dispose(): void;
  /** Advance critter idle sway/hops; the train position triggers hops.
   *  `mood` (optional) dampens hops in rain and silences them at night. */
  updateCritters(
    dt: number,
    trainX: number | null,
    trainZ: number | null,
    mood?: CritterMood,
  ): void;
  /** Trigger a hop on the critter with this voice (idle chirp dance). */
  hopCritter(voice: string): void;
  /** Begin a drag preview: the real model follows the pointer, grid-snapped. */
  beginGhost(kind: PieceType | SceneryKind): void;
  /** Snap the ghost to a cell (null hides it off-meadow); tint by validity. */
  moveGhost(cell: Cell | null, rotation: Rotation, valid: boolean): void;
  /** Drop the preview ghost and release its per-drag materials. */
  endGhost(): void;
  /** Show/hide the hill run's winter snow crowns (event-driven, change-gated). */
  setHillSnow(visible: boolean): void;
  /** The meadow cell under a screen point, or null off-meadow. */
  cellFromPoint(clientX: number, clientY: number): Cell | null;
  /** The screen-space center of a meadow cell, or null when off-camera. */
  cellToScreen(cell: Cell): { x: number; y: number } | null;
  /** The placed meadow item whose cell is under a screen point, for relocate/return drags. */
  pickPiece(clientX: number, clientY: number): PickedItem | null;
  /** Hide/show a placed clone (e.g. while its own drag ghost stands in). */
  setPieceVisible(id: string, visible: boolean): void;
  /** Debug aid: show the meadow's snap-cell boundaries. */
  setGridVisible(visible: boolean): void;
  /** Winter tell: show/hide the tunnel domes' snow caps (event-driven). */
  setTunnelSnow(visible: boolean): void;
  /** Flip a switch's point blades to the chosen road (event-driven). The
   *  double slip also needs the entry edge — its blades live per entry. */
  setSwitchRoad(pieceId: string, exit: Edge, entry?: Edge): void;
  /** Advance every crossing gate toward the trains; poses the arms, lantern,
   *  and bell ask. `trains` are riding trains' world-space spots, `night` the
   *  0..1 night factor (idle lanterns glow softly after dusk). */
  updateCrossings(dt: number, trains: ReadonlyArray<{ x: number; z: number }>, night: number): void;
  /** Winter tell: show/hide the crossing's snow cap (event-driven). */
  setCrossingSnow(visible: boolean): void;
  /** Advance the delight toys: windmill sails, carousel spin, balloon wander. */
  updateDelight(dt: number): void;
  /** Winter tell: show/hide the delight toys' snow caps (event-driven). */
  setDelightSnow(visible: boolean): void;
  /** Dev/e2e witness: the first balloon's drift from its base, in cells. */
  delightBalloonDrift(): { x: number; z: number; altitude: number } | null;
  /** Advance the music boxes; `trains` are riding trains' world-space spots. */
  updateMusicBox(dt: number, trains: ReadonlyArray<{ x: number; z: number }>): void;
  /** Hidden-tab lifecycle for the boxes' synthesized voice. */
  suspendMusicBox(): void;
  resumeMusicBox(): void;
  /** Dev/e2e witness: the first music box's winding state. */
  musicBoxProbe(): ReturnType<MusicBoxScene['probe']>;

  /** Debug aid: every placed crossing's live phase ('idle'|'closing'|
   *  'active'|'lifting'), for e2e witnesses. */
  crossingPhases(): string[];
  /** Debug aid: whether the crossing bell edge is ringing right now. */
  bellRinging(): boolean;
  /** Dev/e2e witness: a switch piece's live point-blade + signal-lever
   *  angles (null when the piece is missing or has no blades rendered).
   *  The double slip keeps one blade group per entry edge — pass the
   *  model entry to read that group (south group = the default node). */
  switchPose(pieceId: string, entry?: Edge): { blade: number; lever: number | null } | null;
}

/** Renders one cloned model per placed piece, kept in sync with the store. */
export function startTrackRenderer(
  scene: Scene,
  camera: PerspectiveCamera,
  canvas: HTMLCanvasElement,
  world: WorldStore,
  audio: AudioController,
): TrackRenderer {
  /** Placed critter ids with live idle/hop animation (see critter-life). */
  const animatedCritters = new Set<string>();
  const critterLife = createCritterLife((voice) => audio.chirp(voice));
  /** Delight toys (windmill/carousel/balloon) with live motion appliers. */
  const delight = createDelightMotion();
  let delightSnow = false;
  /** Music boxes: winding state, figurine twirl, and the synthesized voice. */
  const musicBoxVoice = createMusicBoxVoice(audio);
  const musicBox = createMusicBoxScene(musicBoxVoice);
  let disposed = false;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Keeps the critter animator's roster matched to the placed critters. */
  function syncCritterAnimations(wanted: ReadonlyMap<string, MeadowItem>): void {
    const next = new Set<string>();
    for (const [id, item] of wanted) {
      if (!isPiece(item) && sceneryCategory(item.kind) === 'critter') next.add(id);
    }
    for (const id of next) {
      if (animatedCritters.has(id)) continue;
      const model = placement.rendered.get(id);
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

  // Placement owns the store subscription and the render maps; everything
  // below reads the live maps through this handle. The hooks are the resident
  // reactions (delight, critters, the music box) plus the crossing delegations,
  // which only run after an asset has loaded — the crossings module below is
  // constructed by then.
  const placement = startTrackPlacement(scene, world, reducedMotion, {
    onPieceTemplate: (type, model) => {
      if (type === 'tunnel') {
        // The snow cap is a winter-only tell — hidden unless snow already
        // settled while the asset was in flight (setTunnelSnow is
        // change-driven, so the template must honor the live state).
        // Clones inherit the template's state.
        const cap = model.getObjectByName('tunnel_snow_cap');
        if (cap) cap.visible = tunnelSnow;
      }
      crossings.pieceTemplate(type, model);
    },
    onSceneryTemplate: (kind, model) => {
      if (isDelightKind(kind) || kind === 'music-box') {
        // Snow caps author visible; settle them to the winter state known
        // at load time (the asset race, as in syncTunnelPortals).
        const capName = kind === 'music-box' ? 'musicbox_snow_cap' : `${kind}_snow_cap`;
        const cap = model.getObjectByName(capName);
        if (cap) cap.visible = delightSnow;
      }
    },
    onModelReplaced: (id) => {
      crossings.modelReplaced(id);
      delight.detach(id);
      musicBox.detach(id);
    },
    onModelRemoved: (id) => {
      crossings.modelRemoved(id);
      delight.detach(id);
      musicBox.detach(id);
    },
    onModelAdded: (id, model, kind) => crossings.modelAdded(id, model, kind),
    onItemAttached: (id, model, item) => {
      if (!isPiece(item) && isDelightKind(item.kind)) delight.attach(id, item.kind, model);
      if (!isPiece(item) && item.kind === 'music-box') {
        const spot = cellToWorld(item.cell);
        musicBox.attach(id, model, spot.x, spot.z);
      }
    },
    afterSync: (wanted) => syncCritterAnimations(wanted),
  });

  // Ghost and grid own their scene objects; the ghost reads the live
  // template map, so an asset still in flight yields no preview.
  const ghost = startTrackGhost(scene, placement.templates);

  // Picking reads the live maps through the placement handle: the hit test
  // resolves the cell first, then the item tracked on it.
  const picking = startTrackPicking(camera, canvas, placement);

  let tunnelSnow = false;
  const crossings = startTrackCrossings(placement, audio, reducedMotion);

  function setTunnelSnow(visible: boolean): void {
    if (visible === tunnelSnow) return;
    tunnelSnow = visible;
    const setCap = (model: Object3D): void => {
      const cap = model.getObjectByName('tunnel_snow_cap');
      if (cap) cap.visible = visible;
    };
    const template = placement.templates.get('tunnel');
    if (template) setCap(template);
    for (const [id, model] of placement.rendered) {
      const item = placement.tracked.get(id);
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
      const template = placement.templates.get(kind);
      if (template) setCap(template);
    }
    for (const [id, model] of placement.rendered) {
      const item = placement.tracked.get(id);
      if (item && !isPiece(item) && (isDelightKind(item.kind) || item.kind === 'music-box')) {
        setCap(model);
      }
    }
  }

  return {
    cellFromPoint: picking.cellFromPoint,
    cellToScreen: picking.cellToScreen,
    updateCritters(dt, trainX, trainZ, mood): void {
      if (disposed) return;
      critterLife.update(dt, trainX, trainZ, mood);
    },
    hopCritter(voice): void {
      if (disposed) return;
      critterLife.hopByVoice(voice);
    },
    beginGhost: ghost.beginGhost,
    moveGhost: ghost.moveGhost,
    endGhost: ghost.endGhost,
    pickPiece: picking.pickPiece,
    setPieceVisible: (id, visible): void => placement.setPieceVisible(id, visible),
    setGridVisible: ghost.setGridVisible,
    setTunnelSnow,
    setHillSnow: (visible): void => placement.setHillSnow(visible),
    setSwitchRoad: crossings.setSwitchRoad,
    updateCrossings: crossings.updateCrossings,
    setCrossingSnow: crossings.setCrossingSnow,
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
    // Dev/e2e witnesses: live crossing phases and the bell edge state.
    crossingPhases: crossings.crossingPhases,
    bellRinging: crossings.bellRinging,
    // Dev/e2e witness: the rendered switch's live pose.
    switchPose: crossings.switchPose,
    dispose(): void {
      disposed = true;
      placement.dispose();
      ghost.endGhost();
      crossings.dispose();
      critterLife.dispose();
      animatedCritters.clear();
      delight.dispose();
      musicBox.dispose();
      musicBoxVoice.dispose();
      ghost.dispose();
    },
  };
}
