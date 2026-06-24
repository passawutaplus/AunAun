import * as React from "react";
import { Link } from "@tanstack/react-router";
import { PageFooterActions } from "@/components/dashboard/PageFooterActions";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Upload, LogOut, ShieldCheck, RotateCcw, Image as ImageIcon } from "lucide-react";
import { compressImageFile, dataUrlToBlob } from "@/lib/imageCompress";
import { AiUsageSettingsSection } from "@/components/dashboard/settings/AiUsageSettingsSection";
import { AccountIdentityBadge } from "@/components/dashboard/AccountIdentityBadge";
import { StorageUsageSettingsSection } from "@/components/dashboard/settings/StorageUsageSettingsSection";
import { LineNotificationSection } from "@/components/dashboard/settings/LineNotificationSection";
import { SettingsQuickLinksSection } from "@/components/dashboard/settings/SettingsQuickLinksSection";
import { DisplayThemeSection } from "@/components/dashboard/settings/DisplayThemeSection";
import { DocumentBrandingSection } from "@/components/dashboard/settings/DocumentBrandingSection";
import { PaymentSettingsSection } from "@/components/dashboard/settings/PaymentSettingsSection";
import { SignatureSettingsSection } from "@/components/dashboard/settings/SignatureSettingsSection";
import { TierMembershipCard } from "@/components/tier/TierMembershipCard";

interface FormState {
  brand_name: string;
  tagline: string;
  display_name: string;
  phone: string;
  email: string;
  address: string;
  tax_id: string;
  social_link: string;
  logo_url: string;
}

const EMPTY: FormState = {
  brand_name: "",
  tagline: "",
  display_name: "",
  phone: "",
  email: "",
  address: "",
  tax_id: "",
  social_link: "",
  logo_url: "",
};

function fromProfile(p: ReturnType<typeof useAuth>["profile"], email: string): FormState {
  return {
    brand_name: p?.brand_name ?? "",
    tagline: p?.tagline ?? "",
    display_name: p?.display_name ?? "",
    phone: p?.phone ?? "",
    email,
    address: p?.address ?? "",
    tax_id: p?.tax_id ?? "",
    social_link: p?.social_link ?? "",
    logo_url: p?.logo_url ?? "",
  };
}

