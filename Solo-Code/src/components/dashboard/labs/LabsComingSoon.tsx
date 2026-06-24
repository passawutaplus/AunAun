import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

const COMING = [
  { title: "Layout Grid", note: "สร้าง grid system สำหรับ brief" },
  { title: "Mood Mixer", note: "ผสม reference + keyword → palette" },
];

export function LabsComingSoon() {
  return (
    <Card className="p-5 sm:p-6 glass border-dashed">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 text-primary p-2.5 shrink-0">
          <Sparkles className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold tracking-tight">Labs ถัดไป</h3>
            <Badge variant="secondary" className="text-[10px]">
              เร็วๆ นี้
            </Badge>
          </div>
          <ul className="grid sm:grid-cols-2 gap-2">
            {COMING.map((item) => (
              <li
                key={item.title}
                className="rounded-xl border border-border/70 bg-background/60 px-3 py-2.5"
              >
                <p className="text-xs font-semibold">{item.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{item.note}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
