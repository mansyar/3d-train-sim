import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import type { AudioController } from '../audio/audio-controller';
import type { WorldStore } from '../state/world';
import type { MeadowLights } from './lights';
import type { QualityApplier } from './quality-applier';
import type { RenderScale } from './render-scale';
import type { TrackRenderer } from './track-renderer';

/**
 * The shared refs every scene subsystem reads. One object, built once by the
 * `init-scene` assembler and passed explicitly to each subsystem — no
 * singletons, no module-level mutable state (spec: minimal SceneContext).
 */
export interface SceneContext {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  canvas: HTMLCanvasElement;
  world: WorldStore;
  audio: AudioController;
  /** The placed-piece/scenery renderer (ghosts, picking, gates, critters). */
  tracks: TrackRenderer;
  /** The meadow's sun/moon/ambient rig (updated by the day clock). */
  lights: MeadowLights;
  /** The performance guardrail's trim applier (render scale, shadows). */
  qualityApplier: QualityApplier;
  /** Offscreen blit path used when render-scale trims are active. */
  renderScale: RenderScale;
  /** The user's reduced-motion preference, sampled at init. */
  reducedMotion: boolean;
}
