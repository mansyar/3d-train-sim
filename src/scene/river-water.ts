import type { Scene } from 'three';
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
} from 'three';
import { riverDepth, riverWaterCells } from '../core/river';
import type { SkyColors } from '../core/sky-palette';
import { MEADOW_CELLS } from '../core/track-graph';
import { waterColorAt } from '../core/water-palette';
import { FROZEN_SNOW } from './duck';
import { GROUND_SIZE } from './ground';

/**
 * The river's surface: one merged toy-flat mesh spanning the water cells,
 * sitting a whisper above the play mat so it reads as water *in* the meadow
 * rather than a hole through it.
 *
 * Purely visual — the color math is the pure `water-palette` (sky mirror +
 * snow pale + shore gradient), baked into per-vertex colors so the band
 * shades shallow near the banks and deep along its spine. A soft procedural
 * ripple texture drifts downstream (with the duck's drift direction) and
 * vanishes when the river ices over. No per-frame allocation: the frame path
 * rewrites the color array in place and nudges one texture offset. A
 * reduced-motion static frame is static for the river too.
 */

/** The surface lift above the play mat (the mat itself sits at y = 0). */
export const SURFACE_LIFT = 0.02;

/** World units between ripple crests — one per cell, bands flow downstream. */
const RIPPLE_PERIOD = GROUND_SIZE / MEADOW_CELLS;
/** Downstream drift speed in world units per second (the duck's pace). */
const FLOW_SPEED = (GROUND_SIZE / MEADOW_CELLS) * 0.35;
/** Ripple shadow depth: how far below white the troughs dip (8-bit scale). */
const RIPPLE_AMPLITUDE = 14;

export interface RiverWater {
  /**
   * Recolor the surface for this sky gradient and settled-snow amount, and
   * drift the ripples by `dt` seconds. `dt = 0` holds the frame perfectly
   * still (reduced motion, the one-time paint).
   */
  update(sky: SkyColors, snow: number, dt: number): void;
  dispose(): void;
}

/**
 * The ripple texture: one soft sinusoidal band per tile, generated once.
 */
function createRippleTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    for (let y = 0; y < canvas.height; y += 1) {
      // One crest per tile: white highs, gently shadowed troughs.
      const phase = (y / canvas.height) * Math.PI * 2;
      const trough = 0.5 - 0.5 * Math.cos(phase); // 0 at crest, 1 at trough
      const value = Math.round(255 - RIPPLE_AMPLITUDE * trough);
      ctx.fillStyle = `rgb(${value},${value},${value})`;
      ctx.fillRect(0, y, canvas.width, 1);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
}

