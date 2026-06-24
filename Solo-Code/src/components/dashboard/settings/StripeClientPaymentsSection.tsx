import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { CreditCard, ExternalLink, Info, Loader2 } from "lucide-react";
import { getStripeEnvironment } from "@/lib/stripe";

type ConnectProfile = {
  connect_onboarding_complete?: boolean;
  connect_payouts_enabled?: boolean;
  stripe_client_payments_enabled?: boolean;
};

export type StripeConnectPreviewState = "disconnected" | "pending" | "ready";

export function StripeClientPaymentsSection({ preview }: { preview?: StripeConnectPreviewState }) {
  const { profile, refreshProfile } = useAuth();
  const p = profile as (typeof profile & ConnectProfile) | null;
  const isPreview = preview != null;
  const [enabled, setEnabled] = React.useState(
    preview === "ready" ? true : p?.stripe_client_payments_enabled !== false,
  );
  const [saving, setSaving] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);

  React.useEffect(() => {
    if (isPreview) return;
    setEnabled(p?.stripe_client_payments_enabled !== false);
  }, [p?.stripe_client_payments_enabled, isPreview]);

  const connectReady = isPreview
    ? preview === "ready"
    : !!p?.connect_onboarding_complete && !!p?.connect_payouts_enabled;
  const onboardingComplete = isPreview
    ? preview === "pending" || preview === "ready"
    : !!p?.connect_onboarding_complete;

  async function saveEnabled(next: boolean) {
    if (isPreview) {
      setEnabled(next);
      return;
    }
    if (!profile?.user_id) return;
    setSaving(true);
    setEnabled(next);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ stripe_client_payments_enabled: next })
        .eq("user_id", profile.user_id);
      if (error) throw error;
      await refreshProfile();
      toast.success(next ? "เปิดรับชำระออนไลน์แล้ว" : "ปิดรับชำระออนไลน์แล้ว");
    } catch (err) {
      setEnabled(!next);
      toast.error(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function startConnect() {
    if (isPreview) return;
    setConnecting(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("กรุณาเข้าสู่ระบบก่อน");

      const origin = window.location.origin;
      const res = await fetch("/api/payments/connect/onboard", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          environment: getStripeEnvironment(),
          returnUrl: `${origin}/dashboard?tab=settings&connect=done#payment-settings`,
          refreshUrl: `${origin}/dashboard?tab=settings&connect=refresh#payment-settings`,
        }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || json.error || !json.url) {
        throw new Error(json.error ?? "ไม่สามารถเริ่มเชื่อมบัญชีได้");
      }
      window.location.href = json.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เชื่อมบัญชีไม่สำเร็จ");
      setConnecting(false);
    }
  }

  return (
    <Card id="stripe-connect" className="border-primary/15 shadow-soft scroll-mt-20">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm">รับชำระออนไลน์จากลูกค้า</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              ลูกค้าชำระด้วยบัตรบนหน้าติดตามงาน — ลูกค้ารับค่าธรรมเนียม card เอง คุณได้ยอดงานเต็ม
              (ทุกแพ็กเกตที่เชื่อม Stripe Connect แล้ว)
            </p>
            <Button variant="link" size="sm" className="h-auto p-0 mt-1.5 text-xs gap-1" asChild>
              <Link to="/help/payments" hash="online">
                <Info className="h-3.5 w-3.5" />
                ดูรายละเอียดชำระออนไลน์
              </Link>
            </Button>
          </div>
        </div>

        <div className="rounded-xl bg-muted/30 p-3 text-xs space-y-1">
          <p className="font-medium">สถานะ Stripe Connect</p>
          {connectReady ? (
            <p className="text-emerald-700">พร้อมรับชำระออนไลน์</p>
          ) : onboardingComplete ? (
            <p className="text-amber-700">รอ Stripe ตรวจสอบบัญชี</p>
          ) : (
            <p className="text-muted-foreground">ยังไม่ได้เชื่อมบัญชีรับเงิน</p>
          )}
        </div>

        {!connectReady && (
          <>
            <Button
              type="button"
              variant="outline"
              className="gap-1.5 w-full sm:w-auto"
              disabled={connecting}
              onClick={startConnect}
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              เชื่อม Stripe Connect
            </Button>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              ถ้า error เรื่อง Connect — เปิด{" "}
              <a
                href="https://dashboard.stripe.com/test/connect/overview"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Stripe Dashboard → Connect (Test mode)
              </a>{" "}
              แล้วกด Get started ก่อน (ครั้งเดียวต่อบัญชี Stripe)
            </p>
          </>
        )}

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/50">
          <div>
            <Label htmlFor="stripe-client-payments" className="text-sm font-medium">
              แสดงช่องทางชำระออนไลน์ให้ลูกค้า
            </Label>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              ปิดได้ชั่วคราว — QR/สลิปยังใช้ได้ตามปกติ
            </p>
          </div>
          <Switch
            id="stripe-client-payments"
            checked={enabled}
            disabled={saving || !connectReady}
            onCheckedChange={saveEnabled}
          />
        </div>
      </CardContent>
    </Card>
  );
}
