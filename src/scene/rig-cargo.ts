import { Box3, type Object3D, Vector3 } from 'three';
import {
  actionAtStop,
  type CargoAction,
  type CargoLoad,
  loadAfterAction,
  MAX_DELIVERED_CRATES,
} from '../core/cargo';
import {
  resolveTransferProgress,
  type TransferPoint,
  transferPoint,
  transferProgress,
} from '../core/cargo-transfer';
import type { Cell } from '../core/track-graph';
import type { WorldStore } from '../state/world';
import type { Confetti } from './confetti';
import { disposeObject } from './dispose-object';

/** How long the wagon crates take to pop aboard at a station load. */
const CARGO_POP_SECONDS = 0.25;

/** Bounded DEV trace history — several whole arcs survive before the ring wraps. */
const TRACE_CAPACITY = 256;

/** The cargo slice of a train rig (structurally satisfied by TrainRig). */
export interface CargoRig {
  /** The ride anchor served, '' when the rig is back in the spare pool. */
  anchor: string;
  wagons: Object3D[];
  cargo: CargoLoad;
  /** Load pop-in progress, 1 = settled. Sits at 1 unless animating. */
  cargoPop: number;
}

/** Dev/e2e read-out of the one live hand-off. Endpoints are world positions. */
export interface CargoTransferWitness {
  kind: CargoAction;
  stationId: string;
  progress: number;
  from: TransferPoint;
  to: TransferPoint;
  spot: TransferPoint;
  /** Destination slot visibility — false while a delivery crate is in flight. */
  slotVisible: boolean;
}

/**
 * One retained sample in the DEV transfer trace. It carries exactly the live
 * witness fields so the e2e can assert the whole arc after the fact; the app
 * records it in place at transfer start and on every tick (landing included).
 */
export type CargoTransferTraceSample = CargoTransferWitness;

/** Ordered DEV trace result. `samples` holds the retained preallocated objects
 *  themselves (oldest first), not copies — their identities stay stable. */
export interface CargoTransferTrace {
  count: number;
  samples: CargoTransferTraceSample[];
}

/** A station's numbered slot: its world point and the crate mesh that fills it. */
export interface StationSlot {
  point: TransferPoint;
  crate: Object3D | null;
}

/** One in-flight hand-off. Endpoints and scratch live here, allocated once. */
interface ActiveTransfer {
  rig: CargoRig;
  kind: CargoAction;
  stationId: string;
  elapsed: number;
  progress: number;
  from: TransferPoint;
  to: TransferPoint;
  spot: TransferPoint;
  /** Refreshed on world notify — the frame path reads this, never scenery(). */
  stationPresent: boolean;
  /** Platform slot hidden until the delivery lands, revealed on every exit. */
  slotCrate: Object3D | null;
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
  /** Advance the single visible crate arc, snapping home on cancel. */
  tickTransfer(dt: number): void;
  /** Dev/e2e witness: the live arc's kind, progress and endpoints, or null. */
  transferWitness(): CargoTransferWitness | null;
  /** DEV-only: the retained transfer samples, oldest first. Never called in a frame. */
  transferTrace(): CargoTransferTrace;
  dispose(): void;
}

export interface RigCargoOptions {
  world: WorldStore;
  /** The delivery celebration — a pooled burst at the station. */
  confetti: Confetti;
  /** Reduced motion keeps the delivery but skips the travel arc. */
  reducedMotion: boolean;
  cellToWorld: (cell: Cell) => { x: number; z: number };
  /** The travel crate is parented here so its path uses world coordinates. */
  scene: Object3D;
  /** World point and crate mesh of a station's numbered slot, or null if absent. */
  stationSlotWorld: (stationId: string, slot: number) => StationSlot | null;
}

