import { useRef } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  url: string;
  /** Used for the downloaded file names, e.g. "samecor-qr-<handle>.png". */
  fileLabel: string;
};

/** Pixel size of the downloaded PNG — big enough for print. */
const PNG_SIZE = 1024;

function saveBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}

function withQrSource(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("src", "qr");
    return u.toString();
  } catch {
    return url;
  }
}

/** QR code of the owner's public profile link, downloadable as SVG or PNG. */
const ProfileQrCode = ({ url, fileLabel }: Props) => {
  const svgWrap = useRef<HTMLDivElement>(null);
  const pngWrap = useRef<HTMLDivElement>(null);
  // Scans arrive as page_view with ?src=qr, the same tag the /go landing uses for printed QR codes.
  const qrUrl = withQrSource(url);
  const base = `samecor-qr-${fileLabel.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "profile"}`;

  const downloadSvg = () => {
    const svg = svgWrap.current?.querySelector("svg");
    if (!svg) return;
    const markup = new XMLSerializer().serializeToString(svg);
    saveBlob(new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${markup}`], { type: "image/svg+xml" }), `${base}.svg`);
  };

  const downloadPng = () => {
    const canvas = pngWrap.current?.querySelector("canvas");
    canvas?.toBlob((blob) => blob && saveBlob(blob, `${base}.png`), "image/png");
  };

  return (
    <div className="mt-4 flex flex-col items-center gap-3 border-t border-border pt-4">
      <div ref={svgWrap} className="rounded-xl bg-white p-3">
        <QRCodeSVG value={qrUrl} size={168} level="M" marginSize={2} bgColor="#FFFFFF" fgColor="#111111" title="QR code โปรไฟล์" />
      </div>
      <div ref={pngWrap} className="hidden" aria-hidden>
        <QRCodeCanvas value={qrUrl} size={PNG_SIZE} level="M" marginSize={4} bgColor="#FFFFFF" fgColor="#111111" />
      </div>
      <div className="flex w-full gap-2">
        <Button type="button" variant="outline" onClick={downloadPng} className="h-10 flex-1 gap-2 rounded-xl text-sm">
          <Download className="h-4 w-4" aria-hidden />
          PNG
        </Button>
        <Button type="button" variant="outline" onClick={downloadSvg} className="h-10 flex-1 gap-2 rounded-xl text-sm">
          <Download className="h-4 w-4" aria-hidden />
          SVG
        </Button>
      </div>
    </div>
  );
};

export default ProfileQrCode;
