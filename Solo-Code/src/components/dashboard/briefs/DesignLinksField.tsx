import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BriefDesignLink, DesignLinkTool } from "@/lib/briefSchema";
import { Plus, Trash2, Link2 } from "lucide-react";

const TOOLS: { id: DesignLinkTool; label: string }[] = [
  { id: "figma", label: "Figma" },
  { id: "canva", label: "Canva" },
  { id: "adobe", label: "Adobe" },
  { id: "drive", label: "Drive / โฟลเดอร์" },
  { id: "other", label: "อื่นๆ" },
];

type Props = {
  value: BriefDesignLink[];
  onChange: (next: BriefDesignLink[]) => void;
  disabled?: boolean;
};

export function DesignLinksField({ value, onChange, disabled }: Props) {
  const links = value ?? [];

  function add() {
    onChange([...links, { tool: "figma", label: "", url: "" }]);
  }

  function update(i: number, patch: Partial<BriefDesignLink>) {
    onChange(links.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }

  function remove(i: number) {
    onChange(links.filter((_, j) => j !== i));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5" /> ลิงก์ไฟล์งาน (Figma / Canva / Adobe)
        </p>
        <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" disabled={disabled} onClick={add}>
          <Plus className="h-3 w-3 mr-1" /> เพิ่ม
        </Button>
      </div>
      {links.length === 0 && (
        <p className="text-[11px] text-muted-foreground">เก็บลิงก์ไฟล์ต้นฉบับที่ทำงานจริงนอก So1o</p>
      )}
      {links.map((link, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[7rem_1fr_1fr_auto] items-center">
          <Select
            value={link.tool}
            onValueChange={(v) => update(i, { tool: v as DesignLinkTool })}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TOOLS.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="h-8 text-xs"
            placeholder="ชื่อ เช่น Mockup v2"
            value={link.label}
            onChange={(e) => update(i, { label: e.target.value })}
            disabled={disabled}
          />
          <Input
            className="h-8 text-xs"
            placeholder="https://..."
            value={link.url}
            onChange={(e) => update(i, { url: e.target.value })}
            disabled={disabled}
          />
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={disabled} onClick={() => remove(i)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}
