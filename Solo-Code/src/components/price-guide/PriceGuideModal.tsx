import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DISCLAIMER_TAX_PRICE } from "@/lib/copyConstants";
import { toast } from "sonner";
import {
  JOB_TYPE_OPTIONS,
  COMPLEXITY_OPTIONS,
  computeSuggestion,
  fmt,
  type JobType,
  type Complexity,
  type PriceSuggestion,
} from "./priceLogic";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onApplyPrice?: (price: number) => void;
  initialQuantity?: number;
  initialJobType?: JobType;
}

type Step = 1 | 2 | 3 | 4;

export function PriceGuideModal({
  open,
  onOpenChange,
  onApplyPrice,
  initialQuantity,
  initialJobType,
}: Props) {
  const [step, setStep] = React.useState<Step>(1);
  const [jobType, setJobType] = React.useState<JobType>(initialJobType ?? "logo");
  const [days, setDays] = React.useState<number>(3);
  const [quantity, setQuantity] = React.useState<number>(initialQuantity ?? 1);
  const [complexity, setComplexity] = React.useState<Complexity>("normal");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{
    suggestion: PriceSuggestion;
    reasoning: string;
    eventId: string | null;
  } | null>(null);

  // feedback state
  const [feedback, setFeedback] = React.useState<"up" | "down" | null>(null);
  const [feedbackReason, setFeedbackReason] = React.useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setStep(1);
      setResult(null);
      setFeedback(null);
      setFeedbackReason("");
      if (initialQuantity) setQuantity(initialQuantity);
      if (initialJobType) setJobType(initialJobType);
    }
  }, [open, initialQuantity, initialJobType]);

  async function handleCalculate() {
    setLoading(true);
    const suggestion = computeSuggestion(jobType, days, complexity);
    try {
      const { data, error } = await supabase.functions.invoke("ai-price-suggest", {
        body: { jobType, days, complexity, quantity, suggestion },
      });
      if (error) throw error;
      const finalSuggestion = data?.marketAvg
        ? computeSuggestion(jobType, days, complexity, data.marketAvg)
        : suggestion;
      setResult({
        suggestion: finalSuggestion,
        reasoning: data?.reasoning || "ราคานี้คำนวณจากเวลาและความยากของงานครับ",
        eventId: data?.eventId ?? null,
      });
      setStep(4);
    } catch (e) {
      console.error(e);
      setResult({
        suggestion,
        reasoning: `ราคานี้คำนวณจากเวลาทำงาน + ความยาก + ค่าเฉลี่ยตลาดครับ\n${DISCLAIMER_TAX_PRICE}`,
        eventId: null,
      });
      setStep(4);
      toast.info("ใช้การคำนวณท้องถิ่น (AI ไม่พร้อมใช้งาน)");
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (result && onApplyPrice) {
      onApplyPrice(result.suggestion.recommended);
      toast.success("อัปเดตราคาแล้ว");
      onOpenChange(false);
    }
  }

  async function submitFeedback(rating: "up" | "down") {
    if (!result) return;
    setFeedback(rating);
    if (rating === "up") {
      // submit immediately
      await persistFeedback("up", "");
    }
  }

  async function persistFeedback(rating: "up" | "down", reason: string) {
    setFeedbackSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("not signed in");
      const { error } = await supabase.from("price_guide_feedback").insert({
        user_id: u.user.id,
        event_id: result?.eventId,
        job_type: jobType,
        rating,
        reason: reason.trim() || null,
      });
      if (error) throw error;
      toast.success("ขอบคุณสำหรับฟีดแบ็ก!");
    } catch (e) {
      console.error(e);
      toast.error("บันทึกฟีดแบ็กไม่สำเร็จ");
      setFeedback(null);
    } finally {
      setFeedbackSubmitting(false);
    }
  }

  const baseCostPreview = days * 8 * 300;
  const lineTotal = result ? result.suggestion.recommended * quantity : 0;
  const lineWHT = Math.round(lineTotal * 0.03);
  const lineNet = lineTotal - lineWHT;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden glass border-primary/20">
        <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5 border-b border-primary/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="h-8 w-8 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-soft">
                <Sparkles className="h-4 w-4" />
              </div>
              AI Quick Price Check
            </DialogTitle>
            <DialogDescription className="text-xs">
              ตอบคำถามสั้นๆ ให้ So1o Mentor ช่วยประเมินราคาที่สมเหตุสมผล
            </DialogDescription>
          </DialogHeader>
          {step < 4 && (
            <div className="flex gap-1.5 mt-3">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    s <= step ? "bg-primary" : "bg-primary/15"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {step === 1 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">งานประเภทไหนครับ?</Label>
              <Select value={jobType} onValueChange={(v) => setJobType(v as JobType)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                เราจะดึงราคาเฉลี่ยจากฟรีแลนซ์ในระบบ So1o มาเป็นเกณฑ์
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">ประเมินเวลาทำงานกี่วัน?</Label>
              <Input
                type="number"
                min={0.5}
                step={0.5}
                value={days}
                onChange={(e) => setDays(Number(e.target.value) || 1)}
                className="h-11 num"
              />
              <Label className="text-sm font-medium pt-2 block">จำนวน (qty) ที่ต้องส่ง?</Label>
              <Input
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="h-11 num"
              />
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-xs">
                <p className="text-muted-foreground mb-1">ต้นทุนค่าแรงตัวเอง:</p>
                <p className="font-semibold text-primary num">
                  {days} วัน × 8 ชม. × ฿300 = ฿{fmt(baseCostPreview)}
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">งานนี้ "หิน" แค่ไหน?</Label>
              <div className="grid grid-cols-1 gap-2">
                {COMPLEXITY_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setComplexity(o.value)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      complexity === o.value
                        ? "border-primary bg-primary/10 shadow-soft"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{o.label}</span>
                      <span className="text-xs text-muted-foreground num">
                        {o.markup > 0
                          ? `+${Math.round(o.markup * 100)}%`
                          : o.markup < 0
                            ? `${Math.round(o.markup * 100)}%`
                            : "—"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && result && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20 p-5 text-center">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">
                  ราคาแนะนำ / หน่วย
                </p>
                <p className="text-3xl font-bold text-primary num">
                  ฿{fmt(result.suggestion.recommended)}
                </p>
                <p className="text-xs text-muted-foreground mt-1 num">
                  ช่วงราคา ฿{fmt(result.suggestion.min)} – ฿{fmt(result.suggestion.max)}
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] bg-white/60 backdrop-blur px-2.5 py-1 rounded-full border border-primary/15">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  <span className="num">
                    เฉลี่ยใน So1o: ฿{fmt(result.suggestion.marketAvg.min)}–฿
                    {fmt(result.suggestion.marketAvg.max)}
                  </span>
                </div>
              </div>

              {/* Line total breakdown */}
              <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ราคา/หน่วย × จำนวน</span>
                  <span className="num">
                    ฿{fmt(result.suggestion.recommended)} × {quantity}
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>ยอดรวมก่อนหัก</span>
                  <span className="num">฿{fmt(lineTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">หัก ณ ที่จ่าย 3%</span>
                  <span className="num text-destructive">−฿{fmt(lineWHT)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-1 border-t border-border/50">
                  <span>รับจริง (โอนเข้าบัญชี)</span>
                  <span className="num text-success">฿{fmt(lineNet)}</span>
                </div>
              </div>

              <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-xs leading-relaxed whitespace-pre-line">
                <p className="font-medium text-primary mb-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> So1o Mentor บอกว่า
                </p>
                {result.reasoning}
              </div>

              {/* Feedback */}
              <div className="rounded-lg border border-border/60 p-3 space-y-2">
                <p className="text-[11px] text-muted-foreground">
                  ราคานี้ตรงใจไหมครับ? ฟีดแบ็กของคุณช่วยปรับช่วงราคาตลาดให้แม่นขึ้น
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={feedback === "up" ? "default" : "outline"}
                    onClick={() => submitFeedback("up")}
                    disabled={feedbackSubmitting || feedback === "up"}
                    className="flex-1 gap-1.5"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" /> ตรงใจ
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={feedback === "down" ? "default" : "outline"}
                    onClick={() => submitFeedback("down")}
                    disabled={feedbackSubmitting}
                    className="flex-1 gap-1.5"
                  >
                    <ThumbsDown className="h-3.5 w-3.5" /> ไม่ตรง
                  </Button>
                </div>
                {feedback === "down" && (
                  <div className="space-y-2 pt-1">
                    <Textarea
                      placeholder="บอกเราหน่อยว่าควรเป็นเท่าไหร่ หรือไม่ตรงตรงไหน..."
                      value={feedbackReason}
                      onChange={(e) => setFeedbackReason(e.target.value)}
                      rows={2}
                      maxLength={300}
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => persistFeedback("down", feedbackReason)}
                      disabled={feedbackSubmitting}
                      className="w-full h-8 text-xs"
                    >
                      ส่งฟีดแบ็ก
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border/50 bg-muted/20 flex items-center justify-between gap-2">
          {step > 1 && step < 4 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep((step - 1) as Step)}
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> ย้อนกลับ
            </Button>
          )}
          <div className="flex-1" />
          {step < 3 && (
            <Button onClick={() => setStep((step + 1) as Step)} className="bg-primary">
              ถัดไป <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === 3 && (
            <Button onClick={handleCalculate} disabled={loading} className="bg-gradient-primary">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> กำลังคำนวณ...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1" /> คำนวณราคา
                </>
              )}
            </Button>
          )}
          {step === 4 && (
            <>
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                คำนวณใหม่
              </Button>
              {onApplyPrice && (
                <Button onClick={handleApply} className="bg-gradient-primary">
                  <CheckCircle2 className="h-4 w-4 mr-1" /> ใช้ราคานี้
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
