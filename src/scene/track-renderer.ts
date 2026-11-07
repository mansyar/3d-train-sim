import type { PerspectiveCamera, Scene } from 'three';
import type { AudioController } from '../audio/audio-controller';
import type { PickedItem } from '../core/meadow-grid';
import type { PieceType } from '../core/pieces';
import type { SceneryKind } from '../core/scenery';
import type { Cell, Edge, Rotation } from '../core/track-graph';
import type { WorldStore } from '../state/world';
import type { CritterMood } from './critter-life';
import type { MusicBoxScene } from './music-box';
import { startTrackAmbience, type TrackAmbience } from './track-ambience';
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
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Placement owns the store subscription and the render maps; everything
  // below reads the live maps through this handle. The hooks are the ambient
  // reactions (critters, delight, the music box) plus the crossing
  // delegations, which only run after an asset has loaded — both modules
  // below are constructed by then.
  let ambience: TrackAmbience;
  const placement = startTrackPlacement(scene, world, reducedMotion, {
    onPieceTemplate: (type, model) => {
      ambience.pieceTemplate(type, model);
      crossings.pieceTemplate(type, model);
    },
    onSceneryTemplate: (kind, model) => ambience.sceneryTemplate(kind, model),
    onModelReplaced: (id) => {
      crossings.modelReplaced(id);
      ambience.modelReplaced(id);
    },
    onModelRemoved: (id) => {
      crossings.modelRemoved(id);
      ambience.modelRemoved(id);
    },
    onModelAdded: (id, model, kind) => crossings.modelAdded(id, model, kind),
    onItemAttached: (id, model, item) => ambience.itemAttached(id, model, item),
    afterSync: (wanted) => ambience.syncCritters(wanted),
  });
  ambience = startTrackAmbience(audio, reducedMotion, placement);

  // Ghost and grid own their scene objects; the ghost reads the live
  // template map, so an asset still in flight yields no preview.
  const ghost = startTrackGhost(scene, placement.templates);

  // Picking reads the live maps through the placement handle: the hit test
  // resolves the cell first, then the item tracked on it.
  const picking = startTrackPicking(camera, canvas, placement);

  const crossings = startTrackCrossings(placement, audio, reducedMotion);

  return {
    cellFromPoint: picking.cellFromPoint,
    cellToScreen: picking.cellToScreen,
    beginGhost: ghost.beginGhost,
    moveGhost: ghost.moveGhost,
    endGhost: ghost.endGhost,
    pickPiece: picking.pickPiece,
    setPieceVisible: placement.setPieceVisible,
    setGridVisible: ghost.setGridVisible,
    setHillSnow: placement.setHillSnow,
    setSwitchRoad: crossings.setSwitchRoad,
    updateCrossings: crossings.updateCrossings,
    setCrossingSnow: crossings.setCrossingSnow,
    crossingPhases: crossings.crossingPhases,
    bellRinging: crossings.bellRinging,
    switchPose: crossings.switchPose,
    updateCritters: ambience.updateCritters,
    hopCritter: ambience.hopCritter,
    updateDelight: ambience.updateDelight,
    setDelightSnow: ambience.setDelightSnow,
    delightBalloonDrift: ambience.delightBalloonDrift,
    updateMusicBox: ambience.updateMusicBox,
    suspendMusicBox: ambience.suspendMusicBox,
    resumeMusicBox: ambience.resumeMusicBox,
    musicBoxProbe: ambience.musicBoxProbe,
    setTunnelSnow: ambience.setTunnelSnow,
    dispose(): void {
      placement.dispose();
      ghost.endGhost();
      crossings.dispose();
      ambience.dispose();
      ghost.dispose();
    },
  };
}
