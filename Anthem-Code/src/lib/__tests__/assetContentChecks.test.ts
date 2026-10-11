import { describe, expect, it } from "vitest";
import {
  checkAttachmentBytes,
  dangerousZipEntry,
  extensionOf,
  pdfHasLaunchAction,
  signatureMatchesExtension,
  zipEntryNames,
} from "../../../../Solo-Code/supabase/functions/_shared/asset-content-checks";

const enc = new TextEncoder();

/** Smallest valid ZIP: stored (empty) entries, one central-directory record each, then the EOCD. */
function makeZip(names: string[]): Uint8Array {
  const parts: number[] = [];
  const central: number[] = [];
  const u16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
  const u32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
  for (const name of names) {
    const nameBytes = Array.from(enc.encode(name));
    const offset = parts.length;
    parts.push(...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(0), ...u32(0), ...u16(nameBytes.length), ...u16(0), ...nameBytes);
    central.push(...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(0), ...u32(0), ...u16(nameBytes.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...nameBytes);
  }
  const cdOffset = parts.length;
  const all = [...parts, ...central, ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(names.length), ...u16(names.length), ...u32(central.length), ...u32(cdOffset), ...u16(0)];
  return new Uint8Array(all);
}

const pad = (head: number[]) => new Uint8Array([...head, ...new Array(16).fill(0)]);

describe("attachment content checks (server side)", () => {
  it("reads the extension from the last path segment", () => {
    expect(extensionOf("u/f/assets/abc-photo.PNG")).toBe("png");
    expect(extensionOf("noext")).toBe("");
  });

  it("accepts real signatures and rejects a renamed executable", () => {
    expect(signatureMatchesExtension("pdf", pad([0x25, 0x50, 0x44, 0x46]))).toBe(true);
    expect(signatureMatchesExtension("png", pad([0x89, 0x50, 0x4e, 0x47]))).toBe(true);
    expect(signatureMatchesExtension("jpg", pad([0xff, 0xd8, 0xff]))).toBe(true);
    // "MZ" is a Windows executable
    expect(signatureMatchesExtension("pdf", pad([0x4d, 0x5a]))).toBe(false);
    expect(signatureMatchesExtension("exe", pad([0x4d, 0x5a]))).toBe(false);
  });

  it("lists ZIP entries and flags programs inside", () => {
    const ok = makeZip(["fonts/Regular.ttf", "readme.txt"]);
    expect(zipEntryNames(ok)).toEqual(["fonts/Regular.ttf", "readme.txt"]);
    expect(checkAttachmentBytes("zip", ok)).toEqual({ ok: true });

    const bad = makeZip(["brand/logo.png", "setup.exe"]);
    const verdict = checkAttachmentBytes("zip", bad);
    expect(verdict.ok).toBe(false);
    expect(dangerousZipEntry(zipEntryNames(bad)!)).toBe("setup.exe");
  });

  it("flags path traversal inside a ZIP", () => {
    expect(dangerousZipEntry(["../../etc/passwd"])).toBe("../../etc/passwd");
    expect(dangerousZipEntry(["C:/Windows/x.txt"])).toBe("C:/Windows/x.txt");
  });

  it("rejects an unreadable ZIP and a PDF with a launch action", () => {
    expect(checkAttachmentBytes("zip", pad([0x50, 0x4b, 0x03, 0x04])).ok).toBe(false);
    const pdf = new Uint8Array([...enc.encode("%PDF-1.7\n1 0 obj << /Type /Action /S /Launch /F (cmd.exe) >> endobj")]);
    expect(pdfHasLaunchAction(pdf)).toBe(true);
    expect(checkAttachmentBytes("pdf", pdf).ok).toBe(false);
    const fine = new Uint8Array([...enc.encode("%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj")]);
    expect(checkAttachmentBytes("pdf", fine)).toEqual({ ok: true });
  });

  it("refuses types that are not on the allow-list", () => {
    expect(checkAttachmentBytes("exe", pad([0x4d, 0x5a])).ok).toBe(false);
    expect(checkAttachmentBytes("html", enc.encode("<html>")).ok).toBe(false);
  });
});
