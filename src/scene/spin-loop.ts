import type { Camera, Object3D, Scene, WebGLRenderer } from 'three';

export function startSpinLoop(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  getTarget: () => Object3D,
): () => void {
  // Product guideline: gentle motion — respect the OS reduced-motion setting
  // by rendering a single static frame instead of animating.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    renderer.render(scene, camera);
    return () => undefined;
  }

  let rafId = 0;
  let tickCount = 0;
  let running = true;
  const tick = () => {
    if (!running) return;
    tickCount += 1;
    const target = getTarget();
    target.rotation.y = tickCount * 0.01;
    target.rotation.x = Math.sin(tickCount * 0.005) * 0.15;
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
  return () => {
    running = false;
    cancelAnimationFrame(rafId);
  };
}
