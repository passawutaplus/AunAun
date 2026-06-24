import * as React from "react";
import type { Quotation } from "@/store/quotations";
import { computeTotals, formatBaht, computeRevisionDates } from "@/store/quotations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  CircleDot,
  CheckCircle2,
  Circle,
  Repeat,
  Flag,
  Wallet,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  q: Quotation;
  patch: (p: Partial<Quotation>) => void;
  sections?: Array<"dates" | "milestones" | "notes">;
}

export function TimelinePanel({ q, patch, sections }: Props) {
  const show = (key: NonNullable<Props["sections"]>[number]) => !sections || sections.includes(key);
  const totals = React.useMemo(() => computeTotals(q), [q]);

  const revisionDates = React.useMemo(
    () => computeRevisionDates(q.startDate, q.endDate, q.revisionsCount),
    [q.startDate, q.endDate, q.revisionsCount],
  );

  function addMilestone() {
    patch({
      milestones: [
        ...q.milestones,
        {
          id: Math.random().toString(36).slice(2, 10),
          label: "งวดใหม่",
          description: "",
          percent: 0,
        },
      ],
    });
  }

  function updateMs(id: string, p: Partial<Quotation["milestones"][number]>) {
    patch({ milestones: q.milestones.map((m) => (m.id === id ? { ...m, ...p } : m)) });
  }

  function removeMs(id: string) {
    patch({ milestones: q.milestones.filter((m) => m.id !== id) });
  }

  // Build full timeline view (start, revisions, end)
  const timelineEvents = React.useMemo(() => {
    const events: {
      date?: string;
      label: string;
      type: "deposit" | "start" | "revision" | "end";
    }[] = [];
    if (q.depositDueDate) {
      events.push({ date: q.depositDueDate, label: "ชำระมัดจำก่อนเริ่มงาน", type: "deposit" });
    }
    if (q.startDate) events.push({ date: q.startDate, label: "เริ่มงาน", type: "start" });
    revisionDates.forEach((d, i) => {
      events.push({ date: d, label: `ส่งแก้ไขครั้งที่ ${i + 1}`, type: "revision" });
    });
    if (q.endDate) events.push({ date: q.endDate, label: "ส่งมอบ / จบงาน", type: "end" });
    return events.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  }, [q.startDate, q.endDate, q.depositDueDate, revisionDates]);

  return (
    <div className="space-y-4 text-sm">
      {/* Date range */}
      {show("dates") && (
        <Section icon={<CalendarIcon className="h-3.5 w-3.5" />} title="วันที่โครงการ">
          <div className="grid grid-cols-2 gap-2">
            <DatePicker
              label="วันที่เริ่ม"
              value={q.startDate}
              onChange={(d) => {
                // ถ้า end อยู่ก่อน start ใหม่ → ล้าง end ออก
                if (q.endDate && d && q.endDate < d) {
                  patch({ startDate: d, endDate: "" });
                } else {
                  patch({ startDate: d });
                }
              }}
            />
            <DatePicker
              label="วันที่จบงาน"
              value={q.endDate}
              minDate={q.startDate}
              onChange={(d) => patch({ endDate: d })}
            />
          </div>
          {q.startDate && q.endDate && q.endDate < q.startDate && (
            <p className="text-[11px] text-destructive mt-1.5" role="alert">
              วันจบงานต้องไม่อยู่ก่อนวันเริ่มงาน
            </p>
          )}

          {/* Auto timeline preview */}
          {timelineEvents.length > 0 && (
            <div className="rounded-lg border border-dashed border-primary/30 bg-primary-soft/30 p-2.5 mt-2 space-y-1.5">
              <p className="text-[11px] font-semibold text-primary flex items-center gap-1">
                <Repeat className="h-3 w-3" /> ไทม์ไลน์อัตโนมัติ
              </p>
              <div className="space-y-1">
                {timelineEvents.map((e, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5">
                      {e.type === "deposit" && <Wallet className="h-3 w-3 text-orange-500" />}
                      {e.type === "start" && <CircleDot className="h-3 w-3 text-primary" />}
                      {e.type === "revision" && <Repeat className="h-3 w-3 text-amber-500" />}
                      {e.type === "end" && <Flag className="h-3 w-3 text-emerald-600" />}
                      <span>{e.label}</span>
                    </span>
                    <span className="num text-muted-foreground">
                      {e.date && format(new Date(e.date), "d MMM yy", { locale: th })}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                ปรับจำนวนแก้ไขได้ที่ช่อง "จำนวนแก้ไขงานฟรี" ในแท็บตั้งค่า
              </p>
            </div>
          )}
        </Section>
      )}

      {/* Milestones (payment) — date only */}
      {show("milestones") && (
        <Section icon={<Flag className="h-3.5 w-3.5" />} title="งวดการชำระเงิน">
          <div className="space-y-3">
            {q.milestones.map((m, i) => {
              const amount = totals.grandTotal * ((m.percent || 0) / 100);
              const isLast = i === q.milestones.length - 1;
              return (
                <div key={m.id} className="flex gap-2">
                  <div className="flex flex-col items-center pt-1.5">
                    {m.done ? (
                      <CheckCircle2 className="h-4 w-4 text-success fill-success/20" />
                    ) : i === 0 ? (
                      <CircleDot className="h-4 w-4 text-primary" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/70" />
                    )}
                    {!isLast && <div className="w-px h-full bg-border/60 mt-1" />}
                  </div>
                  <div className="flex-1 space-y-1.5 pb-1">
                    <div className="flex items-center gap-2">
                      <Input
                        value={m.label}
                        onChange={(e) => updateMs(m.id, { label: e.target.value })}
                        className="h-7 text-xs font-medium border-0 bg-transparent shadow-none px-0 focus-visible:ring-0"
                        placeholder="ชื่องวด"
                      />
                      <button
                        onClick={() => removeMs(m.id)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <DatePicker
                      compact
                      value={m.date}
                      minDate={q.startDate}
                      onChange={(d) => updateMs(m.id, { date: d })}
                    />
                    {m.percent > 0 && amount > 0 && (
                      <p className="text-[11px] text-muted-foreground num">
                        {m.percent}% = ฿{formatBaht(amount)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            <Button
              size="sm"
              variant="outline"
              onClick={addMilestone}
              className="w-full h-7 text-xs"
            >
              <Plus className="h-3 w-3" /> เพิ่มงวด
            </Button>
            <p className="text-[10px] text-muted-foreground italic">
              สัดส่วน % ของแต่ละงวดตั้งจาก "เงื่อนไขการชำระ" ในแท็บตั้งค่า
            </p>
          </div>
        </Section>
      )}

      {/* Notes */}
      {show("notes") && (
        <Textarea
          rows={3}
          value={q.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          maxLength={500}
          placeholder="โน้ตสำหรับตัวคุณเอง — ไม่แสดงในใบเสนอราคา"
          className="text-xs"
        />
      )}
    </div>
  );
}

function DatePicker({
  label,
  value,
  onChange,
  compact = false,
  minDate,
}: {
  label?: string;
  value?: string;
  onChange: (date: string) => void;
  compact?: boolean;
  minDate?: string;
}) {
  const date = value ? new Date(value) : undefined;
  const min = minDate ? new Date(minDate) : undefined;
  return (
    <div className="space-y-1">
      {label && <Label className="text-[11px] text-muted-foreground">{label}</Label>}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal num text-xs",
              compact ? "h-7 px-2" : "h-9",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className={compact ? "h-3 w-3 mr-1" : "h-3.5 w-3.5 mr-1.5"} />
            {date ? format(date, "d MMM yy", { locale: th }) : "เลือกวันที่"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && onChange(d.toISOString().slice(0, 10))}
            disabled={min ? (d) => d < min : undefined}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <div className="px-3 py-2 bg-muted/30 border-b border-border/40">
        <h3 className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
          <span className="text-primary">{icon}</span>
          {title}
        </h3>
      </div>
      <div className="px-3 py-3 space-y-2">{children}</div>
    </div>
  );
}
