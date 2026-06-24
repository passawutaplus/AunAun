import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Library, Loader2 } from "lucide-react";
import { useColorPalettes } from "@/hooks/useColorPalettes";
import { preferWhiteText } from "@/lib/colorUtils";

interface Props {
  onPick: (hex: string) => void;
}

export function MyPalettesQuickPick({ onPick }: Props) {
  const { palettes, loading } = useColorPalettes();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState("");

  React.useEffect(() => {
    if (!activeId && palettes[0]) setActiveId(palettes[0].id);
  }, [palettes, activeId]);

  const active = palettes.find((p) => p.id === activeId);
  const colors = (active?.colors ?? []).filter((c) =>
    filter
      ? c.hex.toLowerCase().includes(filter.toLowerCase()) ||
        (c.label ?? "").toLowerCase().includes(filter.toLowerCase())
      : true,
  );

  return (
    <Card className="p-4 glass space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Library className="h-4 w-4 text-primary" /> My Library
        </h4>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {!loading && palettes.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          ยังไม่มีพาเลทที่บันทึก กดปุ่ม "บันทึกสีนี้" ด้านบนเพื่อเริ่ม
        </p>
      ) : (
        <>
          <div className="flex gap-2">
            <Select value={activeId ?? ""} onValueChange={(v) => setActiveId(v)}>
              <SelectTrigger className="h-9 text-sm flex-1">
                <SelectValue placeholder="เลือกพาเลท" />
              </SelectTrigger>
              <SelectContent>
                {palettes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.colors.length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="ค้นหา"
              className="h-9 text-sm max-w-[120px]"
            />
          </div>

          {colors.length === 0 ? (
            <p className="text-xs text-muted-foreground">ไม่มีสีในพาเลทนี้</p>
          ) : (
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
              {colors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onPick(c.hex)}
                  className="aspect-square rounded-lg border border-border/40 transition hover:scale-110 flex items-end justify-center pb-0.5"
                  style={{
                    backgroundColor: c.hex,
                    color: preferWhiteText(c.hex) ? "#fff" : "#000",
                  }}
                  title={`${c.label ?? ""} ${c.hex}`}
                >
                  <span className="text-[8px] font-mono font-semibold opacity-80">
                    {c.hex.replace("#", "")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
