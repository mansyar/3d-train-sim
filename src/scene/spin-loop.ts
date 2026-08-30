import type { Camera, Object3D, Scene, WebGLRenderer } from 'three';

/** Gentle drift (yaw) and nod (pitch) rates in radians per second. */
const SPIN_SPEED = 0.6;
const NOD_SPEED = 0.3;
const NOD_AMPLITUDE = 0.15;

export interface SpinLoop {
  /** Stop the loop permanently (teardown). */
  stop(): void;
  /** Pause rendering — e.g. the tab went hidden. No-op while stopped. */
  suspend(): void;
  /** Resume rendering with a fresh frame. No-op unless suspended. */
  resume(): void;
}

export function startSpinLoop(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  /** Spun while it exists — null pauses the showcase spin (ride motion owns the model). */
  getTarget: () => Object3D | null,
  /** Extra per-frame animation (e.g. ride motion). Runs after the spin, same frame. */
  onFrame?: (dt: number) => void,
): SpinLoop {
  // Product guideline: gentle motion — respect the OS reduced-motion setting
  // by rendering a single static frame instead of animating.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    renderer.render(scene, camera);
    return { stop: () => undefined, suspend: () => undefined, resume: () => undefined };
  }

  let rafId = 0;
  let lastMs = performance.now();
  let running = true;
  /** Hidden tab: render loop stopped, resumed with a fresh frame on return. */
  let paused = false;
  const tick = () => {
    if (!running) return;
    if (paused) return; // RAF may still fire once after cancel — stay dark.
    const now = performance.now();
    // Clamp dt so a background-tab pause doesn't produce a huge jump.
    const dt = Math.min((now - lastMs) / 1000, 0.1);
    lastMs = now;
    const target = getTarget();
    if (target) {
      target.rotation.y += SPIN_SPEED * dt;
      target.rotation.x = Math.sin((now / 1000) * NOD_SPEED) * NOD_AMPLITUDE;
    }
    onFrame?.(dt);
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);
  return {
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
    },
    suspend() {
      if (!running) return;
      paused = true;
      cancelAnimationFrame(rafId);
    },
    resume() {
      if (!running || !paused) return;
      paused = false;
      lastMs = performance.now(); // Fresh dt — no time-travel jump.
      rafId = requestAnimationFrame(tick);
    },
  };
}
