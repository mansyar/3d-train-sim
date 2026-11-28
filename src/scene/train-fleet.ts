import type { Object3D } from 'three';
import { createLiveryAudio, type LiveryAudioWitness } from '../audio/liveries';
import type { RideAudioBinding } from '../audio/ride-audio';
import type { CargoLoad } from '../core/cargo';
import { cellToWorld } from '../core/meadow-grid';
import type { Edge } from '../core/track-graph';
import { TRAIN_KINDS, type TrainKind } from '../core/trains';
import {
  DEFAULT_WAGON_PRESET,
  WAGON_PRESETS,
  type WagonPreset,
  wagonPresetUrls,
  wagonSlots,
} from '../core/wagons';
import {
  locoVehicleId,
  PAINT_SWATCHES,
  type StickerId,
  type VehicleId,
  type VehicleLivery,
  wagonVehicleId,
} from '../state/liveries';
import type { RideController, RideState } from '../state/ride';
import { liveryStore } from '../ui/app';
import { disposeObject } from './dispose-object';
import { attachHeadlight, type Headlight } from './headlight';
import {
  attachStickers,
  disposeStickerBinding,
  disposeStickerTextures,
  popSticker,
  type StickerBinding,
  type StickerWitness,
  stickerWitness,
  syncStickers,
  tickStickers,
} from './liveries/stickers';
import { loadLocomotive } from './load-locomotive';
import { loadCrate, loadWagon } from './load-wagons';
import { parkPoseFor } from './park-pose';
import { createRideMotion, parkFollowersBehind, type RideMotion } from './ride-motion';
import { paintHex, paintVehicle, type RigCargo } from './rig-cargo';
import type { SceneContext } from './scene-context';
import { createSteamPuffEmitter, type SteamPuffEmitter } from './steam-puff-emitter';

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
  /** Livery reward: seconds left in the scale bounce (0 = settled). */
  bounceT: number;
  /** Livery reward: completed bounces, a DEV/e2e witness. */
  bounceCount: number;
  /** The model's settled scale, captured from the loaded asset. */
  baseScale: number;
  /** Four preallocated sticker sprites, one per side anchor. */
  stickers: StickerBinding;
}

export interface TrainFleet {
  /** Mirrors the active rides: one rig per ride, spares rest where they stopped. */
  sync(ridesList: readonly RideState[]): void;
  /** Steam on/off across the fleet with the ride mode. */
  setEmitting(riding: boolean): void;
  /** Per-frame tick: motion, puffs, cargo pops, chug beats, crossing spots.
   *  The visible puff count is read back through steamPuffCount(). */
  update(dt: number): void;
  /** The steam puffs visible after the last update (HUD/e2e witness). */
  steamPuffCount(): number;
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
  /** Dev/e2e witness: the never-ridden opener's resting spot, or null. */
  parkedSpot(): { x: number; z: number } | null;
  /** Whether a rig is inside a tunnel run (the toot trails an echo). */
  inTunnel(rig: TrainRig): boolean;
  /** DEV/e2e witness: live paint, bounces, and reward plays per vehicle. */
  liveryWitness(): {
    bodyHex(id: VehicleId): string | null;
    bounceCount(id: VehicleId): number;
    stickers(id: VehicleId): StickerWitness;
    audio(): LiveryAudioWitness;
  };
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
  /** Flips on the world's first notify — the loaded world, not the empty store. */
  let worldReady = false;
  let loadedTrain: TrainKind | null = null;
  let loadedPreset: WagonPreset | null = null;
  let loadedCount = 0;
  let loadedOutfits = '';

