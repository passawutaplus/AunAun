import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ListChecks } from "lucide-react";
import type { BriefScopeItem } from "@/lib/briefSchema";

interface Props {
  value: BriefScopeItem[];
  onChange: (next: BriefScopeItem[]) => void;
  disabled?: boolean;
}

export function ScopeItemsField({ value, onChange, disabled }: Props) {
  const items = value ?? [];

  const update = (idx: number, patch: Partial<BriefScopeItem>) => {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, { name: "", quantity: 1, note: "" }]);

  const totalQty = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);

  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-center">
          <ListChecks className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-xs text-muted-foreground">ยังไม่มีรายการ — กดปุ่มด้านล่างเพื่อเพิ่ม</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
              <Input
                className="col-span-5 h-9"
                placeholder="ชื่อรายการ เช่น โลโก้"
                value={it.name}
                onChange={(e) => update(i, { name: e.target.value })}
                disabled={disabled}
              />
              <Input
                className="col-span-2 h-9 text-center"
                type="number"
                min={1}
                value={it.quantity}
                onChange={(e) => update(i, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                disabled={disabled}
              />
              <Input
                className="col-span-4 h-9"
                placeholder="หมายเหตุ (ถ้ามี)"
                value={it.note ?? ""}
                onChange={(e) => update(i, { note: e.target.value })}
                disabled={disabled}
              />
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="col-span-1 h-9 w-9 text-destructive hover:text-destructive"
                  onClick={() => remove(i)}
                  aria-label="ลบรายการ"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground pt-1">
            รวม {items.length} รายการ · จำนวน {totalQty} ชิ้น
          </p>
        </div>
      )}
      {!disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          className="rounded-lg gap-1"
        >
          <Plus className="h-3.5 w-3.5" /> เพิ่มรายการ
        </Button>
      )}
    </div>
  );
}
