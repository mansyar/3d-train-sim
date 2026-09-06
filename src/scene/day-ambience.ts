import type { AmbienceAudio } from '../audio/ambience-audio';
import type { RiverBabble } from '../audio/river-babble';
import { createDayClock } from '../core/day-clock';
import { riverProximity } from '../core/river';
import {
  type Celestial,
  celestialAt,
  nightFactorAt,
  type SkyColors,
  skyColorsAt,
} from '../core/sky-palette';
import { type Cell, MEADOW_CELLS, neighbourOf } from '../core/track-graph';
import { type PortalGlow, portalGlowAt, tunnelRunsOf } from '../core/tunnels';
import {
  createWeatherClock,
  intensityOf,
  lerpIntensity,
  type WeatherIntensity,
} from '../core/weather-cycle';
import { FROZEN_SNOW } from './duck';
import { createFireflies } from './fireflies';
import { GROUND_SIZE, type Ground } from './ground';
import type { Headlight } from './headlight';
import { createPortalGlow } from './portal-glow';
import { createRiverWater } from './river-water';
import type { SceneContext } from './scene-context';
import { createSkyDome } from './sky-dome';
import { createWeatherParticles } from './weather-particles';
import { disposeWindowGlows, setGlowNight } from './window-glow';

/** Portal glow reach in cell units — the mouth flares as the engine nears. */
const PORTAL_GLOW_RADIUS = 2.5;

/**
 * Time of day + weather: pure clocks (driven per animation frame) recolor
 * the sky, ease the lights, drive particles and whiten the meadow. Painted
 * once up front so the reduced-motion static frame still shows a lit
 * mid-morning meadow (frozen ambience under reduced motion).
 */
export interface DayAmbience {
  /** Advance the pure clocks by one frame (frame loop only). */
  tick(): void;
  /** Repaint sky/lights/weather/water from the current clock state. */
  paint(dt?: number): void;
  /** 0..1 night factor at the current day fraction (gates, critters, duck). */
  nightFactor(): number;
  /** The lerped live weather bed — read-only for the river life's mood. */
  weather(): WeatherIntensity;
  /** Recompute + repaint the primary train's portal glow (night-aware). */
  updatePortalGlow(star: { x: number; z: number } | null): void;
  dispose(): void;
}

export interface DayAmbienceOptions {
  context: SceneContext;
  /** One night beam per little train — parked spares included (fleet-owned). */
  headlights: Headlight[];
  /** Rain patter + wind bed (created by the assembler; visibility-aware). */
  ambience: AmbienceAudio;
  /** River babble (created by the assembler; visibility-aware). */
  babble: RiverBabble;
  /** The meadow surface — its snow gate whitens with the weather bed. */
  ground: Ground;
}

