import { useMemo } from "react";
import BriefcaseIcon from "../icons/BriefcaseIcon";
import { Handshake, Calendar, Coins, Paperclip, ExternalLink, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Conversation } from "@/hooks/useChat";
import { ChatQuoteActions } from "@/components/chat/ChatQuoteActions";
import { ChatCollabActions } from "@/components/chat/ChatCollabActions";
import { HireOrderFlowPanel } from "@/components/hire/HireOrderFlowPanel";
import { HireOrderDetailContent } from "@/components/hire/HireOrderDetailDialog";
import { useCollabPlan } from "@/hooks/useCollabPlan";
import { useCollabPlanUi } from "@/stores/collabPlanUiStore";
import {
  COLLAB_PIPELINE,
  countCollabPlanProgress,
  deliverableItemsFromAlign,
  getAlignOverview,
  normalizeStepProgressEntries,
  summarizeProgressEntries,
} from "@/lib/collabToolkit";
import { cn } from "@/lib/utils";

function formatPlanDate(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const d = new Date(raw.length <= 10 ? `${raw}T12:00:00` : raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const COLLAB_TYPE_LABELS: Record<string, string> = {
  chat: "พูดคุย",
  "joint-project": "ร่วมโปรเจกต์",
  "skill-swap": "แลกเปลี่ยนสกิล",
  studio: "Studio/ทีม",
  experiment: "งานทดลอง",
  content: "คอนเทนต์",
  other: "อื่นๆ",
};

const ChatMetaPanel = ({
  conversation,
  embedded = false,
}: {
  conversation: Conversation;
  embedded?: boolean;
}) => {
  const navigate = useNavigate();
  const isHire = conversation.kind === "hire";
  const isCollab = conversation.kind === "collab";
  const openPlan = useCollabPlanUi((s) => s.openFor);
  const {
    doc: planDoc,
    state: planState,
    isLoading: planLoading,
  } = useCollabPlan(
    conversation,
    isCollab || conversation.group_tag === "collab",
  );
  const planProgress = countCollabPlanProgress(planDoc);
  const planDetails = useMemo(() => {
    const align = planDoc.payload.align;
    const overview = getAlignOverview(align).trim();
    const deliverables = deliverableItemsFromAlign(align)
      .map((d) => d.trim())
      .filter(Boolean);
    const dates = [
      align.draftAt ? `ร่าง: ${formatPlanDate(align.draftAt)}` : null,
      align.dueAt ? `ส่ง: ${formatPlanDate(align.dueAt)}` : null,
      align.releaseAt ? `ลงผลงาน: ${formatPlanDate(align.releaseAt)}` : null,
    ].filter(Boolean) as string[];
    const refs = (align.referenceLinks ?? []).map((u) => u.trim()).filter(Boolean);
    const portfolios = align.portfolioRefs ?? [];
    const laterNotes = (
      [
        ["create", "สร้างงาน", planDoc.payload.create],
        ["review", "ยืนยันสุดท้าย", planDoc.payload.review],
        ["publish", "ลงผลงานร่วมกัน", planDoc.payload.publish],
      ] as const
    )
      .map(([id, label, step]) => {
        if (id === "publish") {
          const note = step.note.trim();
          return note ? { id, label, note } : null;
        }
        const fromEntries = summarizeProgressEntries(
          normalizeStepProgressEntries(step as typeof planDoc.payload.create),
        );
        const note = fromEntries || step.note.trim();
        return note ? { id, label, note } : null;
      })
      .filter((x): x is { id: string; label: string; note: string } => !!x);
    const finalLinks = [
      ...(planDoc.payload.review.finalLinks ?? []),
      ...(planDoc.payload.publish.finalLinks ?? []),
    ]
      .map((u) => u.trim())
      .filter(Boolean);
    const hasAny =
      !!overview ||
      dates.length > 0 ||
      !!align.timelineNote?.trim() ||
      deliverables.length > 0 ||
      !!align.rights?.trim() ||
      refs.length > 0 ||
      portfolios.length > 0 ||
      laterNotes.length > 0 ||
      finalLinks.length > 0;
    return {
      overview,
      dates,
      timelineNote: align.timelineNote?.trim() ?? "",
      deliverables,
      rights: align.rights?.trim() ?? "",
      refs,
      portfolios,
      laterNotes,
      finalLinks,
      hasAny,
    };
  }, [planDoc.payload]);

  const { data: meta } = useQuery({
    queryKey: ["chat-meta", conversation.kind, conversation.request_id],
    enabled: !!conversation.request_id && (isHire || isCollab),
    queryFn: async () => {
      if (isHire) {
        const { data } = await supabase
          .from("hiring_requests")
          .select("budget, budget_amount, deadline, project_title, client_name, email, phone, message")
          .eq("id", conversation.request_id)
          .maybeSingle();
        return { hire: data, collab: null };
      }
      const { data } = await supabase
        .from("collab_requests")
        .select("collab_types, timeline, message, attached_project_ids")
        .eq("id", conversation.request_id)
        .maybeSingle();
      return { hire: null, collab: data };
    },
  });

  const accent = isHire ? "text-[hsl(var(--chat-hire))]" : "text-[hsl(var(--chat-collab))]";
  const bg = isHire ? "bg-[hsl(var(--chat-hire-soft))]" : "bg-[hsl(var(--chat-collab-soft))]";
  const showCollabPlan = isCollab || conversation.group_tag === "collab";

  return (
    <aside
      className={
        embedded
          ? "w-full bg-background overflow-y-auto"
          : "w-full lg:w-80 lg:border-l lg:border-border bg-background overflow-y-auto"
      }
    >
      {!embedded && (
        <div className={`p-4 ${bg}`}>
          <div className={`inline-flex items-center gap-1.5 text-xs font-semibold ${accent}`}>
            {isHire ? <BriefcaseIcon className="w-3.5 h-3.5" /> : <Handshake className="w-3.5 h-3.5" />}
            {isHire ? "ข้อมูลงานจ้าง" : "ข้อมูลแผนงานร่วมกัน"}
          </div>
          <h3 className="font-medium text-foreground mt-1 line-clamp-2">
            {conversation.project_title || (isHire ? "งานจ้าง" : "คอลแลป")}
          </h3>
        </div>
      )}

      <div className="p-4 space-y-3 text-sm">
        {isHire && meta?.hire && (
          <>
            <Row icon={<Coins className="w-4 h-4" />} label="งบประมาณ" value={meta.hire.budget_amount ? `฿${meta.hire.budget_amount.toLocaleString()}` : meta.hire.budget ?? "—"} />
            <Row icon={<Calendar className="w-4 h-4" />} label="กำหนดส่ง" value={meta.hire.deadline ?? "ยังไม่ระบุ"} />
            <div>
              <p className="text-xs text-muted-foreground mb-1">รายละเอียดงาน</p>
              <p className="text-base leading-6 text-foreground whitespace-pre-wrap">{meta.hire.message ?? "—"}</p>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1.5">ติดต่อลูกค้า</p>
              <div className="space-y-1 text-sm">
                <div className="text-foreground">{meta.hire.client_name}</div>
                <a href={`mailto:${meta.hire.email}`} className="block text-[hsl(var(--chat-hire))] hover:underline">{meta.hire.email}</a>
                {meta.hire.phone && <a href={`tel:${meta.hire.phone}`} className="block text-[hsl(var(--chat-hire))] hover:underline">{meta.hire.phone}</a>}
              </div>
            </div>
          </>
        )}

        {showCollabPlan ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-[hsl(var(--chat-collab))]">แผนงานร่วมกัน</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {planLoading
                    ? "กำลังโหลด…"
                    : `ความคืบหน้า ${planProgress.done}/${planProgress.total}`}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-full text-[11px] bg-[hsl(var(--chat-collab))] text-white hover:opacity-90"
                onClick={() => openPlan(conversation.id)}
              >
                <Handshake className="w-3.5 h-3.5 mr-1" />
                เปิดแผน
              </Button>
            </div>

            <div className="rounded-xl border border-[hsl(var(--chat-collab)/0.3)] bg-[hsl(var(--chat-collab-soft))]/40 p-3 space-y-3">
              {planLoading ? (
                <p className="text-[11px] text-muted-foreground">กำลังโหลดรายละเอียดแผน…</p>
              ) : planDetails.hasAny ? (
                <>
                  {planDetails.overview ? (
                    <DetailBlock label="เป้าหมาย / บรีฟ / บทบาท" value={planDetails.overview} />
                  ) : null}
                  {planDetails.dates.length > 0 || planDetails.timelineNote ? (
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium text-muted-foreground">ไทม์ไลน์</p>
                      {planDetails.dates.length > 0 ? (
                        <p className="text-[12px] text-foreground leading-snug">
                          {planDetails.dates.join(" · ")}
                        </p>
                      ) : null}
                      {planDetails.timelineNote ? (
                        <p className="text-[12px] text-foreground/90 whitespace-pre-wrap leading-snug">
                          {planDetails.timelineNote}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {planDetails.deliverables.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium text-muted-foreground">ชิ้นงานที่ต้องทำ</p>
                      <ol className="list-decimal pl-4 space-y-0.5 text-[12px] text-foreground leading-snug">
                        {planDetails.deliverables.map((item, i) => (
                          <li key={`${i}-${item}`}>{item}</li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                  {planDetails.rights ? (
                    <DetailBlock label="สิทธิ์ / เครดิต" value={planDetails.rights} />
                  ) : null}
                  {planDetails.refs.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium text-muted-foreground">ลิงก์อ้างอิง</p>
                      <ul className="space-y-0.5">
                        {planDetails.refs.map((url) => (
                          <li key={url}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-[hsl(var(--chat-collab))] hover:underline break-all"
                            >
                              {url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {planDetails.portfolios.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                        <Paperclip className="w-3 h-3" /> ผลงานในแผน
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {planDetails.portfolios.map((ref) => (
                          <button
                            key={ref.projectId}
                            type="button"
                            onClick={() => navigate(`/project/${ref.projectId}`)}
                            className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-md bg-background/80 hover:bg-accent border border-border/60"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {ref.title || "ดูผลงาน"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {planDetails.laterNotes.map((row) => (
                    <DetailBlock key={row.id} label={row.label} value={row.note} />
                  ))}
                  {planDetails.finalLinks.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium text-muted-foreground">ลิงก์ผลงานสุดท้าย</p>
                      <ul className="space-y-0.5">
                        {planDetails.finalLinks.map((url) => (
                          <li key={url}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-[hsl(var(--chat-collab))] hover:underline break-all"
                            >
                              {url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  ยังไม่มีรายละเอียดในแผน — กด「เปิดแผน」เพื่อกรอกเป้าหมาย ชิ้นงาน และสิทธิ์
                </p>
              )}
            </div>

            <ul className="space-y-1 rounded-xl border border-border/70 bg-muted/20 p-2">
              {COLLAB_PIPELINE.map((stage) => {
                const done = !!planState.stages[stage.id]?.done;
                const current = planDoc.currentStep === stage.id;
                return (
                  <li key={stage.id} className="text-[11px] leading-snug">
                    <div className="flex gap-2 items-center">
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px]",
                          done
                            ? "bg-[hsl(var(--chat-collab))] text-white"
                            : current
                              ? "bg-[hsl(var(--chat-collab)/0.2)] text-[hsl(var(--chat-collab))] ring-1 ring-[hsl(var(--chat-collab)/0.45)]"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {done ? <Check className="w-2.5 h-2.5" strokeWidth={3} /> : stage.step}
                      </span>
                      <p
                        className={cn(
                          "min-w-0 flex-1 font-medium",
                          done || current ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {stage.title}
                        {current && !done ? (
                          <span className="ml-1.5 text-[10px] font-normal text-[hsl(var(--chat-collab))]">
                            กำลังทำ
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            {meta?.collab ? (
              <div className="space-y-2 pt-1 border-t border-border">
                <p className="text-xs text-muted-foreground">จากคำชวนคอลแลป</p>
                {(meta.collab.collab_types ?? []).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(meta.collab.collab_types ?? []).map((t: string) => (
                      <span key={t} className={`text-xs px-2.5 py-1 rounded-full ${bg} ${accent}`}>
                        {COLLAB_TYPE_LABELS[t] ?? t}
                      </span>
                    ))}
                  </div>
                ) : null}
                {meta.collab.timeline ? (
                  <Row icon={<Calendar className="w-4 h-4" />} label="ช่วงเวลา" value={meta.collab.timeline} />
                ) : null}
                {meta.collab.message ? (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">ไอเดียที่เสนอ</p>
                    <p className="text-sm leading-6 text-foreground whitespace-pre-wrap">
                      {meta.collab.message}
                    </p>
                  </div>
                ) : null}
                {(meta.collab.attached_project_ids ?? []).length > 0 ? (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Paperclip className="w-3 h-3" /> ผลงานอ้างอิง
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(meta.collab.attached_project_ids as string[]).map((pid) => (
                        <button
                          key={pid}
                          type="button"
                          onClick={() => navigate(`/project/${pid}`)}
                          className="text-xs flex items-center gap-1 px-2 py-1 rounded-md bg-muted hover:bg-accent"
                        >
                          <ExternalLink className="w-3 h-3" /> ดูผลงาน
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {(conversation.kind === "hire" || conversation.studio_id) && (
          <div className="pt-1">
            <ChatQuoteActions conversation={conversation} />
          </div>
        )}
        {isHire && conversation.request_id ? (
          <>
            <HireOrderFlowPanel
              conversation={conversation}
              projectTitle={conversation.project_title ?? meta?.hire?.project_title ?? null}
            />
            <div className="pt-3 border-t border-border">
              <HireOrderDetailContent
                conversation={conversation}
                deadline={meta?.hire?.deadline ?? null}
                showDeadline={false}
                showPartner={false}
              />
            </div>
          </>
        ) : null}
        {conversation.kind === "collab" && conversation.request_id ? (
          <ChatCollabActions conversation={conversation} />
        ) : null}
      </div>
    </aside>
  );
};

const Row = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-2">
    <span className="text-muted-foreground mt-0.5">{icon}</span>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  </div>
);

const DetailBlock = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-1">
    <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
    <p className="text-[12px] text-foreground whitespace-pre-wrap leading-snug">{value}</p>
  </div>
);

export default ChatMetaPanel;
