/**
 * Trigger a browser file download from in-memory bytes.
 * Creates a temporary blob URL, clicks a hidden <a download>, then revokes immediately.
 */
export function triggerFileDownload(data: Uint8Array, filename: string, mimeType: string): void {
  const buffer = new ArrayBuffer(data.byteLength);

  new Uint8Array(buffer).set(data);

  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
