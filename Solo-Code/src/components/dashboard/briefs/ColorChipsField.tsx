import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Copy, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { normalizeHex, preferWhiteText } from "@/lib/colorUtils";
import { ColorLabDialog } from "./ColorLab/ColorLabDialog";
import { ColorChartPicker } from "./ColorLab/ColorChartPicker";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Used as label inside Color Lab when picking. */
  label?: "ชอบ" | "ต้องห้าม";
}

export function ColorChipsField({ value, onChange, disabled, placeholder, label }: Props) {
  const [open, setOpen] = React.useState(false);
  const [labOpen, setLabOpen] = React.useState(false);
  const [picked, setPicked] = React.useState("#FF6B00");
  const [hexInput, setHexInput] = React.useState("");

  const add = (hex: string) => {
    const n = normalizeHex(hex);
    if (!n) {
      toast.error("Hex code ไม่ถูกต้อง (เช่น #FF6B00)");
      return;
    }
    if (value.includes(n)) {
      toast.info("มีสีนี้อยู่แล้ว");
      return;
    }
    onChange([...value, n]);
    setHexInput("");
  };

  const remove = (hex: string) => onChange(value.filter((c) => c !== hex));

  const copy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      toast.success(`คัดลอก ${hex} แล้ว`);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 items-center">
        {value.length === 0 && (
          <span className="text-xs text-muted-foreground">
            {placeholder ?? "ยังไม่มีสี กดปุ่ม + เพื่อเพิ่ม"}
          </span>
        )}
        {value.map((hex) => (
          <div
            key={hex}
            className="group flex items-center gap-1 rounded-lg border border-border bg-card pl-1 pr-1.5 py-1"
          >
            <button
              type="button"
              onClick={() => copy(hex)}
              className="w-5 h-5 rounded-md border border-border shrink-0"
              style={{ backgroundColor: hex }}
              title="คัดลอก hex"
            />
            <code className="text-[10px] font-mono">{hex}</code>
            <button
              type="button"
              onClick={() => copy(hex)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Copy className="h-3 w-3" />
            </button>
            {!disabled && (
              <button
                type="button"
                onClick={() => remove(hex)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="ลบสี"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        {!disabled && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 rounded-lg gap-1 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> เพิ่มสี
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 space-y-3" align="start">
              <div
                className="rounded-lg border border-border p-3 flex items-center justify-between transition-colors"
                style={{
                  backgroundColor: picked,
                  color: preferWhiteText(picked) ? "#fff" : "#000",
                }}
              >
                <span className="text-base font-semibold">Aa Bb อักษรไทย</span>
                <code className="text-[10px] font-mono opacity-80">{picked.toUpperCase()}</code>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground">เลือกสีจาก Chart</p>
                <ColorChartPicker value={picked} onChange={setPicked} className="w-full" />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    add(picked);
                    setOpen(false);
                  }}
                  className="w-full"
                >
                  เพิ่ม {picked.toUpperCase()}
                </Button>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground">หรือพิมพ์ Hex</p>
                <div className="flex gap-1.5">
                  <Input
                    value={hexInput}
                    onChange={(e) => setHexInput(e.target.value)}
                    placeholder="#FF6B00"
                    className="h-8 text-xs font-mono"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        add(hexInput);
                        setOpen(false);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      add(hexInput);
                      setOpen(false);
                    }}
                  >
                    เพิ่ม
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 rounded-lg gap-1 text-xs text-primary hover:bg-primary/10"
            onClick={() => setLabOpen(true)}
            title="เปิด Color Lab"
          >
            <FlaskConical className="h-3.5 w-3.5" /> Color Lab
          </Button>
        )}
      </div>
      <ColorLabDialog
        open={labOpen}
        onOpenChange={setLabOpen}
        initialHex={value[value.length - 1] ?? "#FF6B00"}
        onApply={(hex) => add(hex)}
        applyLabel={label ? `+ เพิ่มเข้า "${label}"` : "+ เพิ่มเข้าบรีฟ"}
      />
    </div>
  );
}
