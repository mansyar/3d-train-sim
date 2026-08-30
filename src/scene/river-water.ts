import type { Scene } from 'three';
import { BufferAttribute, BufferGeometry, Mesh, MeshStandardMaterial } from 'three';
import { riverWaterCells } from '../core/river';
import type { SkyColors } from '../core/sky-palette';
import { MEADOW_CELLS } from '../core/track-graph';
import { waterColorAt } from '../core/water-palette';
import { GROUND_SIZE } from './ground';

/**
 * The river's surface: one merged toy-flat mesh spanning the water cells,
 * sitting a whisper above the play mat so it reads as water *in* the meadow
 * rather than a hole through it.
 *
 * Purely visual — the color math is the pure `water-palette` (sky mirror +
 * snow pale). No waves, no animation of its own: the only motion is the
 * day-cycle recolor the shared ambience paint drives, so a reduced-motion
 * static frame is static for the river too. The frame path writes one
 * uniform-style color — no allocation.
 */

/** The surface lift above the play mat (the mat itself sits at y = 0). */
const SURFACE_LIFT = 0.02;

export interface RiverWater {
  /** Recolor the surface for this sky gradient and settled-snow amount. */
  update(sky: SkyColors, snow: number): void;
  dispose(): void;
}

export function createRiverWater(scene: Scene): RiverWater {
  const cellSize = GROUND_SIZE / MEADOW_CELLS;
  const half = GROUND_SIZE / 2;

  // One quad per water cell, merged into a single geometry — the band reads
  // as one continuous river while staying cell-aligned with the meadow grid.
  const cells = riverWaterCells();
  const positions = new Float32Array(cells.length * 4 * 3);
  const normals = new Float32Array(cells.length * 4 * 3);
  const indices = new Uint16Array(cells.length * 6);
  for (const [i, cell] of cells.entries()) {
    const x0 = -half + cell.x * cellSize;
    const z0 = -half + cell.y * cellSize;
    const x1 = x0 + cellSize;
    const z1 = z0 + cellSize;
    const y = SURFACE_LIFT;
    positions.set([x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1], i * 12);
    normals.set([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], i * 12);
    const vertex = i * 4;
    // Winding matters: with the default FrontSide culling, (0,1,2)/(0,2,3)
    // would face *down* (normal (0,−s²,0)) and be culled from the overview
    // camera — reversed here so the surface faces up.
    indices.set([vertex, vertex + 2, vertex + 1, vertex, vertex + 3, vertex + 2], i * 6);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));

  const material = new MeshStandardMaterial({
    color: waterColorAt({ top: 0x87c5fb, horizon: 0xe8f6ff }, 0),
  });
  const water = new Mesh(geometry, material);
  water.receiveShadow = true; // Cloud shadows drift across the water like on grass.
  scene.add(water);

  return {
    update(sky, snow) {
      material.color.setHex(waterColorAt(sky, snow));
    },
    dispose() {
      scene.remove(water);
      geometry.dispose();
      material.dispose();
    },
  };
}