  // ---- Expression: one store, one reward voice, subscription-driven paint ----
  /** Seconds of a livery bounce; reduced motion lands in place instead. */
  const BOUNCE_SECONDS = 0.32;
  /** The models load at 1.5; the bounce is a small pulse around that size. */
  const BOUNCE_SCALE = 0.12;
  const liveryAudio = createLiveryAudio(audio);
  /** Last applied hex per vehicle. Seeded from the store so boot/stamp updates
   *  never look like a fresh paint (no phantom reward or bounce). */
  const lastPaint = new Map<VehicleId, string | null>();
  const lastStickers = new Map<VehicleId, StickerId[]>();
  for (const [id, livery] of Object.entries(liveryStore.liveries())) {
    lastPaint.set(id, PAINT_SWATCHES.find((s) => s.id === livery.paint)?.hex ?? null);
    lastStickers.set(id, [...livery.stickers]);
  }
  /** Wagon sprites follow their mesh's lifetime (wagons are re-dressed). */
  const wagonStickers = new WeakMap<Object3D, StickerBinding>();
  /** The preset each live wagon was dressed from — DEV witness + boot refill. */
  const wagonOutfitOf = new WeakMap<Object3D, WagonPreset>();

  const bindingForWagon = (wagon: Object3D): StickerBinding => {
    let binding = wagonStickers.get(wagon);
    if (!binding) {
      binding = attachStickers(wagon, context.reducedMotion);
      wagonStickers.set(wagon, binding);
    }
    return binding;
  };

  const hexFor = (id: VehicleId): string | null => {
    const paint = liveryStore.liveryFor(id).paint;
    return paint ? (PAINT_SWATCHES.find((s) => s.id === paint)?.hex ?? null) : null;
  };

  const bounce = (rig: TrainRig): void => {
    if (context.reducedMotion) return;
    rig.bounceT = BOUNCE_SECONDS;
    rig.bounceCount += 1;
  };

  /** Reapply the current livery to one rig's engine and its wagons — used on
   *  build, kind swap, and re-dress so newly arriving meshes inherit the paint. */
  const applyLiveryToRig = (rig: TrainRig): void => {
    const locoId = locoVehicleId(rig.kind);
    const locoHex = hexFor(locoId);
    paintVehicle(rig.model, locoHex);
    syncStickers(rig.stickers, liveryStore.liveryFor(locoId).stickers, false);
    lastPaint.set(locoId, locoHex);
    const slots = wagonSlots();
    for (const [index, wagon] of rig.wagons.entries()) {
      // Extras have no drawer slot of their own; like a loco paint tap, they
      // inherit the engine's paint and stickers instead of staying stock.
      const slot = slots[index];
      const id = slot ? wagonVehicleId(rig.kind, slot) : locoId;
      // The drawer paints the whole consist through the loco's id; a wagon
      // only keeps its own color when an explicit wagon paint exists.
      const hex = hexFor(id) ?? locoHex;
      paintVehicle(wagon, hex);
      const own = liveryStore.liveryFor(id).stickers;
      syncStickers(
        bindingForWagon(wagon),
        own.length > 0 ? own : liveryStore.liveryFor(locoId).stickers,
        false,
      );
      lastPaint.set(id, hex);
    }
  };

