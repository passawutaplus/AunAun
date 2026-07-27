import { useEffect, useRef } from "react";
import { ChevronDown, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getKycPdpaAgreementSections, KYC_PDPA_CONSENT_VERSION } from "@/lib/kycPdpa";
import { cn } from "@/lib/utils";

type Props = {
  readComplete: boolean;
  onReadComplete: () => void;
  className?: string;
};

/** Scrollable KYC/PDPA agreement — must reach bottom (or jump) before consent unlocks. */
export function KycPdpaConsentReader({ readComplete, onReadComplete, className }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sections = getKycPdpaAgreementSections();

  const markComplete = () => {
    if (!readComplete) onReadComplete();
  };

  const checkBottom = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remaining <= 24) markComplete();
  };

  useEffect(() => {
    checkBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + content size only
  }, []);

  const jumpToBottom = () => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    // Smooth scroll may not fire enough events on short content — unlock after settle
    window.setTimeout(() => markComplete(), 450);
  };

  return (
    <div className={cn("rounded-xl border border-border/70 bg-muted/15 overflow-hidden", className)}>
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border/60 bg-background/40">
        <div className="min-w-0 space-y-0.5">
          <p className="text-base font-medium text-foreground">ข้อมูลที่เราจะเก็บ (ตาม PDPA)</p>
          <p className="text-sm text-muted-foreground">
            ข้อตกลงแพลตฟอร์ม–ผู้ใช้ · เวอร์ชัน {KYC_PDPA_CONSENT_VERSION}
          </p>
        </div>
        {readComplete ? (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-4 h-4" /> อ่านครบแล้ว
          </span>
        ) : (
          <Button type="button" size="sm" variant="outline" className="rounded-full h-9 text-sm shrink-0" onClick={jumpToBottom}>
            <ChevronDown className="w-4 h-4 mr-1" /> เลื่อนลงท้าย
          </Button>
        )}
      </div>

      <div
        ref={scrollerRef}
        onScroll={checkBottom}
        className="max-h-[min(52vh,420px)] overflow-y-auto px-4 py-4 space-y-5 text-sm leading-relaxed scroll-smooth"
        tabIndex={0}
        role="region"
        aria-label="เอกสารยินยอม KYC ตาม PDPA"
      >
        {sections.map((section) => (
          <section key={section.title} className="space-y-2">
            <h3 className="text-base font-medium text-foreground">{section.title}</h3>
            {section.paragraphs.map((p, i) => (
              <p key={`${section.title}-${i}`} className="text-muted-foreground">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

export default KycPdpaConsentReader;
