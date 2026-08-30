import {
  type Camera,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  type Scene as ThreeScene,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three';

/**
 * Renders the scene at a fraction of the canvas drawing buffer, then blits
 * the result to fill it. The canvas buffer itself never resizes after boot:
 * resizing a WebGL drawing buffer mid-run permanently freezes frame
 * presentation in some compositors (observed in headless Chromium), so the
 * guardrails' render-scale trims happen in an offscreen target instead — a
 * plain textured-quad copy, no post-processing.
 */
export interface RenderScale {
  /**
   * Draw one frame. `scale` 1 renders straight to the canvas (identical to a
   * direct render); below 1 renders into an offscreen target of
   * scale × buffer size and blits it up.
   */
  render(scene: ThreeScene, camera: Camera, scale: number): void;
  dispose(): void;
}

export function createRenderScale(renderer: WebGLRenderer): RenderScale {
  const target = new WebGLRenderTarget(1, 1);
  const blitScene = new Scene();
  const blitCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const blitMaterial = new MeshBasicMaterial({ map: target.texture });
  const quad = new Mesh(new PlaneGeometry(2, 2), blitMaterial);
  quad.frustumCulled = false;
  blitScene.add(quad);

  return {
    render(scene, camera, scale) {
      if (scale >= 1) {
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
        return;
      }
      const canvas = renderer.domElement;
      const width = Math.max(1, Math.floor(canvas.width * scale));
      const height = Math.max(1, Math.floor(canvas.height * scale));
      if (target.width !== width || target.height !== height) target.setSize(width, height);
      // The scene pass renders linear into the target — three applies tone
      // mapping and the sRGB output transform only on the screen pass, which
      // is the blit. Aspect matches the buffer, so the camera is untouched.
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(blitScene, blitCamera);
    },
    dispose() {
      target.dispose();
      quad.geometry.dispose();
      blitMaterial.dispose();
    },
  };
}