  /** Paint on tap tints the body; a stamp lands on the preallocated decals.
   *  Each matching rig bounces once for paint, and each affected vehicle pops
   *  once when the cap pushes its oldest decal off — through the reward voice
   *  shared with paint, so the child hears one muted-aware ding. */
  const onLiveryChange = (id: VehicleId, livery: VehicleLivery): void => {
    const hex = livery.paint
      ? (PAINT_SWATCHES.find((s) => s.id === livery.paint)?.hex ?? null)
      : null;
    const previous = lastPaint.get(id) ?? null;
    const repaint = previous !== hex;
    lastPaint.set(id, hex);

    const before = lastStickers.get(id) ?? [];
    const stamped =
      livery.stickers.length >= before.length &&
      (livery.stickers.length !== before.length ||
        livery.stickers.some((sticker, index) => sticker !== before[index]));
    const cleared = livery.stickers.length < before.length; // restore-to-stock
    lastStickers.set(id, [...livery.stickers]);
    if (!repaint && !stamped && !cleared) return; // boot state or a no-op reselect

    let paintMatched = false;
    let stampMatched = false;
    /** Stamp with a wink and a ding; a restore clears silently instead. */
    const applyStickers = (binding: StickerBinding): void => {
      if (!stamped) {
        syncStickers(binding, [], false);
        return;
      }
      stampMatched = true;
      syncStickers(binding, livery.stickers, true);
      popSticker(binding); // one small wink per stamp; the cap pop is counted in sync
    };
    for (const rig of [...rigs.values(), ...spares]) {
      let hit = false;
      const locoId = locoVehicleId(rig.kind);
      if (id === locoId) {
        // A loco change covers its whole consist — every wagon, both sides.
        if (repaint) {
          paintVehicle(rig.model, hex);
          for (const wagon of rig.wagons) paintVehicle(wagon, hex);
        }
        if (stamped || cleared) {
          applyStickers(rig.stickers);
          for (const wagon of rig.wagons) applyStickers(bindingForWagon(wagon));
        }
        hit = true;
      } else {
        const slots = wagonSlots();
        for (const [index, wagon] of rig.wagons.entries()) {
          const slot = slots[index];
          if (slot && wagonVehicleId(rig.kind, slot) === id) {
            if (repaint) paintVehicle(wagon, hex);
            if (stamped || cleared) applyStickers(bindingForWagon(wagon));
            hit = true;
          }
        }
      }
      if (hit && repaint) {
        bounce(rig);
        paintMatched = true;
      }
    }
    if (paintMatched && hex !== null) liveryAudio.reward('paint');
    if (stampMatched && livery.stickers.length > 0) liveryAudio.reward('stamp');
  };
  const unsubscribeLivery = liveryStore.subscribe(onLiveryChange);

  /** The cached template pair for one preset, created on first use. */
  const templatesFor = (preset: WagonPreset): (Object3D | null)[] => {
    let pair = wagonTemplates.get(preset);
    if (!pair) {
      pair = wagonSlots().map(() => null);
      wagonTemplates.set(preset, pair);
    }
    return pair;
  };

  /**
   * Which preset dresses one wagon slot. A per-wagon choice wins; slots still
   * on the classic default follow the pair preset, so the drawer's pair tap
   * keeps dressing the base consist and extras reuse the same kit assets.
   */
  const outfitFor = (kind: TrainKind, index: number): WagonPreset => {
    const chosen = world.wagonOutfits(kind)[index];
    return chosen && chosen !== DEFAULT_WAGON_PRESET ? chosen : world.consistFor(kind);
  };

  /**
   * Clones one kind's wagons in pulling order, one per requested slot. Extra
   * slots reuse their preset's already-loaded lead model — no new asset fetch
   * and no slot-model redesign. A missing template shortens the consist rather
   * than breaking the ride.
   */
  const cloneConsistWagons = (kind: TrainKind): Object3D[] => {
    const clones: Object3D[] = [];
    const count = world.wagonCount(kind);
    for (let index = 0; index < count; index += 1) {
      const preset = outfitFor(kind, index);
      const pair = templatesFor(preset);
      const template = index < pair.length ? pair[index] : pair[0];
      if (!template) continue;
      const clone = template.clone(true);
      scene.add(clone);
      wagonOutfitOf.set(clone, preset);
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
    const wagons = cloneConsistWagons(kind);
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
      bounceT: 0,
      bounceCount: 0,
      baseScale: model.scale.x,
      stickers: attachStickers(model, context.reducedMotion),
    };
    for (const wagon of wagons) cargo.attach(wagon);
    applyLiveryToRig(rig);
    rig.motion = createRideMotion(
      model,
      world,
      () => rigState(rig),
      (paused) => setRigPaused(rig, paused),
      onStationDing,
      wagons,
      (inside) => setRigInTunnel(rig, inside),
      (stationId) => cargo.handleStation(rig, stationId),
      (pieceId: string, exit: Edge, entry: Edge) => tracks.setSwitchRoad(pieceId, exit, entry),
      onBumpCrest,
    );
    return rig;
  };

  /** Removes one wagon without freeing GPU resources shared with its template.
   *  Crates are template clones too: detach them so no guest rides a ghost. */
  const removeWagon = (wagon: Object3D): void => {
    const binding = wagonStickers.get(wagon);
    if (binding) {
      disposeStickerBinding(binding);
      wagonStickers.delete(wagon);
    }
    for (const child of [...wagon.children]) {
      if (child.name === 'cargo_crate') wagon.remove(child);
    }
    scene.remove(wagon);
    wagonOutfitOf.delete(wagon);
  };

