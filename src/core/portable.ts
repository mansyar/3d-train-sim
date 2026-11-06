/**
 * Portable world files — the pure half of export/import. A world becomes a
 * world-only snapshot string, a local date names the download, and an incoming
 * file is judged (size, readability, salvage) before anything is applied.
 *
 * Nothing here touches the DOM, storage, `three.js`, or the world store: the
 * caller reads the file and passes its byte length in.
 */
import { parseWorldSnapshot, serializeWorld, type WorldData } from './save';
import type { PlacedScenery } from './scenery';
import type { PlacedPiece } from './track-graph';
import type { TrainKind } from './trains';
import type { TrainConsist } from './wagons';

/** The cap an imported file must stay within; anything larger is refused. */
export const MAX_IMPORT_BYTES = 1024 * 1024;

/**
 * The world fields an export carries. Device settings such as mute and the
 * chosen day phase are deliberately absent: the file is a world, not a device.
 */
export interface PortableWorld {
  pieces: readonly PlacedPiece[];
  scenery: readonly PlacedScenery[];
  train?: TrainKind;
  consist?: TrainConsist;
  deliveries?: Record<string, number>;
}

/** What an incoming file turned out to be. Refusals never carry a world. */
export type ImportResult =
  | { status: 'too-large' }
  | { status: 'unreadable' }
  | {
      status: 'imported';
      world: WorldData;
      /** Skips stay split so the notice can name what was lost. */
      droppedPieces: number;
      droppedScenery: number;
      droppedDuplicates: number;
    };

/**
 * Names the download from the date on the wall: `tiny-tracks-YYYY-MM-DD.json`.
 * Local getters only — a late-evening export must not jump to tomorrow.
 */
export function exportFileName(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `tiny-tracks-${year}-${month}-${day}.json`;
}

/**
 * Serializes a world as the JSON string a download carries. Reuses the app's
 * own snapshot writer, so the file is the shape the loader already understands;
 * preferences are left at their defaults and therefore omitted.
 */
export function buildExport(world: PortableWorld): string {
  return JSON.stringify(
    serializeWorld(
      world.pieces,
      world.scenery,
      world.train,
      false,
      world.deliveries,
      world.consist,
    ),
  );
}

/**
 * Judges an incoming file. Size is checked first so an oversized file is never
 * parsed; a parse failure, a structurally unreadable snapshot, or a salvage that
 * kept nothing is a refusal; anything narrower becomes an import with the
 * per-kind skip counts the parent notice needs. Pure: a refusal leaves nothing
 * behind and there is no state to mutate.
 */
export function readImport(text: string, byteLength: number): ImportResult {
  if (byteLength > MAX_IMPORT_BYTES) return { status: 'too-large' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { status: 'unreadable' };
  }

  const result = parseWorldSnapshot(parsed);
  if (result.status === 'unreadable') return { status: 'unreadable' };

  // A salvage that kept nothing is not a world worth replacing a meadow with;
  // the boot loader refuses one the same way. A clean empty world still imports.
  if (
    result.status === 'salvaged' &&
    result.world.pieces.length + result.world.scenery.length === 0
  ) {
    return { status: 'unreadable' };
  }

  return {
    status: 'imported',
    world: result.world,
    droppedPieces: result.droppedPieces,
    droppedScenery: result.droppedScenery,
    droppedDuplicates: result.droppedDuplicates,
  };
}
