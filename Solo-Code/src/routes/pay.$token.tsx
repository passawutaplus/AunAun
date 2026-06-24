import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, CreditCard, ThumbsUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const escrowRpc = (fn: string, args?: Record<string, unknown>) =>
  (
    supabase as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: Error | null }>;
    }
  ).rpc(fn, args);

export const Route = createFileRoute("/pay/$token")({
  head: ({ params }) => ({
    meta: [
      { title: "ชำระเงิน Escrow | So1o Freelancer" },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:url", content: `https://solofreelancer.com/pay/${params.token}` },
    ],
  }),
  component: EscrowPayPage,
});

type EscrowRow = {
  id: string;
  title: string;
  client_name: string;
  amount_thb: number;
  platform_fee_thb: number;
  net_payout_thb: number;
  status: string;
  funded_at: string | null;
  approved_at: string | null;
};

const statusLabel: Record<string, string> = {
  pending_payment: "รอชำระเงิน",
  funded: "ชำระแล้ว · รอฟรีแลนซ์ทำงาน",
  in_progress: "กำลังดำเนินงาน",
  pending_release: "รอปล่อยเงินให้ฟรีแลนซ์",
  released: "ปล่อยเงินแล้ว",
  disputed: "มีข้อพิพาท",
  refunded: "คืนเงินแล้ว",
  cancelled: "ยกเลิก",
};

function EscrowPayPage() {
  const { token } = Route.useParams();
  const [escrow, setEscrow] = useState<EscrowRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await escrowRpc("get_escrow_by_portal_token", {
        _portal_token: token,
      });
      if (error) throw error;
      setEscrow(data as EscrowRow | null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const startPay = async () => {
    setPaying(true);
    try {
      const origin = window.location.origin;
      const res = await fetch(`${origin}/api/public/payments/client-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          paymentType: "escrow",
          successUrl: `${origin}/pay/${token}?paid=1`,
          cancelUrl: `${origin}/pay/${token}?canceled=1`,
        }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || json.error || !json.url) throw new Error(json.error ?? "ไม่สามารถเริ่มชำระเงินได้");
      window.location.href = json.url;
    } catch (e) {
      toast.error((e as Error).message);
      setPaying(false);
    }
  };

  const approve = async () => {
    setActing(true);
    try {
      const { error } = await escrowRpc("client_approve_escrow", { _portal_token: token });
      if (error) throw error;
      toast.success("อนุมัติงานแล้ว — ระบบจะปล่อยเงินให้ฟรีแลนซ์");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setActing(false);
    }
  };

  const dispute = async () => {
    const reason = window.prompt("เหตุผลที่แจ้งข้อพิพาท (ถ้ามี)") ?? "";
    setActing(true);
    try {
      const { error } = await escrowRpc("client_dispute_escrow", {
        _portal_token: token,
        _reason: reason,
      });
      if (error) throw error;
      toast.success("แจ้งข้อพิพาทแล้ว — ทีมงานจะติดต่อกลับ");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!escrow) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-muted-foreground">ไม่พบลิงก์ชำระเงิน</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
          <h1 className="text-2xl font-semibold">ชำระเงินผ่าน Escrow</h1>
          <p className="text-sm text-muted-foreground">
            ทางเลือกเพื่อความมั่นใจ — เงินพักในระบบจนกว่าคุณอนุมัติงาน · โอนตรงนอกแพลตฟอร์มเราไม่รับประกัน
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{escrow.title}</CardTitle>
            <Badge variant="secondary">{statusLabel[escrow.status] ?? escrow.status}</Badge>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {escrow.client_name ? (
              <p>
                <span className="text-muted-foreground">ลูกค้า:</span> {escrow.client_name}
              </p>
            ) : null}
            <p className="text-2xl font-bold">฿{escrow.amount_thb.toLocaleString("th-TH")}</p>
            <p className="text-muted-foreground text-xs">
              ฟรีแลนซ์ได้รับสุทธิ ฿{escrow.net_payout_thb.toLocaleString("th-TH")} (หลังหักค่าธรรมเนียม
              ฿{escrow.platform_fee_thb.toLocaleString("th-TH")})
            </p>

            {escrow.status === "pending_payment" ? (
              <Button className="w-full" onClick={startPay} disabled={paying}>
                {paying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                ชำระเงิน
              </Button>
            ) : null}

            {escrow.status === "funded" || escrow.status === "in_progress" ? (
              <div className="flex flex-col gap-2">
                <Button className="w-full" onClick={approve} disabled={acting}>
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  อนุมัติงานและปล่อยเงิน
                </Button>
                <Button variant="outline" className="w-full" onClick={dispute} disabled={acting}>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  แจ้งข้อพิพาท
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
