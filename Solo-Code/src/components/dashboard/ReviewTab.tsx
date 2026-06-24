import * as React from "react";
import { PageFooterActions } from "@/components/dashboard/PageFooterActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus, GitCompareArrows } from "lucide-react";

type Pin = { id: string; x: number; y: number; note: string };

const SAMPLE_V1 = "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=600&q=70";
const SAMPLE_V2 = "https://images.unsplash.com/photo-1561070791-2526d30994b8?w=600&q=70";

export function ReviewTab() {
  const [pins, setPins] = React.useState<Pin[]>([
    { id: "1", x: 30, y: 40, note: "ขยายโลโก้ใหญ่ขึ้นอีก 10%" },
  ]);

  const addPin = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const note = prompt("คอมเมนต์จุดนี้:");
    if (note) setPins((p) => [...p, { id: crypto.randomUUID(), x, y, note }]);
  };

  return (
    <div className="space-y-5">
      <Card className="animate-fade-up">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 text-primary" /> Pin-point Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">คลิกบนภาพเพื่อปักหมุดคอมเมนต์</p>
          <div
            className="relative rounded-xl overflow-hidden border border-border/60 cursor-crosshair select-none"
            onClick={addPin}
          >
            <img
              src={SAMPLE_V1}
              alt="Design version preview"
              className="w-full block"
              draggable={false}
              loading="lazy"
              decoding="async"
            />
            {pins.map((pin, i) => (
              <div
                key={pin.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 group"
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-elevated ring-2 ring-white">
                  {i + 1}
                </div>
                <div className="absolute left-9 top-0 hidden group-hover:block bg-card border border-border/60 rounded-lg px-2 py-1 text-xs shadow-card whitespace-nowrap max-w-[220px]">
                  {pin.note}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1">
            {pins.map((p, i) => (
              <div key={p.id} className="flex items-start gap-2 text-xs">
                <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
                  {i + 1}
                </span>
                <span>{p.note}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="animate-fade-up">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <GitCompareArrows className="h-4 w-4 text-primary" /> Comparison Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Version 1", src: SAMPLE_V1 },
              { label: "Version 2", src: SAMPLE_V2 },
            ].map((v) => (
              <div key={v.label} className="rounded-xl overflow-hidden border border-border/60">
                <div className="px-3 py-1.5 bg-muted/60 text-xs font-medium flex items-center justify-between">
                  <span>{v.label}</span>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px]">
                    เลือก
                  </Button>
                </div>
                <img
                  src={v.src}
                  alt={v.label}
                  className="w-full block"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <PageFooterActions feature="review" label="รีวิวงาน" />
    </div>
  );
}
