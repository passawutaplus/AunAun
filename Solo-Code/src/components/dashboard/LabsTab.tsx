import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, FileText, FlaskConical, Palette, Type, Sparkles } from "lucide-react";
import { PaletteSkeleton } from "@/components/dashboard/skeletons/TabSkeletons";
import { LabsComingSoon } from "@/components/dashboard/labs/LabsComingSoon";
import { TypographyLab } from "@/components/dashboard/labs/TypographyLab";
import { CreativeBriefHandoffDialog } from "@/components/dashboard/labs/CreativeBriefHandoffDialog";
import {
  requestOpenBrief,
  storeCreativeLabHandoff,
} from "@/lib/creativeLabHandoff";
import { normalizeHex } from "@/lib/colorUtils";
import { toast } from "sonner";

const ColorLabInline = React.lazy(() =>
  import("./briefs/ColorLab/ColorLabInline").then((m) => ({ default: m.ColorLabInline })),
);
const MyPalettes = React.lazy(() =>
  import("./labs/MyPalettes").then((m) => ({ default: m.MyPalettes })),
);
const ExportHub = React.lazy(() =>
  import("./labs/ExportHub").then((m) => ({ default: m.ExportHub })),
);
const MoodMixer = React.lazy(() =>
  import("./labs/MoodMixer").then((m) => ({ default: m.MoodMixer })),
);
const BrandKitCard = React.lazy(() =>
  import("./labs/BrandKitCard").then((m) => ({ default: m.BrandKitCard })),
);
const LayoutGridLab = React.lazy(() =>
  import("./labs/LayoutGridLab").then((m) => ({ default: m.LayoutGridLab })),
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
  const navigate = useNavigate();
  const [hex, setHex] = React.useState("#FF6B00");
  const [paletteHexes, setPaletteHexes] = React.useState<string[]>([hex]);
  const [briefHandoffOpen, setBriefHandoffOpen] = React.useState(false);
  const [pendingHex, setPendingHex] = React.useState<string | null>(null);
  const [fontHandoffOpen, setFontHandoffOpen] = React.useState(false);
  const [pendingFonts, setPendingFonts] = React.useState<string | null>(null);

  const handlePickColor = React.useCallback((nextHex: string) => {
    setHex(nextHex);
    setPaletteHexes((prev) => (prev.includes(nextHex) ? prev : [...prev, nextHex]));
  }, []);

  function openColorBriefHandoff(hexValue: string) {
    const n = normalizeHex(hexValue);
    if (!n) {
      toast.error("สีไม่ถูกต้อง");
      return;
    }
    setPendingHex(n);
    setBriefHandoffOpen(true);
  }

  function confirmColorBrief(briefId: string | null) {
    if (!pendingHex) return;
    storeCreativeLabHandoff({
      kind: "color",
      hexes: [pendingHex],
      briefId: briefId ?? undefined,
    });
    if (briefId) requestOpenBrief(briefId);
    setBriefHandoffOpen(false);
    setPendingHex(null);
    toast.success("ส่งสีเข้าบรีฟแล้ว");
    void navigate({ to: "/dashboard", search: { tab: "planner", sub: "briefs" } });
  }

  function openFontBriefHandoff(fontsLine: string) {
    setPendingFonts(fontsLine);
    setFontHandoffOpen(true);
  }

  function confirmFontBrief(briefId: string | null) {
    if (!pendingFonts) return;
    storeCreativeLabHandoff({
      kind: "fonts",
      likedFonts: pendingFonts,
      briefId: briefId ?? undefined,
    });
    if (briefId) requestOpenBrief(briefId);
    setFontHandoffOpen(false);
    setPendingFonts(null);
    toast.success("ส่งฟอนต์เข้าบรีฟแล้ว");
    void navigate({ to: "/dashboard", search: { tab: "planner", sub: "briefs" } });
  }

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
                <h2 className="text-base sm:text-lg font-bold tracking-tight">Creative Labs</h2>
                <Badge variant="outline" className="text-[10px]">
                  เครื่องมือเสริม
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                สี · ฟอนต์ · ส่งเข้า Smart Brief — ทำงานจริงใน Figma / Adobe / Canva
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

      <Tabs defaultValue="color" className="w-full">
        <TabsList className="w-full h-auto flex flex-wrap gap-1 p-1 sticky top-[7.5rem] z-20 bg-background/95 backdrop-blur border border-border/60 rounded-xl">
          <TabsTrigger value="color" className="text-xs gap-1.5 flex-1 min-w-[4.5rem]">
            <Palette className="h-3.5 w-3.5" /> สี
          </TabsTrigger>
          <TabsTrigger value="palettes" className="text-xs gap-1.5 flex-1 min-w-[4.5rem]">
            พาเลท
          </TabsTrigger>
          <TabsTrigger value="type" className="text-xs gap-1.5 flex-1 min-w-[4.5rem]">
            <Type className="h-3.5 w-3.5" /> ฟอนต์
          </TabsTrigger>
          <TabsTrigger value="export" className="text-xs gap-1.5 flex-1 min-w-[4.5rem]">
            ส่งออก
          </TabsTrigger>
          <TabsTrigger value="soon" className="text-xs gap-1.5 flex-1 min-w-[4.5rem]">
            <Sparkles className="h-3.5 w-3.5" /> เพิ่มเติม
          </TabsTrigger>
        </TabsList>

        <TabsContent value="color" className="mt-4 space-y-4">
          <Card id="color-lab" className="p-3 sm:p-4 glass scroll-mt-28">
            <React.Suspense fallback={<ColorLabFallback />}>
              <ColorLabInline
                hex={hex}
                onHexChange={setHex}
                onApply={openColorBriefHandoff}
                applyLabel="ส่งเข้าบรีฟ"
              />
            </React.Suspense>
          </Card>
          <React.Suspense fallback={<Skeleton className="h-24 w-full" />}>
            <ExportHub hexes={[hex, ...paletteHexes.filter((h) => h !== hex)]} compact />
          </React.Suspense>
        </TabsContent>

        <TabsContent value="palettes" className="mt-4">
          <React.Suspense fallback={<PaletteSkeleton />}>
            <MyPalettes onPickColor={handlePickColor} />
          </React.Suspense>
        </TabsContent>

        <TabsContent value="type" className="mt-4">
          <TypographyLab onSendToBrief={openFontBriefHandoff} />
        </TabsContent>

        <TabsContent value="export" className="mt-4">
          <React.Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
            <ExportHub hexes={paletteHexes.length ? paletteHexes : [hex]} />
          </React.Suspense>
        </TabsContent>

        <TabsContent value="soon" className="mt-4 space-y-4">
          <React.Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
            <MoodMixer />
          </React.Suspense>
          <React.Suspense fallback={<Skeleton className="h-32 w-full rounded-xl" />}>
            <BrandKitCard hex={hex} paletteHexes={paletteHexes} />
          </React.Suspense>
          <React.Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
            <LayoutGridLab />
          </React.Suspense>
          <LabsComingSoon />
        </TabsContent>
      </Tabs>

      <CreativeBriefHandoffDialog
        open={briefHandoffOpen}
        onOpenChange={setBriefHandoffOpen}
        title="ส่งสีเข้าบรีฟ"
        description="เลือกบรีฟที่มีอยู่ หรือสร้างบรีฟใหม่พร้อมสีนี้"
        onConfirm={confirmColorBrief}
      />
      <CreativeBriefHandoffDialog
        open={fontHandoffOpen}
        onOpenChange={setFontHandoffOpen}
        title="ส่งฟอนต์เข้าบรีฟ"
        description="เลือกบรีฟที่มีอยู่ หรือสร้างบรีฟใหม่พร้อมฟอนต์คู่นี้"
        onConfirm={confirmFontBrief}
      />
    </div>
  );
}
