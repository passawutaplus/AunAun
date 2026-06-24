import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useClients, ClientsProvider } from "@/store/clients";
import { MessageSquare, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FeedbackJob, Revision } from "./feedback/types";
import { NewJobDialog } from "./feedback/NewJobDialog";
import { JobCard } from "./feedback/JobCard";
import { PreSubmitChecklist } from "./feedback/PreSubmitChecklist";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { clientsKey } from "@/store/clients";
import { PageFooterActions } from "./PageFooterActions";
import { useSupabaseRecords } from "@/hooks/useSupabaseRecords";

type FeedbackRow = {
  id: string;
  client_id: string;
  title: string;
  closed: boolean;
  revisions: unknown;
  created_at: string;
  revision_quota?: number | null;
  quotation_id?: string | null;
};

export function FeedbackTab() {
  return (
    <ClientsProvider>
      <FeedbackTabInner />
    </ClientsProvider>
  );
}

function FeedbackTabInner() {
  const { list: savedClients, add: addSavedClient } = useClients();
  const qc = useQueryClient();
  const { user } = useAuth();

  const {
    items: jobs,
    setItems: setJobs,
    isLoading,
  } = useSupabaseRecords<FeedbackJob, FeedbackRow>({
    table: "feedback_jobs",
    cacheKey: "feedback_jobs",
    orderBy: { column: "created_at", ascending: false },
    fromRow: (r) => ({
      id: r.id,
      title: r.title,
      clientId: r.client_id,
      closed: r.closed,
      createdAt: r.created_at,
      revisions: Array.isArray(r.revisions) ? (r.revisions as Revision[]) : [],
      revisionQuota: r.revision_quota ?? null,
      quotationId: r.quotation_id ?? null,
    }),
    toRow: (j, userId) => ({
      id: j.id,
      user_id: userId,
      client_id: j.clientId,
      title: j.title,
      closed: j.closed,
      revisions: j.revisions as unknown,
      revision_quota: j.revisionQuota ?? null,
      quotation_id: j.quotationId ?? null,
    }),
  });

  const handleAddClient = React.useCallback(
    async (name: string) => {
      const c = await addSavedClient({ name });
      return c.id;
    },
    [addSavedClient],
  );

  const handleResync = React.useCallback(() => {
    qc.invalidateQueries({ queryKey: clientsKey(user?.id ?? null) });
    toast.success("ซิงค์รายชื่อลูกค้าแล้ว");
  }, [qc, user?.id]);

  const [filter, setFilter] = React.useState<"all" | "open" | "closed">("all");

  const clientOptionsForAdd = React.useMemo(
    () => savedClients.map((c) => ({ id: c.id, name: c.name })),
    [savedClients],
  );

  const clientName = (id: string) => savedClients.find((c) => c.id === id)?.name ?? "—";

  const filtered = jobs.filter((j) =>
    filter === "all" ? true : filter === "open" ? !j.closed : j.closed,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-base font-semibold">Feedback ลูกค้า</h3>
            <p className="text-[11px] text-muted-foreground">
              จดฟีดแบคแต่ละรอบ พร้อมแนบรูป · ข้อมูลถูกบันทึกในบัญชีของคุณอัตโนมัติ
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResync}
            className="h-9 gap-1.5 rounded-xl text-xs"
            title="ดึงรายชื่อลูกค้าล่าสุดจากฟีเจอร์ลูกค้า"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Resync ลูกค้า
          </Button>
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="h-9 w-[140px] rounded-xl text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              <SelectItem value="open">กำลังดำเนินการ</SelectItem>
              <SelectItem value="closed">ปิดแล้ว</SelectItem>
            </SelectContent>
          </Select>
          <NewJobDialog
            clientOptions={clientOptionsForAdd}
            onAddClient={handleAddClient}
            onAdd={(j) => setJobs((arr) => [j, ...arr])}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดงานของคุณ…
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-10">
              ยังไม่มีรายการฟีดแบค — กดปุ่ม "เพิ่มงาน" เพื่อเริ่มต้น
            </p>
          )}
          {filtered.map((j) => (
            <JobCard
              key={j.id}
              job={j}
              clientName={clientName(j.clientId)}
              onUpdate={(updated) =>
                setJobs((arr) => arr.map((x) => (x.id === updated.id ? updated : x)))
              }
              onDelete={() => setJobs((arr) => arr.filter((x) => x.id !== j.id))}
            />
          ))}
        </div>
      )}

      <PreSubmitChecklist />

      <PageFooterActions feature="Feedback" label="Feedback ลูกค้า" />
    </div>
  );
}
