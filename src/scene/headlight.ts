import type { Object3D } from 'three';
import { Mesh, MeshBasicMaterial, SphereGeometry, SpotLight, Vector3 } from 'three';

/** A toy-sized lamp lens on the engine's nose. */
const LAMP_RADIUS = 0.22;
/** Subtle cone: short reach, soft edges, aimed just ahead of the engine. */
const SPOT_DISTANCE = 14;
const SPOT_ANGLE = 0.55;
const SPOT_PENUMBRA = 0.8;
const SPOT_MAX_INTENSITY = 2.2;

export interface Headlight {
  /** Brighten with the night factor (0 = off by day, 1 = full beam). */
  update(nightFactor: number): void;
}

/**
 * The locomotive's night headlight: a warm emissive lens on the nose plus a
 * subtle forward spotlight cone. Purely visual — the night factor comes from
 * the pure day clock. Attached per locomotive clone; the scene's model
 * teardown reclaims the geometry and materials.
 */
export function attachHeadlight(model: Object3D): Headlight {
  // The engine's authored front faces +Z at yaw 0 (see MODEL_YAW_OFFSET in ride-motion).
  const lampGeometry = new SphereGeometry(LAMP_RADIUS, 12, 8);
  const lampMaterial = new MeshBasicMaterial({
    color: 0xffe9b0,
    transparent: true,
    opacity: 0,
  });
  const lamp = new Mesh(lampGeometry, lampMaterial);
  lamp.position.set(0, 1.0, 1.55);
  model.add(lamp);

  const spot = new SpotLight(0xffe2a8, 0, SPOT_DISTANCE, SPOT_ANGLE, SPOT_PENUMBRA, 1.2);
  spot.position.set(0, 1.1, 1.5);
  model.add(spot);
  const aim = new Vector3(0, 0.2, 9);
  model.add(spot.target); // The target must live in the same scene graph.
  spot.target.position.copy(aim);

  return {
    update(nightFactor) {
      lampMaterial.opacity = Math.min(1, nightFactor * 1.4);
      spot.intensity = nightFactor * SPOT_MAX_INTENSITY;
    },
  };
}
