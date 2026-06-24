import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useAdminDisputeEscrow,
  useAdminEscrows,
  escrowPayUrl,
} from "@/hooks/useMarketplaceEscrow";

export function AdminEscrowPanel() {
  const { data: rows = [], isLoading, refetch } = useAdminEscrows();
  const dispute = useAdminDisputeEscrow();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Escrow Marketplace
        </h2>
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
          รีเฟรช
        </Button>
      </div>
      {!rows.length ? (
        <p className="text-sm text-muted-foreground">ยังไม่มีรายการ Escrow</p>
      ) : (
        rows.map((row) => (
          <Card key={row.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="truncate">{row.title}</span>
                <Badge variant="secondary">{row.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>
                ฿{row.amount_thb.toLocaleString("th-TH")} · สุทธิ ฿
                {row.net_payout_thb.toLocaleString("th-TH")}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {escrowPayUrl(row.portal_token)}
              </p>
              {row.status === "disputed" ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    disabled={dispute.isPending}
                    onClick={() =>
                      dispute.mutate({ id: row.id, action: "release", note: "admin release" })
                    }
                  >
                    ปล่อยเงิน
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={dispute.isPending}
                    onClick={() =>
                      dispute.mutate({ id: row.id, action: "refund", note: "admin refund" })
                    }
                  >
                    คืนเงิน (mark)
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={dispute.isPending}
                    onClick={() => dispute.mutate({ id: row.id, action: "reopen" })}
                  >
                    เปิดงานต่อ
                  </Button>
                </div>
              ) : null}
              {row.status === "pending_release" ? (
                <Button
                  size="sm"
                  disabled={dispute.isPending}
                  onClick={() =>
                    dispute.mutate({ id: row.id, action: "release", note: "admin release" })
                  }
                >
                  โอน Stripe Connect
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
