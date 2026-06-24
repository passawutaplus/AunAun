import * as React from "react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { EsignDisclaimer } from "@/components/legal/EsignDisclaimer";
import { uploadSignatureImage } from "@/lib/uploadSignatureImage";
import { Loader2, PenLine, Trash2, Upload } from "lucide-react";

export function SignatureSettingsSection() {
  const { user, profile, refreshProfile } = useAuth();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [ackSaving, setAckSaving] = React.useState(false);
  const [ack, setAck] = React.useState(false);

  const signatureUrl = profile?.signature_url ?? null;
  const acknowledged = Boolean(profile?.esign_acknowledged_at);

  React.useEffect(() => {
    setAck(acknowledged);
  }, [acknowledged]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!acknowledged && !ack) {
      toast.error("กรุณายอมรับข้อจำกัดก่อนอัปโหลดลายเซ็น");
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      if (!acknowledged && ack) {
        const { error: ackErr } = await supabase
          .from("profiles")
          .update({ esign_acknowledged_at: new Date().toISOString() })
          .eq("user_id", user.id);
        if (ackErr) throw ackErr;
      }
      const { publicUrl } = await uploadSignatureImage(user.id, file);
      const { error } = await supabase
        .from("profiles")
        .update({ signature_url: publicUrl })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("บันทึกลายเซ็นแล้ว");
      await refreshProfile();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function onRemove() {
    if (!user) return;
    setUploading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ signature_url: null })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("ลบลายเซ็นแล้ว");
      await refreshProfile();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  async function onAckOnly(checked: boolean) {
    setAck(checked);
    if (!user || !checked || acknowledged) return;
    setAckSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ esign_acknowledged_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
    } catch (err) {
      setAck(false);
      toast.error(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setAckSaving(false);
    }
  }

  return (
    <section id="signature-settings" className="space-y-4 scroll-mt-20">
      <div className="flex items-start gap-3 px-0.5">
        <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-600 grid place-items-center shrink-0">
          <PenLine className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold tracking-tight">ลายเซ็นเอกสาร</h2>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            อัปโหลด PNG พื้นหลังโปร่งใส — ใช้ฝังในใบเสนอราคาหรือเอกสาร PDF
          </p>
        </div>
      </div>

      <Card className="border-border/60">
        <CardContent className="pt-5 space-y-4">
          <EsignDisclaimer variant="tool" />
          <EsignDisclaimer variant="freelancer" />

          {!acknowledged && (
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={ack}
                disabled={ackSaving}
                onCheckedChange={(v) => void onAckOnly(v === true)}
                className="mt-0.5"
              />
              <span className="text-xs leading-relaxed text-muted-foreground">
                ฉันเข้าใจว่าเป็นเครื่องมือช่วยจัดทำเอกสาร และฉันเป็นผู้รับผิดชอบการขอความยินยอมจากลูกค้า
              </span>
            </label>
          )}

          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div
              className="h-24 w-40 rounded-lg border border-dashed border-border bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,transparent_0%_50%)] bg-[length:12px_12px] grid place-items-center overflow-hidden"
            >
              {signatureUrl ? (
                <img
                  src={signatureUrl}
                  alt="ลายเซ็นของคุณ"
                  className="max-h-20 max-w-[9rem] object-contain"
                />
              ) : (
                <span className="text-[10px] text-muted-foreground px-2 text-center">ยังไม่มีลายเซ็น</span>
              )}
            </div>

            <div className="flex flex-col gap-2 flex-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/webp"
                className="hidden"
                onChange={onUpload}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploading || (!acknowledged && !ack)}
                onClick={() => fileRef.current?.click()}
                className="gap-1.5 h-10 w-full sm:w-auto"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {signatureUrl ? "เปลี่ยนลายเซ็น" : "อัปโหลด PNG"}
              </Button>
              {signatureUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={uploading}
                  onClick={() => void onRemove()}
                  className="gap-1.5 text-destructive hover:text-destructive w-full sm:w-auto justify-start"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  ลบลายเซ็น
                </Button>
              )}
              <Label className="text-[10px] text-muted-foreground font-normal">
                PNG หรือ WebP พื้นหลังโปร่งใส · ย่ออัตโนมัติ ~800px
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
