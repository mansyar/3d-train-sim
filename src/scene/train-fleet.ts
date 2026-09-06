import type { Object3D } from 'three';
import type { RideAudioBinding } from '../audio/ride-audio';
import type { CargoLoad } from '../core/cargo';
import type { Edge } from '../core/track-graph';
import { TRAIN_KINDS, type TrainKind } from '../core/trains';
import { WAGON_PRESETS, type WagonPreset, wagonPresetUrls, wagonSlots } from '../core/wagons';
import type { RideController, RideState } from '../state/ride';
import { disposeObject } from './dispose-object';
import { attachHeadlight, type Headlight } from './headlight';
import { loadLocomotive } from './load-locomotive';
import { loadCrate, loadWagon } from './load-wagons';
import { createRideMotion, parkFollowersBehind, type RideMotion } from './ride-motion';
import type { RigCargo } from './rig-cargo';
import type { SceneContext } from './scene-context';
import { createSteamPuffEmitter, type SteamPuffEmitter } from './steam-puff-emitter';
import { cellToWorld } from './track-renderer';

/** One chug-beat at full voice — per-train puff accumulators spend this. */
const CHUG_BEAT_SECONDS = 0.5;
/** The breath between the two dings of a station welcome. */
const STATION_DING_GAP_MS = 350;

/** One little train in the scene, serving one riding component. */
export interface TrainRig {
  /** The ride anchor this rig serves ('' while resting between rides). */
  anchor: string;
  /** The locomotive kind this rig's model was built from. */
  kind: TrainKind;
  model: Object3D;
  wagons: Object3D[];
  puffs: SteamPuffEmitter;
  /** The engine's night beam, updated by the ambience paint. */
  headlight: Headlight;
  /** The wagon cargo cycle: empty loads at a stop, loaded delivers. */
  cargo: CargoLoad;
  /** Load pop-in progress, 1 = settled. Sits at 1 unless animating. */
  cargoPop: number;
  /** Per-train chug-beat accumulator — each engine puffs to its own pace. */
  puffAcc: number;
  motion: RideMotion;
  /** The ride state the motion last began with — a new state ⇒ re-begin. */
  begunWith: RideState | null;
  /** One-shot: where a reused train sits, so it rolls on from there. */
  startNear: { x: number; z: number } | null;
}

export interface TrainFleet {
  /** Mirrors the active rides: one rig per ride, spares rest where they stopped. */
  sync(ridesList: readonly RideState[]): void;
  /** Steam on/off across the fleet with the ride mode. */
  setEmitting(riding: boolean): void;
  /** Per-frame tick: motion, puffs, cargo pops, chug beats, crossing spots.
   *  Returns the number of currently visible steam puffs (HUD witness). */
  update(dt: number): number;
  /** The riding trains' spots this frame — a view into a preallocated pool. */
  crossingSpots(): Array<{ x: number; z: number }>;
  /** The rig serving the primary (largest) active ride, or null. */
  primary(): TrainRig | null;
  /** The rig serving one ride anchor, or null (the camera's filmed train). */
  rigFor(anchor: string): TrainRig | null;
  /** How many rigs are riding right now. */
  ridingCount(): number;
  /** Total wagons across every rig (HUD/e2e witness). */
  wagonCount(): number;
  /** The riding rig nearest the meadow's heart, else the nearest spare —
   *  the whistle answerer when the camera is on the overview. */
  nearest(): TrainRig | null;
  /** Whether a rig is inside a tunnel run (the toot trails an echo). */
  inTunnel(rig: TrainRig): boolean;
  dispose(): void;
}

export interface TrainFleetOptions {
  context: SceneContext;
  rides: RideController;
  /** Ride/chug binding — paused rigs and tunnel runs duck the shared chug. */
  rideAudio: RideAudioBinding;
  /** The engines' night beams, shared with the ambience paint. */
  headlights: Headlight[];
  /** The wagon cargo cycle (crate attach/pop/deliver + confetti). */
  cargo: RigCargo;
  /** Called each time a rig is built — the assembler retires the
   *  placeholder crate and stops spinning it (idempotent from rig #2). */
  onFirstTrain(): void;
}

