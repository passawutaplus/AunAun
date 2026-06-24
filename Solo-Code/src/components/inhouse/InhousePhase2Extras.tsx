import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { FileText, FolderOpen, Loader2, Workflow } from "lucide-react";
import { useOrgQuotations } from "@/hooks/inhouse/useInhouseQuotation";

/** Phase 2 — shared asset library entry (org-scoped assets ship later). */
export function InhouseSharedAssetsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderOpen className="h-4 w-4" />
          Shared Asset Library
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          ไลบรารี asset ร่วมของทีม (brand kit, รูป, ไฟล์) — ใช้ Assets ส่วนตัวได้ก่อน แล้วจะ sync
          ข้ามสมาชิกในรอบถัดไป
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link to="/dashboard" search={{ tab: "mydata", sub: "assets" }}>
            เปิด Assets (My Desk)
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

interface PipelineBridgeProps {
  orgId: string;
  linkedQuotationId: string | null;
  onCreateTeamQuote?: () => void;
  creatingTeamQuote?: boolean;
}

/** Link workspace ↔ Client Work pipeline quotation. */
export function InhousePipelineBridge({
  orgId,
  linkedQuotationId,
  onCreateTeamQuote,
  creatingTeamQuote,
}: PipelineBridgeProps) {
  const { data: orgQuotes = [] } = useOrgQuotations(orgId);

  if (linkedQuotationId) {
    const linked = orgQuotes.find((q) => q.id === linkedQuotationId);
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 py-4 text-sm">
          <Workflow className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>
            เชื่อมกับ Pipeline แล้ว
            {linked ? ` · ${linked.number}` : ""}
          </span>
          <Button variant="link" size="sm" className="h-auto p-0" asChild>
            <Link
              to="/dashboard"
              search={{ tab: "finance", sub: "pipeline" }}
              onClick={() => {
                try {
                  sessionStorage.setItem("so1o.openQuotationId", linkedQuotationId);
                } catch {
                  /* noop */
                }
              }}
            >
              เปิดใบเสนอราคา
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Client Work
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-3">
        <p>สร้างใบเสนอราคาในนามทีม แล้วผูกกับ workspace นี้</p>
        {onCreateTeamQuote && (
          <Button
            variant="default"
            size="sm"
            onClick={onCreateTeamQuote}
            disabled={creatingTeamQuote}
          >
            {creatingTeamQuote && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            สร้างใบเสนอราคาทีม
          </Button>
        )}
        {orgQuotes.length > 0 && (
          <div className="pt-2 border-t space-y-1">
            <p className="text-xs font-medium text-foreground">ใบเสนอราคาทีมล่าสุด</p>
            {orgQuotes.slice(0, 3).map((q) => (
              <Link
                key={q.id}
                to="/dashboard"
                search={{ tab: "finance", sub: "pipeline" }}
                className="block text-xs text-primary underline"
                onClick={() => {
                  try {
                    sessionStorage.setItem("so1o.openQuotationId", q.id);
                  } catch {
                    /* noop */
                  }
                }}
              >
                {q.number} — {q.projectName || q.clientName || "ไม่มีชื่อ"}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
