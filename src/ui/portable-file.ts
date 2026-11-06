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
  // Revoke on the next tick: Safari aborts a download whose URL disappears in
  // the same task as the click.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Reads a picked file as text. A read rejection is handed to the caller, which
 * turns it into a parent-facing note; nothing is swallowed here.
 */
export async function readWorldFile(file: File): Promise<{ text: string; byteLength: number }> {
  return { text: await file.text(), byteLength: file.size };
}
