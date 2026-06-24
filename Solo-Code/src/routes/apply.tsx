import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RouteError } from "@/components/RouteError";
import * as React from "react";
import { z } from "zod";
import { RequireAuth } from "@/auth/RequireAuth";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles, Rocket, ShieldCheck, Loader2, ArrowRight } from "lucide-react";
import logoUrl from "@/assets/solo-freelancer-logo.webp";
import { appendTesterApplicationToSheet } from "@/server/sheets.functions";
import { LineHeaderButton } from "@/components/LineContactButton";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const Route = createFileRoute("/apply")({
  head: () => ({
    meta: [
      { title: "ร่วมเป็นกลุ่มบุกเบิก — So1o Freelancer" },
      {
        name: "description",
        content:
          "เปิดรับสมัคร Tester รุ่นแรก จำกัด 100 คน เพื่อทดลองใช้เครื่องมือผู้ช่วยฟรีแลนซ์ก่อนใคร",
      },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "ร่วมเป็นกลุ่มบุกเบิก — So1o Freelancer" },
      { property: "og:description", content: "สมัคร Tester รุ่นแรกของ So1o Freelancer" },
      { property: "og:url", content: "https://solofreelancer.com/apply" },
    ],
    links: [{ rel: "canonical", href: "https://solofreelancer.com/apply" }],
  }),
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: () => (
    <RequireAuth>
      <ApplyPage />
    </RequireAuth>
  ),
});

const FIELDS = ["Graphic", "Web Dev", "Content", "Admin Support", "อื่นๆ"] as const;
const YEARS = ["น้อยกว่า 1 ปี", "1-2 ปี", "3-5 ปี", "มากกว่า 5 ปี"] as const;
const QUOTE_METHODS = [
  "เขียนเองใน Word/Excel/Canva/Adobe",
  "ใช้โปรแกรมบัญชีสำเร็จรูป",
  "บอกปากเปล่า/พิมพ์แชท (ไม่มีเอกสาร)",
  "อื่นๆ",
] as const;
const PAINS = [
  "คำนวณราคาไม่ถูก ไม่รู้จะตั้งเท่าไหร่",
  "ลูกค้าแก้รายละเอียดงานไม่จบ (งานงอก)",
  "ตามเก็บเงินมัดจำ/ค่างวดลำบาก",
  "อธิบายสไตล์งานให้ลูกค้าเข้าใจยาก (Visual mismatch)",
  "การบันทึกค่าใช้จ่ายต่างๆ",
  "รายได้และคำนวนภาษี",
  "จดบันทึก supplier",
  "อื่นๆ",
] as const;

const schema = z
  .object({
    full_name: z.string().trim().min(1, "กรุณาระบุชื่อ-นามสกุล").max(120),
    alias_name: z.string().trim().max(120).optional(),
    main_field: z.string().min(1, "กรุณาเลือกสายงาน"),
    main_field_other: z.string().trim().max(120).optional(),
    years_experience: z.string().min(1, "กรุณาเลือกประสบการณ์"),
    contact_email: z.string().trim().max(200).optional(),
    contact_line: z.string().trim().max(200).optional(),
    quotation_method: z.array(z.string()).min(1, "เลือกอย่างน้อย 1 ข้อ"),
    quotation_method_other: z.string().trim().max(200).optional(),
    pain_points: z.array(z.string()),
    pain_points_other: z.string().trim().max(200).optional(),
    feature_request: z.string().trim().max(2000).optional(),
  })
  .refine(
    (d) =>
      (d.contact_email && d.contact_email.length > 0) ||
      (d.contact_line && d.contact_line.length > 0),
    { message: "กรุณาระบุอย่างน้อย 1 ช่องทางติดต่อ (Email หรือ LINE)" },
  )
  .refine((d) => !d.contact_email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.contact_email), {
    message: "รูปแบบอีเมลไม่ถูกต้อง",
    path: ["contact_email"],
  });

function ApplyPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = React.useState(false);
  const submittedRef = React.useRef(false);

  // If already approved, redirect away
  React.useEffect(() => {
    if (profile?.tester_approved) {
      navigate({ to: "/dashboard" });
    }
  }, [profile?.tester_approved, navigate]);

  const [form, setForm] = React.useState({
    full_name: "",
    alias_name: "",
    main_field: "",
    main_field_other: "",
    years_experience: "",
    contact_email: "",
    contact_line: "",
    quotation_method: [] as string[],
    quotation_method_other: "",
    pain_points: [] as string[],
    pain_points_other: "",
    feature_request: "",
  });

  const toggleArr = (key: "quotation_method" | "pain_points", val: string) => {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter((v) => v !== val) : [...f[key], val],
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (submittedRef.current || submitting) return; // กันกดซ้ำ
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "ข้อมูลไม่ครบ");
      return;
    }
    submittedRef.current = true;
    setSubmitting(true);
    const payload: Record<string, unknown> = {
      user_id: user.id,
      full_name: parsed.data.full_name,
      alias_name: parsed.data.alias_name || null,
      main_field: parsed.data.main_field,
      main_field_other:
        parsed.data.main_field === "อื่นๆ" ? parsed.data.main_field_other || null : null,
      years_experience: parsed.data.years_experience,
      contact_email: parsed.data.contact_email || null,
      contact_line: parsed.data.contact_line || null,
      // Legacy columns kept for back-compat
      contact_channel: parsed.data.contact_email ? "Email" : "LINE",
      contact_value: parsed.data.contact_email || parsed.data.contact_line || "",
      quotation_method: parsed.data.quotation_method,
      quotation_method_other: parsed.data.quotation_method.includes("อื่นๆ")
        ? parsed.data.quotation_method_other || null
        : null,
      pain_points: parsed.data.pain_points,
      pain_points_other: parsed.data.pain_points.includes("อื่นๆ")
        ? parsed.data.pain_points_other || null
        : null,
      feature_request: parsed.data.feature_request || null,
    };
    const { error } = await supabase.from("tester_applications").insert(payload as never);
    if (error) {
      if (error.code === "23505") {
        toast.success("คุณได้สมัครไว้แล้ว กำลังพาเข้าหลังบ้าน...");
        await refreshProfile();
        setSubmitting(false);
        navigate({ to: "/dashboard" });
        return;
      }
      submittedRef.current = false;
      setSubmitting(false);
      toast.error("ส่งคำตอบไม่สำเร็จ: " + error.message);
      return;
    }

    // Mirror to Google Sheet (best-effort, ไม่บล็อกผู้ใช้ถ้าล้มเหลว)
    try {
      await appendTesterApplicationToSheet({
        data: {
          full_name: parsed.data.full_name,
          alias_name: parsed.data.alias_name ?? null,
          main_field: parsed.data.main_field,
          main_field_other: parsed.data.main_field_other ?? null,
          years_experience: parsed.data.years_experience,
          contact_email: parsed.data.contact_email ?? null,
          contact_line: parsed.data.contact_line ?? null,
          quotation_method: parsed.data.quotation_method,
          quotation_method_other: parsed.data.quotation_method_other ?? null,
          pain_points: parsed.data.pain_points,
          pain_points_other: parsed.data.pain_points_other ?? null,
          feature_request: parsed.data.feature_request ?? null,
        },
      });
    } catch (err) {
      console.error("Sheet sync failed:", err);
    }

    toast.success("ยินดีต้อนรับสู่กลุ่มบุกเบิก! 🎉");
    await refreshProfile();
    setSubmitting(false);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="ambient-blobs" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] -z-0"
        aria-hidden="true"
        style={{ backgroundImage: "var(--gradient-mesh)" }}
      />

      <header className="sticky top-0 z-30 glass border-b border-white/40">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={logoUrl}
              alt=""
              className="h-9 w-9 rounded-xl object-cover shadow-soft ring-1 ring-white/60"
              loading="lazy"
              decoding="async"
            />
            <div>
              <h1 className="text-sm font-semibold leading-none tracking-tight">
                So<span className="text-primary">1</span>o Freelancer
              </h1>
              <p className="text-[10px] text-muted-foreground mt-0.5">รับสมัครกลุ่มบุกเบิก</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <LineHeaderButton />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft text-primary px-3 py-1 text-[11px] font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" /> Tester รุ่นแรก
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/70 backdrop-blur px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-soft">
            <Sparkles className="h-3 w-3 text-primary" /> จำกัด 100 คนแรก
          </div>
          <h2 className="mt-4 text-2xl sm:text-4xl font-bold tracking-tight leading-tight">
            ร่วมเป็นส่วนหนึ่งในการสร้าง
            <br className="hidden sm:block" />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Lab สำหรับคนทำงานอิสระ
            </span>
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-sm sm:text-base text-muted-foreground leading-relaxed">
            So1o Freelancer เปิดรับสมัคร Tester รุ่นแรก (จำกัด 100 user)
            เพื่อทดลองใช้เครื่องมือผู้ช่วยฟรีแลนซ์
            พร้อมรับสิทธิพิเศษเมื่อโปรแกรมเราเปิดตัวอย่างเป็นทางการ
          </p>
        </div>

        <Card className="border-border/60 shadow-elevated">
          <CardContent className="p-5 sm:p-7">
            <form onSubmit={onSubmit} className="space-y-7">
              {/* Section 1 */}
              <Section num="1" title="ข้อมูลพื้นฐาน" desc="Basic Info">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="ชื่อ-นามสกุล" required>
                    <Input
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      placeholder="เช่น สมชาย ใจดี"
                    />
                  </Field>
                  <Field label="ชื่อในวงการ (ถ้ามี)">
                    <Input
                      value={form.alias_name}
                      onChange={(e) => setForm({ ...form, alias_name: e.target.value })}
                      placeholder="เช่น Chai.designs"
                    />
                  </Field>
                </div>

                <Field label="สายงานหลักของคุณคืออะไร?" required>
                  <RadioGroup
                    value={form.main_field}
                    onValueChange={(v) => setForm({ ...form, main_field: v })}
                    className="grid grid-cols-2 sm:grid-cols-5 gap-2"
                  >
                    {FIELDS.map((f) => (
                      <label
                        key={f}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition-colors ${form.main_field === f ? "border-primary bg-primary-soft" : "border-border hover:bg-muted/50"}`}
                      >
                        <RadioGroupItem value={f} />
                        {f}
                      </label>
                    ))}
                  </RadioGroup>
                  {form.main_field === "อื่นๆ" && (
                    <Input
                      className="mt-2"
                      placeholder="โปรดระบุสายงาน"
                      value={form.main_field_other}
                      onChange={(e) => setForm({ ...form, main_field_other: e.target.value })}
                    />
                  )}
                </Field>

                <Field label="เป็นฟรีแลนซ์มาแล้วกี่ปี" required>
                  <RadioGroup
                    value={form.years_experience}
                    onValueChange={(v) => setForm({ ...form, years_experience: v })}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                  >
                    {YEARS.map((y) => (
                      <label
                        key={y}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition-colors ${form.years_experience === y ? "border-primary bg-primary-soft" : "border-border hover:bg-muted/50"}`}
                      >
                        <RadioGroupItem value={y} />
                        {y}
                      </label>
                    ))}
                  </RadioGroup>
                </Field>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    ช่องทางติดต่อ <span className="text-destructive">*</span>
                    <span className="text-[11px] text-muted-foreground font-normal ml-2">
                      (กรอกอย่างน้อย 1 ช่องทาง)
                    </span>
                  </Label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">อีเมล</Label>
                      <Input
                        type="email"
                        value={form.contact_email}
                        onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                        placeholder="you@email.com"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">LINE ID</Label>
                      <Input
                        value={form.contact_line}
                        onChange={(e) => setForm({ ...form, contact_line: e.target.value })}
                        placeholder="เช่น @so1o"
                      />
                    </div>
                  </div>
                </div>
              </Section>

              {/* Section 2 */}
              <Section num="2" title="เจาะลึกพฤติกรรม" desc="User Behavior">
                <Field
                  label="ปกติคุณออกใบเสนอราคาด้วยวิธีใด?"
                  required
                  help="เลือกได้มากกว่า 1 ข้อ"
                >
                  <div className="grid sm:grid-cols-2 gap-2">
                    {QUOTE_METHODS.map((m) => (
                      <label
                        key={m}
                        className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer text-sm transition-colors ${form.quotation_method.includes(m) ? "border-primary bg-primary-soft" : "border-border hover:bg-muted/50"}`}
                      >
                        <Checkbox
                          checked={form.quotation_method.includes(m)}
                          onCheckedChange={() => toggleArr("quotation_method", m)}
                        />
                        <span>{m}</span>
                      </label>
                    ))}
                  </div>
                  {form.quotation_method.includes("อื่นๆ") && (
                    <Input
                      className="mt-2"
                      placeholder="โปรดระบุวิธีอื่น"
                      value={form.quotation_method_other}
                      onChange={(e) => setForm({ ...form, quotation_method_other: e.target.value })}
                    />
                  )}
                </Field>

                <Field
                  label="ความทรมาน (Pain Point) ที่สุดของคุณเวลาคุยงานคืออะไร?"
                  help="เลือกกี่ข้อก็ได้"
                >
                  <div className="grid sm:grid-cols-2 gap-2">
                    {PAINS.map((p) => (
                      <label
                        key={p}
                        className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer text-sm transition-colors ${form.pain_points.includes(p) ? "border-primary bg-primary-soft" : "border-border hover:bg-muted/50"}`}
                      >
                        <Checkbox
                          checked={form.pain_points.includes(p)}
                          onCheckedChange={() => toggleArr("pain_points", p)}
                        />
                        <span>{p}</span>
                      </label>
                    ))}
                  </div>
                  {form.pain_points.includes("อื่นๆ") && (
                    <Input
                      className="mt-2"
                      placeholder="โปรดระบุ pain point อื่น"
                      value={form.pain_points_other}
                      onChange={(e) => setForm({ ...form, pain_points_other: e.target.value })}
                    />
                  )}
                </Field>
              </Section>

              {/* Section 3 */}
              <Section num="3" title="สิ่งที่ต้องการ" desc="Feature Request">
                <Field label="ข้อเสนอแนะหรือฟีเจอร์ที่ต้องการให้มี">
                  <Textarea
                    value={form.feature_request}
                    onChange={(e) => setForm({ ...form, feature_request: e.target.value })}
                    placeholder="บอกเราได้เลย — ฟีเจอร์ไหนที่อยากให้มีเพื่อให้งานฟรีแลนซ์สะดวกขึ้น"
                    className="min-h-[110px]"
                  />
                </Field>
              </Section>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 sm:p-4 text-xs sm:text-sm text-foreground/90 leading-relaxed">
                <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">
                  📌 นโยบายช่วง Beta
                </p>
                <p>
                  สิทธิ์การเข้าใช้งานมีจำนวนจำกัด
                  ทีมงานขออนุญาตระงับสิทธิ์ผู้ที่ไม่มีความเคลื่อนไหวเกิน 7 วัน
                  เพื่อส่งต่อโอกาสให้ผู้ที่อยู่ใน Waitlist ท่านถัดไปครับ
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-5">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  ข้อมูลของคุณจะถูกเก็บเป็นความลับและใช้เพื่อปรับปรุงผลิตภัณฑ์เท่านั้น
                </p>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-gradient-primary text-primary-foreground rounded-full px-6 shadow-elevated"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Rocket className="h-4 w-4" />
                  )}
                  {submitting ? "กำลังส่ง..." : "เข้าร่วมกลุ่มบุกเบิก"}
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
      <SiteFooter variant="minimal" />
    </div>
  );
}

function Section({
  num,
  title,
  desc,
  children,
}: {
  num: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-end gap-3 border-b border-border pb-2">
        <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent leading-none">
          {num}
        </span>
        <div>
          <h3 className="text-base font-semibold leading-none">{title}</h3>
          <p className="text-[11px] text-muted-foreground mt-1">{desc}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  help,
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
        {help && (
          <span className="text-[11px] text-muted-foreground font-normal ml-2">({help})</span>
        )}
      </Label>
      {children}
    </div>
  );
}
