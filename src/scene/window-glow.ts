import type { Object3D, Texture } from 'three';
import { AdditiveBlending, Box3, CanvasTexture, Sprite, SpriteMaterial, Vector3 } from 'three';
import type { SceneryKind } from '../core/scenery';

/** Building kinds whose windows light up at night. */
const GLOW_KINDS: readonly SceneryKind[] = ['house', 'cottage', 'station'];

/** Every glow material ever attached — templates share it with their clones,
 *  so one write per frame drives every placed building. */
const glowMaterials = new Set<SpriteMaterial>();

/** The warm window light, at full strength under a nightFactor of 1. */
const MAX_OPACITY = 0.85;

let texture: Texture | null = null;

/** Radial warm glow texture, drawn once and shared by every sprite. */
function glowTexture(): Texture {
  if (texture) return texture;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 214, 140, 0.95)');
    gradient.addColorStop(0.5, 'rgba(255, 190, 110, 0.45)');
    gradient.addColorStop(1, 'rgba(255, 180, 100, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  }
  texture = new CanvasTexture(canvas);
  return texture;
}

/**
 * Attach a warm "windows lit" glow to a building template. The sprite rides
 * the template's front face (it rotates with placements) so it reads as a
 * lit window from the street side and hides honestly behind the walls
 * otherwise. Clones share the material — no per-placement cost.
 */
export function attachWindowGlow(model: Object3D, kind: SceneryKind): void {
  if (!GLOW_KINDS.includes(kind)) return;
  const box = new Box3().setFromObject(model);
  const size = box.getSize(new Vector3());
  const material = new SpriteMaterial({
    map: glowTexture(),
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending, // Glows brighten, never occlude.
    depthWrite: false,
  });
  const sprite = new Sprite(material);
  const height = Math.max(size.y, 0.001);
  const depth = Math.max(size.z, 0.001);
  sprite.position.set(0, height * 0.55, depth * 0.51);
  sprite.scale.setScalar(Math.min(size.x, height) * 0.9);
  model.add(sprite);
  glowMaterials.add(material);
}

/** Drive every glow's brightness from the night factor (0 day → 1 night). */
export function setGlowNight(nightFactor: number): void {
  const opacity = nightFactor * MAX_OPACITY;
  for (const material of glowMaterials) material.opacity = opacity;
}

/** Release the shared texture (call from scene teardown). */
export function disposeWindowGlows(): void {
  texture?.dispose();
  texture = null;
  glowMaterials.clear();
}