export function createRiverWater(scene: Scene): RiverWater {
  const cellSize = GROUND_SIZE / MEADOW_CELLS;
  const half = GROUND_SIZE / 2;

  // One quad per water cell, merged into a single geometry — the band reads
  // as one continuous river while staying cell-aligned with the meadow grid.
  const cells = riverWaterCells();
  const positions = new Float32Array(cells.length * 4 * 3);
  const normals = new Float32Array(cells.length * 4 * 3);
  const colors = new Float32Array(cells.length * 4 * 3);
  const uvs = new Float32Array(cells.length * 4 * 2);
  const indices = new Uint16Array(cells.length * 6);
  // Depth per VERTEX, not per cell: each grid corner averages the cells
  // sharing it, so bilinear interpolation across each quad shades a smooth
  // shallow-to-deep gradient instead of a checkerboard of flat cells. The
  // corner average peaks at 0.5 (a spine corner touches two spine cells),
  // hence the ×2 back to the palette's full 0..1 depth range.
  const cornerDepth = (gx: number, gy: number): number => {
    let sum = 0;
    for (const [dx, dy] of [
      [-1, -1],
      [0, -1],
      [-1, 0],
      [0, 0],
    ] as const) {
      sum += riverDepth({ x: gx + dx, y: gy + dy });
    }
    return Math.min(1, (sum / 4) * 2);
  };
  const vertexDepths = new Float32Array(cells.length * 4);
  for (const [i, cell] of cells.entries()) {
    vertexDepths.set(
      [
        cornerDepth(cell.x, cell.y),
        cornerDepth(cell.x + 1, cell.y),
        cornerDepth(cell.x + 1, cell.y + 1),
        cornerDepth(cell.x, cell.y + 1),
      ],
      i * 4,
    );
  }
  for (const [i, cell] of cells.entries()) {
    const x0 = -half + cell.x * cellSize;
    const z0 = -half + cell.y * cellSize;
    const x1 = x0 + cellSize;
    const z1 = z0 + cellSize;
    const y = SURFACE_LIFT;
    positions.set([x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1], i * 12);
    normals.set([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], i * 12);
    // UVs run in world units over the ripple period, so the bands line up
    // across cell seams; scrolling offset.y drifts them downstream (+z).
    uvs.set(
      [
        x0 / RIPPLE_PERIOD,
        z0 / RIPPLE_PERIOD,
        x1 / RIPPLE_PERIOD,
        z0 / RIPPLE_PERIOD,
        x1 / RIPPLE_PERIOD,
        z1 / RIPPLE_PERIOD,
        x0 / RIPPLE_PERIOD,
        z1 / RIPPLE_PERIOD,
      ],
      i * 8,
    );
    const vertex = i * 4;
    // Winding matters: with the default FrontSide culling, (0,1,2)/(0,2,3)
    // would face *down* (normal (0,−s²,0)) and be culled from the overview
    // camera — reversed here so the surface faces up.
    indices.set([vertex, vertex + 2, vertex + 1, vertex, vertex + 3, vertex + 2], i * 6);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  const colorAttribute = new BufferAttribute(colors, 3);
  geometry.setAttribute('color', colorAttribute);
  geometry.setIndex(new BufferAttribute(indices, 1));

  const ripple = createRippleTexture();
  const material = new MeshStandardMaterial({
    color: 0xffffff, // The palette lives in the vertex colors — see below.
    vertexColors: true,
    map: ripple,
  });
  const water = new Mesh(geometry, material);
  water.receiveShadow = true; // Cloud shadows drift across the water like on grass.
  scene.add(water);

  const deepSky = { top: 0x87c5fb, horizon: 0xe8f6ff };

  /**
   * Geometry color attributes are consumed in the working (linear) space,
   * unlike `material.color.setHex` which converts hex from sRGB. Apply the
   * same conversion here, or the band renders pale-washed.
   */
  const sRGBToLinear = (c: number): number =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

  /** Paint every vertex for this sky/snow — in place, no allocation. */
  function repaint(sky: SkyColors, snow: number): void {
    for (const [i, depth] of vertexDepths.entries()) {
      const hex = waterColorAt(sky, snow, depth);
      const o = i * 3;
      colors[o] = sRGBToLinear(((hex >> 16) & 0xff) / 255);
      colors[o + 1] = sRGBToLinear(((hex >> 8) & 0xff) / 255);
      colors[o + 2] = sRGBToLinear((hex & 0xff) / 255);
    }
    colorAttribute.needsUpdate = true;
  }

  /** Whether the ice has the ripples stood down (shader swap, not per frame). */
  let iced = false;

  repaint(deepSky, 0); // The one-time paint before the first ambience frame.

  return {
    update(sky, snow, dt) {
      repaint(sky, snow);
      const frozen = snow >= FROZEN_SNOW; // The shared frozen gate (duck + babble).
      if (frozen !== iced) {
        iced = frozen;
        material.map = frozen ? null : ripple;
        material.needsUpdate = true; // Map toggles swap the shader program.
      }
      if (!frozen && dt > 0) {
        // Decreasing offset moves each crest toward +z — downstream, the
        // direction the duck drifts. Allocation-free.
        ripple.offset.y -= (FLOW_SPEED * dt) / RIPPLE_PERIOD;
      }
    },
    dispose() {
      scene.remove(water);
      geometry.dispose();
      material.dispose();
      ripple.dispose();
    },
  };
}
