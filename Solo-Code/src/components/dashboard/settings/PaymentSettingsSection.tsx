import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Image as ImageIcon, Info, Loader2, QrCode, RotateCcw, Upload, Wallet } from "lucide-react";
import { compressImageFile, dataUrlToBlob } from "@/lib/imageCompress";
import { StripeClientPaymentsSection } from "@/components/dashboard/settings/StripeClientPaymentsSection";

const CURRENCIES = [
  { value: "THB", label: "฿ (THB)" },
  { value: "USD", label: "$ (USD)" },
  { value: "EUR", label: "€ (EUR)" },
  { value: "GBP", label: "£ (GBP)" },
  { value: "JPY", label: "¥ (JPY)" },
  { value: "SGD", label: "S$ (SGD)" },
];

type PaymentForm = {
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  payment_qr_url: string;
  currency: string;
  terms: string;
};

const EMPTY: PaymentForm = {
  bank_name: "",
  bank_account_name: "",
  bank_account_number: "",
  payment_qr_url: "",
  currency: "THB",
  terms: "",
};

function fromProfile(p: ReturnType<typeof useAuth>["profile"]): PaymentForm {
  return {
    bank_name: p?.bank_name ?? "",
    bank_account_name: p?.bank_account_name ?? "",
    bank_account_number: p?.bank_account_number ?? "",
    payment_qr_url: p?.payment_qr_url ?? "",
    currency: p?.currency ?? "THB",
    terms: p?.terms ?? "",
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

export function PaymentSettingsSection() {
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = React.useState<PaymentForm>(EMPTY);
  const [saving, setSaving] = React.useState(false);
  const [uploadingQR, setUploadingQR] = React.useState(false);
  const qrRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setForm(fromProfile(profile));
  }, [profile]);

  function setField<K extends keyof PaymentForm>(k: K, v: PaymentForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function uploadQr(file: File): Promise<string | null> {
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
    const path = `${user.id}/qr-${Date.now()}.${ext}`;
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

  async function onUploadQR(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQR(true);
    const url = await uploadQr(file);
    if (url) {
      setField("payment_qr_url", url);
      toast.success("อัปโหลด QR แล้ว — กดบันทึกเพื่อยืนยัน");
    }
    setUploadingQR(false);
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
        bank_name: trim(form.bank_name, 80),
        bank_account_name: trim(form.bank_account_name, 80),
        bank_account_number: trim(form.bank_account_number, 50),
        payment_qr_url: form.payment_qr_url.trim() || null,
        currency: form.currency || "THB",
        terms: form.terms.trim().slice(0, 2000) || null,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ: " + error.message);
    } else {
      toast.success("บันทึกช่องทางชำระเงินแล้ว");
      await refreshProfile();
    }
  }

  function onReset() {
    setForm(fromProfile(profile));
    toast.info("รีเซ็ตช่องทางชำระเงินแล้ว");
  }

  return (
    <section id="payment-settings" className="space-y-4 scroll-mt-20">
      <div className="flex items-start justify-between gap-3 px-0.5">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 grid place-items-center shrink-0">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">การเงิน</h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              ช่องทางรับชำระจากลูกค้า — QR PromptPay / โอน และชำระออนไลน์ด้วยบัตร
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 text-xs gap-1 h-8" asChild>
          <Link to="/help/payments">
            <Info className="h-3.5 w-3.5" />
            คู่มือ
          </Link>
        </Button>
      </div>

      <Card className="glass border-border shadow-soft">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 grid place-items-center shrink-0">
              <QrCode className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">ช่องทางการชำระเงิน (QR / โอน)</h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                แสดงบนใบเสนอราคาและหน้าติดตามงาน — ลูกค้าโอนแล้วอัปสลิป
              </p>
              <Button variant="link" size="sm" className="h-auto p-0 mt-1 text-xs gap-1" asChild>
                <Link to="/help/payments" hash="qr">
                  <Info className="h-3.5 w-3.5" />
                  ดูรายละเอียด QR & โอน
                </Link>
              </Button>
            </div>
          </div>

          <form onSubmit={onSave} className="space-y-4">
            <Field label="ชื่อธนาคาร">
              <Input
                value={form.bank_name}
                onChange={(e) => setField("bank_name", e.target.value)}
                maxLength={80}
                placeholder="เช่น กสิกรไทย, PromptPay"
              />
            </Field>

            <Field label="ชื่อบัญชี">
              <Input
                value={form.bank_account_name}
                onChange={(e) => setField("bank_account_name", e.target.value)}
                maxLength={80}
                placeholder="เช่น สมชาย ใจดี"
              />
            </Field>

            <Field label="เลขบัญชี">
              <Input
                value={form.bank_account_number}
                onChange={(e) => setField("bank_account_number", e.target.value)}
                maxLength={50}
                placeholder="เช่น 123-4-56789-0"
              />
            </Field>

            <div className="space-y-2">
              <Label className="text-xs font-medium">QR Code สำหรับชำระเงิน</Label>
              <div className="flex items-center gap-3">
                <div className="h-20 w-20 rounded-2xl border border-border bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                  {form.payment_qr_url ? (
                    <img
                      src={form.payment_qr_url}
                      alt="payment QR"
                      className="h-full w-full object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <input
                  ref={qrRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={onUploadQR}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => qrRef.current?.click()}
                  disabled={uploadingQR}
                  className="flex-1 h-12"
                >
                  {uploadingQR ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  อัปโหลด QR
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                แนะนำ QR PromptPay จากแอปธนาคาร · ไม่เกิน 500KB
              </p>
            </div>

            <Field label="สกุลเงิน">
              <Select value={form.currency} onValueChange={(v) => setField("currency", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="เงื่อนไขการใช้บริการ">
              <Textarea
                value={form.terms}
                onChange={(e) => setField("terms", e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder={
                  "• ชำระมัดจำเพื่อเริ่มงาน\n• โอนลิขสิทธิ์เมื่อชำระเต็ม\n• แก้ไขเพิ่มเติม ฿500 ต่อรอบ"
                }
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                แต่ละบรรทัดจะเป็น bullet ในใบเสนอราคา
              </p>
            </Field>

            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="ghost"
                onClick={onReset}
                className="text-muted-foreground gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" /> รีเซ็ต
              </Button>
              <div className="flex-1" />
              <Button type="submit" disabled={saving} className="gap-1.5 px-5">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                บันทึกช่องทางชำระเงิน
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <StripeClientPaymentsSection />
    </section>
  );
}
