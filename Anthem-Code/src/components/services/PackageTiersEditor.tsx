import { Copy, Layers, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PACKAGE_TIERS_MAX, sortTiers, type PackageTier } from "@/hooks/useCreatorServices";

type Props = {
  tiers: PackageTier[];
  disabled?: boolean;
  onChange: (tiers: PackageTier[]) => void;
};

const TIER_NAMES = ["Basic", "Standard", "Premium"];
const num = (v: string) => Math.max(0, Number.parseInt(v.replace(/[^\d]/g, ""), 10) || 0);

export const blankTier = (name = "Basic"): PackageTier => ({
  name,
  summary: "",
  price_thb: 0,
  duration_days: 0,
  deliverables: [""],
  revisions: 0,
  exclusions: "",
});

const Req = () => <span className="text-destructive">*</span>;

/**
 * Pricing of a package = 1–3 levels, each with its own scope. Prices must differ;
 * the list is re-ordered cheapest first when a price is left, so the first one is the "starting" price.
 */
export default function PackageTiersEditor({ tiers, disabled, onChange }: Props) {
  const set = (i: number, patch: Partial<PackageTier>) =>
    onChange(tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const setDeliverable = (i: number, k: number, value: string) =>
    set(i, { deliverables: tiers[i].deliverables.map((d, j) => (j === k ? value : d)) });
  const unusedName = () => TIER_NAMES.find((n) => !tiers.some((t) => t.name === n)) ?? "";
  const sortIfPriced = () => {
    if (tiers.every((t) => t.price_thb > 0)) onChange(sortTiers(tiers));
  };

  return (
    <section className="space-y-3">
      <div className="space-y-0.5">
        <Label className="inline-flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-primary" aria-hidden />
          ระดับแพ็กเกจ <Req />
        </Label>
        <p className="text-xs text-muted-foreground">
          อย่างน้อย 1 ระดับ สูงสุด {PACKAGE_TIERS_MAX} · ราคาแต่ละระดับต้องไม่ซ้ำกัน · ระดับที่ถูกสุดจะขึ้นเป็นราคาเริ่มต้นบนการ์ด
        </p>
      </div>

      {tiers.map((t, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/15 px-2 text-[11px] font-semibold text-primary">
              {i === 0 ? "เริ่มต้น" : i + 1}
            </span>
            <Input
              value={t.name}
              onChange={(e) => set(i, { name: e.target.value.slice(0, 40) })}
              placeholder="ชื่อแพ็กเกจ เช่น Basic"
              aria-label={`ชื่อระดับที่ ${i + 1}`}
              className="h-9 flex-1"
              disabled={disabled}
            />
            {tiers.length < PACKAGE_TIERS_MAX ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0"
                aria-label={`คัดลอก ${t.name || `ระดับที่ ${i + 1}`}`}
                title="คัดลอกเป็นระดับใหม่ (ล้างราคา)"
                disabled={disabled}
                onClick={() =>
                  onChange([
                    ...tiers.slice(0, i + 1),
                    { ...t, name: unusedName(), price_thb: 0, deliverables: [...t.deliverables] },
                    ...tiers.slice(i + 1),
                  ])
                }
              >
                <Copy className="h-4 w-4" aria-hidden />
              </Button>
            ) : null}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
              aria-label={`ลบ ${t.name || `ระดับที่ ${i + 1}`}`}
              title={tiers.length <= 1 ? "ต้องมีอย่างน้อย 1 ระดับ" : "ลบระดับนี้"}
              disabled={disabled || tiers.length <= 1}
              onClick={() => onChange(tiers.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          </div>

          <Input
            value={t.summary}
            onChange={(e) => set(i, { summary: e.target.value.slice(0, 200) })}
            placeholder="รายละเอียดย่อสั้นๆ เช่น เหมาะกับร้านเปิดใหม่"
            aria-label="รายละเอียดย่อของระดับนี้"
            className="h-9"
            disabled={disabled}
          />

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">
                ราคา (บาท) <Req />
              </Label>
              <Input
                inputMode="numeric"
                value={t.price_thb ? String(t.price_thb) : ""}
                onChange={(e) => set(i, { price_thb: num(e.target.value) })}
                onBlur={sortIfPriced}
                placeholder="เช่น 1500"
                className="h-9"
                disabled={disabled}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                จำนวนวันทำงาน <Req />
              </Label>
              <Input
                inputMode="numeric"
                value={t.duration_days ? String(t.duration_days) : ""}
                onChange={(e) => set(i, { duration_days: num(e.target.value) })}
                placeholder="เช่น 7"
                className="h-9"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              สิ่งที่ส่งมอบงาน <Req />
            </Label>
            {t.deliverables.map((d, k) => (
              <div key={k} className="flex gap-2">
                <Input
                  value={d}
                  onChange={(e) => setDeliverable(i, k, e.target.value.slice(0, 120))}
                  placeholder={`รายการที่ ${k + 1}`}
                  className="h-9"
                  disabled={disabled}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 text-muted-foreground"
                  aria-label="ลบรายการ"
                  disabled={disabled || t.deliverables.length <= 1}
                  onClick={() => set(i, { deliverables: t.deliverables.filter((_, j) => j !== k) })}
                >
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            ))}
            {t.deliverables.length < 10 ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 rounded-full px-3 text-xs"
                disabled={disabled}
                onClick={() => set(i, { deliverables: [...t.deliverables, ""] })}
              >
                <Plus className="mr-1 h-3.5 w-3.5" aria-hidden /> เพิ่มรายการ
              </Button>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-[8rem_1fr]">
            <div className="space-y-1">
              <Label className="text-xs">รอบแก้ไข (ไม่บังคับ)</Label>
              <Input
                inputMode="numeric"
                value={t.revisions ? String(t.revisions) : ""}
                onChange={(e) => set(i, { revisions: Math.min(99, num(e.target.value)) })}
                placeholder="เช่น 2"
                className="h-9"
                disabled={disabled}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">สิ่งที่ไม่รวม (ไม่บังคับ)</Label>
              <Textarea
                value={t.exclusions}
                onChange={(e) => set(i, { exclusions: e.target.value.slice(0, 500) })}
                placeholder="เช่น ไม่รวมไฟล์ต้นฉบับ"
                rows={1}
                className="min-h-9"
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      ))}

      {tiers.length < PACKAGE_TIERS_MAX ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={disabled}
          onClick={() => onChange([...tiers, blankTier(unusedName())])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden /> เพิ่มระดับ
        </Button>
      ) : null}
    </section>
  );
}
