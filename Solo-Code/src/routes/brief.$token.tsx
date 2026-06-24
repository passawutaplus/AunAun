import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import * as React from "react";
import { RouteError } from "@/components/RouteError";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ShieldCheck, Send, Printer, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  type DesignBrief,
  briefCompleteness,
  STATUS_LABEL,
  STATUS_TONE,
  PROJECT_TYPES,
  MOOD_OPTIONS,
  FORMAT_OPTIONS,
} from "@/lib/briefSchema";
import { ReferenceUploader } from "@/components/dashboard/briefs/ReferenceUploader";
import { ConfirmBriefDialog } from "@/components/dashboard/briefs/ConfirmBriefDialog";
import { BriefPdfTemplate } from "@/components/dashboard/briefs/BriefPdfTemplate";
import { runPrintToPdf } from "@/lib/printPdf";
import { getPublicBriefPortalBranding } from "@/server/briefPortal.functions";
import type { PortalBranding } from "@/lib/documentTheme/types";

export const Route = createFileRoute("/brief/$token")({
  head: ({ params }) => {
    const title = "บรีฟงานออกแบบ | So1o Freelancer";
    const description =
      "กรอกบรีฟงานออกแบบออนไลน์ ระบุขอบเขตงาน เป้าหมาย และยืนยันรายละเอียดร่วมกับฟรีแลนซ์ของคุณผ่าน So1o Freelancer";
    const url = `https://solofreelancer.com/brief/${params.token}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex,nofollow" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
      ],
    };
  },
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: PublicBriefPage,
});

function PublicBriefPage() {
  const { token } = Route.useParams();
  const getPortalBranding = useServerFn(getPublicBriefPortalBranding);
  const [brief, setBrief] = React.useState<DesignBrief | null>(null);
  const [portal, setPortal] = React.useState<PortalBranding | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);
  const debRef = React.useRef<NodeJS.Timeout | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [{ data, error }, portalRes] = await Promise.all([
      supabase.rpc("get_brief_by_token", { _token: token }),
      getPortalBranding({ data: { token } }).catch(() => ({ portal: null })),
    ]);
    setPortal((portalRes?.portal ?? null) as PortalBranding | null);
    if (error || !data) {
      toast.error("ไม่พบบรีฟ หรือลิงก์ไม่ถูกต้อง");
      setBrief(null);
    } else {
      setBrief(data as unknown as DesignBrief);
    }
    setLoading(false);
  }, [token, getPortalBranding]);

  React.useEffect(() => {
    load();
  }, [load]);

  const patch = (p: Partial<DesignBrief>) => setBrief((cur) => (cur ? { ...cur, ...p } : cur));
  const patchSection = <K extends keyof DesignBrief>(key: K, p: Partial<DesignBrief[K]>) =>
    setBrief((cur) => (cur ? { ...cur, [key]: { ...(cur[key] as any), ...p } } : cur));

  // Auto-save (debounced) via RPC
  React.useEffect(() => {
    if (!brief || brief.status === "confirmed") return;
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      setSaving(true);
      const { error } = await supabase.rpc("update_brief_by_token", {
        _token: token,
        _client_info: brief.client_info as any,
        _project_overview: brief.project_overview as any,
        _audience: brief.audience as any,
        _design_direction: brief.design_direction as any,
        _tech_specs: brief.tech_specs as any,
        _timeline_budget: brief.timeline_budget as any,
        _notes: brief.notes,
        _references: brief.references as any,
      });
      setSaving(false);
      if (error) toast.error(error.message);
      else setSavedAt(new Date());
    }, 1200);
    return () => {
      if (debRef.current) clearTimeout(debRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brief]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> กำลังโหลดบรีฟ…
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="rounded-2xl border bg-card p-8 text-center max-w-md">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <h1 className="text-lg font-semibold">ไม่พบบรีฟนี้</h1>
          <p className="text-sm text-muted-foreground mt-1">ลิงก์อาจถูกลบ หรือไม่ถูกต้อง</p>
          <Button asChild className="mt-4 rounded-xl">
            <Link to="/">กลับหน้าแรก</Link>
          </Button>
        </div>
      </div>
    );
  }

  const o = brief.owner ?? {};
  const locked = brief.status === "confirmed";
  const completeness = briefCompleteness(brief);

  const toggleMood = (m: string) => {
    const cur = brief.design_direction.moods ?? [];
    patchSection("design_direction", {
      moods: cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m],
    });
  };
  const toggleFormat = (f: string) => {
    const cur = brief.tech_specs.formats ?? [];
    patchSection("tech_specs", {
      formats: cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f],
    });
  };

  const exportPdf = () => {
    runPrintToPdf({ bodyClass: "printing-brief", successMessage: "ส่งออก PDF สำเร็จ" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-10 no-print">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {o.logo_url ? (
              <img src={o.logo_url} alt="" className="w-9 h-9 rounded-lg object-contain bg-muted" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">
                {o.brand_name || o.display_name || "Freelancer"}
              </div>
              {o.tagline && (
                <div className="text-[10px] text-muted-foreground truncate">{o.tagline}</div>
              )}
            </div>
          </div>
          <Badge className={`${STATUS_TONE[brief.status]} border-0 text-[10px]`}>
            {STATUS_LABEL[brief.status]}
          </Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4 no-print">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold tracking-wider">
            <FileText className="h-3.5 w-3.5" /> DESIGN BRIEF
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{brief.title}</h1>
          <p className="text-xs text-muted-foreground">
            กรอกข้อมูลให้ครบเพื่อให้นักออกแบบเข้าใจงานของคุณมากที่สุด — ระบบบันทึกอัตโนมัติ
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-3 flex items-center gap-3">
          <div className="flex-1">
            <Progress value={completeness} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground mt-1">
              กรอกแล้ว {completeness}%
              {savedAt && ` · บันทึกล่าสุด ${savedAt.toLocaleTimeString("th-TH")}`}
            </p>
          </div>
          {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {locked && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            บรีฟนี้ยืนยันแล้วโดย {brief.confirmed_by_name} เมื่อ{" "}
            {new Date(brief.confirmed_at!).toLocaleString("th-TH")}
          </div>
        )}

        {/* Sections */}
        <Section title="1. ข้อมูลของคุณ">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="ชื่อ-นามสกุล">
              <Input
                value={brief.client_info.client_name ?? ""}
                onChange={(e) => patchSection("client_info", { client_name: e.target.value })}
                disabled={locked}
              />
            </Field>
            <Field label="ชื่อแบรนด์ / ธุรกิจ">
              <Input
                value={brief.client_info.brand_name ?? ""}
                onChange={(e) => patchSection("client_info", { brand_name: e.target.value })}
                disabled={locked}
              />
            </Field>
            <Field label="อีเมล">
              <Input
                type="email"
                value={brief.client_info.contact_email ?? ""}
                onChange={(e) => patchSection("client_info", { contact_email: e.target.value })}
                disabled={locked}
              />
            </Field>
            <Field label="เบอร์โทร">
              <Input
                value={brief.client_info.contact_phone ?? ""}
                onChange={(e) => patchSection("client_info", { contact_phone: e.target.value })}
                disabled={locked}
              />
            </Field>
            <Field label="LINE ID" full>
              <Input
                value={brief.client_info.contact_line ?? ""}
                onChange={(e) => patchSection("client_info", { contact_line: e.target.value })}
                disabled={locked}
              />
            </Field>
          </div>
        </Section>

        <Section title="2. เกี่ยวกับโปรเจกต์">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="ประเภทงาน">
              <Select
                value={brief.project_overview.project_type ?? ""}
                onValueChange={(v) => patchSection("project_overview", { project_type: v })}
                disabled={locked}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือก" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="เป้าหมายของงานนี้">
              <Input
                value={brief.project_overview.goal ?? ""}
                onChange={(e) => patchSection("project_overview", { goal: e.target.value })}
                placeholder="เช่น เพิ่มยอดขาย"
                disabled={locked}
              />
            </Field>
            <Field label="เกี่ยวกับธุรกิจของคุณ" full>
              <Textarea
                rows={2}
                value={brief.project_overview.about_business ?? ""}
                onChange={(e) =>
                  patchSection("project_overview", { about_business: e.target.value })
                }
                placeholder="ขายอะไร ใครคือลูกค้า จุดเด่นคืออะไร"
                disabled={locked}
              />
            </Field>
            <Field label="ปัญหาหรือความต้องการ" full>
              <Textarea
                rows={2}
                value={brief.project_overview.problem ?? ""}
                onChange={(e) => patchSection("project_overview", { problem: e.target.value })}
                disabled={locked}
              />
            </Field>
          </div>
        </Section>

        <Section title="3. กลุ่มเป้าหมาย">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="เพศ">
              <Input
                value={brief.audience.gender ?? ""}
                onChange={(e) => patchSection("audience", { gender: e.target.value })}
                disabled={locked}
              />
            </Field>
            <Field label="ช่วงอายุ">
              <Input
                value={brief.audience.age_range ?? ""}
                onChange={(e) => patchSection("audience", { age_range: e.target.value })}
                placeholder="เช่น 25-35"
                disabled={locked}
              />
            </Field>
            <Field label="ไลฟ์สไตล์" full>
              <Input
                value={brief.audience.lifestyle ?? ""}
                onChange={(e) => patchSection("audience", { lifestyle: e.target.value })}
                disabled={locked}
              />
            </Field>
            <Field label="ความสนใจ" full>
              <Input
                value={brief.audience.interests ?? ""}
                onChange={(e) => patchSection("audience", { interests: e.target.value })}
                disabled={locked}
              />
            </Field>
          </div>
        </Section>

        <Section title="4. แนวทางออกแบบ">
          <div className="space-y-3">
            <Field label="Mood & Tone (เลือกได้หลายอัน)">
              <div className="flex flex-wrap gap-1.5">
                {MOOD_OPTIONS.map((m) => {
                  const on = (brief.design_direction.moods ?? []).includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={locked}
                      onClick={() => toggleMood(m)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition ${on ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 hover:bg-muted border-border"}`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="สีที่ชอบ">
                <Input
                  value={brief.design_direction.liked_colors ?? ""}
                  onChange={(e) =>
                    patchSection("design_direction", { liked_colors: e.target.value })
                  }
                  disabled={locked}
                />
              </Field>
              <Field label="สีที่ไม่ชอบ">
                <Input
                  value={brief.design_direction.forbidden_colors ?? ""}
                  onChange={(e) =>
                    patchSection("design_direction", { forbidden_colors: e.target.value })
                  }
                  disabled={locked}
                />
              </Field>
              <Field label="ฟอนต์ที่ชอบ">
                <Input
                  value={brief.design_direction.liked_fonts ?? ""}
                  onChange={(e) =>
                    patchSection("design_direction", { liked_fonts: e.target.value })
                  }
                  disabled={locked}
                />
              </Field>
              <Field label="แรงบันดาลใจ / Reference">
                <Input
                  value={brief.design_direction.inspiration ?? ""}
                  onChange={(e) =>
                    patchSection("design_direction", { inspiration: e.target.value })
                  }
                  disabled={locked}
                />
              </Field>
            </div>
          </div>
        </Section>

        <Section title="5. รูปอ้างอิง (Mood Board)">
          <ReferenceUploader
            refs={brief.references}
            onChange={(next) => patch({ references: next })}
            userId={null}
            disabled={locked}
          />
        </Section>

        <Section title="6. สเปกทางเทคนิค">
          <div className="space-y-3">
            <Field label="นามสกุลไฟล์ที่ต้องการ">
              <div className="flex flex-wrap gap-1.5">
                {FORMAT_OPTIONS.map((f) => {
                  const on = (brief.tech_specs.formats ?? []).includes(f);
                  return (
                    <button
                      key={f}
                      type="button"
                      disabled={locked}
                      onClick={() => toggleFormat(f)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition ${on ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 hover:bg-muted border-border"}`}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="ขนาด / สเปก">
                <Input
                  value={brief.tech_specs.size ?? ""}
                  onChange={(e) => patchSection("tech_specs", { size: e.target.value })}
                  placeholder="เช่น 1080x1080"
                  disabled={locked}
                />
              </Field>
              <Field label="การนำไปใช้">
                <Select
                  value={brief.tech_specs.usage ?? ""}
                  onValueChange={(v) => patchSection("tech_specs", { usage: v })}
                  disabled={locked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือก" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">ออนไลน์ (Web/Social)</SelectItem>
                    <SelectItem value="print">งานพิมพ์</SelectItem>
                    <SelectItem value="both">ทั้งสองอย่าง</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>
        </Section>

        <Section title="7. ไทม์ไลน์และงบประมาณ">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="วันที่อยากได้ร่างแรก">
              <Input
                type="date"
                value={brief.timeline_budget.draft_date ?? ""}
                onChange={(e) => patchSection("timeline_budget", { draft_date: e.target.value })}
                disabled={locked}
              />
            </Field>
            <Field label="วันปิดงาน (Deadline)">
              <Input
                type="date"
                value={brief.timeline_budget.deadline ?? ""}
                onChange={(e) => patchSection("timeline_budget", { deadline: e.target.value })}
                disabled={locked}
              />
            </Field>
            <Field label="งบประมาณ" full>
              <Input
                value={brief.timeline_budget.budget ?? ""}
                onChange={(e) => patchSection("timeline_budget", { budget: e.target.value })}
                placeholder="เช่น 5,000-10,000 บาท"
                disabled={locked}
              />
            </Field>
          </div>
        </Section>

        <Section title="8. หมายเหตุเพิ่มเติม">
          <Textarea
            rows={3}
            value={brief.notes}
            onChange={(e) => patch({ notes: e.target.value })}
            placeholder="สิ่งที่อยากบอกเพิ่มเติม"
            disabled={locked}
          />
        </Section>

        {/* Confirm CTA */}
        {!locked ? (
          <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-sm">พร้อมยืนยันบรีฟนี้แล้ว?</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  เมื่อยืนยัน บรีฟจะถูกล็อกเพื่อใช้เป็นหลักฐานขอบเขตงาน —
                  หากต้องการแก้ไขทีหลังอาจมีค่าใช้จ่ายเพิ่ม
                </p>
              </div>
            </div>
            <Button
              onClick={() => setConfirmOpen(true)}
              className="w-full rounded-xl gap-2"
              size="lg"
            >
              <Send className="h-4 w-4" /> ยืนยันและส่งบรีฟ
            </Button>
          </div>
        ) : (
          <Button variant="outline" className="w-full rounded-xl gap-2" onClick={exportPdf}>
            <Printer className="h-4 w-4" /> ดาวน์โหลด/พิมพ์ PDF
          </Button>
        )}

        {portal?.showPoweredBy !== false && (
          <p className="text-center text-[10px] text-muted-foreground pt-2">
            Powered by{" "}
            <Link to="/" className="text-primary hover:underline">
              So1o Freelancer
            </Link>
          </p>
        )}
      </main>

      {/* Print template */}
      <div className="brief-print-only">
        <BriefPdfTemplate brief={brief} theme={portal?.theme} />
      </div>

      <ConfirmBriefDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        shareToken={token}
        briefTitle={brief.title}
        onConfirmed={load}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`space-y-1 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
