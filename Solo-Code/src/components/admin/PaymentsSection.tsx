import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { CreditCard, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminEscrowPanel } from "@/components/dashboard/admin/AdminEscrowPanel";

type PaymentRow = {
  id: string;
  event_type: string;
  message: string;
  amount_cents: number | null;
  currency: string | null;
  environment: string;
  created_at: string;
  user_id: string | null;
};

export function PaymentsSection() {
  const [rows, setRows] = React.useState<PaymentRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from("payment_notifications")
        .select("id, event_type, message, amount_cents, currency, environment, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(80);
      if (error) throw error;
      setRows((data ?? []) as PaymentRow[]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "โหลด payment events ไม่สำเร็จ";
      setLoadError(msg);
      setRows([]);
      toast.error("โหลด payment events ไม่สำเร็จ", { description: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Payments
          </h2>
          <p className="text-sm text-muted-foreground">Stripe / webhook events ล่าสุด</p>
        </div>
        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" />
          รีเฟรช
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังโหลด...
            </div>
          ) : loadError ? (
            <div className="text-center py-16 text-sm text-destructive px-4">
              โหลดไม่สำเร็จ: {loadError}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">
              ยังไม่มี payment events
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {rows.map((r) => (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {r.event_type}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {r.environment}
                    </Badge>
                    {r.amount_cents != null && (
                      <span className="text-xs font-semibold num">
                        {(r.amount_cents / 100).toLocaleString("th-TH")}{" "}
                        {r.currency?.toUpperCase() ?? "THB"}
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-1">{r.message || "—"}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: th })}
                    {r.user_id && <span className="ml-1 font-mono">· {r.user_id.slice(0, 8)}</span>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <AdminEscrowPanel />
    </div>
  );
}
