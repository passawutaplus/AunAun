import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileDropzone } from "@/components/doc/FileDropzone";
import { extractPaletteFromImage } from "@/lib/extractPalette";
import { normalizeHexArray } from "@/lib/colorUtils";
import { storeCreativeLabHandoff, requestOpenBrief } from "@/lib/creativeLabHandoff";
import { CreativeBriefHandoffDialog } from "./CreativeBriefHandoffDialog";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

const FONT_SUGGESTIONS: Record<string, string> = {
  มินิมอล: "Inter + Noto Sans Thai",
  อบอุ่น: "DM Sans + Kanit",
  พรีเมียม: "Playfair Display + Sarabun",
  เทค: "Space Grotesk + IBM Plex Sans Thai",
};

export function MoodMixer() {
  const navigate = useNavigate();
  const [keywords, setKeywords] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<{
    hexes: string[];
    fonts: string;
    moodLine: string;
  } | null>(null);
  const [briefOpen, setBriefOpen] = React.useState(false);

  async function handleMix(files: File[]) {
    setBusy(true);
    try {
      let hexes: string[] = [];
      if (files[0]) {
        const raw = await extractPaletteFromImage(files[0], 6);
        hexes = normalizeHexArray(raw);
      }
      if (hexes.length === 0) hexes = ["#2D3748", "#E2E8F0", "#FF6B00", "#1A202C", "#F7FAFC"];

      const kw = keywords.toLowerCase();
      const fontKey = Object.keys(FONT_SUGGESTIONS).find((k) => kw.includes(k)) ?? "มินิมอล";
      const fonts = FONT_SUGGESTIONS[fontKey]!;
      const moodLine = keywords.trim()
        ? `อารมณ์งาน: ${keywords.trim()} — โทน${fontKey}`
        : `อารมณ์งาน: ${fontKey} · สีหลัก ${hexes[0]}`;

      setResult({ hexes, fonts, moodLine });
      toast.success("สร้างชุด mood แล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "สร้างไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  function sendToBrief(briefId: string | null) {
    if (!result) return;
    storeCreativeLabHandoff({
      kind: "palette",
      hexes: result.hexes,
      likedFonts: `${result.fonts}\n${result.moodLine}`,
      paletteName: keywords.trim() || "Mood Mixer",
      briefId: briefId ?? undefined,
    });
    if (briefId) requestOpenBrief(briefId);
    setBriefOpen(false);
    toast.success("ส่งเข้าบรีฟแล้ว");
    void navigate({ to: "/dashboard", search: { tab: "planner", sub: "briefs" } });
  }

  return (
    <Card className="p-5 glass space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 text-primary p-2.5">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold">Mood Mixer</h3>
          <p className="text-xs text-muted-foreground mt-1">
            คำอธิบาย + รูปอ้างอิง → พาเลท สี · ฟอนต์ · ข้อความ mood
          </p>
        </div>
      </div>

      <Textarea
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
        placeholder="เช่น มินิมอล อบอุ่น ไทยโมเดิร์น"
        className="text-sm min-h-[72px]"
      />

      <FileDropzone
        onFiles={(files) => void handleMix(files.slice(0, 3))}
        busy={busy}
        maxFiles={3}
        title="แนบรูปอ้างอิง (ไม่บังคับ)"
        hint="JPG/PNG · ดึงสีจากรูปอัตโนมัติ"
      />

      {busy && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> กำลังผสม mood...
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-border/60 p-3 space-y-3 text-xs">
          <div className="flex flex-wrap gap-1.5">
            {result.hexes.map((h) => (
              <span
                key={h}
                className="h-8 w-8 rounded-lg border border-border/60"
                style={{ backgroundColor: h }}
                title={h}
              />
            ))}
          </div>
          <p>
            <span className="font-medium">ฟอนต์:</span> {result.fonts}
          </p>
          <p className="text-muted-foreground">{result.moodLine}</p>
          <Button type="button" size="sm" className="w-full" onClick={() => setBriefOpen(true)}>
            ส่งเข้าบรีฟ
          </Button>
        </div>
      )}

      <CreativeBriefHandoffDialog
        open={briefOpen}
        onOpenChange={setBriefOpen}
        title="ส่ง mood เข้าบรีฟ"
        description="เลือกบรีฟหรือสร้างใหม่พร้อมสีและฟอนต์"
        onConfirm={sendToBrief}
      />
    </Card>
  );
}
