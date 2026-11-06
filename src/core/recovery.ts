/**
 * Recovery notice — the parent-facing line about a save that a boot salvaged
 * or restored. Kept pure so it can be unit-tested without storage or a DOM;
 * the parent gate is what actually shows the text.
 */

/** Mirrors the loader's status union without importing from `src/state`. */
export type RecoveryStatus = 'clean' | 'salvaged' | 'restored' | 'fresh';

/**
 * Returns the one-line grown-up notice for a boot, or `null` when there is
 * nothing a parent needs to read: a clean load, a fresh meadow, or a salvage
 * that somehow dropped nothing. Broken toys, scenery, and duplicates all count
 * as skipped toys.
 */
export function recoveryNotice(
  status: RecoveryStatus,
  droppedPieces: number,
  droppedScenery: number,
  droppedDuplicates = 0,
): string | null {
  const dropped = droppedPieces + droppedScenery + droppedDuplicates;

  if (status === 'restored') {
    // The backup can itself have been a salvage, so skipped toys still count.
    if (dropped <= 0) return 'Your meadow was restored from the last good save.';
    const skipped = dropped === 1 ? '1 broken toy was' : `${dropped} broken toys were`;
    return `Your meadow was restored from the last good save, and ${skipped} skipped.`;
  }
  if (status !== 'salvaged') return null;

  if (dropped <= 0) return null;

  const toy = dropped === 1 ? 'toy' : 'toys';
  return `We saved your meadow and skipped ${dropped} broken ${toy}.`;
}
