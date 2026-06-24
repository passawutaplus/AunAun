import * as React from "react";
import SignaturePad from "signature_pad";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface Props {
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}

export function SignaturePadField({ onChange, disabled }: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const padRef = React.useRef<SignaturePad | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(ratio, ratio);

    const pad = new SignaturePad(canvas, {
      backgroundColor: "rgba(255,255,255,0)",
      penColor: "#111827",
    });
    padRef.current = pad;

    const emit = () => {
      if (pad.isEmpty()) {
        onChange(null);
      } else {
        onChange(pad.toDataURL("image/png"));
      }
    };
    pad.addEventListener("endStroke", emit);

    return () => {
      pad.removeEventListener("endStroke", emit);
      padRef.current = null;
    };
  }, [onChange]);

  React.useEffect(() => {
    if (padRef.current) {
      disabled ? padRef.current.off() : padRef.current.on();
    }
  }, [disabled]);

  function clear() {
    padRef.current?.clear();
    onChange(null);
  }

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-border bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,transparent_0%_50%)] bg-[length:12px_12px] overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-40 touch-none bg-white/80"
          aria-label="พื้นที่วาดลายเซ็น"
        />
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={disabled} className="gap-1.5">
        <RotateCcw className="h-3.5 w-3.5" />
        ล้างลายเซ็น
      </Button>
    </div>
  );
}
