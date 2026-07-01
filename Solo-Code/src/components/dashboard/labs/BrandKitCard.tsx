import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadBrandKit, saveBrandKit } from "@/lib/brandKit";
import { storeCreativeLabHandoff } from "@/lib/creativeLabHandoff";
import { Layers } from "lucide-react";
import { toast } from "sonner";

type Props = { hex: string; paletteHexes: string[] };

export function BrandKitCard({ hex, paletteHexes }: Props) {
  const [name, setName] = React.useState("");
  const [fonts, setFonts] = React.useState("");
  const [kit, setKit] = React.useState(loadBrandKit);

  const hexes = React.useMemo(() => {
    const set = new Set([hex, ...paletteHexes].filter(Boolean));
    return [...set];
  }, [hex, paletteHexes]);

  function handleSave() {
    const next = {
      name: name.trim() || "Brand Kit",
      hexes,
      fonts: fonts.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };
    saveBrandKit(next);
    setKit(next);
    toast.success("บันทึก Brand Kit ในเซสชันนี้แล้ว");
  }

  function sendToBrief() {
    storeCreativeLabHandoff({
      kind: "palette",
      hexes,
      likedFonts: fonts.trim() || kit?.fonts,
      paletteName: name.trim() || kit?.name || "Brand Kit",
    });
    toast.success("เตรียมส่งเข้าบรีฟ — ไปหน้า Smart Brief");
  }

  return (
    <Card className="p-5 glass space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 text-primary p-2.5">
          <Layers className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold">Brand Kit</h3>
          <p className="text-xs text-muted-foreground mt-1">รวมสีและฟอนต์ชุดเดียวก่อนส่งบรีฟ</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {hexes.map((h) => (
          <span key={h} className="h-7 w-7 rounded-md border" style={{ backgroundColor: h }} title={h} />
        ))}
      </div>

      <Input placeholder="ชื่อชุดแบรนด์" value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
      <Input placeholder="ฟอนต์ (ไม่บังคับ)" value={fonts} onChange={(e) => setFonts(e.target.value)} className="h-9 text-sm" />

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={handleSave}>
          บันทึกชุด
        </Button>
        <Button type="button" size="sm" onClick={sendToBrief}>
          ส่งเข้าบรีฟ
        </Button>
        <Button type="button" size="sm" variant="ghost" asChild>
          <Link to="/dashboard" search={{ tab: "settings" }}>
            ธีมเอกสาร
          </Link>
        </Button>
      </div>

      {kit && (
        <p className="text-[10px] text-muted-foreground">
          ชุดล่าสุด: {kit.name} · {kit.hexes.length} สี
        </p>
      )}
    </Card>
  );
}
