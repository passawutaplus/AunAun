import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, History } from "lucide-react";
import { fmt } from "@/components/price-guide/priceLogic";
import { PriceGuideModal } from "@/components/price-guide/PriceGuideModal";

interface EventRow {
  id: string;
  job_type: string;
  days: number;
  quantity: number;
  complexity: string;
  recommended_price: number;
  applied: boolean;
  reasoning: string | null;
  created_at: string;
}

export function PriceHistoryWidget() {
  const { user } = useAuth();
  const [rows, setRows] = React.useState<EventRow[]>([]);
  const [open, setOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("price_guide_events")
      .select("id,job_type,days,quantity,complexity,recommended_price,applied,reasoning,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    setRows((data as EventRow[]) ?? []);
  }, [user]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: refresh whenever the user's price_guide_events change (insert/delete by trim trigger)
  React.useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`pg-events-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "price_guide_events",
          filter: `user_id=eq.${user.id}`,
        },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, refresh]);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4 text-primary" /> ประวัติประเมินราคา
        </CardTitle>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpen(true)}>
          <Sparkles className="h-3 w-3 mr-1" /> ประเมินใหม่
        </Button>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {rows.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">
            ยังไม่มีประวัติ — ลองกด "ประเมินใหม่" ดูครับ
          </p>
        )}
        {rows.length > 0 && (
          <p className="text-[10px] text-muted-foreground text-center pb-1">
            เก็บประวัติได้สูงสุด 5 รายการล่าสุด
          </p>
        )}
        {rows.map((r) => (
          <div key={r.id} className="text-xs p-2 rounded-lg bg-muted/30">
            <button
              onClick={() => setExpanded(expanded === r.id ? null : r.id)}
              className="w-full flex items-center gap-2 text-left"
            >
              <Badge variant="outline" className="text-[10px] shrink-0">
                {r.job_type}
              </Badge>
              <span className="num text-muted-foreground shrink-0">
                {r.days}วัน × {r.quantity}
              </span>
              <span className="num font-semibold text-primary flex-1">
                ฿{fmt(Number(r.recommended_price))}
              </span>
              {r.applied && (
                <Badge className="bg-success/15 text-success border-success/30 text-[10px]">
                  ใช้แล้ว
                </Badge>
              )}
              <span className="text-muted-foreground text-[10px] shrink-0">
                {new Date(r.created_at).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </button>
            {expanded === r.id && r.reasoning && (
              <p className="mt-2 pt-2 border-t border-border/40 text-muted-foreground whitespace-pre-line leading-relaxed">
                {r.reasoning}
              </p>
            )}
          </div>
        ))}
      </CardContent>
      <PriceGuideModal
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) refresh();
        }}
      />
    </Card>
  );
}
