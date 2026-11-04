import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import SectionHeader from "@/components/admin/SectionHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAdminInviteAction } from "@/hooks/useCreatorInvites";
import { EMAIL_RE, INVITE_DISCIPLINES } from "@/lib/creatorInvite";

type SendMode = "email_now" | "scheduled" | "manual_dm";

const AUTO_EMAILS: [string, string][] = [
  ["คำเชิญ", "ตอนสร้าง หรือตามเวลาที่ตั้ง"],
  ["เตือน 1 ครั้ง", "5 วันถ้ายังไม่เริ่มกรอก"],
  ["ยืนยันว่าได้รับข้อมูล", "ทันทีที่ศิลปินกดส่ง"],
  ["ลิงก์ตรวจอนุมัติ", "เมื่อทีมกด “ส่งลิงก์ตรวจ”"],
  ["บัญชีพร้อมใช้ + รหัสสุ่ม", "หลังศิลปินอนุมัติและทีมกดเผยแพร่"],
];

function tomorrowAt10(): string {
  const d = new Date(Date.now() + 86400_000);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00`;
}

export default function AdminCreatorInvitationNewPage() {
  const navigate = useNavigate();
  const action = useAdminInviteAction();
  const [f, setF] = useState({
    display_name: "",
    discipline: "",
    country: "Thailand",
    contact: "",
    language: "th" as "th" | "en",
    expires_days: 30,
    personal_note: "",
    interest_url: "",
  });
  const [mode, setMode] = useState<SendMode>("email_now");
  const [scheduledAt, setScheduledAt] = useState(tomorrowAt10());
  const [reminder, setReminder] = useState(true);
  const isEmail = EMAIL_RE.test(f.contact.trim());
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const effectiveMode: SendMode = isEmail ? mode : "manual_dm";
  const canSubmit = f.display_name.trim() && f.contact.trim() && !action.isPending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const res = (await action.mutateAsync({
      action: "create",
      invite: {
        ...f,
        display_name: f.display_name.trim(),
        contact: f.contact.trim(),
        send_mode: effectiveMode,
        scheduled_at: effectiveMode === "scheduled" ? new Date(scheduledAt).toISOString() : null,
        auto_reminder: isEmail && reminder,
      },
    })) as { id: string; invite_link: string; mail?: { sent: number; failed: number } | null };
    if (effectiveMode === "email_now") {
      if (res.mail?.sent) toast.success(`สร้างแล้ว · ส่งอีเมลถึง ${f.contact.trim()}`);
      else toast.warning("สร้างแล้ว แต่อีเมลยังไม่ออก — ดูผลส่งในหน้ารายละเอียด");
    } else if (effectiveMode === "scheduled") toast.success("สร้างแล้ว · ตั้งเวลาส่งไว้");
    else toast.success("สร้างแล้ว · คัดลอกลิงก์และข้อความไปส่งทาง DM");
    navigate(`/admin/creator-invitations/${res.id}`, { state: { inviteLink: res.invite_link } });
  }

  const modeOption = (value: SendMode, title: string, sub: string, disabled = false) => (
    <label htmlFor={`sm-${value}`} className={`flex items-start gap-3 rounded-sm border border-admin-border p-3 ${disabled ? "opacity-50" : "cursor-pointer hover:bg-admin-hover"}`}>
      <RadioGroupItem id={`sm-${value}`} value={value} disabled={disabled} className="mt-0.5" />
      <span className="text-sm">
        <span className="font-medium text-admin-fg">{title}</span>
        <span className="block text-xs text-admin-muted">{sub}</span>
        {value === "scheduled" && effectiveMode === "scheduled" ? (
          <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="mt-2 h-9 w-auto" aria-label="เวลาส่ง (เวลาเครื่อง)" />
        ) : null}
      </span>
    </label>
  );

  return (
    <div>
      <p className="mb-2 text-xs text-admin-muted">
        <Link to="/admin/creator-invitations" className="hover:underline">
          Creator invitations
        </Link>{" "}
        / ใหม่
      </p>
      <SectionHeader eyebrow="growth" title="สร้างคำเชิญ" description="ลิงก์เฉพาะตัวสุ่มจากระบบ (ไม่ใช้ชื่อหรืออีเมล) · ยกเลิกหรือต่ออายุได้ · ตั้ง noindex" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <form onSubmit={submit} className="space-y-4 rounded-sm border border-admin-border p-5">
          <div className="space-y-1.5">
            <Label htmlFor="ci-name">ชื่อที่จะแสดงบนคำเชิญ *</Label>
            <Input id="ci-name" value={f.display_name} maxLength={120} onChange={(e) => set("display_name", e.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ci-disc">สาขา</Label>
              <Select value={f.discipline} onValueChange={(v) => set("discipline", v)}>
                <SelectTrigger id="ci-disc">
                  <SelectValue placeholder="เลือกสาขา" />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_DISCIPLINES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ci-country">ประเทศ</Label>
              <Input id="ci-country" value={f.country} maxLength={80} onChange={(e) => set("country", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ci-contact">อีเมล หรือ handle โซเชียล *</Label>
            <Input id="ci-contact" value={f.contact} maxLength={254} placeholder="name@example.com หรือ @handle" onChange={(e) => set("contact", e.target.value)} required />
            <p className="text-xs text-admin-muted">{f.contact && !isEmail ? "ไม่ใช่อีเมล — ระบบจะไม่ส่งอีเมล ให้ส่งเองทาง DM" : "ใช้อีเมลจริงของศิลปิน ระบบจะใช้สร้างบัญชีหลังอนุมัติ"}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ci-lang">ภาษา (หน้าเชิญ + อีเมล)</Label>
              <Select value={f.language} onValueChange={(v) => set("language", v as "th" | "en")}>
                <SelectTrigger id="ci-lang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="th">ไทย</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ci-exp">หมดอายุ</Label>
              <Select value={String(f.expires_days)} onValueChange={(v) => set("expires_days", Number(v))}>
                <SelectTrigger id="ci-exp">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[14, 30, 60].map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} วัน
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ci-note">ข้อความส่วนตัว (แสดงบนหน้าคำเชิญและในอีเมล)</Label>
            <Textarea id="ci-note" rows={3} maxLength={600} value={f.personal_note} placeholder="ผมสนใจผลงานของคุณ เลยอยากชวนมาเป็นครีเอเตอร์กลุ่มแรกของเรา" onChange={(e) => set("personal_note", e.target.value)} />
            <p className="text-xs text-admin-muted">ใช้ “สนใจผลงานของคุณ” — อย่าอ้างว่าติดตามมานานถ้าไม่จริง</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ci-url">ผลงานที่ทำให้สนใจ (ภายใน · ไม่แสดงต่อศิลปิน)</Label>
            <Input id="ci-url" type="url" value={f.interest_url} maxLength={500} placeholder="https://" onChange={(e) => set("interest_url", e.target.value)} />
          </div>

          <fieldset className="space-y-2 border-t border-admin-border pt-4">
            <legend className="mb-2 text-sm font-medium">ส่งคำเชิญ</legend>
            <RadioGroup value={effectiveMode} onValueChange={(v) => setMode(v as SendMode)} className="gap-2">
              {modeOption("email_now", "ส่งอีเมลอัตโนมัติทันที", "จาก “Aun · SAMECOR” <invite@samecor.com> · ตอบกลับไปที่ info@samecor.com", !isEmail)}
              {modeOption("scheduled", "ตั้งเวลาส่ง", "เช่น พรุ่งนี้ 10:00 (เวลาไทย) · ระบบส่งในรอบ 10 นาทีถัดไป", !isEmail)}
              {modeOption("manual_dm", "ส่งเองทาง DM", "ได้ลิงก์ + ข้อความ TH/EN ไปคัดลอกในหน้ารายละเอียด")}
            </RadioGroup>
            <label className={`flex items-start gap-2.5 pt-2 text-sm ${!isEmail ? "opacity-50" : ""}`}>
              <Checkbox checked={isEmail && reminder} disabled={!isEmail} onCheckedChange={(v) => setReminder(v === true)} className="mt-0.5" />
              <span>
                เตือนอัตโนมัติ 1 ครั้งหลัง 5 วัน ถ้ายังไม่เริ่มกรอก <span className="text-xs text-admin-muted">· หยุดเองเมื่อตอบรับ/ปฏิเสธ/เลิกรับอีเมล</span>
              </span>
            </label>
          </fieldset>
          <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
            {action.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : null}
            {effectiveMode === "email_now" ? "สร้างคำเชิญและส่งอีเมล" : effectiveMode === "scheduled" ? "สร้างและตั้งเวลาส่ง" : "สร้างคำเชิญ"}
          </Button>
        </form>

        <aside className="space-y-4">
          <div className="rounded-sm border border-admin-border p-4">
            <p className="text-sm font-medium">อีเมลที่ระบบส่งเองตลอดทาง</p>
            <ol className="mt-2 space-y-1.5 text-xs">
              {AUTO_EMAILS.map(([a, b]) => (
                <li key={a}>
                  <span className="font-medium text-admin-fg">{a}</span> <span className="text-admin-muted">· {b}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[11px] text-admin-muted">
              ทุกฉบับเป็นไทย/อังกฤษตามภาษาที่เลือก · มีลิงก์เลิกรับอีเมล · บันทึกผลส่งในหน้ารายละเอียด · LINE แจ้งกลุ่ม Noti SAMECOR เมื่อศิลปินส่งข้อมูล
            </p>
          </div>
          <div className="rounded-sm border border-admin-border p-4 text-xs text-admin-muted">
            <p className="text-sm font-medium text-admin-fg">ส่งทีละหลายคน</p>
            ในหน้ารายการ ติ๊กเลือกหลายคนแล้วกด “ส่งอีเมลคำเชิญ” · ไม่เกิน 50 ฉบับ/ชม. กันโดนมองเป็นสแปม · นำเข้า CSV และการ์ดภาพอัตโนมัติ = V1.1
          </div>
        </aside>
      </div>
    </div>
  );
}
