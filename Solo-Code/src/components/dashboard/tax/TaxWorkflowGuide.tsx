import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  Coins,
  FileText,
  Receipt,
  Calculator,
  Send,
  ChevronRight,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FinanceMoneySub } from "@/components/dashboard/FinanceMoneyNav";

const STEPS = [
  {
    id: "income",
    icon: Coins,
    title: "1. บันทึกรายได้",
    desc: "ทุกครั้งที่ลูกค้าโอนเงิน — ใส่ยอด gross และอัตราหัก ณ ที่จ่าย",
    action: "income" as FinanceMoneySub,
    tip: "ซิงค์จาก Quotation ที่ปิดงานแล้วได้เลย",
  },
  {
    id: "wht",
    icon: FileText,
    title: "2. เก็บใบ 50ทวิ",
    desc: "อัปโหลดหรือสแกนใบหัก ณ ที่จ่าย — ระบบช่วยอ่านตัวเลขให้",
    action: null,
    tip: "ถ่ายรูปให้เห็นเลขที่ใบและยอดชัดๆ",
  },
  {
    id: "expense",
    icon: Receipt,
    title: "3. บันทึกรายจ่าย",
    desc: "เก็บบิลค่าใช้จ่ายจริง หรือเลือกหักแบบเหมาตามกฎหมาย",
    action: null,
    tip: "หักจริงต้องมีหลักฐาน — หักเหมาใช้สูตร 40(2)/40(8)",
  },
  {
    id: "estimate",
    icon: Calculator,
    title: "4. ดูประมาณการ",
    desc: "ระบบคำนวณภาษีเบื้องต้น ลดหย่อน และเครดิต WHT ให้อัตโนมัติ",
    action: null,
    tip: "ลอง «โหมดจำลอง» ก่อนตัดสินใจลดหย่อน",
  },
  {
    id: "export",
    icon: Send,
    title: "5. ส่งนักบัญชี",
    desc: "ดาวน์โหลด ZIP รวมสรุป CSV ใบ 50ทวิ และใบเสร็จ — คัดลอกข้อความส่ง Line ได้",
    action: null,
    tip: "Export ต้นเดือน 3–4 ก่อนกำหนดยื่นภาษี",
  },
] as const;

interface TaxWorkflowGuideProps {
  onNavigate: (sub: FinanceMoneySub) => void;
  onExport?: () => void;
  done?: Partial<Record<(typeof STEPS)[number]["id"], boolean>>;
}

export function TaxWorkflowGuide({ onNavigate, onExport, done = {} }: TaxWorkflowGuideProps) {
  const [expanded, setExpanded] = React.useState(true);
  const completed = STEPS.filter((s) => done[s.id]).length;

  return (
    <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/5 via-card to-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-primary/5 transition-colors"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary shrink-0" />
            ภาษีฟรีแลนซ์ — ทำตามลำดับนี้
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {completed}/{STEPS.length} ขั้นที่ทำแล้ว · อ่านง่าย ไม่ต้องเป็นนักบัญชีก็เริ่มได้
          </p>
        </div>
        <ChevronRight
          className={cn(
            "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
            expanded && "rotate-90",
          )}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isDone = !!done[step.id];
            return (
              <div
                key={step.id}
                className={cn(
                  "relative flex gap-3 rounded-xl border p-3 transition-colors",
                  isDone ? "border-emerald-200 bg-emerald-50/50" : "border-border/60 bg-card/80",
                )}
              >
                {i < STEPS.length - 1 && (
                  <span
                    className="absolute left-[1.65rem] top-full h-2 w-px bg-border"
                    aria-hidden
                  />
                )}
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    isDone ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary",
                  )}
                >
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">{step.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                    {step.desc}
                  </p>
                  <p className="text-[10px] text-primary/80 mt-1">💡 {step.tip}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {step.action && (
                      <button
                        type="button"
                        onClick={() => onNavigate(step.action!)}
                        className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        ไปหน้ารายได้ <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                    {step.id === "export" && onExport && (
                      <button
                        type="button"
                        onClick={onExport}
                        className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        Export ชุดนักบัญชี <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <Link
            to="/help/tax"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary mt-1"
          >
            <BookOpen className="h-3 w-3" /> อ่านคู่มือภาษีฉบับเต็ม
          </Link>
        </div>
      )}
    </div>
  );
}
