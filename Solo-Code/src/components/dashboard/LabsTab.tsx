import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, FileText, FlaskConical, Palette } from "lucide-react";
import { PaletteSkeleton } from "@/components/dashboard/skeletons/TabSkeletons";
import { LabsComingSoon } from "@/components/dashboard/labs/LabsComingSoon";
import { TypographyLab } from "@/components/dashboard/labs/TypographyLab";

const ColorLabInline = React.lazy(() =>
  import("./briefs/ColorLab/ColorLabInline").then((m) => ({ default: m.ColorLabInline })),
);
const MyPalettes = React.lazy(() =>
  import("./labs/MyPalettes").then((m) => ({ default: m.MyPalettes })),
);

function ColorLabFallback() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-44 w-full rounded-xl" />
      <div className="grid sm:grid-cols-[260px_1fr] gap-4">
        <Skeleton className="h-44 w-full rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}

export function LabsTab() {
  const [hex, setHex] = React.useState("#FF6B00");
  const colorLabRef = React.useRef<HTMLDivElement>(null);

  const handlePickColor = React.useCallback((nextHex: string) => {
    setHex(nextHex);
    colorLabRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-6 glass relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="relative flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="relative shrink-0">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-elevated">
                <FlaskConical className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-card border border-border flex items-center justify-center shadow-soft">
                <Palette className="h-3 w-3 text-primary" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">Color Lab</h2>
                <Badge variant="outline" className="text-[10px]">
                  พร้อมใช้งาน
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                ทดลองสี · ตรวจ contrast · export Tailwind · บันทึกพาเลท · ใช้ใน Smart Brief
              </p>
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 rounded-xl self-start"
          >
            <Link to="/dashboard" search={{ tab: "planner", sub: "briefs" }}>
              <FileText className="h-3.5 w-3.5" />
              ไป Smart Brief
              <ArrowRight className="h-3.5 w-3.5 opacity-60" />
            </Link>
          </Button>
        </div>
      </Card>

      <Card ref={colorLabRef} id="color-lab" className="p-3 sm:p-4 glass scroll-mt-24">
        <React.Suspense fallback={<ColorLabFallback />}>
          <ColorLabInline hex={hex} onHexChange={setHex} />
        </React.Suspense>
      </Card>

      <React.Suspense fallback={<PaletteSkeleton />}>
        <MyPalettes onPickColor={handlePickColor} />
      </React.Suspense>

      <TypographyLab />

      <LabsComingSoon />
    </div>
  );
}
