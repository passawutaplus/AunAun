import { describe, expect, it } from "vitest";
import {
  looksLikeHevcMp4,
  repairMp4Bytes,
} from "@/lib/repairMp4Container";

function be32(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

function ascii(s: string): Uint8Array {
  return new Uint8Array([...s].map((c) => c.charCodeAt(0)));
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Minimal broken MP4: mdat size swallows trailing moov (Katie-style). */
function buildBrokenMp4(opts?: { hevc?: boolean }): Uint8Array {
  const ftypBody = concat(ascii("isom"), be32(0), ascii("isom"), ascii("mp42"));
  const ftyp = concat(be32(8 + ftypBody.length), ascii("ftyp"), ftypBody);

  const mediaPad = new Uint8Array(64).fill(0xaa);
  const codecTag = opts?.hevc ? ascii("hvc1") : ascii("avc1");
  mediaPad.set(codecTag, 8);

  const moovBody = concat(be32(108), ascii("mvhd"), new Uint8Array(100));
  const moov = concat(be32(8 + moovBody.length), ascii("moov"), moovBody);

  // Claim mdat size covers media + moov (broken — moov hidden inside mdat).
  const claimedMdatSize = 8 + mediaPad.length + moov.length;
  const mdatHeader = concat(be32(claimedMdatSize), ascii("mdat"));
  return concat(ftyp, mdatHeader, mediaPad, moov);
}

describe("repairMp4Bytes", () => {
  it("rewrites mdat size so moov becomes a sibling atom", () => {
    const broken = buildBrokenMp4();
    const result = repairMp4Bytes(broken, { fileName: "katie-broken.mp4" });

    expect(result.repaired).toBe(true);
    expect(result.needsTranscode).toBe(true);
    expect(result.reason).toMatch(/mdat-swallowed-moov/);

    const view = new DataView(
      result.bytes.buffer,
      result.bytes.byteOffset,
      result.bytes.byteLength,
    );
    expect(view.getUint32(0, false)).toBe(24);
    const mdatSize = view.getUint32(24, false);
    const moovOff = 24 + mdatSize;
    expect(
      String.fromCharCode(...result.bytes.slice(moovOff + 4, moovOff + 8)),
    ).toBe("moov");

    const again = repairMp4Bytes(result.bytes, { fileName: "katie-broken.mp4" });
    expect(again.repaired).toBe(false);
    expect(again.needsTranscode).toBe(false);
  });

  it("flags HEVC (hvc1) for forced H.264 transcode", () => {
    const broken = buildBrokenMp4({ hevc: true });
    expect(looksLikeHevcMp4(broken)).toBe(true);
    const result = repairMp4Bytes(broken, { fileName: "hevc.mp4" });
    expect(result.repaired).toBe(true);
    expect(result.needsTranscode).toBe(true);
    expect(result.reason).toMatch(/hevc/);

    const healthyHevc = repairMp4Bytes(result.bytes, { fileName: "hevc.mp4" });
    expect(healthyHevc.repaired).toBe(false);
    expect(healthyHevc.needsTranscode).toBe(true);
    expect(healthyHevc.reason).toBe("hevc");
  });

  it("leaves a healthy H.264 mp4 alone", () => {
    const fixed = repairMp4Bytes(buildBrokenMp4(), { fileName: "ok.mp4" });
    expect(fixed.repaired).toBe(true);
    const again = repairMp4Bytes(fixed.bytes, { fileName: "ok.mp4" });
    expect(again.repaired).toBe(false);
    expect(again.needsTranscode).toBe(false);
  });
});
