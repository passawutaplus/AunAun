import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Palette, Crown, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/auth/AuthProvider";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { resolveDocumentTheme, type DocumentThemeInput } from "@/lib/documentTheme";
import type { Json } from "@/integrations/supabase/types";
import {
  SOLO_DEFAULT_BRIEF,
  SOLO_DEFAULT_INVOICE,
  SOLO_DEFAULT_PRIMARY,
  SOLO_DEFAULT_RECEIPT,
} from "@/lib/documentTheme/defaults";
import { normalizeHex } from "@/lib/colorUtils";
import { PreviewPanel } from "@/components/dashboard/quotations/PreviewPanel";
import type { Quotation } from "@/store/quotations";
import { SettingsFormSubsection } from "@/components/dashboard/settings/SettingsCategoryGroup";
import { cn } from "@/lib/utils";

const PREVIEW_QUOTATION: Quotation = {
  id: "preview",
  number: "QT-PREVIEW",
  projectName: "ตัวอย่างโปรเจกต์",
  clientName: "ลูกค้าตัวอย่าง",
  items: [
    {
      id: "1",
      name: "ออกแบบโลโก้",
      description: "3 แบบ + แก้ไข 2 รอบ",
      quantity: 1,
      unitPrice: 15000,
    },
  ],
  addons: [],
  difficulties: [],
  milestones: [],
  hiddenCost: 0,
  discountValue: 0,
  discountKind: "percent",
  vatEnabled: false,
  vatRate: 7,
  whtEnabled: false,
  whtRate: 3,
  depositPreset: 50,
  paymentTerms: "มัดจำ 50% ก่อนเริ่มงาน",
  notes: "",
  status: "draft",
  hourlyDays: 0,
  hourlyHours: 0,
  revisionsCount: 2,
  lateFeePercent: 0,
  paidPartial: 0,
  timelineEnabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

type ThemeForm = {
  primary: string;
  invoiceColor: string;
  receiptColor: string;
  briefAccent: string;
  unifiedColors: boolean;
  showSo1oBadge: boolean;
  showPoweredBy: boolean;
  portalUseDocumentColors: boolean;
  portalPrimary: string;
  portalShowLogo: boolean;
  portalWelcomeMessage: string;
};

function tierDefaultBadge(isPro: boolean): boolean {
  return !isPro;
}

function fromInput(input: DocumentThemeInput | undefined, isPro: boolean): ThemeForm {
  const primary = input?.primary ?? SOLO_DEFAULT_PRIMARY;
  return {
    primary,
    invoiceColor: input?.invoiceColor ?? SOLO_DEFAULT_INVOICE,
    receiptColor: input?.receiptColor ?? SOLO_DEFAULT_RECEIPT,
    briefAccent: input?.briefAccent ?? SOLO_DEFAULT_BRIEF,
    unifiedColors: input?.unifiedColors !== false,
    showSo1oBadge: input?.showSo1oBadge ?? tierDefaultBadge(isPro),
    showPoweredBy: input?.showPoweredBy ?? tierDefaultBadge(isPro),
    portalUseDocumentColors: input?.portalUseDocumentColors !== false,
    portalPrimary: input?.portalPrimary ?? primary,
    portalShowLogo: input?.portalShowLogo !== false,
    portalWelcomeMessage: input?.portalWelcomeMessage ?? "",
  };
}

function toInput(form: ThemeForm, isPro: boolean): DocumentThemeInput {
  const base: DocumentThemeInput = {
    unifiedColors: form.unifiedColors,
    portalUseDocumentColors: form.portalUseDocumentColors,
    portalShowLogo: form.portalShowLogo,
    portalWelcomeMessage: form.portalWelcomeMessage.trim() || undefined,
  };

  if (isPro) {
    base.showSo1oBadge = form.showSo1oBadge;
    base.showPoweredBy = form.showPoweredBy;
  }

  const primary = normalizeHex(form.primary);
  if (primary) base.primary = primary;

  if (!form.unifiedColors) {
    const inv = normalizeHex(form.invoiceColor);
    const rec = normalizeHex(form.receiptColor);
    const brief = normalizeHex(form.briefAccent);
    if (inv) base.invoiceColor = inv;
    if (rec) base.receiptColor = rec;
    if (brief) base.briefAccent = brief;
  }

  if (!form.portalUseDocumentColors) {
    const portal = normalizeHex(form.portalPrimary);
    if (portal) base.portalPrimary = portal;
  }

  return base;
}

function ThemeToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
      <div>
        <p className="text-xs font-medium">{title}</p>
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

function PortalPreview({
  brandName,
  logoUrl,
  portalPrimary,
  welcomeMessage,
  showLogo,
  showPoweredBy,
}: {
  brandName: string;
  logoUrl: string | null;
  portalPrimary: string;
  welcomeMessage: string;
  showLogo: boolean;
  showPoweredBy: boolean;
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: `linear-gradient(to bottom, color-mix(in srgb, ${portalPrimary} 14%, white), white)`,
      }}
    >
      <p className="text-[10px] font-medium text-muted-foreground px-3 py-2 border-b bg-muted/30">
        ตัวอย่าง Portal ลูกค้า
      </p>
      <div className="px-4 py-5 text-center space-y-2">
        {showLogo && logoUrl && !showPoweredBy && (
          <img src={logoUrl} alt="" className="h-9 mx-auto object-contain" />
        )}
        <p className="text-[10px] font-semibold tracking-[0.18em]" style={{ color: portalPrimary }}>
          {!showPoweredBy ? brandName.toUpperCase() : "CLIENT PORTAL"}
        </p>
        <h3 className="text-base font-semibold text-foreground">งานตัวอย่าง</h3>
        {welcomeMessage && !showPoweredBy && (
          <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">{welcomeMessage}</p>
        )}
        <div
          className="mx-auto max-w-[220px] rounded-lg border bg-white/80 px-3 py-2 text-left text-[10px] text-muted-foreground"
          style={{ borderColor: `color-mix(in srgb, ${portalPrimary} 35%, transparent)` }}
        >
          <span className="font-medium text-foreground">สถานะงาน</span>
          <div className="mt-1.5 h-1.5 rounded-full overflow-hidden bg-muted">
            <div className="h-full w-2/3 rounded-full" style={{ backgroundColor: portalPrimary }} />
          </div>
        </div>
        {showPoweredBy && (
          <p className="text-[9px] text-muted-foreground pt-2">
            Powered by{" "}
            <span className="font-semibold" style={{ color: portalPrimary }}>
              So1o Freelancer
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

export function DocumentBrandingSection() {
  const { user, profile, refreshProfile } = useAuth();
  const { tier, isPro } = useSubscription();
  const [form, setForm] = React.useState<ThemeForm>(() =>
    fromInput((profile?.document_theme ?? {}) as DocumentThemeInput, isPro),
  );
  const [saving, setSaving] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setForm(fromInput((profile?.document_theme ?? {}) as DocumentThemeInput, isPro));
  }, [profile?.document_theme, isPro]);

  const previewTheme = React.useMemo(
    () => resolveDocumentTheme(tier, toInput(form, isPro)),
    [tier, form, isPro],
  );

  const portalPreviewPrimary = form.portalUseDocumentColors
    ? previewTheme.colors.primary
    : (normalizeHex(form.portalPrimary) ?? previewTheme.colors.primary);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !isPro) return;
    const primary = normalizeHex(form.primary);
    if (!primary) {
      toast.error("สีหลักไม่ถูกต้อง — ใช้รูปแบบ #RRGGBB");
      return;
    }
    if (!form.portalUseDocumentColors && !normalizeHex(form.portalPrimary)) {
      toast.error("สี Portal ไม่ถูกต้อง — ใช้รูปแบบ #RRGGBB");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ document_theme: toInput(form, isPro) as unknown as Json })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ: " + error.message);
    } else {
      toast.success("บันทึกธีมเอกสาร & Portal แล้ว");
      await refreshProfile();
    }
  }

  return (
    <Card className="glass border-border shadow-soft overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardContent className="p-0">
          <div className="p-4 sm:p-5">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="w-full flex items-start justify-between gap-3 text-left group"
              >
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold tracking-tight flex items-center gap-2">
                    <Palette className="h-4 w-4 text-primary shrink-0" />
                    ธีมเอกสาร & Portal
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {open
                      ? "ปรับสีและแบรนด์แยกกันระหว่างเอกสาร PDF กับ portal ลูกค้า"
                      : isPro
                        ? `สีเอกสาร ${previewTheme.colors.primary}${form.portalUseDocumentColors ? "" : ` · Portal ${portalPreviewPrimary}`}`
                        : "แตะเพื่อดูตัวอย่าง — อัพเกรด Pro เพื่อปรับสี"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!open && (
                    <span
                      className="h-6 w-6 rounded-md border border-border shrink-0"
                      style={{ backgroundColor: previewTheme.colors.primary }}
                      aria-hidden
                    />
                  )}
                  {isPro && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
                      <Crown className="h-3 w-3" /> White-label
                    </span>
                  )}
                </div>
              </button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-5 border-t border-border/50 pt-4">
              {!isPro && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm space-y-2">
                  <p className="font-medium">อัพเกรด Pro เพื่อเอาแบรนด์ So1o ออกและปรับสีเอกสาร</p>
                  <p className="text-xs text-muted-foreground">
                    แผน Free จะมี footer &quot;So1o Freelancer&quot; บน PDF และ Powered by บน portal
                    ลูกค้า
                  </p>
                  <Button size="sm" asChild>
                    <Link to="/pricing">ดูแพ็ก Pro</Link>
                  </Button>
                </div>
              )}

              <form onSubmit={onSave} className="space-y-6">
                <SettingsFormSubsection
                  title="ธีมเอกสาร"
                  description="ใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ และ Brief PDF"
                >
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">สีหลัก (Primary)</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={form.primary}
                          onChange={(e) => setForm((f) => ({ ...f, primary: e.target.value }))}
                          className="h-10 w-14 p-1 cursor-pointer"
                          disabled={!isPro}
                        />
                        <Input
                          value={form.primary}
                          onChange={(e) => setForm((f) => ({ ...f, primary: e.target.value }))}
                          className="font-mono text-xs"
                          disabled={!isPro}
                          placeholder="#F37021"
                        />
                      </div>
                    </div>
                    <ThemeToggleRow
                      title="ใช้สีเดียวทุกเอกสาร"
                      description="ปิดเพื่อแยกสีใบแจ้งหนี้/ใบเสร็จ/บรีฟ"
                      checked={form.unifiedColors}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, unifiedColors: v }))}
                      disabled={!isPro}
                    />
                  </div>

                  {!form.unifiedColors && (
                    <div className="grid sm:grid-cols-3 gap-3">
                      {(
                        [
                          ["invoiceColor", "ใบแจ้งหนี้"],
                          ["receiptColor", "ใบเสร็จ"],
                          ["briefAccent", "บรีฟ"],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key} className="space-y-1">
                          <Label className="text-[10px]">{label}</Label>
                          <Input
                            type="color"
                            value={form[key]}
                            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                            className="h-9 w-full p-1 cursor-pointer"
                            disabled={!isPro}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <ThemeToggleRow
                    title="แสดง So1o badge บนเอกสาร"
                    description='Footer "So1o Freelancer" บน PDF — Pro ปิดได้'
                    checked={form.showSo1oBadge}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, showSo1oBadge: v }))}
                    disabled={!isPro}
                  />

                  <div className="rounded-xl border bg-white overflow-hidden">
                    <p className="text-[10px] font-medium text-muted-foreground px-3 py-2 border-b bg-muted/30">
                      ตัวอย่างใบเสนอราคา
                    </p>
                    <div className="p-2 scale-[0.85] origin-top-left w-[118%] max-h-[280px] overflow-hidden pointer-events-none">
                      <PreviewPanel q={PREVIEW_QUOTATION} themeOverride={previewTheme} />
                    </div>
                  </div>
                </SettingsFormSubsection>

                <SettingsFormSubsection
                  title="Portal ลูกค้า"
                  description="หน้า Track / Brief ที่ลูกค้าเปิดจากลิงก์"
                >
                  <ThemeToggleRow
                    title="ใช้สีเดียวกับเอกสาร"
                    description="ปิดเพื่อตั้งสี Portal แยกจาก PDF"
                    checked={form.portalUseDocumentColors}
                    onCheckedChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        portalUseDocumentColors: v,
                        portalPrimary: v ? f.primary : f.portalPrimary,
                      }))
                    }
                    disabled={!isPro}
                  />

                  {!form.portalUseDocumentColors && (
                    <div className="space-y-2">
                      <Label className="text-xs">สี Portal</Label>
                      <div className="flex gap-2 max-w-sm">
                        <Input
                          type="color"
                          value={form.portalPrimary}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, portalPrimary: e.target.value }))
                          }
                          className="h-10 w-14 p-1 cursor-pointer"
                          disabled={!isPro}
                        />
                        <Input
                          value={form.portalPrimary}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, portalPrimary: e.target.value }))
                          }
                          className="font-mono text-xs"
                          disabled={!isPro}
                          placeholder="#F37021"
                        />
                      </div>
                    </div>
                  )}

                  <ThemeToggleRow
                    title="แสดงโลโก้บน Portal"
                    description="ใช้โลโก้จากโปรไฟล์ร้าน — ปิดได้ถ้าต้องการแสดงแค่ชื่อ"
                    checked={form.portalShowLogo}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, portalShowLogo: v }))}
                    disabled={!isPro}
                  />

                  <div className="space-y-2">
                    <Label className="text-xs">ข้อความต้อนรับ (ไม่บังคับ)</Label>
                    <Input
                      value={form.portalWelcomeMessage}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, portalWelcomeMessage: e.target.value }))
                      }
                      placeholder="เช่น ยินดีต้อนรับ — ติดตามงานของคุณได้ที่นี่"
                      disabled={!isPro}
                      maxLength={200}
                    />
                  </div>

                  <ThemeToggleRow
                    title="แสดง Powered by So1o"
                    description="Footer solofreelancer.com บน portal ลูกค้า"
                    checked={form.showPoweredBy}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, showPoweredBy: v }))}
                    disabled={!isPro}
                  />

                  <PortalPreview
                    brandName={
                      profile?.brand_name?.trim() ||
                      profile?.display_name?.trim() ||
                      "So1o Freelancer"
                    }
                    logoUrl={profile?.logo_url?.trim() || null}
                    portalPrimary={portalPreviewPrimary}
                    welcomeMessage={form.portalWelcomeMessage.trim()}
                    showLogo={form.portalShowLogo}
                    showPoweredBy={form.showPoweredBy}
                  />
                </SettingsFormSubsection>

                {isPro && (
                  <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    บันทึกธีมเอกสาร & Portal
                  </Button>
                )}
              </form>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