  /**
   * Re-dresses one rig's wagons from their per-slot outfits. The engine,
   * the ride, and the cargo state stay — only the wagon meshes change. The
   * array refills in place so the ride motion (which holds the reference)
   * keeps posing the new wagons with today's spacing; a riding train's
   * wagons re-pose on the next tick, a spare re-parks behind its engine.
   */
  const dressRigWagons = (rig: TrainRig): void => {
    for (const old of rig.wagons) removeWagon(old);
    rig.wagons.length = 0;
    for (const wagon of cloneConsistWagons(rig.kind)) {
      cargo.attach(wagon);
      rig.wagons.push(wagon);
    }
    // New meshes arrive with hidden crates — restore whatever was aboard.
    cargo.setLoaded(rig, rig.cargo !== 'empty');
    applyLiveryToRig(rig); // freshly cloned bodies inherit their current paint
    if (!rig.anchor) parkFollowersBehind(rig.model, rig.wagons);
  };

  /** Frees a rig's scene objects (kind rebuilds and teardown). */
  const disposeRigVisuals = (rig: TrainRig): void => {
    rig.puffs.dispose();
    scene.remove(rig.puffs.group);
    disposeStickerBinding(rig.stickers);
    scene.remove(rig.model);
    for (const wagon of rig.wagons) removeWagon(wagon);
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
    // Before the first ▶, keep one train parked on the largest loop — dry
    // rails nearest the meadow heart — the toy the toddler meets on opening
    // (the old single train's resting spot). Gated on `worldReady` so the
    // opener is born from the loaded world, and posed exactly once: resting
    // spares are never re-parked (spec FR4).
    if (worldReady && ridesList.length === 0 && rigs.size === 0 && spares.length === 0) {
      const parked = createRig();
      if (parked) {
        const pose = parkPoseFor(world.pieces());
        if (pose) {
          parked.model.position.set(pose.x, pose.y, pose.z);
          parked.model.rotation.y = pose.yaw;
          parkFollowersBehind(parked.model, parked.wagons);
        }
        spares.push(parked);
      }
    }
  };