export function createDayAmbience({
  context,
  headlights,
  ambience,
  babble,
  ground,
}: DayAmbienceOptions): DayAmbience {
  const { world, camera, tracks, lights, qualityApplier } = context;
  const dayClock = createDayClock({ now: () => performance.now() });
  const weatherClock = createWeatherClock({ now: () => performance.now() });
  const sky = createSkyDome(context.scene);
  const water = createRiverWater(context.scene);
  const weather = createWeatherParticles(context.scene);
  const fireflies = createFireflies(context.scene);
  /** The portals catching the night beams (one shared warm light). */
  const portalGlowVisual = createPortalGlow(context.scene);
  /** Open portal mouths in flat [x, z, ...] cell units — rebuilt on edits. */
  const openPortals: number[] = [];
  /** Scratch for the per-frame proximity lookup (zero-alloc frame path). */
  const portalGlow: PortalGlow = { x: 0, z: 0, intensity: 0 };
  const rebuildPortalCache = (): void => {
    openPortals.length = 0;
    const byId = new Map(world.pieces().map((p) => [p.id, p] as const));
    for (const run of tunnelRunsOf(world.pieces())) {
      const piece = byId.get(run.pieceId);
      if (!piece) continue;
      for (const edge of run.openPortals) {
        const n = neighbourOf(piece.cell, edge);
        openPortals.push((piece.cell.x + n.x) / 2, (piece.cell.y + n.y) / 2);
      }
    }
  };
  rebuildPortalCache();
  const unsubscribePortals = world.subscribe(rebuildPortalCache);
  // Scratch objects for the frame path — the palette/intensity calls write
  // into these instead of allocating (spec NFR: no per-frame allocation).
  const skyColors: SkyColors = { top: 0, horizon: 0 };
  const celestial: Celestial = { sun: 0, moon: 0 };
  const intensity: WeatherIntensity = { rain: 0, snow: 0, cloud: 0 };
  /** Quality-scaled copy of the weather bed fed to the particle emitter. */
  const scaledWeather: WeatherIntensity = { rain: 0, snow: 0, cloud: 0 };
  /** Scratch cell for the river-proximity lookup (zero-alloc frame path). */
  const proximityCell: Cell = { x: 0, y: 0 };
  /** World units per meadow cell — matches the track renderer's grid. */
  const cellSize = GROUND_SIZE / MEADOW_CELLS;

  const tick = (): void => {
    dayClock.tick();
    weatherClock.tick();
  };

  const paint = (dt = 0.016): void => {
    const fraction = dayClock.fraction;
    sky.update(fraction, skyColorsAt(fraction, skyColors), celestialAt(fraction, celestial));
    const night = nightFactorAt(fraction);
    lights.update(night);
    setGlowNight(night);
    for (const light of headlights) light.update(night);
    // Weather intensity lerps across any active cross-fade.
    const blend = weatherClock.blend;
    const base = blend
      ? lerpIntensity(intensityOf(blend.from), intensityOf(blend.to), blend.t, intensity)
      : intensityOf(weatherClock.weather);
    // The guardrail's L2 halves the particle bed; the emitter's opacity
    // easing makes the trim fade in, and snow accumulation stays full.
    const weatherScale = qualityApplier.weatherScale;
    scaledWeather.rain = base.rain * weatherScale;
    scaledWeather.snow = base.snow * weatherScale;
    scaledWeather.cloud = base.cloud * weatherScale;
    weather.update(dt, scaledWeather);
    ground.setSnow(base.snow);
    tracks.setTunnelSnow(base.snow >= FROZEN_SNOW); // The hill wears winter, like the river.
    tracks.setHillSnow(base.snow >= FROZEN_SNOW); // The hill run's crowns share the gate.
    tracks.setCrossingSnow(base.snow >= FROZEN_SNOW); // The crossing wears winter too.
    tracks.setDelightSnow(base.snow >= FROZEN_SNOW); // The delight toys join winter.
    water.update(skyColors, base.snow, dt); // The river mirrors the sky and ices over.
    ambience.update(base); // Rain patter + wind follow the weather bed.
    // River babble whispers near the water; a frozen river stands the babble
    // down with the duck (same snow gate).
    proximityCell.x = Math.floor((camera.position.x + GROUND_SIZE / 2) / cellSize);
    proximityCell.y = Math.floor((camera.position.z + GROUND_SIZE / 2) / cellSize);
    babble.update(base.snow >= FROZEN_SNOW ? 0 : riverProximity(proximityCell));
    fireflies.update(dt, night, base.rain); // Fireflies own the dry night.
  };

  return {
    tick,
    paint,
    nightFactor: () => nightFactorAt(dayClock.fraction),
    weather: () => {
      // Recompute the live bed on read (the pre-extraction critter path):
      // the shared `intensity` scratch is only written while a cross-fade
      // runs, so a no-blend frame must read the clock's weather directly.
      const blend = weatherClock.blend;
      return blend
        ? lerpIntensity(intensityOf(blend.from), intensityOf(blend.to), blend.t, intensity)
        : intensityOf(weatherClock.weather);
    },
    updatePortalGlow(star) {
      const night = nightFactorAt(dayClock.fraction);
      // The headlight catches the portals at night: a warm glow at the open
      // arch mouth nearest the engine, keyed to night factor and proximity.
      if (star && night > 0 && openPortals.length > 0) {
        portalGlowAt(
          openPortals,
          (star.x + GROUND_SIZE / 2) / cellSize - 0.5,
          (star.z + GROUND_SIZE / 2) / cellSize - 0.5,
          PORTAL_GLOW_RADIUS,
          portalGlow,
        );
      } else {
        portalGlow.intensity = 0;
      }
      portalGlowVisual.update(portalGlow, night);
    },
    dispose(): void {
      unsubscribePortals();
      portalGlowVisual.dispose();
      sky.dispose();
      water.dispose();
      weather.dispose();
      fireflies.dispose();
      disposeWindowGlows();
    },
  };
}
