import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Handshake, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { storeAnthemQuotationHandoff } from "@/lib/ecosystemHandoff";
import { ANTHEM_SHOWCASE_URL } from "@/lib/productLinks";

const ANTHEM_APP_URL = ANTHEM_SHOWCASE_URL.replace(/\/$/, "");

type HiringRow = {
  id: string;
  project_title: string | null;
  client_name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  deadline: string | null;
  status: string | null;
  created_at: string;
};

export function AnthemJobsPanel({ onOpenQuotations }: { onOpenQuotations?: () => void }) {
  const { user } = useAuth();

  const { data: hires = [], isLoading } = useQuery({
    queryKey: ["anthem-hiring-requests", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("anthem")
        .from("hiring_requests")
        .select(
          "id, project_title, client_name, email, phone, message, deadline, status, created_at",
        )
        .eq("freelancer_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data ?? [];
    },
  });

  function openQuote(hire: HiringRow) {
    const notes = [hire.message, hire.deadline ? `กำหนดส่ง: ${hire.deadline}` : ""]
      .filter(Boolean)
      .join("\n\n");
    storeAnthemQuotationHandoff({
      projectName: hire.project_title || "งานจาก Pixel100",
      clientName: hire.client_name || "ลูกค้า",
      clientEmail: hire.email ?? undefined,
      clientPhone: hire.phone ?? undefined,
      endDate: hire.deadline ?? undefined,
      notes: notes || undefined,
      requestId: hire.id,
    });
    onOpenQuotations?.();
  }

  if (isLoading) {
    return (
      <Card className="glass border-border shadow-soft">
        <CardContent className="p-4 text-sm text-muted-foreground">
          กำลังโหลดงานจาก Pixel100…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Handshake className="h-4 w-4 text-primary" />
          งานจาก Pixel100
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          คำขอจ้างจากหน้าร้าน — สร้างใบเสนอราคาใน So1o ได้ทันที
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {hires.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            ยังไม่มีคำขอจ้าง — ลงผลงานบน{" "}
            <a
              href={ANTHEM_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Pixel100
            </a>{" "}
            เพื่อรับงาน
          </p>
        ) : (
          hires.map((hire) => (
            <div
              key={hire.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{hire.project_title || "งานจ้าง"}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {hire.client_name}
                  {hire.deadline ? ` · ${hire.deadline}` : ""}
                </p>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">
                    {hire.status ?? "ใหม่"}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(hire.created_at).toLocaleDateString("th-TH")}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => openQuote(hire)}
                >
                  สร้าง Quote
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" asChild>
                  <a
                    href={`${ANTHEM_APP_URL}/portfolio/manage`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Pixel100
                  </a>
                </Button>
              </div>
            </div>
          ))
        )}
        {hires.length > 0 && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1">
            <MessageCircle className="h-3 w-3" />
            เปิดแชทจ้างงานได้จาก Pixel100 → แชท
          </p>
        )}
      </CardContent>
    </Card>
  );
}