  /** Swaps one rig's locomotive in place — rides keep rolling (spec R3). */
  const swapRigKind = (rig: TrainRig, kind: TrainKind): void => {
    if (rig.kind === kind) return;
    const template = locomotiveTemplates.get(kind);
    if (!template) return; // new kind's assets not ready — keep the current model
    rig.puffs.dispose();
    scene.remove(rig.puffs.group);
    disposeStickerBinding(rig.stickers); // sprites die with the shell they sat on
    scene.remove(rig.model); // The old engine leaves the meadow — no ghosts.
    const lightIndex = headlights.indexOf(rig.headlight);
    if (lightIndex !== -1) headlights.splice(lightIndex, 1);
    const model = template.clone(true);
    scene.add(model);
    rig.kind = kind;
    rig.model = model;
    rig.baseScale = model.scale.x;
    rig.stickers = attachStickers(model, context.reducedMotion);
    rig.bounceT = 0; // a swapped-in shell lands settled, never mid-bounce
    rig.headlight = attachHeadlight(model);
    headlights.push(rig.headlight);
    rig.puffs = createSteamPuffEmitter(model, camera, kind);
    scene.add(rig.puffs.group);
    rig.puffs.setEmitting(rides.mode() === 'riding');
    applyLiveryToRig(rig); // the new shell inherits this kind's livery
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
          // One consist can mix presets across slots, so any new template may
          // complete it. Re-dress all rigs (boot is a handful of fills, never
          // a per-frame path); riding wagons re-pose on the next tick.
          for (const rig of [...rigs.values(), ...spares]) dressRigWagons(rig);
          syncRigs(rides.rides());
        })
        .catch(() => {
          // Wagon asset unavailable — the train chugs on without it.
        });
    }
  }

  const unsubscribeTrain = world.subscribe(() => {
    // The first notify carries the loaded world (boot hydration or the very
    // first edit): unlock the opener and sync once so it parks from that
    // world, never from the empty pre-load store.
    if (!worldReady) {
      worldReady = true;
      syncRigs(rides.rides());
    }
    const kind = world.train();
    const preset = world.consistFor(kind);
    const count = world.wagonCount(kind);
    const outfits = world.wagonOutfits(kind).join(',');
    if (
      kind === loadedTrain &&
      preset === loadedPreset &&
      count === loadedCount &&
      outfits === loadedOutfits
    ) {
      return; // deliveries and placements need no re-dress
    }
    const kindChanged = kind !== loadedTrain;
    const presetChanged = preset !== loadedPreset;
    const consistChanged = count !== loadedCount || outfits !== loadedOutfits;
    loadedTrain = kind;
    loadedPreset = preset;
    loadedCount = count;
    loadedOutfits = outfits;
    for (const rig of [...rigs.values(), ...spares]) {
      if (kindChanged) swapRigKind(rig, kind);
      if (presetChanged || consistChanged) dressRigWagons(rig);
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

  /**
   * The opener's resting spot while it has never ridden — the boot-parking
   * witness for e2e. A spare with no `begunWith` is exactly the pre-▶ train.
   */
  const parkedSpot = (): { x: number; z: number } | null => {
    const parked = spares.find((rig) => rig.begunWith === null);
    return parked ? { x: parked.model.position.x, z: parked.model.position.z } : null;
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
  // Published by the last update for steamPuffCount() — a read-back witness,
  // not a return value, so no frame system carries a value forward (FR-8).
  let lastSteamPuffCount = 0;

  /** The rigs carrying one vehicle id (the engine, or a given wagon slot). */
  const rigsFor = (id: VehicleId): TrainRig[] => {
    const found: TrainRig[] = [];
    for (const rig of [...rigs.values(), ...spares]) {
      if (id === locoVehicleId(rig.kind)) {
        found.push(rig);
        continue;
      }
      const slots = wagonSlots();
      for (const slot of slots) {
        if (slot && wagonVehicleId(rig.kind, slot) === id) {
          found.push(rig);
          break;
        }
      }
    }
    return found;
  };

  /** Sticker state for one vehicle: the first matching rig's decal order,
   *  with the reward/animation witnesses summed across its consist. */
  const stickersFor = (id: VehicleId): StickerWitness => {
    let visible: StickerId[] = [];
    let anchors: StickerWitness['anchors'] = [];
    let stamps = 0;
    let pops = 0;
    let animations = 0;
    let frames = 0;
    for (const rig of rigsFor(id)) {
      let binding: StickerBinding | undefined = rig.stickers;
      if (id !== locoVehicleId(rig.kind)) {
        const slots = wagonSlots();
        binding = undefined;
        for (const [index, wagon] of rig.wagons.entries()) {
          const slot = slots[index];
          if (slot && wagonVehicleId(rig.kind, slot) === id) {
            binding = wagonStickers.get(wagon);
            break;
          }
        }
      }
      if (!binding) continue;
      const probe = stickerWitness(binding);
      if (visible.length === 0) {
        visible = probe.visible;
        anchors = probe.anchors;
      }
      stamps += probe.stamps;
      pops += probe.pops;
      animations += probe.animations;
      frames += probe.frames;
    }
    return { visible, anchors, stamps, pops, animations, frames };
  };

  const liveryWitness = {
    /** The actual material color, not just the store's intent. */
    bodyHex(id: VehicleId): string | null {
      const matching = rigsFor(id);
      for (const rig of matching) {
        if (id === locoVehicleId(rig.kind)) {
          const hex = paintHex(rig.model);
          if (hex) return hex;
        } else {
          const slots = wagonSlots();
          for (const [index, wagon] of rig.wagons.entries()) {
            const slot = slots[index];
            if (slot && wagonVehicleId(rig.kind, slot) === id) {
              const hex = paintHex(wagon);
              if (hex) return hex;
            }
          }
        }
      }
      return matching.length > 0 ? (lastPaint.get(id) ?? null) : null;
    },
    bounceCount(id: VehicleId): number {
      return rigsFor(id).reduce((sum, rig) => sum + rig.bounceCount, 0);
    },
    stickers: stickersFor,
    audio: () => liveryAudio.probe(),
  };

  /** DEV/e2e witness: each rig's live outfits, positions, and crate state.
   *  Read on demand only — no allocation on any frame. */
  const consistWitness = {
    rigs(): Array<{
      kind: TrainKind;
      anchor: string;
      loco: { x: number; y: number; z: number };
      wagons: Array<{
        preset: WagonPreset | null;
        x: number;
        y: number;
        z: number;
        crateAttached: boolean;
        crateVisible: boolean;
      }>;
    }> {
      return [...rigs.values(), ...spares].map((rig) => ({
        kind: rig.kind,
        anchor: rig.anchor,
        loco: {
          x: rig.model.position.x,
          y: rig.model.position.y,
          z: rig.model.position.z,
        },
        wagons: rig.wagons.map((wagon) => {
          const crate = wagon.getObjectByName('cargo_crate');
          return {
            preset: wagonOutfitOf.get(wagon) ?? null,
            x: wagon.position.x,
            y: wagon.position.y,
            z: wagon.position.z,
            crateAttached: crate !== undefined,
            crateVisible: crate?.visible === true,
          };
        }),
      }));
    },
  };

  if (import.meta.env.DEV) {
    (window as unknown as { __tinyTracksLivery?: typeof liveryWitness }).__tinyTracksLivery =
      liveryWitness;
    (window as unknown as { __tinyTracksConsist?: typeof consistWitness }).__tinyTracksConsist =
      consistWitness;
  }

  return {
    sync: syncRigs,
    parkedSpot,
    setEmitting(riding) {
      for (const rig of rigs.values()) rig.puffs.setEmitting(riding);
    },
    update(dt: number): void {
      tickStickers(dt); // transform-only; no new objects on any frame
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
        // Livery reward: a short scale pulse on the painted train. The wave
        // starts and ends at the settled scale; reduced motion never starts
        // one, so the final state simply lands with no animation.
        if (rig.bounceT > 0) {
          rig.bounceT = Math.max(0, rig.bounceT - dt);
          const phase = 1 - rig.bounceT / BOUNCE_SECONDS;
          rig.model.scale.setScalar(rig.baseScale + Math.sin(phase * Math.PI) * BOUNCE_SCALE);
        }
      }
      // A station stop above may have begun a hand-off; advance it on this
      // same frame. One active transfer, one tick — no per-rig arc bookkeeping.
      cargo.tickTransfer(dt);
      // Hand the riding trains' spots to the crossing gates as one view.
      crossingTrainView.length = crossingTrainCount;
      for (let i = 0; i < crossingTrainCount; i++) {
        crossingTrainView[i] = crossingTrainPool[i] as { x: number; z: number };
      }
      lastSteamPuffCount = visibleSteamPuffs;
    },
    steamPuffCount: () => lastSteamPuffCount,
    crossingSpots: () => crossingTrainView,
    primary,
    rigFor: (anchor) => rigs.get(anchor) ?? null,
    ridingCount: () => rigs.size,
    wagonCount: () =>
      [...rigs.values(), ...spares].reduce((count, rig) => count + rig.wagons.length, 0),
    nearest: () => nearestRig(rigs.values()) ?? nearestRig(spares),
    inTunnel: (rig) => tunnelRigs.has(rig),
    liveryWitness: () => liveryWitness,
    dispose(): void {
      disposed = true;
      unsubscribeTrain();
      unsubscribeLivery();
      liveryAudio.dispose();
      if (import.meta.env.DEV) {
        delete (window as unknown as { __tinyTracksLivery?: typeof liveryWitness })
          .__tinyTracksLivery;
        delete (window as unknown as { __tinyTracksConsist?: typeof consistWitness })
          .__tinyTracksConsist;
      }
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
      disposeStickerTextures();
    },
  };
}
