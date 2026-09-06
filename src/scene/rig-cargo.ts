import { Box3, type Object3D } from 'three';
import { actionAtStop, type CargoLoad, loadAfterAction } from '../core/cargo';
import type { Cell } from '../core/track-graph';
import type { WorldStore } from '../state/world';
import type { Confetti } from './confetti';
import { disposeObject } from './dispose-object';

/** How long the wagon crates take to pop aboard at a station load. */
const CARGO_POP_SECONDS = 0.25;

/** The cargo slice of a train rig (structurally satisfied by TrainRig). */
export interface CargoRig {
  wagons: Object3D[];
  cargo: CargoLoad;
  /** Load pop-in progress, 1 = settled. Sits at 1 unless animating. */
  cargoPop: number;
}

export interface RigCargo {
  /** Swap the delivery-crate template in once its GLB lands. */
  setTemplate(model: Object3D): void;
  /** Mount a delivery crate on a wagon's cargo bed, hidden until loaded. */
  attach(wagon: Object3D): void;
  /** The delivery crates riding these wagons (attached lazily). */
  crates(wagons: Object3D[]): Object3D[];
  /** The load pop-in: a quick ease-out-back so crates bounce aboard. */
  advancePop(rig: CargoRig, dt: number): void;
  /** Shows the wagons' crates, popping them aboard when loading. */
  setLoaded(rig: CargoRig, loaded: boolean): void;
  /** One stop of the cargo cycle: empty wagons load, loaded wagons deliver.
   *  Delivery bumps the station's persisted count and pops the confetti. */
  handleStation(rig: CargoRig, stationId: string): void;
  dispose(): void;
}

export interface RigCargoOptions {
  world: WorldStore;
  /** The delivery celebration — a pooled burst at the station. */
  confetti: Confetti;
  /** Reduced motion keeps the delivery but skips the pop animation. */
  reducedMotion: boolean;
  cellToWorld: (cell: Cell) => { x: number; z: number };
}

export function createRigCargo({
  world,
  confetti,
  reducedMotion,
  cellToWorld,
}: RigCargoOptions): RigCargo {
  /** The wagon-load delivery crate (cloned per wagon, template owns GPU). */
  let crateTemplate: Object3D | null = null;

  /** The delivery crates riding these wagons (attached lazily). */
  const crates = (wagons: Object3D[]): Object3D[] => {
    const found: Object3D[] = [];
    for (const wagon of wagons) {
      const crate = wagon.getObjectByName('cargo_crate');
      if (crate) found.push(crate);
    }
    return found;
  };

  /** Mounts a delivery crate on a wagon's cargo bed, hidden until loaded. */
  const attach = (wagon: Object3D): void => {
    if (!crateTemplate || wagon.getObjectByName('cargo_crate')) return;
    const crate = crateTemplate.clone(true);
    crate.visible = false;
    crate.name = 'cargo_crate';
    // max.y is yaw-invariant, so the bed height is exact at any heading;
    // the wagon root is scaled, so the world offset converts to local units.
    const bedTop = new Box3().setFromObject(wagon).max.y;
    crate.position.y = (bedTop - wagon.position.y) / (wagon.scale.y || 1) + 0.02;
    wagon.add(crate);
  };

  /** The load pop-in: a quick ease-out-back so crates bounce aboard. */
  const advancePop = (rig: CargoRig, dt: number): void => {
    rig.cargoPop = Math.min(1, rig.cargoPop + dt / CARGO_POP_SECONDS);
    const t = rig.cargoPop - 1;
    const overshoot = 1 + 2.70158 * t * t * t + 1.70158 * t * t;
    const scale = Math.max(overshoot, 0.01);
    for (const crate of crates(rig.wagons)) crate.scale.setScalar(scale);
  };

  /** Shows the wagons' crates, popping them aboard when loading. */
  const setLoaded = (rig: CargoRig, loaded: boolean): void => {
    rig.cargoPop = 1;
    for (const crate of crates(rig.wagons)) {
      crate.visible = loaded;
      crate.scale.setScalar(1);
    }
    if (loaded && !reducedMotion) {
      rig.cargoPop = 0; // The next frames pop them up to full size.
      for (const crate of crates(rig.wagons)) crate.scale.setScalar(0.01);
    }
  };

  const handleStation = (rig: CargoRig, stationId: string): void => {
    const action = actionAtStop(rig.cargo);
    rig.cargo = loadAfterAction(action);
    setLoaded(rig, action === 'load');
    if (action !== 'deliver') return;
    // A station lifted mid-ride cannot receive the delivery — the crates
    // simply come off; no orphan count, no celebration.
    const station = world.scenery().find((item) => item.id === stationId);
    if (station) {
      world.deliverCrate(stationId);
      const at = cellToWorld(station.cell);
      confetti.burst(at.x, 0.5, at.z);
    }
  };

  return {
    setTemplate(model) {
      crateTemplate = model;
    },
    attach,
    crates,
    advancePop,
    setLoaded,
    handleStation,
    dispose(): void {
      if (crateTemplate) disposeObject(crateTemplate);
      crateTemplate = null;
    },
  };
}
