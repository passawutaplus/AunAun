import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Scale } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CHANNEL_OPTIONS,
  DELIVERABLE_LABELS,
  DEFAULT_USAGE_RIGHTS,
  DELIVERABLES,
  LEGAL_DISCLAIMER,
  LICENSE_TYPE_OPTIONS,
  TERRITORIES,
  TERM_LABELS,
  TERMS,
  TRANSFER_LABELS,
  TRANSFER_ON,
  WORK_TYPE_OPTIONS,
  type Deliverable,
  type UsageRightsInput,
} from "@/lib/usageRightsSchema";
import { useLegalUsageRights } from "@/store/legalUsageRights";
import { summarizeUsageRights } from "@/lib/buildCopyrightClauses";
import { trackFeature } from "@/lib/featureUsage";
import type { Quotation } from "@/store/quotations";

function toggleInList<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

export function UsageRightsBuilder({
  open,
  onOpenChange,
  quotation,
  initialRightsId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  quotation: Quotation;
  initialRightsId?: string | null;
  onSaved?: () => void;
}) {
  const { save } = useLegalUsageRights();
  const [form, setForm] = React.useState<UsageRightsInput>({
    ...DEFAULT_USAGE_RIGHTS,
    revisionRounds: quotation.revisionsCount || 2,
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setForm({
      ...DEFAULT_USAGE_RIGHTS,
      revisionRounds: quotation.revisionsCount || 2,
    });
  }, [open, quotation.revisionsCount]);

  const summary = summarizeUsageRights(form);

  const submit = async () => {
    setSaving(true);
    try {
      await save({
        input: form,
        quotationId: quotation.id,
        rightsId: initialRightsId ?? quotation.usageRightsId,
      });
      void trackFeature("legal.rights.set");
      toast.success("บันทึกสิทธิลิขสิทธิ์แล้ว");
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4 text-primary" />
            สิทธิ์ลูกค้าใช้งานยังไง?
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            เลือกแบบที่ใกล้เคียงที่สุด แล้วปรับทีหลังได้ —
            เราจะช่วยเขียนข้อความในใบเสนอราคาและสัญญาให้
          </p>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <section className="space-y-2">
            <Label className="text-xs">ประเภทงาน</Label>
            <div className="grid grid-cols-2 gap-2">
              {WORK_TYPE_OPTIONS.map((w) => (
                <button
                  key={w.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, workType: w.value }))}
                  className={cn(
                    "rounded-lg border p-2.5 text-left transition-colors",
                    form.workType === w.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <span className="text-lg">{w.icon}</span>
                  <p className="text-xs font-medium mt-1">{w.label}</p>
                  <p className="text-[10px] text-muted-foreground">{w.hint}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <Label className="text-xs">สิทธิใช้งาน</Label>
            <div className="grid grid-cols-1 gap-2">
              {LICENSE_TYPE_OPTIONS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, licenseType: l.value }))}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left",
                    form.licenseType === l.value ? "border-primary bg-primary/10" : "border-border",
                  )}
                >
                  <p className="text-xs font-medium">{l.label}</p>
                  <p className="text-[10px] text-muted-foreground">{l.hint}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <Label className="text-xs">ช่องทางที่ใช้ได้</Label>
            <div className="flex flex-wrap gap-1.5">
              {CHANNEL_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, channels: toggleInList(f.channels, c.value) }))
                  }
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px]",
                    form.channels.includes(c.value)
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <section className="space-y-1.5">
              <Label className="text-xs">ระยะเวลา</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
                value={form.term}
                onChange={(e) =>
                  setForm((f) => ({ ...f, term: e.target.value as UsageRightsInput["term"] }))
                }
              >
                {TERMS.map((t) => (
                  <option key={t} value={t}>
                    {TERM_LABELS[t]}
                  </option>
                ))}
              </select>
            </section>
            <section className="space-y-1.5">
              <Label className="text-xs">โอนสิทธิ์เมื่อ</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
                value={form.transferOn}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    transferOn: e.target.value as UsageRightsInput["transferOn"],
                  }))
                }
              >
                {TRANSFER_ON.map((t) => (
                  <option key={t} value={t}>
                    {TRANSFER_LABELS[t]}
                  </option>
                ))}
              </select>
            </section>
          </div>

          <section className="space-y-1.5">
            <Label className="text-xs">ภูมิภาค</Label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
              value={form.territory}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  territory: e.target.value as UsageRightsInput["territory"],
                }))
              }
            >
              {TERRITORIES.map((t) => (
                <option key={t} value={t}>
                  {t === "custom" ? "ระบุเอง" : t === "thailand" ? "ประเทศไทย" : "ทั่วโลก"}
                </option>
              ))}
            </select>
            {form.territory === "custom" && (
              <Input
                className="h-8 text-xs mt-1"
                placeholder="เช่น อาเซียน, กรุงเทพฯ"
                value={form.territoryCustom ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, territoryCustom: e.target.value }))}
              />
            )}
          </section>

          <section className="space-y-2">
            <Label className="text-xs">ไฟล์ที่ส่งมอบ</Label>
            <div className="flex flex-wrap gap-1.5">
              {DELIVERABLES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      deliverables: toggleInList(f.deliverables, d as Deliverable),
                    }))
                  }
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px]",
                    form.deliverables.includes(d)
                      ? "border-primary bg-primary/15"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {DELIVERABLE_LABELS[d]}
                </button>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <section className="space-y-1">
              <Label className="text-xs">รอบแก้ไขฟรี</Label>
              <Input
                type="number"
                min={0}
                max={20}
                className="h-8 text-xs"
                value={form.revisionRounds}
                onChange={(e) =>
                  setForm((f) => ({ ...f, revisionRounds: Number(e.target.value) || 0 }))
                }
              />
            </section>
            <section className="space-y-1">
              <Label className="text-xs">ค่าแก้เกิน (บาท/รอบ)</Label>
              <Input
                type="number"
                min={0}
                className="h-8 text-xs"
                placeholder="ไม่บังคับ"
                value={form.extraRevisionFee ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    extraRevisionFee: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
            </section>
          </div>

          <div className="rounded-lg border border-dashed bg-muted/30 p-3 space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground">สรุป</p>
            {summary.map((line) => (
              <p key={line} className="text-[11px] text-foreground">
                {line}
              </p>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground leading-relaxed">⚖️ {LEGAL_DISCLAIMER}</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
