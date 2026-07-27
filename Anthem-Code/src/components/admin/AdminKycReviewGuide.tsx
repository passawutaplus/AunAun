import { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardList,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { kycRejectLabel } from "@/lib/kycRejectReasons";
import {
  KYC_EXAMPLE_CASES,
  KYC_REVIEW_CHECKLIST,
  KYC_REVIEW_RULES,
  allKycReviewChecksPassed,
  type KycReviewCheckId,
} from "@/lib/adminKycReviewGuide";
import { cn } from "@/lib/utils";

/** One-page ops guide on /admin/kyc — steps, checklist summary, example cases. */
export function AdminKycGuidePanel() {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-sm border border-admin-border bg-admin-surface overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-admin-hover/40 transition-colors"
          >
            <BookOpen className="w-4 h-4 text-admin-accent shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-admin-fg">คู่มือตรวจ KYC (1 หน้า)</p>
              <p className="text-[11px] text-admin-muted">
                กดตามข้อ · checklist · ตัวอย่างอนุมัติ/ปฏิเสธ
              </p>
            </div>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-admin-muted shrink-0 transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-admin-border px-3 py-3 space-y-4 text-sm">
            <section className="space-y-1.5">
              <p className="text-[11px] uppercase tracking-wider text-admin-muted font-medium">
                กติกาสั้นๆ
              </p>
              <ul className="space-y-1 text-xs text-admin-muted">
                {KYC_REVIEW_RULES.map((rule) => (
                  <li key={rule} className="flex gap-2">
                    <span className="text-admin-accent shrink-0">·</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-admin-muted font-medium flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5" />
                กดตามข้อ (8 ข้อ)
              </p>
              <ol className="grid gap-1.5 sm:grid-cols-2">
                {KYC_REVIEW_CHECKLIST.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-sm border border-admin-border/80 bg-admin-hover/20 px-2.5 py-2"
                  >
                    <p className="text-xs font-medium text-admin-fg">
                      {item.step}. {item.label}
                    </p>
                    <p className="text-[11px] text-admin-muted mt-0.5 leading-snug">{item.hint}</p>
                    {item.failReason ? (
                      <p className="text-[10px] text-destructive/80 mt-1">
                        ไม่ผ่าน → {kycRejectLabel(item.failReason)}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>

            <section className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-admin-muted font-medium">
                ตัวอย่างเคสจริง
              </p>
              <div className="grid gap-2 lg:grid-cols-2">
                {KYC_EXAMPLE_CASES.map((ex) => {
                  const ok = ex.verdict === "approve";
                  return (
                    <article
                      key={ex.id}
                      className={cn(
                        "rounded-sm border px-2.5 py-2 space-y-1.5",
                        ok
                          ? "border-emerald-500/25 bg-emerald-500/5"
                          : "border-destructive/25 bg-destructive/5",
                      )}
                    >
                      <p className="text-xs font-medium flex items-center gap-1.5">
                        {ok ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                        )}
                        {ex.title}
                      </p>
                      <ul className="space-y-0.5 text-[11px] text-admin-muted">
                        {ex.facts.map((f) => (
                          <li key={f} className="flex gap-1.5">
                            <Circle className="w-1.5 h-1.5 mt-1.5 shrink-0 fill-current" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-admin-fg">
                        <span className="font-medium">ทำ:</span> {ex.action}
                        {ex.reasonCode ? (
                          <span className="text-admin-muted">
                            {" "}
                            ({kycRejectLabel(ex.reasonCode)})
                          </span>
                        ) : null}
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

type ChecklistProps = {
  checks: Record<KycReviewCheckId, boolean>;
  onChange: (id: KycReviewCheckId, value: boolean) => void;
  onMarkAll?: () => void;
  onClearAll?: () => void;
};

/** Tickable checklist inside the KYC review dialog. */
export function AdminKycReviewChecklist({
  checks,
  onChange,
  onMarkAll,
  onClearAll,
}: ChecklistProps) {
  const done = KYC_REVIEW_CHECKLIST.filter((i) => checks[i.id]).length;
  const total = KYC_REVIEW_CHECKLIST.length;
  const allPassed = allKycReviewChecksPassed(checks);

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-xs font-medium flex items-center gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" />
            Checklist ก่อนตัดสินใจ
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            ติ๊กครบ {total} ข้อก่อนอนุมัติ · ตอนนี้ {done}/{total}
            {allPassed ? " · พร้อมอนุมัติ" : ""}
          </p>
        </div>
        <div className="flex gap-1">
          {onClearAll ? (
            <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={onClearAll}>
              ล้าง
            </Button>
          ) : null}
          {onMarkAll ? (
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={onMarkAll}>
              ติ๊กทั้งหมด
            </Button>
          ) : null}
        </div>
      </div>

      <ul className="space-y-1.5">
        {KYC_REVIEW_CHECKLIST.map((item) => {
          const checked = checks[item.id];
          const inputId = `kyc-check-${item.id}`;
          return (
            <li key={item.id}>
              <label
                htmlFor={inputId}
                className={cn(
                  "flex items-start gap-2.5 rounded-md border px-2.5 py-2 cursor-pointer transition-colors",
                  checked
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-border/80 bg-background/60 hover:bg-muted/40",
                )}
              >
                <Checkbox
                  id={inputId}
                  checked={checked}
                  onCheckedChange={(v) => onChange(item.id, v === true)}
                  className="mt-0.5"
                />
                <span className="min-w-0">
                  <span className="text-xs font-medium block">
                    {item.step}. {item.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground leading-snug block">
                    {item.hint}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