export function SettingsTab() {
  const { user, profile, refreshProfile, signOut, isAdmin } = useAuth();
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [saving, setSaving] = React.useState(false);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const logoRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setForm(fromProfile(profile, user?.email ?? ""));
  }, [profile, user?.email]);

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function uploadFile(file: File): Promise<string | null> {
    if (!user) return null;
    let blob: Blob = file;
    let contentType = file.type;
    let ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    if (file.type !== "image/svg+xml") {
      try {
        const dataUrl = await compressImageFile(file);
        blob = dataUrlToBlob(dataUrl);
        contentType = "image/jpeg";
        ext = "jpg";
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "บีบอัดรูปไม่สำเร็จ");
        return null;
      }
    } else if (file.size > 400 * 1024) {
      toast.error("ไฟล์ SVG ใหญ่เกิน 400 KB");
      return null;
    }
    const path = `${user.id}/logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("brand-logos")
      .upload(path, blob, { upsert: true, contentType });
    if (upErr) {
      toast.error("อัปโหลดไม่สำเร็จ: " + upErr.message);
      return null;
    }
    const { data } = supabase.storage.from("brand-logos").getPublicUrl(path);
    return data.publicUrl;
  }

  async function onUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const url = await uploadFile(file);
    if (url) {
      setField("logo_url", url);
      toast.success("อัปโหลดโลโก้แล้ว — กดบันทึกเพื่อยืนยัน");
    }
    setUploadingLogo(false);
    e.target.value = "";
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const trim = (s: string, max = 200) => s.trim().slice(0, max) || null;
    const { error } = await supabase
      .from("profiles")
      .update({
        brand_name: trim(form.brand_name, 80),
        tagline: trim(form.tagline, 200),
        display_name: trim(form.display_name, 80),
        phone: trim(form.phone, 30),
        address: trim(form.address, 300),
        tax_id: trim(form.tax_id, 30),
        social_link: trim(form.social_link, 300),
        logo_url: form.logo_url.trim() || null,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ: " + error.message);
    } else {
      toast.success("บันทึกการตั้งค่าเรียบร้อย");
      await refreshProfile();
    }
  }

  function onReset() {
    setForm(fromProfile(profile, user?.email ?? ""));
    toast.info("รีเซ็ตเป็นค่าที่บันทึกล่าสุดแล้ว");
  }

  return (
    <div className="space-y-4 pb-24 lg:pb-4">
      <TierMembershipCard />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <AiUsageSettingsSection />
        <StorageUsageSettingsSection />
      </div>
      <LineNotificationSection />
      <DocumentBrandingSection />

      <Card className="glass border-border shadow-soft">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-5 gap-4">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">ตั้งค่าโปรไฟล์ร้าน</h2>
              <p className="text-xs text-muted-foreground">
                ข้อมูลนี้จะแสดงในใบเสนอราคาและเอกสารที่ส่งให้ลูกค้า
              </p>
            </div>
            <div className="flex items-start gap-3 shrink-0">
              <AccountIdentityBadge variant="settings" />
              {isAdmin && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-foreground text-background px-2 py-1 rounded-full">
                  <ShieldCheck className="h-3 w-3" /> ADMIN
                </span>
              )}
            </div>
          </div>

          <form onSubmit={onSave} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-medium">โลโก้ร้าน</Label>
              <div className="flex items-center gap-3">
                <div className="h-20 w-20 rounded-2xl border border-border bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                  {form.logo_url ? (
                    <img
                      src={form.logo_url}
                      alt="brand logo"
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={onUploadLogo}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => logoRef.current?.click()}
                  disabled={uploadingLogo}
                  className="flex-1 h-12"
                >
                  {uploadingLogo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  เลือกรูป
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                รูปสี่เหลี่ยมจัตุรัสสวยที่สุด · ไม่เกิน 500KB
              </p>
            </div>

            <Field label="ชื่อร้าน/สตูดิโอ">
              <Input
                value={form.brand_name}
                onChange={(e) => setField("brand_name", e.target.value)}
                maxLength={80}
                placeholder="So1o Freelancer"
              />
            </Field>

            <Field label="แท็กไลน์">
              <Input
                value={form.tagline}
                onChange={(e) => setField("tagline", e.target.value)}
                maxLength={200}
                placeholder="โปรแกรมช่วยคำนวณราคาและทำใบเสนอราคาออนไลน์อย่างง่าย"
              />
            </Field>

            <Field label="ชื่อของคุณ">
              <Input
                value={form.display_name}
                onChange={(e) => setField("display_name", e.target.value)}
                maxLength={80}
                placeholder="So1o Freelancer"
              />
            </Field>

            <Field label="เบอร์โทร">
              <Input
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                maxLength={30}
                placeholder="เช่น 081-234-5678"
                inputMode="tel"
              />
            </Field>

            <Field label="EMAIL">
              <Input value={form.email} disabled className="bg-muted/40" />
            </Field>

            <Field label="ที่อยู่">
              <Textarea
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
                maxLength={300}
                rows={2}
                placeholder="เช่น 123/4 ถ.สุขุมวิท แขวงคลองตัน เขตวัฒนา กรุงเทพฯ 10110"
              />
            </Field>

            <Field label="เลขประชาชน/นิติบุคคล">
              <Input
                value={form.tax_id}
                onChange={(e) => setField("tax_id", e.target.value)}
                maxLength={30}
                placeholder="เช่น 1234567890123"
                inputMode="numeric"
              />
            </Field>

            <Field label="ลิงก์โซเชียล / โชว์เคสภายนอก (เช่น Pixel100, Behance)">
              <Input
                value={form.social_link}
                onChange={(e) => setField("social_link", e.target.value)}
                maxLength={300}
                placeholder="เช่น https://instagram.com/your_handle"
                inputMode="url"
              />
            </Field>

            <div className="flex items-center gap-2 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="ghost"
                onClick={onReset}
                className="text-muted-foreground gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" /> รีเซ็ต
              </Button>
              <div className="flex-1" />
              <Button
                type="submit"
                disabled={saving}
                className="bg-primary hover:bg-primary/90 gap-1.5 px-6"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                บันทึกการตั้งค่า
              </Button>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              {isAdmin && (
                <Button
                  type="button"
                  asChild
                  variant="outline"
                  className="gap-1.5 w-full sm:w-auto border-primary/40 text-foreground"
                >
                  <Link to="/admin" search={{ section: undefined, q: undefined }}>
                    <ShieldCheck className="h-3.5 w-3.5" /> เข้าหน้า Admin
                  </Link>
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={signOut}
                className="text-muted-foreground gap-1.5 w-full sm:w-auto"
              >
                <LogOut className="h-3.5 w-3.5" /> ออกจากระบบ
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <PaymentSettingsSection />

      <SignatureSettingsSection />

      <SettingsQuickLinksSection />

      <DisplayThemeSection />

      <PageFooterActions feature="settings" label="ตั้งค่า" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}
