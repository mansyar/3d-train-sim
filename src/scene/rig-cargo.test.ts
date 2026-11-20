import { BoxGeometry, Mesh, Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import type { CargoLoad } from '../core/cargo';
import type { PlacedScenery } from '../core/scenery';
import type { Cell } from '../core/track-graph';
import type { WorldStore } from '../state/world';
import type { Confetti } from './confetti';
import {
  type CargoRig,
  type CargoTransferTrace,
  type CargoTransferTraceSample,
  createRigCargo,
} from './rig-cargo';

/**
 * Headless proof of the frame contract: a live arc must never query the
 * world's defensive-copy `scenery()` (NFR-1), and a delivery's platform slot
 * must only reappear when the crate lands or the arc is cancelled (FR-2).
 */

const STATION_ID = 'station-1';

/** Straight-line distance between two transfer points — used to prove the arc's
 *  start and landing spots really sit at their endpoints. */
const pointDistance = (
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** Indexed guard for the DEV trace in assertions (a test may throw on a gap). */
const sampleAt = (trace: CargoTransferTrace, index: number): CargoTransferTraceSample => {
  const sample = trace.samples[index];
  if (!sample) throw new Error(`trace sample ${index} missing`);
  return sample;
};

function harness(load: CargoLoad = 'empty', reducedMotion = false) {
  const scene = new Object3D();
  const template = new Object3D();
  template.add(new Mesh(new BoxGeometry(1, 1, 1)));
  const wagon = new Object3D();
  // A real wagon has a bed mesh; without one Box3 returns -Infinity and the
  // traced bed endpoint would be NaN instead of a finite world point.
  wagon.add(new Mesh(new BoxGeometry(1, 0.4, 1)));
  const slotCrate = new Object3D();
  slotCrate.name = 'station_crate_1';

  const station: PlacedScenery = {
    id: STATION_ID,
    kind: 'station',
    cell: { x: 0, y: 0 },
    rotation: 0,
  };
  let scenery: PlacedScenery[] = [station];
  let sceneryCalls = 0;
  let deliveries = 0;
  const listeners = new Set<() => void>();
  const notify = (): void => {
    for (const listener of listeners) listener();
  };
  // Only the four methods the cargo rig reads; a full store stub would bury
  // the counting assertion behind irrelevant world state.
  const world = {
    scenery: () => {
      sceneryCalls += 1;
      return scenery.map((item) => ({ ...item, cell: { ...item.cell } }));
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    deliveryCount: () => deliveries,
    deliverCrate: () => {
      deliveries += 1;
      notify();
      return deliveries;
    },
  } as unknown as WorldStore;
  const confetti = {
    burst() {},
    update() {},
    dispose() {},
  } as unknown as Confetti;

  const cargo = createRigCargo({
    world,
    confetti,
    reducedMotion,
    cellToWorld: (cell: Cell) => ({ x: cell.x, z: cell.y }),
    scene,
    stationSlotWorld: (stationId, slot) =>
      stationId === STATION_ID && slot >= 1
        ? { point: { x: 2, y: 0, z: 2 }, crate: slotCrate }
        : null,
  });
  cargo.setTemplate(template);
  cargo.attach(wagon);
  const rig: CargoRig = { anchor: 'ride-1', wagons: [wagon], cargo: load, cargoPop: 1 };

  return {
    cargo,
    rig,
    slotCrate,
    sceneryCalls: () => sceneryCalls,
    deliveries: () => deliveries,
    removeStation: () => {
      scenery = [];
      notify();
    },
    dispose: () => cargo.dispose(),
  };
}

describe('createRigCargo — allocation-free frame path', () => {
  it('never queries world.scenery() while an arc is live or landing', () => {
    const h = harness();
    h.cargo.handleStation(h.rig, STATION_ID); // empty wagons load
    expect(h.cargo.transferWitness()?.kind).toBe('load');
    const atStart = h.sceneryCalls();

    for (let i = 0; i < 10; i += 1) h.cargo.tickTransfer(1 / 60);
    expect(h.cargo.transferWitness(), 'the arc is still flying').not.toBeNull();
    expect(h.sceneryCalls(), 'ticks read the presence flag, not a scenery copy').toBe(atStart);

    for (let i = 0; i < 40; i += 1) h.cargo.tickTransfer(1 / 60);
    expect(h.cargo.transferWitness(), 'the arc landed').toBeNull();
    expect(h.sceneryCalls(), 'landing is renderer state only').toBe(atStart);
    expect(h.rig.cargo).toBe('loaded');
    expect(h.cargo.crates(h.rig.wagons)[0]?.visible).toBe(true);
    h.dispose();
  });

  it('a notify may refresh presence, cancelling a removed-station arc on the next tick', () => {
    const h = harness('loaded');
    h.cargo.handleStation(h.rig, STATION_ID); // loaded wagons deliver
    expect(h.cargo.transferWitness()?.kind).toBe('deliver');
    expect(h.cargo.transferWitness()?.slotVisible, 'the slot waits during flight').toBe(false);
    expect(h.slotCrate.visible).toBe(false);
    expect(h.deliveries(), 'the ledger settled at the stop').toBe(1);

    h.removeStation(); // world notify: one scenery copy is allowed here
    const afterNotify = h.sceneryCalls();
    h.cargo.tickTransfer(1 / 60); // cancel resolves the witness home
    expect(h.cargo.transferWitness()).toBeNull();
    expect(h.sceneryCalls(), 'the tick itself still queries nothing').toBe(afterNotify);
    expect(h.slotCrate.visible, 'the delivered crate stays on the platform').toBe(true);
    expect(h.deliveries(), 'a cancel cannot count again').toBe(1);
    h.dispose();
  });

  it('a rig leaving its ride cancels the arc and restores the slot', () => {
    const h = harness('loaded');
    h.cargo.handleStation(h.rig, STATION_ID);
    expect(h.slotCrate.visible).toBe(false);
    h.rig.anchor = '';
    h.cargo.tickTransfer(1 / 60);
    expect(h.cargo.transferWitness()).toBeNull();
    expect(h.slotCrate.visible).toBe(true);
    h.dispose();
  });

  it('a new stop reveals the old slot before starting the next hand-off', () => {
    const h = harness('loaded');
    h.cargo.handleStation(h.rig, STATION_ID); // deliver hides the slot
    expect(h.slotCrate.visible).toBe(false);
    h.cargo.handleStation(h.rig, STATION_ID); // empty wagons load again
    expect(h.slotCrate.visible).toBe(true);
    expect(h.cargo.transferWitness()?.kind).toBe('load');
    h.dispose();
  });

  it('the instant reduced-motion path leaves the delivered slot visible', () => {
    const h = harness('loaded', true);
    h.cargo.handleStation(h.rig, STATION_ID);
    expect(h.cargo.transferWitness()).toBeNull();
    expect(h.deliveries(), 'the delivery still settles once').toBe(1);
    expect(h.slotCrate.visible, 'no arc ever hid the slot').toBe(true);
    h.dispose();
  });
});

describe('createRigCargo — DEV transfer trace', () => {
  it('records a start sample, one per tick, and a landing sample at the destination', () => {
    const h = harness();
    expect(h.cargo.transferTrace().count, 'a fresh rig has no samples').toBe(0);

    h.cargo.handleStation(h.rig, STATION_ID); // load starts
    const atStart = h.cargo.transferTrace();
    expect(atStart.count).toBe(1);
    expect(sampleAt(atStart, 0).kind).toBe('load');
    expect(sampleAt(atStart, 0).progress).toBe(0);
    expect(pointDistance(sampleAt(atStart, 0).spot, sampleAt(atStart, 0).from)).toBeCloseTo(0);

    h.cargo.tickTransfer(1 / 60);
    h.cargo.tickTransfer(1 / 60);
    expect(h.cargo.transferTrace().count, 'each tick appends one sample').toBe(3);

    // Run through the landing; the arc is time-based (0.5 s), so a bounded
    // loop is enough even when dt is small.
    for (let i = 0; i < 120 && h.cargo.transferWitness(); i += 1) {
      h.cargo.tickTransfer(1 / 60);
    }
    expect(h.cargo.transferWitness(), 'the arc landed').toBeNull();
    const trace = h.cargo.transferTrace();
    const landing = sampleAt(trace, trace.count - 1);
    expect(landing.progress, 'the landing tick is recorded at progress 1').toBe(1);
    expect(pointDistance(landing.spot, landing.to)).toBeCloseTo(0);
    h.dispose();
  });

  it('returns stable sample object identities across calls', () => {
    const h = harness();
    h.cargo.handleStation(h.rig, STATION_ID);
    h.cargo.tickTransfer(1 / 60);
    h.cargo.tickTransfer(1 / 60);
    const first = h.cargo.transferTrace();
    const second = h.cargo.transferTrace();
    expect(second.count).toBe(first.count);
    for (let i = 0; i < first.count; i += 1) {
      expect(sampleAt(second, i), 'the same preallocated object is returned').toBe(
        sampleAt(first, i),
      );
    }
    h.dispose();
  });

  it('a cancelled arc records its landing spot toward the destination', () => {
    const h = harness('loaded');
    h.cargo.handleStation(h.rig, STATION_ID); // deliver
    h.cargo.tickTransfer(1 / 60);
    h.removeStation(); // world notify: the next tick resolves progress home
    h.cargo.tickTransfer(1 / 60);
    expect(h.cargo.transferWitness(), 'the cancelled arc is gone').toBeNull();
    const trace = h.cargo.transferTrace();
    const landing = sampleAt(trace, trace.count - 1);
    expect(landing.kind).toBe('deliver');
    expect(landing.progress, 'cancel resolves to the destination').toBe(1);
    expect(pointDistance(landing.spot, landing.to)).toBeCloseTo(0);
    h.dispose();
  });

  it('a new stop appends a start sample without erasing the earlier arc', () => {
    const h = harness('loaded');
    h.cargo.handleStation(h.rig, STATION_ID); // deliver hides the slot
    h.cargo.tickTransfer(1 / 60);
    const before = h.cargo.transferTrace().count;
    h.cargo.handleStation(h.rig, STATION_ID); // new stop snaps home, then loads
    const after = h.cargo.transferTrace();
    expect(after.count).toBe(before + 1);
    expect(sampleAt(after, after.count - 1).kind).toBe('load');
    expect(sampleAt(after, after.count - 1).progress).toBe(0);
    h.dispose();
  });
});
