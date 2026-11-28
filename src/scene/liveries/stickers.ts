/**
 * Sticker decals: four camera-facing sprites per vehicle, one per side anchor.
 * Every sprite (and its material) is made once when a rig arrives; syncing a
 * livery only swaps a material's map and flips visibility, and the pop tick
 * only writes a sprite's scale. No geometry, downloads, or per-frame objects.
 */

import type { Object3D, Texture } from 'three';
import { Box3, CanvasTexture, Sprite, SpriteMaterial, Vector3 } from 'three';
import {
  MAX_STICKERS,
  STICKER_ANCHORS,
  type StickerAnchor,
  type StickerId,
} from '../../state/liveries';

/** Seconds of the one-shot pop when the oldest sticker is pushed off. */
const POP_SECONDS = 0.26;
/** Peak extra scale at the middle of the pop (a small, wordless birthday wink). */
const POP_GROWTH = 0.28;
/** Sprite size relative to the smallest local body dimension. */
const SPRITE_SIZE = 0.42;

const STICKER_COLORS: Record<StickerId, string> = {
  star: '#ffd34f',
  heart: '#ff7189',
  flower: '#ffb4dc',
  bolt: '#8de6ff',
};

/** One texture per shape, shared by every vehicle and drawn on first use. */
const textures = new Map<StickerId, Texture>();
/** Every live binding — the tick walks this, never the scene graph. */
const bindings = new Set<StickerBinding>();

/** DEV/e2e read of one vehicle's visible stickers and animation witnesses. */
export interface StickerWitness {
  visible: StickerId[];
  anchors: StickerAnchor[];
  stamps: number;
  pops: number;
  animations: number;
  frames: number;
}

export interface StickerBinding {
  readonly sprites: Sprite[];
  readonly anchors: readonly StickerAnchor[];
  readonly visible: StickerId[];
  /** The sprite behind the newest sticker, or -1 when none is visible. */
  newest: number;
  stamps: number;
  pops: number;
  animations: number;
  frames: number;
  reducedMotion: boolean;
  popT: number;
  baseScale: number;
}

