import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { User, Briefcase, ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";
import { FREELANCER_QS, CLIENT_QS, type Persona } from "./surveyShared";

export function OnboardingFlow() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, loading } = useAuth();
  const [step, setStep] = React.useState(0); // 0 = persona, 1..N = questions
  const [persona, setPersona] = React.useState<Persona | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, string | string[]>>({});
  const [saving, setSaving] = React.useState(false);
  const [direction, setDirection] = React.useState(1);

  const open = !!user && !loading && profile && !profile.onboarding_completed;
  const questions =
    persona === "freelancer" ? FREELANCER_QS : persona === "client" ? CLIENT_QS : [];
  const totalSteps = 1 + questions.length;
  const progress = Math.round(((step + 1) / Math.max(1, totalSteps)) * 100);

  if (!open) return null;

  const currentQ = step > 0 ? questions[step - 1] : null;
  const currentVal = currentQ ? answers[currentQ.key] : null;
  const canNext =
    step === 0
      ? !!persona
      : currentQ?.multi
        ? Array.isArray(currentVal) && currentVal.length > 0
        : !!currentVal;

  const next = () => {
    if (!canNext) return;
    setDirection(1);
    setStep((s) => s + 1);
  };
  const back = () => {
    if (step === 0) return;
    setDirection(-1);
    setStep((s) => s - 1);
  };

  const finish = async () => {
    if (!user || !persona) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        persona,
        onboarding_data: { persona, ...answers },
        onboarding_completed: true,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
      return;
    }
    toast.success("ยินดีต้อนรับ! เริ่มจาก 3 ขั้นแรกใน Dashboard");
    await refreshProfile();
    navigate({ to: "/dashboard", search: { tab: "overview" }, replace: true });
  };

  const pickOption = (val: string) => {
    if (!currentQ) return;
    if (currentQ.multi) {
      const arr = Array.isArray(currentVal) ? [...currentVal] : [];
      const idx = arr.indexOf(val);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(val);
      setAnswers((a) => ({ ...a, [currentQ.key]: arr }));
    } else {
      setAnswers((a) => ({ ...a, [currentQ.key]: val }));
    }
  };

  const isPicked = (val: string) => {
    if (!currentQ) return false;
    if (currentQ.multi) return Array.isArray(currentVal) && currentVal.includes(val);
    return currentVal === val;
  };

  const isLast = step === totalSteps - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto">
      <div className="ambient-blobs" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        aria-hidden="true"
        style={{ backgroundImage: "var(--gradient-mesh)" }}
      />

      {/* Progress bar */}
      <div className="sticky top-0 z-10 glass border-b border-white/40">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">เริ่มต้นใช้งาน</p>
            <p className="text-xs font-semibold text-primary">
              {step + 1} / {totalSteps}
            </p>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-primary"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            {step === 0 ? (
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  คุณคือใครในแพลตฟอร์มนี้?
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  เลือกสิ่งที่ใกล้เคียงคุณที่สุด เราจะปรับแต่งประสบการณ์ให้
                </p>

                <div className="mt-6 grid sm:grid-cols-2 gap-3">
                  <PersonaCard
                    icon={Briefcase}
                    title="ฟรีแลนซ์"
                    desc="รับงาน บริหารผลงาน ลูกค้า และรายได้"
                    active={persona === "freelancer"}
                    onClick={() => setPersona("freelancer")}
                  />
                  <PersonaCard
                    icon={User}
                    title="ลูกค้า / ผู้จ้าง"
                    desc="หาฟรีแลนซ์เก่งๆ มาทำงานให้"
                    active={persona === "client"}
                    onClick={() => setPersona("client")}
                  />
                </div>
              </div>
            ) : currentQ ? (
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{currentQ.title}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{currentQ.subtitle}</p>

                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {currentQ.options.map((opt) => {
                    const Icon = opt.icon;
                    const picked = isPicked(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => pickOption(opt.value)}
                        className={`group relative flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition-all ${
                          picked
                            ? "border-primary bg-primary/10 shadow-elevated scale-[1.02]"
                            : "border-border bg-white/60 hover:bg-white hover:border-primary/40 hover:scale-[1.02] hover:shadow-soft"
                        }`}
                      >
                        <Icon
                          className={`h-6 w-6 ${picked ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
                        />
                        <span
                          className={`text-xs font-medium ${picked ? "text-primary" : "text-foreground"}`}
                        >
                          {opt.label}
                        </span>
                        {picked && (
                          <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground grid place-items-center">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        {/* Nav */}
        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={back}
            disabled={step === 0 || saving}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> ย้อนกลับ
          </Button>
          {isLast ? (
            <Button
              onClick={finish}
              disabled={!canNext || saving}
              className="gap-1.5 bg-gradient-primary text-primary-foreground shadow-elevated min-w-[140px]"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              เริ่มใช้งาน
            </Button>
          ) : (
            <Button
              onClick={next}
              disabled={!canNext}
              className="gap-1.5 bg-gradient-primary text-primary-foreground shadow-elevated min-w-[120px]"
            >
              ถัดไป <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          ต้องตอบครบทุกข้อเพื่อปลดล็อกหลังบ้าน
        </p>
      </div>
    </div>
  );
}

function PersonaCard({
  icon: Icon,
  title,
  desc,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col items-start gap-2 rounded-2xl border p-5 text-left transition-all ${
        active
          ? "border-primary bg-primary/10 shadow-elevated scale-[1.02]"
          : "border-border bg-white/60 hover:bg-white hover:border-primary/40 hover:scale-[1.01] hover:shadow-soft"
      }`}
    >
      <div
        className={`h-10 w-10 rounded-xl grid place-items-center ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground">{desc}</p>
      {active && (
        <span className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary text-primary-foreground grid place-items-center">
          <Check className="h-3 w-3" />
        </span>
      )}
    </button>
  );
}
