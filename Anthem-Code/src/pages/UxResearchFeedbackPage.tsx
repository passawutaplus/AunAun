import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ClipboardList } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/brandConfig";
import SeoHead from "@/components/SeoHead";
import UxResearchFeedbackForm from "@/components/research/UxResearchFeedbackForm";

export default function UxResearchFeedbackPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title="ส่งผลการทดสอบ UX"
        description={`ฟอร์มส่งผล UX research สำหรับ ${BRAND_NAME} — ไม่ต้องเข้าสู่ระบบ`}
        path="/research/feedback"
      />

      <header className="border-b border-border/60 bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <BackButton to="/research" label="กลับคู่มือ UX" />
          <span className="text-xs font-medium text-primary uppercase tracking-wider">UX Feedback</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 pb-24 space-y-6">
        {submitted ? (
          <section className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold thai-display">ส่งผลเรียบร้อยแล้ว</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ขอบคุณที่ช่วยทดสอบ {BRAND_NAME} — ทีมจะนำผลไปปรับปรุงต่อ
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/research">กลับคู่มือ UX</Link>
              </Button>
              <Button asChild className="rounded-full">
                <Link to="/">กลับหน้าแรก</Link>
              </Button>
            </div>
          </section>
        ) : (
          <>
            <section className="space-y-2">
              <p className="text-xs font-medium text-primary tracking-wide uppercase">Session summary</p>
              <h1 className="text-3xl font-semibold thai-display tracking-tight">ส่งผลการทดสอบ UX</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                เปิดแท็บนี้ค้างไว้ขณะทดสอบตาม{" "}
                <Link to="/research" className="text-primary hover:underline">
                  คู่มือ /research
                </Link>{" "}
                — ติ๊กสิ่งที่ทำแล้วและให้คะแนน ส่งครั้งเดียวตอนจบ (ไม่ต้อง login)
              </p>
            </section>

            <section className="rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4 space-y-1 text-sm">
              <p className="font-semibold flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-amber-600" />
                ก่อนส่ง
              </p>
              <ul className="text-muted-foreground list-disc pl-5 space-y-1">
                <li>ใส่ชื่อที่ทีมรู้จัก — ไม่เก็บอีเมลหรือข้อมูลส่วนตัว</li>
                <li>ติ๊ก T1–T8 และ section A–T ที่ไล่แล้ว</li>
                <li>ให้คะแนน 1–5 ครบ 8 ข้อ</li>
              </ul>
            </section>

            <UxResearchFeedbackForm onSuccess={() => setSubmitted(true)} />
          </>
        )}
      </main>
    </div>
  );
}
