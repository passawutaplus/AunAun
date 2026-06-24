import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mic, Plus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { formatDuration } from "@/lib/meetingCaptureSchema";
import { consumeOpenMeetingCapture } from "@/lib/pipelineNewDeal";
import { PageFooterActions } from "@/components/dashboard/PageFooterActions";
import { MeetingCapturePanel } from "./meetings/MeetingCapturePanel";
import { MeetingReportView } from "./meetings/MeetingReportView";
import type { MeetingCaptureRow } from "./meetings/MeetingReportPdfTemplate";

type View = "list" | "capture" | "detail";

const STATUS_LABEL: Record<string, string> = {
  pending: "รอดำเนินการ",
  uploading: "กำลังอัปโหลด",
  transcribing: "กำลังถอดเสียง",
  transcribed: "รอสรุปรายงาน",
  reporting: "กำลังสรุปรายงาน",
  extracting: "กำลังสรุปบรีฟ",
  ready: "พร้อมอ่าน",
  failed: "ล้มเหลว",
};

function rowFromDb(r: Record<string, unknown>): MeetingCaptureRow {
  return {
    id: r.id as string,
    user_id: r.user_id as string,
    client_id: (r.client_id as string | null) ?? null,
    title: (r.title as string | null) ?? null,
    source_type: r.source_type as string,
    duration_sec: (r.duration_sec as number | null) ?? null,
    status: r.status as string,
    transcript: (r.transcript as string | null) ?? null,
    report_markdown: (r.report_markdown as string | null) ?? null,
    extract_result: (r.extract_result as Record<string, unknown> | null) ?? null,
    brief_id: (r.brief_id as string | null) ?? null,
    error_message: (r.error_message as string | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

export function MeetingsTab() {
  const { user } = useAuth();
  const [view, setView] = React.useState<View>("list");
  const [items, setItems] = React.useState<MeetingCaptureRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<MeetingCaptureRow | null>(null);
  const [reportDraft, setReportDraft] = React.useState("");

  const load = React.useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("meeting_captures")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setItems((data ?? []).map(rowFromDb));
    setLoading(false);
  }, [user]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (consumeOpenMeetingCapture()) setView("capture");
  }, []);

  const openDetail = (row: MeetingCaptureRow) => {
    setSelected(row);
    setReportDraft(row.report_markdown ?? "");
    setView("detail");
  };

  const handleCaptureDone = (row: MeetingCaptureRow) => {
    setItems((arr) => [row, ...arr.filter((x) => x.id !== row.id)]);
    openDetail(row);
  };

  if (view === "capture") {
    return (
      <MeetingCapturePanel
        onCancel={() => setView("list")}
        onDone={handleCaptureDone}
      />
    );
  }

  if (view === "detail" && selected) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-1 -ml-2" onClick={() => setView("list")}>
          <ArrowLeft className="h-4 w-4" /> กลับรายการ
        </Button>
        <MeetingReportView
          capture={selected}
          reportMarkdown={reportDraft}
          onReportChange={setReportDraft}
          onSaved={() => {
            setSelected((s: MeetingCaptureRow | null) =>
              s ? { ...s, report_markdown: reportDraft } : s,
            );
            void load();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" /> Meeting
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            อัดหรืออัปโหลดการประชุม → ถอดเสียง → สรุปรายงานอ่านง่าย · Export PDF
          </p>
        </div>
        <Button onClick={() => setView("capture")} className="rounded-xl gap-1.5">
          <Plus className="h-4 w-4" /> บันทึกการประชุมใหม่
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center space-y-2">
          <Mic className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="font-medium">ยังไม่มีรายงานการประชุม</p>
          <p className="text-xs text-muted-foreground">กดปุ่มด้านบนเพื่อเริ่มบันทึกครั้งแรก</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {items.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => openDetail(m)}
              className="rounded-2xl border border-border bg-card p-4 text-left hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{m.title || "สรุปการประชุม"}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(m.created_at).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                    {m.duration_sec ? ` · ${formatDuration(m.duration_sec)}` : ""}
                  </p>
                </div>
                <Badge variant={m.status === "ready" ? "default" : "secondary"} className="text-[10px]">
                  {STATUS_LABEL[m.status] ?? m.status}
                </Badge>
              </div>
              {m.error_message && (
                <p className="text-[11px] text-destructive mt-2">{m.error_message}</p>
              )}
            </button>
          ))}
        </div>
      )}

      <PageFooterActions feature="meeting" label="Meeting" />
    </div>
  );
}
