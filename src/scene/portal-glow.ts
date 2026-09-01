import { PointLight, type Scene } from 'three';

import { MEADOW_CELLS } from '../core/track-graph';
import type { PortalGlow } from '../core/tunnels';
import { GROUND_SIZE } from './ground';

/** World units per meadow cell — matches the track renderer's grid. */
const CELL_SIZE = GROUND_SIZE / MEADOW_CELLS;
/** Same warm family as the headlight beam — one light language at night. */
const GLOW_COLOR = 0xffe2a8;
/** Short reach: the glow belongs to the mouth, not the whole hill. */
const GLOW_REACH = 7;
const MAX_INTENSITY = 3;

export interface PortalGlowVisual {
  /**
   * Parks the glow at the given portal with night × proximity strength.
   * Zero intensity (daytime, no tunnels, engine far away) keeps it off.
   */
  update(glow: PortalGlow, nightFactor: number): void;
  dispose(): void;
}

/**
 * The engine's headlight catching a tunnel portal at night: one warm point
 * light parked at the nearest open arch mouth, keyed to the pure night
 * factor and the core proximity glow. Purely visual — one shared light for
 * the whole meadow, moved per frame with zero allocations.
 */
export function createPortalGlow(scene: Scene): PortalGlowVisual {
  const light = new PointLight(GLOW_COLOR, 0, GLOW_REACH, 2);
  light.position.set(0, 0.7, 0);
  scene.add(light);
  const half = GROUND_SIZE / 2;
  return {
    update(glow, nightFactor) {
      const level = glow.intensity * nightFactor;
      light.intensity = level * MAX_INTENSITY;
      light.visible = level > 0.01;
      if (light.visible) {
        // Cell units → world, the exact inverse of cellToWorld.
        light.position.set(
          -half + (glow.x + 0.5) * CELL_SIZE,
          0.7,
          -half + (glow.z + 0.5) * CELL_SIZE,
        );
      }
    },
    dispose: () => {
      scene.remove(light);
      light.dispose();
    },
  };
}
