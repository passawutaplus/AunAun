import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSignature, Search, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { toast } from "sonner";

export interface BriefSummary {
  id: string;
  title: string;
  status: string;
  share_token: string;
  client_info: Record<string, unknown> | null;
  updated_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (brief: BriefSummary) => void;
  currentBriefId?: string;
}

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  draft: { label: "ฉบับร่าง", tone: "bg-muted text-muted-foreground" },
  awaiting_client: {
    label: "รอลูกค้ากรอก",
    tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  awaiting_confirm: { label: "รอยืนยัน", tone: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  confirmed: {
    label: "ยืนยันแล้ว",
    tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
};

export function AttachBriefDialog({ open, onOpenChange, onPick, currentBriefId }: Props) {
  const { user } = useAuth();
  const [briefs, setBriefs] = React.useState<BriefSummary[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("design_briefs")
      .select("id,title,status,share_token,client_info,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          toast.error("โหลดบรีฟไม่สำเร็จ");
          setBriefs([]);
        } else {
          setBriefs((data ?? []) as BriefSummary[]);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return briefs;
    return briefs.filter((b) => {
      const cname = (b.client_info?.name as string | undefined) ?? "";
      return b.title.toLowerCase().includes(q) || cname.toLowerCase().includes(q);
    });
  }, [briefs, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileSignature className="h-4 w-4 text-primary" /> แนบ Design Brief
          </DialogTitle>
          <DialogDescription className="text-xs">
            เลือกบรีฟที่สร้างจาก Smart Brief เพื่อผูกกับใบเสนอราคานี้ —
            ระบบจะดึงข้อมูลลูกค้าและชื่องานให้อัตโนมัติ (เฉพาะช่องที่ยังว่าง)
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อบรีฟหรือชื่อลูกค้า..."
            className="pl-8 h-9 text-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />{" "}
              <span className="text-xs">กำลังโหลดบรีฟ...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground">
              {briefs.length === 0
                ? "ยังไม่มีบรีฟ — สร้างบรีฟใน Smart Brief ก่อนนะครับ"
                : "ไม่พบบรีฟที่ตรงกับคำค้นหา"}
            </div>
          ) : (
            filtered.map((b) => {
              const status = STATUS_LABELS[b.status] ?? { label: b.status, tone: "bg-muted" };
              const cname = (b.client_info?.name as string | undefined) || "—";
              const isCurrent = b.id === currentBriefId;
              return (
                <div
                  key={b.id}
                  className={`rounded-xl border p-3 flex items-start gap-3 transition ${
                    isCurrent ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{b.title || "ไม่มีชื่อ"}</p>
                      <Badge
                        className={`${status.tone} border-0 text-[10px] rounded-full px-2 py-0`}
                      >
                        {status.label}
                      </Badge>
                      {isCurrent && (
                        <span className="text-[10px] text-primary font-medium">(ผูกอยู่)</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">ลูกค้า: {cname}</p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant={isCurrent ? "outline" : "default"}
                      className="h-7 text-xs"
                      onClick={() => {
                        onPick(b);
                        onOpenChange(false);
                      }}
                    >
                      {isCurrent ? "เลือกซ้ำ" : "เลือก"}
                    </Button>
                    <a
                      href={`/brief/${b.share_token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 justify-center"
                    >
                      เปิด <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
