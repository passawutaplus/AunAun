import * as React from "react";
import type { Quotation } from "@/store/quotations";
import { computeTotals, formatBaht } from "@/store/quotations";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Plus, Trash2, Tag, Sparkles } from "lucide-react";
import { PriceGuideModal } from "@/components/price-guide/PriceGuideModal";

interface Props {
  q: Quotation;
  patch: (p: Partial<Quotation>) => void;
  sections?: Array<"add" | "items" | "summary">;
}

export function ServicesPanel({ q, patch, sections }: Props) {
  const show = (key: NonNullable<Props["sections"]>[number]) => !sections || sections.includes(key);
  const totals = React.useMemo(() => computeTotals(q), [q]);
  const [draft, setDraft] = React.useState({
    name: "",
    description: "",
    unitPrice: 0,
    quantity: 1,
  });
  const [priceGuideTarget, setPriceGuideTarget] = React.useState<"draft" | string | null>(null);

  function addItem() {
    if (!draft.name.trim()) return;
    patch({
      items: [
        ...q.items,
        { id: Math.random().toString(36).slice(2, 10), ...draft, name: draft.name.trim() },
      ],
    });
    setDraft({ name: "", description: "", unitPrice: 0, quantity: 1 });
  }

  function updateItem(id: string, patchItem: Partial<Quotation["items"][number]>) {
    patch({ items: q.items.map((it) => (it.id === id ? { ...it, ...patchItem } : it)) });
  }

  function removeItem(id: string) {
    patch({ items: q.items.filter((it) => it.id !== id) });
  }

  return (
    <div className="space-y-4 text-sm">
      {show("add") && (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 space-y-3">
          <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <PlusCircle className="h-3.5 w-3.5 text-primary" /> เพิ่มชิ้นงานใหม่
          </p>
          <Input
            placeholder="ชื่อชิ้นงาน / บริการ"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            maxLength={80}
            className="h-10"
          />
          <Textarea
            placeholder="รายละเอียด (ไม่บังคับ)"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            maxLength={300}
            rows={2}
            className="text-sm"
          />
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] text-muted-foreground">ราคา/หน่วย</p>
                <button
                  type="button"
                  onClick={() => setPriceGuideTarget("draft")}
                  className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  <Sparkles className="h-2.5 w-2.5" /> AI ตั้งราคา
                </button>
              </div>
              <Input
                type="number"
                value={draft.unitPrice || ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, unitPrice: Number(e.target.value) || 0 }))
                }
                className="num h-9"
                placeholder="0"
              />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">จำนวน</p>
              <Input
                type="number"
                value={draft.quantity || ""}
                onChange={(e) => setDraft((d) => ({ ...d, quantity: Number(e.target.value) || 0 }))}
                className="num h-9"
                placeholder="1"
              />
            </div>
          </div>
          <Button onClick={addItem} className="w-full bg-primary hover:bg-primary/90 gap-1.5 h-9">
            <Plus className="h-4 w-4" /> เพิ่มรายการ
          </Button>
        </div>
      )}

      <PriceGuideModal
        open={priceGuideTarget !== null}
        onOpenChange={(o) => !o && setPriceGuideTarget(null)}
        initialQuantity={
          priceGuideTarget === "draft"
            ? Math.max(1, draft.quantity || 1)
            : priceGuideTarget
              ? Math.max(1, q.items.find((it) => it.id === priceGuideTarget)?.quantity || 1)
              : 1
        }
        onApplyPrice={(price) => {
          if (priceGuideTarget === "draft") {
            setDraft((d) => ({ ...d, unitPrice: price }));
          } else if (priceGuideTarget) {
            updateItem(priceGuideTarget, { unitPrice: price });
          }
          setPriceGuideTarget(null);
        }}
      />

      {show("items") && (
        <div className="space-y-3">
          {q.items.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6 rounded-xl border border-dashed border-border/60">
              ยังไม่มีรายการ — เพิ่มชิ้นงานด้านบน
            </p>
          ) : (
            q.items.map((it, idx) => {
              const subtotal = (it.unitPrice || 0) * (it.quantity || 0);
              return (
                <div
                  key={it.id}
                  className="rounded-xl border border-border/60 bg-background p-4 space-y-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      รายการที่ {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      className="text-muted-foreground hover:text-destructive p-1 -mr-1"
                      aria-label="ลบรายการ"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Input
                    value={it.name}
                    onChange={(e) => updateItem(it.id, { name: e.target.value })}
                    placeholder="ชื่อชิ้นงาน / รายละเอียด"
                    className="h-9 font-medium"
                  />
                  <Textarea
                    value={it.description ?? ""}
                    onChange={(e) => updateItem(it.id, { description: e.target.value })}
                    placeholder="รายละเอียดเพิ่มเติม"
                    rows={2}
                    className="text-xs"
                  />
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">จำนวน</p>
                      <Input
                        type="number"
                        value={it.quantity}
                        onChange={(e) =>
                          updateItem(it.id, { quantity: Number(e.target.value) || 0 })
                        }
                        className="h-9 num"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">ราคา/หน่วย</p>
                      <Input
                        type="number"
                        value={it.unitPrice}
                        onChange={(e) =>
                          updateItem(it.id, { unitPrice: Number(e.target.value) || 0 })
                        }
                        className="h-9 num"
                      />
                    </div>
                    <div className="text-right pb-1">
                      <p className="text-[10px] text-muted-foreground mb-0.5">ราคารวม</p>
                      <p className="num text-sm font-semibold text-foreground">
                        ฿{formatBaht(subtotal)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPriceGuideTarget(it.id)}
                    className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    <Sparkles className="h-2.5 w-2.5" /> AI ช่วยตั้งราคา
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {show("summary") && (
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <div className="p-4 space-y-3">
            <Row label="รวมเป็นเงิน" value={`฿${formatBaht(totals.preTaxBeforeDiscount)}`} />
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Tag className="h-3 w-3" /> ส่วนลด
              </p>
              <div className="flex gap-1.5">
                <Input
                  type="number"
                  value={q.discountValue || ""}
                  onChange={(e) => patch({ discountValue: Number(e.target.value) || 0 })}
                  className="h-9 text-sm num flex-1"
                  placeholder="0"
                />
                <Select
                  value={q.discountKind}
                  onValueChange={(v) => patch({ discountKind: v as "percent" | "amount" })}
                >
                  <SelectTrigger className="h-9 w-[64px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">%</SelectItem>
                    <SelectItem value="amount">฿</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {totals.discountAmount > 0 && (
                <p className="text-xs text-right num text-emerald-600">
                  −฿{formatBaht(totals.discountAmount)}
                </p>
              )}
            </div>
            {totals.discountAmount > 0 && (
              <Row label="ราคาหลังหักส่วนลด" value={`฿${formatBaht(totals.preTax)}`} />
            )}
            <div className="flex items-center gap-2 py-1">
              <Checkbox
                checked={q.vatEnabled}
                onCheckedChange={(v) => patch({ vatEnabled: !!v })}
              />
              <span className="text-xs flex-1">VAT {q.vatRate}%</span>
              <span className="text-xs num">฿{formatBaht(totals.vatAmount)}</span>
            </div>
            <div className="flex items-center gap-2 py-1">
              <Checkbox
                checked={q.whtEnabled}
                onCheckedChange={(v) => patch({ whtEnabled: !!v })}
              />
              <span className="text-xs flex-1">หัก ณ ที่จ่าย {q.whtRate}%</span>
              <span className="text-xs num text-emerald-600">
                −฿{formatBaht(totals.withholdingAmount)}
              </span>
            </div>
            <div className="pt-3 border-t border-border/40 flex items-center justify-between">
              <span className="text-sm font-semibold">จำนวนเงินรวมทั้งสิ้น</span>
              <span className="num text-xl font-bold text-primary">
                ฿{formatBaht(totals.grandTotal)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="num font-medium">{value}</span>
    </div>
  );
}