export function createRigCargo({
  world,
  confetti,
  reducedMotion,
  cellToWorld,
  scene,
  stationSlotWorld,
}: RigCargoOptions): RigCargo {
  /** The wagon-load delivery crate (cloned per wagon, template owns GPU). */
  let crateTemplate: Object3D | null = null;
  /** One reused stand-in for the crate in flight (never one per transfer). */
  let travelCrate: Object3D | null = null;
  /** Exactly one ride is active, so at most one hand-off is ever in flight. */
  let active: ActiveTransfer | null = null;

  /**
   * DEV-only bounded trace, allocated once here. The record path only
   * overwrites these objects in place, so an arc's evidence is what the app
   * actually drew — never whatever the test's own RAF happened to catch under
   * CI load. No allocation, growth or closure lives in start/tick/record.
   */
  const traceSamples: CargoTransferTraceSample[] = [];
  for (let i = 0; i < TRACE_CAPACITY; i += 1) {
    traceSamples.push({
      kind: 'load',
      stationId: '',
      progress: 0,
      from: { x: 0, y: 0, z: 0 },
      to: { x: 0, y: 0, z: 0 },
      spot: { x: 0, y: 0, z: 0 },
      slotVisible: true,
    });
  }
  /** Index of the next write; traceSize is the number of retained samples. */
  let traceHead = 0;
  let traceSize = 0;

  /** In-place point copy — no allocation on the record path. */
  const copyTracePoint = (out: TransferPoint, from: TransferPoint): void => {
    out.x = from.x;
    out.y = from.y;
    out.z = from.z;
  };

  /** Records one sample into the ring without allocating. */
  const recordTrace = (transfer: ActiveTransfer, progress: number): void => {
    // traceHead is always modulo-wrapped into the preallocated ring; the guard
    // only narrows away noUncheckedIndexedAccess's impossible undefined.
    const sample = traceSamples[traceHead];
    if (!sample) return;
    sample.kind = transfer.kind;
    sample.stationId = transfer.stationId;
    sample.progress = progress;
    copyTracePoint(sample.from, transfer.from);
    copyTracePoint(sample.to, transfer.to);
    copyTracePoint(sample.spot, transfer.spot);
    sample.slotVisible = transfer.slotCrate ? transfer.slotCrate.visible : true;
    traceHead = (traceHead + 1) % TRACE_CAPACITY;
    if (traceSize < TRACE_CAPACITY) traceSize += 1;
  };

  /** Scratch for one-shot endpoint lookups — never touched in the frame path. */
  const scratchVec = new Vector3();
  /**
   * Station presence is a plain flag, refreshed only when the world notifies.
   * `world.scenery()` copies every item, so a notify may allocate once but a
   * frame never may; the tick reads the flag instead of querying the world.
   */
  const unsubscribeWorld = world.subscribe(() => {
    const transfer = active;
    if (!transfer) return;
    const scenery = world.scenery();
    let present = false;
    for (let i = 0; i < scenery.length; i += 1) {
      const item = scenery[i];
      if (item?.id === transfer.stationId && item.kind === 'station') {
        present = true;
        break;
      }
    }
    transfer.stationPresent = present;
  });

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

  const stationOf = (stationId: string) =>
    world.scenery().find((item) => item.id === stationId && item.kind === 'station');

  /** Lands the visual crate and clears the stand-in. Purely renderer state:
   *  the ledger and celebration already settled at the station stop, so a
   *  reload or a cancel mid-arc can neither lose nor repeat the delivery. */
  const finishTransfer = (transfer: ActiveTransfer): void => {
    if (travelCrate) travelCrate.visible = false;
    // Every exit — landing, cancel, or a new stop — gives the platform its
    // delivered crate back, even when the ledger revealed it mid-flight.
    if (transfer.slotCrate) transfer.slotCrate.visible = true;
    if (transfer.kind === 'load') {
      for (const crate of crates(transfer.rig.wagons)) {
        crate.visible = true;
        crate.scale.setScalar(1);
      }
      transfer.rig.cargoPop = 1;
    }
    if (active === transfer) active = null;
  };

  /** Begins the short visual arc: platform slot ↔ wagon bed. `slotNumber` is
   *  the platform slot the stop just filled, read before the count advanced. */
  const startTransfer = (
    rig: CargoRig,
    action: CargoAction,
    stationId: string,
    slotNumber: number,
  ): void => {
    // Captured here and on notify only: the frame loop below stays allocation-free.
    const station = stationOf(stationId);
    const wagonCrate = crates(rig.wagons)[0];
    const slot = station ? stationSlotWorld(stationId, slotNumber) : null;
    const slotPoint = slot?.point ?? null;
    if (!station || !travelCrate || !wagonCrate || !slotPoint) {
      // No mesh to travel between — the stop already applied the real state.
      setLoaded(rig, action === 'load');
      return;
    }
    // The ledger already revealed this slot; keep it dark until the crate lands.
    const slotCrate = action === 'deliver' ? (slot?.crate ?? null) : null;
    if (slotCrate) slotCrate.visible = false;

    // The wagon bed is the arc's other end; copying the riding crate's world
    // scale keeps the stand-in the same toy at both stops.
    wagonCrate.getWorldPosition(scratchVec);
    const bedPoint: TransferPoint = { x: scratchVec.x, y: scratchVec.y, z: scratchVec.z };
    wagonCrate.getWorldScale(scratchVec);
    travelCrate.scale.copy(scratchVec);

    const from = action === 'load' ? slotPoint : bedPoint;
    const to = action === 'load' ? bedPoint : slotPoint;
    const transfer: ActiveTransfer = {
      rig,
      kind: action,
      stationId,
      elapsed: 0,
      progress: 0,
      from,
      to,
      spot: { x: from.x, y: from.y, z: from.z },
      stationPresent: true,
      slotCrate,
    };
    active = transfer;

    // The real crates wait out the hand-off; one travelling crate stands in.
    for (const crate of crates(rig.wagons)) crate.visible = false;
    travelCrate.position.set(from.x, from.y, from.z);
    travelCrate.visible = true;

    // First trace sample: the arc's origin, recorded before any frame runs.
    recordTrace(transfer, 0);
  };

  const tickTransfer = (dt: number): void => {
    const transfer = active;
    if (!transfer) return;
    // A removed station (flagged on notify) or a rig that left its ride both
    // cancel; the pure helper resolves cancelled progress to 1 so it lands.
    const cancelled = !transfer.stationPresent || transfer.rig.anchor === '';
    transfer.elapsed += dt;
    const progress = resolveTransferProgress(transferProgress(transfer.elapsed), cancelled);
    transfer.progress = progress;
    // Fill the scratch spot BEFORE recording and finishing so the landing
    // sample (progress 1) lands its spot exactly on the destination. The pure
    // helper clamps and zeroes the lift at both endpoints.
    transferPoint(transfer.from, transfer.to, progress, transfer.spot);
    // A world notify can re-settle platform visibility mid-flight; one plain
    // property write keeps the slot dark until the crate actually lands.
    if (transfer.slotCrate) transfer.slotCrate.visible = false;
    // Record every tick — the landing tick included — before finishTransfer
    // clears `active`, so the trace keeps the crate's honest final witness.
    recordTrace(transfer, progress);
    if (progress >= 1) {
      finishTransfer(transfer);
      return;
    }
    if (travelCrate) {
      travelCrate.position.set(transfer.spot.x, transfer.spot.y, transfer.spot.z);
    }
  };

  const transferWitness = (): CargoTransferWitness | null => {
    if (!active) return null;
    return {
      kind: active.kind,
      stationId: active.stationId,
      progress: active.progress,
      from: { ...active.from },
      to: { ...active.to },
      spot: { ...active.spot },
      slotVisible: active.slotCrate ? active.slotCrate.visible : true,
    };
  };

  /**
   * DEV-only. Builds an oldest→newest wrapper over the retained sample
   * references. Allocating here is fine — the frame path never calls it, and
   * the sample objects themselves are the preallocated ring members.
   */
  const transferTrace = (): CargoTransferTrace => {
    const samples: CargoTransferTraceSample[] = [];
    const oldest = (traceHead - traceSize + TRACE_CAPACITY) % TRACE_CAPACITY;
    for (let i = 0; i < traceSize; i += 1) {
      const sample = traceSamples[(oldest + i) % TRACE_CAPACITY];
      if (sample) samples.push(sample);
    }
    return { count: traceSize, samples };
  };

  const handleStation = (rig: CargoRig, stationId: string): void => {
    // A new stop snaps any live arc home first — including its hidden slot,
    // so a stop that takes the instant path never strands a dark platform.
    if (active) finishTransfer(active);
    const action = actionAtStop(rig.cargo);
    rig.cargo = loadAfterAction(action);
    const station = stationOf(stationId);
    // The platform slot this stop fills, read before the ledger advances.
    const slot = Math.min(world.deliveryCount(stationId) + 1, MAX_DELIVERED_CRATES);
    // Settle the persisted delivery and its cue at the STOP, not at the arc's
    // end. The arc is only the visible cause; a reload or a cancel mid-flight
    // must find the hand-off already committed, with no progress to persist.
    if (action === 'deliver' && station) {
      world.deliverCrate(stationId);
      const at = cellToWorld(station.cell);
      confetti.burst(at.x, 0.5, at.z);
    }
    if (reducedMotion || !station || !travelCrate || !crates(rig.wagons)[0]) {
      // Instant state change — no travel mesh, no per-frame arc to witness.
      setLoaded(rig, action === 'load');
      return;
    }
    startTransfer(rig, action, stationId, slot);
  };

  return {
    setTemplate(model) {
      crateTemplate = model;
      travelCrate = model.clone(true);
      travelCrate.name = 'cargo_transfer_crate';
      travelCrate.visible = false;
      scene.add(travelCrate);
    },
    attach,
    crates,
    advancePop,
    setLoaded,
    handleStation,
    tickTransfer,
    transferWitness,
    transferTrace,
    dispose(): void {
      unsubscribeWorld();
      if (active) finishTransfer(active);
      if (travelCrate) {
        scene.remove(travelCrate);
        travelCrate = null;
      }
      active = null;
      if (crateTemplate) disposeObject(crateTemplate);
      crateTemplate = null;
    },
  };
}
