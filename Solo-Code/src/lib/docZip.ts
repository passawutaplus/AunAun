import JSZip from "jszip";

export type ZipEntry = {
  path: string;
  data: Blob | Uint8Array | string;
};

export async function buildZipBlob(entries: ZipEntry[]): Promise<Blob> {
  const zip = new JSZip();
  for (const entry of entries) {
    zip.file(entry.path, entry.data);
  }
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadZip(entries: ZipEntry[], filename: string) {
  const blob = await buildZipBlob(entries);
  downloadBlob(blob, filename);
}
