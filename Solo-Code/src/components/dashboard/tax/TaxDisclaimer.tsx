import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CalendarClock, Info } from "lucide-react";

/** Permanent disclaimer that tax numbers shown are program estimates only. */
export function TaxDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 text-warning-foreground ${
        compact ? "p-2 text-[11px]" : "p-3 text-xs"
      }`}
    >
      <Info
        className={`shrink-0 text-warning ${compact ? "h-3.5 w-3.5 mt-0.5" : "h-4 w-4 mt-0.5"}`}
      />
      <p className="leading-relaxed">
        <span className="font-semibold">นี่คือการคาดการณ์จากโปรแกรม</span> เพื่อช่วยวางแผนเบื้องต้น
        — ตัวเลขจริงอาจต่างกันตามเอกสารและกรณีของท่าน{" "}
        <span className="font-medium">โปรดตรวจสอบความถูกต้องอีกครั้งก่อนยื่นภาษีจริง</span>
      </p>
    </div>
  );
}

/** Computes upcoming Thai filing deadline (mid-year ภงด.94 or annual ภงด.90/91). */
function nextDeadline(now = new Date()) {
  const y = now.getFullYear();
  // ภงด.94 — ยื่นภายใน 30 ก.ย. (ออนไลน์ ~8 ต.ค.)
  const midPaper = new Date(y, 8, 30); // Sep 30
  const midOnline = new Date(y, 9, 8); // Oct 8
  // ภงด.90/91 — ยื่นภายใน 31 มี.ค. ปีถัดไป (ออนไลน์ ~8 เม.ย.)
  const annPaper = new Date(y + 1, 2, 31);
  const annOnline = new Date(y + 1, 3, 8);

  if (now <= midOnline) {
    return {
      title: "ภงด.94 — ภาษีครึ่งปี",
      desc: "สำหรับเงินได้ 40(5)-(8) เช่น ค่าเช่า / วิชาชีพอิสระ / ขายของออนไลน์",
      paper: midPaper,
      online: midOnline,
    };
  }
  if (now <= annOnline) {
    return {
      title: "ภงด.90/91 — ภาษีประจำปี",
      desc: "ยื่นภาษีเงินได้บุคคลธรรมดาประจำปี",
      paper: annPaper,
      online: annOnline,
    };
  }
  // fallback — next mid-year
  return {
    title: "ภงด.94 — ภาษีครึ่งปี (ปีถัดไป)",
    desc: "สำหรับเงินได้ 40(5)-(8)",
    paper: new Date(y + 1, 8, 30),
    online: new Date(y + 1, 9, 8),
  };
}

function daysUntil(d: Date, now = new Date()) {
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const TH_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];
function fmtTh(d: Date) {
  return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export function TaxFilingReminder() {
  const dl = React.useMemo(() => nextDeadline(), []);
  const daysOnline = daysUntil(dl.online);
  const urgent = daysOnline <= 30;

  return (
    <Card
      className={`animate-fade-up ${urgent ? "border-destructive/40 bg-destructive/5" : "border-primary/30 bg-primary-soft/40"}`}
    >
      <CardContent className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <div
            className={`rounded-lg p-2 ${urgent ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}
          >
            {urgent ? <AlertTriangle className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
          </div>
          <div>
            <p className="text-sm font-semibold">{dl.title}</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{dl.desc}</p>
          </div>
        </div>
        <div className="text-right text-[11px] shrink-0">
          <p className={`num font-semibold ${urgent ? "text-destructive" : "text-foreground"}`}>
            อีก {daysOnline > 0 ? daysOnline : 0} วัน
          </p>
          <p className="text-muted-foreground">
            กระดาษ <span className="num">{fmtTh(dl.paper)}</span> · ออนไลน์{" "}
            <span className="num">{fmtTh(dl.online)}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
