import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CVD_LABELS, simulateHex, type CvdType } from "@/lib/colorBlindness";
import { tints, shades, tones } from "@/lib/colorVariations";

interface Props {
  hex: string;
}

const TYPES: CvdType[] = ["normal", "protanopia", "deuteranopia", "tritanopia"];

export function ColorBlindnessSimulator({ hex }: Props) {
  const [type, setType] = React.useState<CvdType>("normal");

  const swatches = React.useMemo(() => {
    return [hex, ...tints(hex, 4), ...shades(hex, 4), ...tones(hex, 4)];
  }, [hex]);

  return (
    <Card className="p-4 glass space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-sm font-semibold">Color Blindness Simulator</h4>
        <span className="text-[10px] text-muted-foreground">
          จำลองการมองเห็นของผู้ที่มีโรคตาบอดสี
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TYPES.map((t) => (
          <Button
            key={t}
            type="button"
            size="sm"
            variant={type === t ? "default" : "outline"}
            onClick={() => setType(t)}
            className="h-8 text-xs rounded-lg"
          >
            {CVD_LABELS[t]}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        <div
          className="h-20 rounded-xl flex items-center justify-center text-sm font-mono font-bold transition-colors"
          style={{
            backgroundColor: simulateHex(hex, type),
            color: "#fff",
            textShadow: "0 1px 2px rgba(0,0,0,0.4)",
          }}
        >
          {simulateHex(hex, type)}
        </div>
        <div className="grid grid-cols-7 sm:grid-cols-13 gap-1">
          {swatches.map((s, i) => {
            const sim = simulateHex(s, type);
            return (
              <div
                key={`${s}-${i}`}
                className="aspect-square rounded-md border border-border/40"
                style={{ backgroundColor: sim }}
                title={`${s} → ${sim}`}
              />
            );
          })}
        </div>
      </div>
    </Card>
  );
}
