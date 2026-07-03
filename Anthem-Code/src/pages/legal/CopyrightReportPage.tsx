import { useState } from "react";
import { Link } from "react-router-dom";
import LegalLayout from "@/components/LegalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Copyright, Loader2, Mail, Scale } from "lucide-react";
import { useSubmitCopyrightReport } from "@/hooks/useLegalCompliance";
import { useAuth } from "@/hooks/useAuth";
import { useEnsureSensitiveAction } from "@/components/legal/SensitiveActionReauthProvider";
import { LEGAL_SUPPORT_EMAIL } from "@/lib/legalConfig";

const STEPS = [
  { id: 1, label: "ข้อมูลคุณ" },
  { id: 2, label: "รายละเอียดผลงาน" },
  { id: 3, label: "ยืนยันและส่ง" },
] as const;

const CopyrightReportPage = () => {
  const submit = useSubmitCopyrightReport();
  const { user } = useAuth();
  const ensureVerified = useEnsureSensitiveAction();
  const [step, setStep] = useState(1);
  const [sent, setSent] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [workDesc, setWorkDesc] = useState("");
  const [workUrl, setWorkUrl] = useState("");
  const [infringeUrl, setInfringeUrl] = useState("");
  const [signature, setSignature] = useState("");
  const [goodFaith, setGoodFaith] = useState(false);
  const [authority, setAuthority] = useState(false);

  const canStep1 = name.trim() && email.includes("@");
  const canStep2 = workDesc.trim().length >= 10 && infringeUrl.trim().startsWith("http");
  const canSubmit = signature.trim() && goodFaith && authority;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (user) {
      try {
        await ensureVerified("ส่งคำร้องละเมิดลิขสิทธิ์");
      } catch {
        return;
      }
    }
    await submit.mutateAsync({
      claimant_name: name.trim(),
      claimant_email: email.trim(),
      claimant_role: role.trim() || undefined,
      original_work_description: workDesc.trim(),
      original_work_url: workUrl.trim() || undefined,
      infringing_url: infringeUrl.trim(),
      good_faith_confirmed: goodFaith,
      authority_confirmed: authority,
      signature_text: signature.trim(),
    });
    setSent(true);
  };

  if (sent) {
    return (
      <LegalLayout title="ส่งคำร้องลิขสิทธิ์แล้ว">
        <div className="not-prose flex flex-col items-center text-center gap-4 py-8">
          <CheckCircle2 className="w-12 h-12 text-primary" />
          <div className="space-y-2 max-w-md">
            <h2 className="text-lg font-semibold text-foreground">รับคำร้องแล้ว</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ทีมงานจะตรวจสอบภายใน 7–14 วันทำการ (เร่งด่วนกว่านั้นในกรณีจำเป็น)
              หากต้องการข้อมูลเพิ่ม เราจะติดต่อที่อีเมลที่คุณให้ไว้
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/">กลับหน้าหลัก</Link>
          </Button>
        </div>
      </LegalLayout>
    );
  }

  return (
    <LegalLayout title="แจ้งละเมิดลิขสิทธิ์">
      <div className="not-prose mb-6 rounded-xl border border-border/60 bg-muted/20 p-4 flex gap-3">
        <Copyright className="w-8 h-8 text-primary shrink-0" />
        <div className="space-y-1 text-sm">
          <p className="font-medium text-foreground">สำหรับเจ้าของสิทธิ์หรือผู้ได้รับมอบอำนาจ</p>
          <p className="text-muted-foreground leading-relaxed">
            กรอกแบบฟอร์มนี้ถ้าพบผลงานบน Aplus1 ที่อาจละเมิดลิขสิทธิ์ของคุณ
            หรือกด <strong>รายงาน</strong> บนหน้าผลงานแล้วเลือก &quot;ละเมิดลิขสิทธิ์&quot; ก็ได้
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="not-prose flex gap-1 mb-6">
        {STEPS.map((s) => (
          <div
            key={s.id}
            className={`flex-1 rounded-full h-1.5 transition-colors ${
              step >= s.id ? "bg-primary" : "bg-muted"
            }`}
            title={s.label}
          />
        ))}
      </div>
      <p className="not-prose text-xs text-muted-foreground mb-4">
        ขั้นที่ {step}/3 — {STEPS[step - 1].label}
      </p>

      {step === 1 && (
        <div className="not-prose space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cr-name">ชื่อ-นามสกุล</Label>
            <Input id="cr-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น สมชาย ใจดี" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cr-email">อีเมลติดต่อ</Label>
            <Input id="cr-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cr-role">บทบาท (ไม่บังคับ)</Label>
            <Input id="cr-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="เจ้าของลิขสิทธิ์ / ตัวแทน / ทนายความ" />
          </div>
          <Button type="button" disabled={!canStep1} onClick={() => setStep(2)}>
            ถัดไป
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="not-prose space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cr-work">ผลงานต้นฉบับของคุณ</Label>
            <Textarea
              id="cr-work"
              value={workDesc}
              onChange={(e) => setWorkDesc(e.target.value)}
              placeholder="อธิบายสั้น ๆ ว่าเป็นผลงานอะไร เช่น โปสเตอร์แคมเปญ X ปี 2024"
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cr-work-url">ลิงก์ต้นฉบับ (ถ้ามี)</Label>
            <Input id="cr-work-url" value={workUrl} onChange={(e) => setWorkUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cr-bad">ลิงก์ผลงานที่ละเมิดบน Aplus1</Label>
            <Input
              id="cr-bad"
              value={infringeUrl}
              onChange={(e) => setInfringeUrl(e.target.value)}
              placeholder="https://aplus1.app/project/..."
              required
            />
            <p className="text-[11px] text-muted-foreground">คัดลอก URL จากแถบที่อยู่เบราว์เซอร์</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>ย้อนกลับ</Button>
            <Button type="button" disabled={!canStep2} onClick={() => setStep(3)}>ถัดไป</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="not-prose space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cr-sign">ลายเซ็น (พิมพ์ชื่อเต็ม)</Label>
            <Input id="cr-sign" value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="ชื่อเดียวกับด้านบน" />
          </div>
          <label className="flex gap-2 items-start rounded-lg border p-3 cursor-pointer">
            <Checkbox checked={goodFaith} onCheckedChange={(v) => setGoodFaith(v === true)} className="mt-0.5" />
            <span className="text-sm leading-relaxed">
              ฉันเชื่อโดยสุจริตว่าการใช้งานดังกล่าวไม่ได้รับอนุญาตจากเจ้าของสิทธิ์
            </span>
          </label>
          <label className="flex gap-2 items-start rounded-lg border p-3 cursor-pointer">
            <Checkbox checked={authority} onCheckedChange={(v) => setAuthority(v === true)} className="mt-0.5" />
            <span className="text-sm leading-relaxed">
              ฉันเป็นเจ้าของสิทธิ์ หรือได้รับอนุญาตให้ดำเนินการแทนเจ้าของสิทธิ์
            </span>
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>ย้อนกลับ</Button>
            <Button type="button" disabled={!canSubmit || submit.isPending} onClick={() => void handleSubmit()}>
              {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              ส่งคำร้อง
            </Button>
          </div>
        </div>
      )}

      <div className="not-prose mt-8 pt-6 border-t border-border/60 flex items-start gap-2 text-xs text-muted-foreground">
        <Mail className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          ต้องการส่งทางอีเมล?{" "}
          <a href={`mailto:${LEGAL_SUPPORT_EMAIL}`} className="text-primary underline">{LEGAL_SUPPORT_EMAIL}</a>
        </p>
      </div>
      <div className="not-prose mt-2 flex items-start gap-2 text-xs text-muted-foreground">
        <Scale className="w-4 h-4 shrink-0 mt-0.5" />
        <p>เอกสารนี้เป็นแบบร่างสำหรับการรับเรื่อง — ไม่ใช่คำตัดสินทางกฎหมาย</p>
      </div>
    </LegalLayout>
  );
};

export default CopyrightReportPage;
