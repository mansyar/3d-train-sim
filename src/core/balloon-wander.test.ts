import { describe, expect, it } from 'vitest';
import { type BalloonPose, type BalloonWanderer, createBalloonWanderer } from './balloon-wander';

/** Tiny deterministic PRNG so wander trajectories are reproducible in tests. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DT = 1 / 30;

function simulate(wanderer: BalloonWanderer, seconds: number): BalloonPose[] {
  const poses: BalloonPose[] = [];
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) poses.push(wanderer.step(DT));
  return poses;
}

describe('balloon wander', () => {
  it('starts landed at its base', () => {
    const wanderer = createBalloonWanderer({ rng: mulberry32(1) });
    expect(wanderer.step(DT)).toMatchObject({
      x: 0,
      z: 0,
      altitude: 0,
      flying: false,
    });
  });

  it('takes off after its rest and cruises aloft', () => {
    const wanderer = createBalloonWanderer({ rng: mulberry32(2) });
    const poses = simulate(wanderer, 30);
    const aloft = poses.filter((pose) => pose.flying && pose.altitude > 0);
    expect(aloft.length).toBeGreaterThan(0);
    for (const pose of aloft) expect(pose.altitude).toBeLessThanOrEqual(1.6);
  });

  it('keeps altitude within [0, maxHeight] through a long flight', () => {
    const wanderer = createBalloonWanderer({ rng: mulberry32(3), maxHeight: 2 });
    const poses = simulate(wanderer, 600);
    for (const pose of poses) {
      expect(pose.altitude).toBeGreaterThanOrEqual(0);
      expect(pose.altitude).toBeLessThanOrEqual(2);
    }
  });

  it('never drifts farther from its base than the wander radius', () => {
    const radius = 2.5;
    const wanderer = createBalloonWanderer({ rng: mulberry32(4), radius });
    const poses = simulate(wanderer, 600);
    for (const pose of poses) {
      expect(Math.hypot(pose.x, pose.z)).toBeLessThanOrEqual(radius + 1e-9);
    }
  });

  it('lands and takes off again, over and over', () => {
    const wanderer = createBalloonWanderer({ rng: mulberry32(5) });
    const poses = simulate(wanderer, 600);
    let takeoffs = 0;
    let landings = 0;
    for (let i = 1; i < poses.length; i++) {
      const before = poses[i - 1];
      const now = poses[i];
      if (!before || !now) continue;
      if (!before.flying && now.flying) takeoffs++;
      if (before.flying && !now.flying) landings++;
    }
    expect(takeoffs).toBeGreaterThanOrEqual(5);
    expect(landings).toBeGreaterThanOrEqual(5);
  });

  it('moves gently, never teleporting between steps', () => {
    const wanderer = createBalloonWanderer({ rng: mulberry32(6), maxHeight: 2 });
    let previous = wanderer.step(DT);
    for (let i = 0; i < 3600; i++) {
      const pose = wanderer.step(DT);
      const jump = Math.hypot(
        pose.x - previous.x,
        pose.z - previous.z,
        pose.altitude - previous.altitude,
      );
      expect(jump).toBeLessThan(0.25); // far under a cell per frame
      previous = pose;
    }
  });

  it('is deterministic for the same seeded RNG', () => {
    const a = createBalloonWanderer({ rng: mulberry32(7) });
    const b = createBalloonWanderer({ rng: mulberry32(7) });
    for (let i = 0; i < 1000; i++) {
      expect(a.step(DT)).toEqual(b.step(DT));
    }
  });
});
