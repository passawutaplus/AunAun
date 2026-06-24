import * as React from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  title?: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
  onDismiss?: () => void;
}

/**
 * DemoBanner — แจ้งผู้ใช้ว่าเนื้อหาด้านล่างเป็นตัวอย่าง (mock data)
 * ใช้ครอบ UI ที่อยากโชว์หน้าตาให้คนใหม่เห็นก่อนกรอกข้อมูลจริง
 */
export function DemoBanner({
  title = "ตัวอย่างหน้าตา (Preview Mode)",
  description = "นี่คือข้อมูลสาธิต ยังไม่ได้ถูกบันทึกจริง — เพิ่มลูกค้าและข้อมูลของคุณเองเพื่อเริ่มใช้งาน",
  ctaLabel,
  onCta,
  onDismiss,
}: Props) {
  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary-soft/60 via-primary-soft/30 to-transparent p-3 sm:p-4 flex items-start gap-3">
      <div className="h-9 w-9 shrink-0 rounded-xl bg-primary/15 flex items-center justify-center">
        <Sparkles className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        {ctaLabel && onCta && (
          <Button size="sm" onClick={onCta} className="mt-2 h-8 text-xs gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            {ctaLabel}
          </Button>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="ปิดแบนเนอร์ตัวอย่าง"
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
