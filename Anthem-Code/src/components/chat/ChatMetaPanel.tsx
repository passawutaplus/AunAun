import BriefcaseIcon from "../icons/BriefcaseIcon";
import { Handshake, Calendar, Coins, Paperclip, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Conversation } from "@/hooks/useChat";
import { ChatQuoteActions } from "@/components/chat/ChatQuoteActions";
import { ChatCollabActions } from "@/components/chat/ChatCollabActions";
import { HireOrderFlowPanel } from "@/components/hire/HireOrderFlowPanel";
import { HireOrderDetailContent } from "@/components/hire/HireOrderDetailDialog";
import { formatHireBudgetLabel, hireInviteDisplay } from "@/lib/hireBrief";
import InboxRequestBrief from "@/components/inbox/InboxRequestBrief";

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

  const { data: meta } = useQuery({
    queryKey: ["chat-meta", conversation.kind, conversation.request_id],
    enabled: !!conversation.request_id && (isHire || isCollab),
    queryFn: async () => {
      if (isHire) {
        const { data } = await supabase
          .from("hiring_requests")
          .select("budget, budget_amount, deadline, project_title, client_name, email, phone, message, job_type, attachment_urls")
          .eq("id", conversation.request_id)
          .maybeSingle();
        return { hire: data, collab: null };
      }
      const { data } = await supabase
        .from("collab_requests")
        .select("collab_types, message, attached_project_ids")
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

      <div className="p-3 space-y-2.5 text-sm">
        {isHire && meta?.hire && (
          <>
            <Row
              icon={<Coins className="w-3.5 h-3.5" />}
              label="งบประมาณ"
              value={
                formatHireBudgetLabel({
                  budget_amount: meta.hire.budget_amount,
                  budget: meta.hire.budget,
                }) ?? "—"
              }
            />
            <Row icon={<Calendar className="w-3.5 h-3.5" />} label="กำหนดส่ง" value={meta.hire.deadline ?? "ยังไม่ระบุ"} />
            {(() => {
              const brief = hireInviteDisplay({
                message: meta.hire.message,
                job_type: (meta.hire as { job_type?: string | null }).job_type,
                attachment_urls: (meta.hire as { attachment_urls?: string[] | null }).attachment_urls,
              });
              return (
                <InboxRequestBrief
                  className="mt-0"
                  typeLabel={brief.jobTypesLabel}
                  details={brief.details}
                  links={brief.links}
                  attachments={brief.attachments}
                  clamp={false}
                />
              );
            })()}
            <div className="pt-2 border-t border-border">
              <p className="text-[11px] text-muted-foreground mb-1">ติดต่อลูกค้า</p>
              <div className="space-y-0.5 text-sm">
                <div className="text-foreground">{meta.hire.client_name}</div>
                <a href={`mailto:${meta.hire.email}`} className="block text-[hsl(var(--chat-hire))] hover:underline">
                  {meta.hire.email}
                </a>
                {meta.hire.phone && (
                  <a href={`tel:${meta.hire.phone}`} className="block text-[hsl(var(--chat-hire))] hover:underline">
                    {meta.hire.phone}
                  </a>
                )}
              </div>
            </div>
          </>
        )}

        {showCollabPlan ? (
          <div className="space-y-3">
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

export default ChatMetaPanel;
