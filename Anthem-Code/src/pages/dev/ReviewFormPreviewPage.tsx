import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SeoHead from "@/components/SeoHead";
import { Button } from "@/components/ui/button";
import {
  WorkReviewDialog,
  type WorkReviewDialogTarget,
} from "@/components/reviews/WorkReviewDialog";
import { BRAND_NAME } from "@/lib/brandConfig";
import type { WorkReviewWizardStep } from "@/lib/workReviews";
import { cn } from "@/lib/utils";

const PREVIEW_TARGET: WorkReviewDialogTarget = {
  kind: "hire",
  subjectUserId: "82039b6d-cdf4-4c46-958a-d770d849382c",
  subjectName: "passawut.a.plus",
  hireRequestId: "00000000-0000-0000-0000-000000000002",
  projectId: "1fa5f711-4b42-4de1-a755-4573d5e89ce0",
  contextLabel: "E+xplorers",
  projectCoverUrl:
    "https://zkflkpbmbozrchqncpzi.supabase.co/storage/v1/object/public/project-media/anthem/82039b6d-cdf4-4c46-958a-d770d849382c/3fcd9ef0-1bf8-427c-8e9c-7127081c8886/b1c76751-db6e-46a7-834e-05683a627b42.webp",
  subjectAvatarUrl:
    "https://zkflkpbmbozrchqncpzi.supabase.co/storage/v1/object/public/project-media/anthem/82039b6d-cdf4-4c46-958a-d770d849382c/avatar/5c1c6002-4002-41f7-b0a7-2dacdd7dfe91.webp",
};

const SCREENS: { step: WorkReviewWizardStep; label: string; blurb: string }[] = [
  { step: "rate", label: "1 · รีวิวครีเอเตอร์", blurb: "5 หมวดดาว + ค่าเฉลี่ย + ความคิดเห็น (สาธารณะ)" },
  { step: "system", label: "2 · แพลตฟอร์ม (ไม่เปิดเผย)", blurb: "5 หมวดดาวแพลตฟอร์ม + NPS + ข้อความ" },
  { step: "done", label: "3 · สำเร็จ", blurb: "หน้าจบรีวิวสำเร็จ" },
];

/** Temporary UI preview — jump to any wizard screen without writing to DB. */
export default function ReviewFormPreviewPage() {
  const [open, setOpen] = useState(true);
  const [initialStep, setInitialStep] = useState<WorkReviewWizardStep>("rate");
  const [nonce, setNonce] = useState(0);

  const dialogKey = useMemo(() => `${initialStep}-${nonce}`, [initialStep, nonce]);

  const openAt = (step: WorkReviewWizardStep) => {
    const mapped = step === "intro" || step === "private" ? (step === "intro" ? "rate" : "system") : step;
    setInitialStep(mapped);
    setNonce((n) => n + 1);
    setOpen(true);
  };

  return (
    <main className="min-h-screen bg-app-ambient px-4 py-12">
      <SeoHead
        path="/dev/review-form"
        title={`พรีวิวฟอร์มรีวิว · ${BRAND_NAME}`}
        description="ดูทุกหน้าของ wizard รีวิวจ้างงาน/คอลแลป"
      />
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <h1 className="thai-display text-2xl font-semibold">พรีวิวฟอร์มรีวิว</h1>
          <p className="text-sm text-muted-foreground">
            โหมดเดโม่ — ใช้ผลงานจริง E+xplorers / passawut.a.plus เป็นตัวอย่าง ไม่บันทึกข้อมูล
          </p>
        </div>

        <ul className="space-y-2">
          {SCREENS.map((s) => (
            <li key={s.step}>
              <button
                type="button"
                onClick={() => openAt(s.step)}
                className={cn(
                  "flex w-full flex-col rounded-2xl border border-border/60 bg-card/50 px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-card",
                  open && initialStep === s.step && "border-primary/50 bg-primary/5",
                )}
              >
                <span className="text-sm font-semibold text-foreground">{s.label}</span>
                <span className="mt-0.5 text-xs text-muted-foreground">{s.blurb}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            className="rounded-full bg-gradient-brand text-white hover:opacity-90"
            onClick={() => openAt("rate")}
          >
            เปิดจากหน้าแรก
          </Button>
          <Link to="/" className="text-sm text-primary hover:underline">
            กลับหน้าแรก
          </Link>
        </div>
      </div>

      <WorkReviewDialog
        key={dialogKey}
        open={open}
        onOpenChange={setOpen}
        target={PREVIEW_TARGET}
        demoMode
        initialStep={initialStep}
      />
    </main>
  );
}
