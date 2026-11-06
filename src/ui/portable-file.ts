/**
 * The file-system edge of portable worlds: hand a JSON string to the browser's
 * download flow and read a picked file back as text.
 *
 * No product judgement lives here — `core/portable.ts` decides what a payload
 * means and whether an incoming file is a meadow at all. This module only moves
 * bytes between the device and the page.
 */

/** Offers a world file to the browser's download flow via a blob URL. */
export function saveWorldFile(fileName: string, json: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revoke with real headroom: WebKit has aborted a blob download when its URL
  // disappeared on the next tick, so the URL must outlive the hand-off to the
  // download manager. Five seconds is well past any start-up latency and still
  // releases the blob promptly.
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Reads a picked file as text. A read rejection is handed to the caller, which
 * turns it into a parent-facing note; nothing is swallowed here.
 */
export async function readWorldFile(file: File): Promise<{ text: string; byteLength: number }> {
  return { text: await file.text(), byteLength: file.size };
}
