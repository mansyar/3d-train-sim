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
 * that somehow dropped nothing.
 */
export function recoveryNotice(
  status: RecoveryStatus,
  droppedPieces: number,
  droppedScenery: number,
): string | null {
  if (status === 'restored') {
    return 'Your meadow was restored from the last good save.';
  }
  if (status !== 'salvaged') return null;

  const dropped = droppedPieces + droppedScenery;
  if (dropped <= 0) return null;

  const toy = dropped === 1 ? 'toy' : 'toys';
  return `We saved your meadow and skipped ${dropped} broken ${toy}.`;
}
