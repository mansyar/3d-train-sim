/** World grid resolution in world units. Track pieces snap to this lattice. */
export const GRID_SIZE = 1;

/**
 * Snap a scalar coordinate to the nearest multiple of `size`.
 * Pure and total for all finite inputs; the primitive of all track snapping.
 */
export function snapToGrid(value: number, size: number = GRID_SIZE): number {
  const snapped = Math.round(value / size) * size;
  // Canonicalize IEEE-754 negative zero so persisted coordinates stay uniform.
  return snapped === 0 ? 0 : snapped;
}