export function createTrainFleet({
  context,
  rides,
  rideAudio,
  headlights,
  cargo,
  onFirstTrain,
}: TrainFleetOptions): TrainFleet {
  const { scene, camera, world, audio, tracks } = context;

  const rigs = new Map<string, TrainRig>(); // assigned, keyed by ride anchor
  const spares: TrainRig[] = []; // built rigs resting between rides
  const locomotiveTemplates = new Map<TrainKind, Object3D>();
  // Wagon templates by preset, each pair in slot (pulling) order — clones per rig.
  const wagonTemplates = new Map<WagonPreset, (Object3D | null)[]>();
  let disposed = false;
  let loadedTrain: TrainKind | null = null;
  let loadedPreset: WagonPreset | null = null;

  /** The cached template pair for one preset, created on first use. */
  const templatesFor = (preset: WagonPreset): (Object3D | null)[] => {
    let pair = wagonTemplates.get(preset);
    if (!pair) {
      pair = wagonSlots().map(() => null);
      wagonTemplates.set(preset, pair);
    }
    return pair;
  };

  /** Clones of one kind's chosen wagon pair, added to the scene in pulling order. */
  const clonePresetWagons = (kind: TrainKind): Object3D[] => {
    const clones: Object3D[] = [];
    for (const template of templatesFor(world.consistFor(kind))) {
      if (!template) continue;
      const clone = template.clone(true);
      scene.add(clone);
      clones.push(clone);
    }
    return clones;
  };

  /** This rig's live ride state — null while parked or between rides. */
  const rigState = (rig: TrainRig): RideState | null => {
    if (!rig.anchor) return null;
    return rides.rides().find((ride) => ride.anchor === rig.anchor) ?? null;
  };

  /** The one shared chug softens when a riding train pauses at a dead end —
   *  and it ducks gently whenever a train is under the hill. */
  const pausedRigs = new Set<TrainRig>();
  const tunnelRigs = new Set<TrainRig>();
  const syncChugSoftened = (): void => {
    rideAudio.setPaused(pausedRigs.size > 0 || tunnelRigs.size > 0);
  };
  const setRigPaused = (rig: TrainRig, paused: boolean): void => {
    if (paused) pausedRigs.add(rig);
    else pausedRigs.delete(rig);
    syncChugSoftened();
  };
  const setRigInTunnel = (rig: TrainRig, inside: boolean): void => {
    if (inside) tunnelRigs.add(rig);
    else tunnelRigs.delete(rig);
    syncChugSoftened();
  };

  /** A station stop earns a happy ding-ding (spec FR4), per train. */
  const onStationDing = (): void => {
    audio.ding();
    window.setTimeout(() => {
      if (!disposed) audio.ding();
    }, STATION_DING_GAP_MS);
  };

  /** A bump-run crest earns one light pop — the station voice, solo and soft. */
  const onBumpCrest = (): void => {
    audio.ding();
  };

  /** Builds one train (locomotive + wagons + steam) for the selected kind. */
  const createRig = (): TrainRig | null => {
    const kind = world.train();
    const template = locomotiveTemplates.get(kind);
    if (!template) return null; // assets not ready — ride on without visuals
    const model = template.clone(true);
    scene.add(model);
    const wagons = clonePresetWagons(kind);
    const puffs = createSteamPuffEmitter(model, camera, kind);
    scene.add(puffs.group);
    const headlight = attachHeadlight(model);
    headlights.push(headlight);
    parkFollowersBehind(model, wagons);
    onFirstTrain();
    // Clones share geometry and materials with their cached template. The
    // template owns those GPU resources and disposes them during teardown.
    const rig: TrainRig = {
      anchor: '',
      kind,
      model,
      wagons,
      cargo: 'empty',
      cargoPop: 1,
      puffAcc: 0,
      puffs,
      headlight,
      motion: null as unknown as RideMotion,
      begunWith: null,
      startNear: null,
    };
    for (const wagon of wagons) cargo.attach(wagon);
    rig.motion = createRideMotion(
      model,
      world,
      () => rigState(rig),
      (paused) => setRigPaused(rig, paused),
      onStationDing,
      wagons,
      (inside) => setRigInTunnel(rig, inside),
      (stationId) => cargo.handleStation(rig, stationId),
      (pieceId: string, exit: Edge) => tracks.setSwitchRoad(pieceId, exit),
      onBumpCrest,
    );
    return rig;
  };

  /**
   * Re-dresses one rig's wagons from its kind's chosen preset. The engine,
   * the ride, and the cargo state stay — only the wagon meshes change. The
   * array refills in place so the ride motion (which holds the reference)
   * keeps posing the new wagons with today's spacing; a riding train's
   * wagons re-pose on the next tick, a spare re-parks behind its engine.
   */
  const dressRigWagons = (rig: TrainRig): void => {
    for (const old of rig.wagons) scene.remove(old);
    rig.wagons.length = 0;
    for (const wagon of clonePresetWagons(rig.kind)) {
      cargo.attach(wagon);
      rig.wagons.push(wagon);
    }
    // New meshes arrive with hidden crates — restore whatever was aboard.
    cargo.setLoaded(rig, rig.cargo !== 'empty');
    if (!rig.anchor) parkFollowersBehind(rig.model, rig.wagons);
  };

  /** Frees a rig's scene objects (kind rebuilds and teardown). */
  const disposeRigVisuals = (rig: TrainRig): void => {
    rig.puffs.dispose();
    scene.remove(rig.puffs.group);
    scene.remove(rig.model);
    for (const wagon of rig.wagons) scene.remove(wagon);
    rig.wagons.length = 0;
    const lightIndex = headlights.indexOf(rig.headlight);
    if (lightIndex !== -1) headlights.splice(lightIndex, 1);
    pausedRigs.delete(rig);
    tunnelRigs.delete(rig);
  };

  /**
   * The spare parked nearest this ride's track — a train already sitting on
   * the loop simply rolls on from where it stopped, and the meadow never
   * gathers two trains on one loop when a farther spare would do.
   */
  const nearestSpareTo = (ride: RideState): TrainRig | null => {
    if (spares.length === 0) return null;
    const piecesById = new Map(world.pieces().map((piece) => [piece.id, piece]));
    let sumX = 0;
    let sumZ = 0;
    let count = 0;
    for (const step of ride.path.steps) {
      const piece = piecesById.get(step.pieceId);
      if (!piece) continue;
      const at = cellToWorld(piece.cell);
      sumX += at.x;
      sumZ += at.z;
      count += 1;
    }
    let nearest: TrainRig | null = null;
    let nearestDist = Infinity;
    for (const spare of spares) {
      const dx = spare.model.position.x - (count > 0 ? sumX / count : 0);
      const dz = spare.model.position.z - (count > 0 ? sumZ / count : 0);
      const d = dx * dx + dz * dz;
      if (d < nearestDist) {
        nearestDist = d;
        nearest = spare;
      }
    }
    return nearest;
  };

  /** Mirrors the active rides: one rig per ride, spares rest where they stopped. */
  const syncRigs = (ridesList: readonly RideState[]): void => {
    const wanted = new Set(ridesList.map((ride) => ride.anchor));
    for (const [anchor, rig] of [...rigs]) {
      if (wanted.has(anchor)) continue;
      rigs.delete(anchor);
      rig.anchor = '';
      spares.push(rig);
    }
    for (const ride of ridesList) {
      let rig = rigs.get(ride.anchor);
      if (!rig) {
        // Prefer a spare already parked on this ride's track — it rolls on
        // from where it sits; otherwise build a fresh train.
        const reused = nearestSpareTo(ride);
        if (reused) {
          spares.splice(spares.indexOf(reused), 1);
          rig = reused;
          rig.startNear = { x: rig.model.position.x, z: rig.model.position.z };
        } else {
          const built = createRig();
          if (!built) continue;
          rig = built;
        }
        rigs.set(ride.anchor, rig);
      }
      rig.anchor = ride.anchor;
      // A new state object means the component changed — re-begin; a running
      // ride keeps its exact state object, so its train never loses progress.
      if (rig.begunWith !== ride) {
        rig.begunWith = ride;
        // The pace personality boards with the locomotive — a fresh or
        // reused rig always rides at its own kind's tempo from the first
        // tick (no tram-default first leg).
        rig.motion.setKind(rig.kind);
        rig.motion.begin(ride, rig.startNear ?? undefined);
        rig.startNear = null;
      }
    }
    // Before the first ▶, keep one train parked at the meadow's heart — the
    // toy the toddler meets on opening (the old single train's resting spot).
    if (ridesList.length === 0 && rigs.size === 0 && spares.length === 0) {
      const parked = createRig();
      if (parked) spares.push(parked);
    }
  };

  /** Swaps one rig's locomotive in place — rides keep rolling (spec R3). */
  const swapRigKind = (rig: TrainRig, kind: TrainKind): void => {
    if (rig.kind === kind) return;
    const template = locomotiveTemplates.get(kind);
    if (!template) return; // new kind's assets not ready — keep the current model
    rig.puffs.dispose();
    scene.remove(rig.puffs.group);
    scene.remove(rig.model); // The old engine leaves the meadow — no ghosts.
    const lightIndex = headlights.indexOf(rig.headlight);
    if (lightIndex !== -1) headlights.splice(lightIndex, 1);
    const model = template.clone(true);
    scene.add(model);
    rig.kind = kind;
    rig.model = model;
    rig.headlight = attachHeadlight(model);
    headlights.push(rig.headlight);
    rig.puffs = createSteamPuffEmitter(model, camera, kind);
    scene.add(rig.puffs.group);
    rig.puffs.setEmitting(rides.mode() === 'riding');
    // The motion re-poses the new engine (and its wagons) exactly where the
    // old one stood — same path distance, same direction, no restart — and
    // the pace personality follows the new locomotive.
    rig.motion.setModel(model);
    rig.motion.setKind(kind);
  };

  for (const kind of TRAIN_KINDS) {
    loadLocomotive(kind)
      .then((model) => {
        if (disposed) {
          disposeObject(model);
          return;
        }
        locomotiveTemplates.set(kind, model);
        if (kind === world.train()) {
          // Late-arriving assets complete any swap that was still waiting.
          for (const rig of [...rigs.values(), ...spares]) swapRigKind(rig, kind);
          syncRigs(rides.rides());
        }
      })
      .catch(() => {
        // Kit asset unavailable — the crate remains as the fallback placeholder.
      });
  }

  loadCrate()
    .then((crateModel) => {
      if (disposed) {
        disposeObject(crateModel);
        return;
      }
      cargo.setTemplate(crateModel);
      // Rigs built before the crate arrived get their cargo now.
      for (const rig of [...rigs.values(), ...spares]) {
        for (const wagon of rig.wagons) cargo.attach(wagon);
      }
    })
    .catch(() => {
      // Crate asset unavailable — trains ride without cargo visuals.
    });

  for (const preset of WAGON_PRESETS) {
    const urls = wagonPresetUrls(preset);
    for (const [index, slot] of wagonSlots().entries()) {
      loadWagon(urls[slot])
        .then((wagon) => {
          if (disposed) {
            disposeObject(wagon);
            return;
          }
          templatesFor(preset)[index] = wagon; // Slot order — pulling order preserved.
          // Rigs pulling this preset gain their new wagons now (the parked
          // opener included); a riding train's wagons re-pose on the next tick.
          for (const rig of [...rigs.values(), ...spares]) {
            if (world.consistFor(rig.kind) !== preset) continue;
            dressRigWagons(rig);
          }
          syncRigs(rides.rides());
        })
        .catch(() => {
          // Wagon asset unavailable — the train chugs on without it.
        });
    }
  }

  const unsubscribeTrain = world.subscribe(() => {
    const kind = world.train();
    const preset = world.consistFor(kind);
    if (kind === loadedTrain && preset === loadedPreset) return;
    const kindChanged = kind !== loadedTrain;
    const presetChanged = preset !== loadedPreset;
    loadedTrain = kind;
    loadedPreset = preset;
    for (const rig of [...rigs.values(), ...spares]) {
      if (kindChanged) swapRigKind(rig, kind);
      if (presetChanged) dressRigWagons(rig);
    }
  });

  /** The rig serving the primary (largest) active ride. */
  const primary = (): TrainRig | null => {
    const ride = rides.rides()[0];
    return ride ? (rigs.get(ride.anchor) ?? null) : null;
  };

  /** The train nearest the meadow's heart (where the overview camera looks). */
  const nearestRig = (candidates: Iterable<TrainRig>): TrainRig | null => {
    let nearest: TrainRig | null = null;
    for (const rig of candidates) {
      if (!nearest || rig.model.position.lengthSq() < nearest.model.position.lengthSq()) {
        nearest = rig;
      }
    }
    return nearest;
  };

  // Crossing gates track each riding train's spot. The pool is preallocated
  // (up to the ride cap) and refilled per frame — no loop allocations.
  const crossingTrainPool: Array<{ x: number; z: number }> = [
    { x: 0, z: 0 },
    { x: 0, z: 0 },
    { x: 0, z: 0 },
    { x: 0, z: 0 },
  ];
  const crossingTrainView: Array<{ x: number; z: number }> = [];

  return {
    sync: syncRigs,
    setEmitting(riding) {
      for (const rig of rigs.values()) rig.puffs.setEmitting(riding);
    },
    update(dt: number): number {
      let visibleSteamPuffs = 0;
      let crossingTrainCount = 0;
      // Every little train ticks — parked spares too, so a pre-ride whistle
      // burst still puffs from the meadow's resting train.
      for (const rig of [...rigs.values(), ...spares]) {
        rig.motion.update(dt);
        rig.puffs.update(dt);
        if (rig.cargoPop < 1) cargo.advancePop(rig, dt);
        // Per-train tempo: each riding engine puffs to its own live pace — a
        // laboring climber puffs slow and deep, a breezing descender quick
        // and light. Parked trains hold their breath (no saved-up burst).
        if (rigState(rig)) {
          const spot = crossingTrainPool[crossingTrainCount] as
            | { x: number; z: number }
            | undefined;
          if (spot) {
            spot.x = rig.model.position.x;
            spot.z = rig.model.position.z;
            crossingTrainCount++;
          }
          rig.puffAcc += dt * rig.motion.pace();
          while (rig.puffAcc >= CHUG_BEAT_SECONDS) {
            rig.puffAcc -= CHUG_BEAT_SECONDS;
            rig.puffs.emit();
          }
        } else {
          rig.puffAcc = 0;
        }
        visibleSteamPuffs += rig.puffs.activeCount();
      }
      // Hand the riding trains' spots to the crossing gates as one view.
      crossingTrainView.length = crossingTrainCount;
      for (let i = 0; i < crossingTrainCount; i++) {
        crossingTrainView[i] = crossingTrainPool[i] as { x: number; z: number };
      }
      return visibleSteamPuffs;
    },
    crossingSpots: () => crossingTrainView,
    primary,
    rigFor: (anchor) => rigs.get(anchor) ?? null,
    ridingCount: () => rigs.size,
    wagonCount: () =>
      [...rigs.values(), ...spares].reduce((count, rig) => count + rig.wagons.length, 0),
    nearest: () => nearestRig(rigs.values()) ?? nearestRig(spares),
    inTunnel: (rig) => tunnelRigs.has(rig),
    dispose(): void {
      disposed = true;
      unsubscribeTrain();
      for (const rig of [...rigs.values(), ...spares]) {
        rig.motion.dispose();
        disposeRigVisuals(rig);
      }
      rigs.clear();
      spares.length = 0;
      for (const model of locomotiveTemplates.values()) disposeObject(model);
      locomotiveTemplates.clear();
      for (const pair of wagonTemplates.values()) {
        for (const wagon of pair) {
          if (wagon) disposeObject(wagon);
        }
      }
      wagonTemplates.clear();
    },
  };
}