function traceShape(ctx: CanvasRenderingContext2D, id: StickerId): void {
  switch (id) {
    case 'star': {
      for (let i = 0; i < 10; i += 1) {
        const radius = i % 2 === 0 ? 26 : 11;
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        const x = 32 + Math.cos(angle) * radius;
        const y = 32 + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      break;
    }
    case 'heart': {
      ctx.moveTo(32, 54);
      ctx.bezierCurveTo(6, 36, 8, 14, 24, 14);
      ctx.bezierCurveTo(30, 14, 32, 18, 32, 22);
      ctx.bezierCurveTo(32, 18, 34, 14, 40, 14);
      ctx.bezierCurveTo(56, 14, 58, 36, 32, 54);
      break;
    }
    case 'flower': {
      for (let i = 0; i < 6; i += 1) {
        const angle = (i * Math.PI) / 3;
        ctx.moveTo(32 + Math.cos(angle) * 18 + 9, 32 + Math.sin(angle) * 18);
        ctx.arc(32 + Math.cos(angle) * 18, 32 + Math.sin(angle) * 18, 9, 0, Math.PI * 2);
      }
      break;
    }
    case 'bolt': {
      ctx.moveTo(36, 6);
      ctx.lineTo(15, 35);
      ctx.lineTo(29, 35);
      ctx.lineTo(24, 58);
      ctx.lineTo(49, 27);
      ctx.lineTo(34, 27);
      break;
    }
  }
}

function textureFor(id: StickerId): Texture {
  const existing = textures.get(id);
  if (existing) return existing;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#5a3218';
    ctx.fillStyle = STICKER_COLORS[id];
    ctx.beginPath();
    traceShape(ctx, id);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  const texture = new CanvasTexture(canvas);
  textures.set(id, texture);
  return texture;
}

/**
 * Preallocate the four anchor sprites on one vehicle. Positions are taken
 * from the body's local bounds so decals sit just off each side, front and
 * rear; Sprite billboards toward the camera without any frame rotation.
 */
export function attachStickers(model: Object3D, reducedMotion: boolean): StickerBinding {
  const sprites: Sprite[] = [];
  const baseScale = 0.5;
  for (const _anchor of STICKER_ANCHORS) {
    const material = new SpriteMaterial({
      map: textureFor('star'),
      transparent: true,
      depthWrite: false,
    });
    const sprite = new Sprite(material);
    sprite.visible = false;
    sprite.scale.setScalar(baseScale);
    model.add(sprite);
    sprites.push(sprite);
  }

  // One measure at attach time — never on a tick. Box3 is world-space and the
  // models arrive uniformly scaled, so divide back into the model's own units.
  const box = new Box3().setFromObject(model);
  const size = box.getSize(new Vector3());
  const sx = model.scale.x || 1;
  const sy = model.scale.y || 1;
  const sz = model.scale.z || 1;
  const halfWidth = (size.x / sx) * 0.5;
  const halfHeight = (size.y / sy) * 0.5;
  const halfLength = (size.z / sz) * 0.5;
  const side = halfWidth + 0.04;
  const along = halfLength * 0.5;
  const height = halfHeight * 0.85;
  const extent = Math.min(halfWidth, halfHeight, halfLength) * SPRITE_SIZE;
  const scale = extent > 0 ? extent : baseScale;
  for (const [index, sprite] of sprites.entries()) {
    const anchor = STICKER_ANCHORS[index];
    const left = anchor === 'left-front' || anchor === 'left-rear';
    const front = anchor === 'left-front' || anchor === 'right-front';
    sprite.position.set(left ? -side : side, height, front ? along : -along);
    sprite.scale.setScalar(scale);
  }

  const binding: StickerBinding = {
    sprites,
    anchors: STICKER_ANCHORS,
    visible: [],
    newest: -1,
    stamps: 0,
    pops: 0,
    animations: 0,
    frames: 0,
    reducedMotion,
    popT: 0,
    baseScale: scale,
  };
  bindings.add(binding);
  return binding;
}

/**
 * Mirror the store's oldest-first sticker list onto the preallocated sprites.
 * `count` is false while dressing a fresh rig so boot/hydration is not scored
 * as a child's stamp. Returns true when the cap pushed the oldest off.
 */
export function syncStickers(
  binding: StickerBinding,
  ids: readonly StickerId[],
  count = true,
): boolean {
  const previous = binding.visible;
  const beforeLength = previous.length;
  const evicted =
    beforeLength >= MAX_STICKERS &&
    ids.length >= MAX_STICKERS &&
    ids.length > 0 &&
    previous[0] !== ids[0];
  const changed = ids.length !== beforeLength || ids.some((id, index) => id !== previous[index]);

  previous.length = 0;
  for (let i = 0; i < MAX_STICKERS; i += 1) {
    const sprite = binding.sprites[i];
    if (!sprite) break;
    const id = ids[i];
    if (!id) {
      sprite.visible = false;
      continue;
    }
    const material = sprite.material as SpriteMaterial;
    const map = textureFor(id);
    if (material.map !== map) {
      material.map = map;
      material.needsUpdate = true;
    }
    sprite.visible = true;
    sprite.scale.setScalar(binding.baseScale);
    previous.push(id);
  }
  binding.newest = previous.length - 1;

  if (changed && count && ids.length >= beforeLength) binding.stamps += 1;
  if (evicted) binding.pops += 1;
  return evicted;
}

/** Begin the single eviction pop; reduced motion lands in place instead. */
export function popSticker(binding: StickerBinding): void {
  if (binding.reducedMotion || binding.newest < 0) return;
  binding.popT = POP_SECONDS;
  binding.animations += 1;
}

/** Transform-only pop advance. No writes to materials, no object creation. */
export function tickStickers(dt: number): void {
  for (const binding of bindings) {
    if (binding.popT <= 0) continue;
    binding.popT = Math.max(0, binding.popT - dt);
    const sprite = binding.sprites[binding.newest];
    if (!sprite) continue;
    const phase = 1 - binding.popT / POP_SECONDS;
    sprite.scale.setScalar(binding.baseScale * (1 + Math.sin(phase * Math.PI) * POP_GROWTH));
    binding.frames += 1;
  }
}

export function stickerWitness(binding: StickerBinding): StickerWitness {
  return {
    visible: [...binding.visible],
    anchors: binding.anchors.slice(0, binding.visible.length),
    stamps: binding.stamps,
    pops: binding.pops,
    animations: binding.animations,
    frames: binding.frames,
  };
}

/** Detach and release one vehicle's sprites; shared textures stay for reuse. */
export function disposeStickerBinding(binding: StickerBinding): void {
  bindings.delete(binding);
  for (const sprite of binding.sprites) {
    sprite.removeFromParent();
    (sprite.material as SpriteMaterial).dispose();
  }
}

/** Scene teardown: release the four shared canvases/textures. */
export function disposeStickerTextures(): void {
  for (const texture of textures.values()) texture.dispose();
  textures.clear();
}
