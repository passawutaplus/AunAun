import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { formatTHB } from "@/data/mockData";

export type FundItem = { name: string; amount: number };

export function parseFundItems(note: string): FundItem[] {
  if (!note) return [];
  try {
    const parsed = JSON.parse(note);
    if (parsed && Array.isArray(parsed.items)) {
      return parsed.items
        .filter(
          (x: unknown): x is FundItem =>
            !!x &&
            typeof (x as FundItem).name === "string" &&
            typeof (x as FundItem).amount === "number",
        )
        .slice(0, 20);
    }
  } catch {
    // not JSON
  }
  return [];
}

export function serializeFundItems(items: FundItem[]): string {
  return JSON.stringify({ items });
}

type Props = {
  items: FundItem[];
  cap: number;
  income: number;
  pctCap?: number;
  onChange: (items: FundItem[]) => void;
  placeholder?: string;
};

export function FundEntryList({ items, cap, income, pctCap = 0.3, onChange, placeholder }: Props) {
  const total = items.reduce((s, i) => s + (i.amount || 0), 0);
  const incomeCap = income > 0 ? Math.floor(income * pctCap) : cap;
  const effectiveCap = Math.min(cap, incomeCap || cap);
  const pct = effectiveCap > 0 ? Math.min(100, (total / effectiveCap) * 100) : 0;
  const over = total > effectiveCap;

  function update(idx: number, patch: Partial<FundItem>) {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function add() {
    if (items.length >= 20) return;
    onChange([...items, { name: "", amount: 0 }]);
  }
  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        {items.length === 0 && (
          <p className="text-[11px] text-muted-foreground italic py-1">
            ยังไม่มีรายการ — กด <span className="font-medium">+ เพิ่มรายการกองทุน</span> เพื่อเริ่ม
          </p>
        )}
        {items.map((it, i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <Input
              value={it.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder={placeholder ?? "ชื่อกองทุน / บลจ."}
              maxLength={120}
              className="h-8 text-xs flex-1"
            />
            <Input
              type="number"
              min={0}
              max={1e9}
              value={it.amount || ""}
              onChange={(e) => update(i, { amount: Math.max(0, Number(e.target.value) || 0) })}
              placeholder="ยอดเงิน"
              className="h-8 text-xs num w-28"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => remove(i)}
              aria-label="ลบรายการ"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="h-7 text-xs gap-1 w-full border-dashed"
        disabled={items.length >= 20}
      >
        <Plus className="h-3.5 w-3.5" /> เพิ่มรายการกองทุน
      </Button>

      <div className="rounded-lg bg-muted/40 p-2 space-y-1.5">
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">ใช้ไป</span>
          <span className="num font-semibold">
            ฿{formatTHB(total)} / ฿{formatTHB(effectiveCap)}
            <span className="text-muted-foreground font-normal ml-1">({pct.toFixed(0)}%)</span>
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className={
              "h-full transition-all " +
              (over ? "bg-destructive" : pct > 80 ? "bg-warning" : "bg-primary")
            }
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        {income > 0 && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary" />
            เพดาน = min({Math.round(pctCap * 100)}% ของรายได้ ฿{formatTHB(incomeCap)}, ฿
            {formatTHB(cap)})
          </p>
        )}
        {over && (
          <p className="text-[10px] text-destructive">
            ⚠ เกินเพดาน — ส่วนเกินจะไม่สามารถนำมาลดหย่อนได้
          </p>
        )}
      </div>
    </div>
  );
}
