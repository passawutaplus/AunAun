import { useState } from "react";
import { Check, FileText, Loader2, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { Conversation } from "@/hooks/useChat";
import {
  useAcceptRequest,
  useRejectRequest,
  useSendMessage,
} from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import CollabRejectDialog from "@/components/collab/CollabRejectDialog";
import {
  collabRejectReasonLabel,
  buildCollabDeclineChatMessage,
} from "@/lib/collabBrief";
import {
  isCollabAcceptedStatus,
  isCollabContactedNewStatus,
  isCollabDeclinedStatus,
} from "@/lib/collabInbox";
import { buildCollabPlanDocumentMessage, emptyCollabPlanState, emptyPlanPayload } from "@/lib/collabToolkit";
import { useCollabPlanUi } from "@/stores/collabPlanUiStore";
import { sharedDb } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";

type Props = {
  conversation: Conversation;
};

type CollabRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: string;
  message?: string | null;
  timeline?: string | null;
  collab_types?: string[] | null;
  project_id?: string | null;
  reject_reason?: string | null;
  reject_note?: string | null;
  keep_chat?: boolean | null;
};

export function ChatCollabActions({ conversation }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [rejectOpen, setRejectOpen] = useState(false);
  const collabPlanUi = useCollabPlanUi();

  const accept = useAcceptRequest();
  const reject = useRejectRequest();
  const sendMessage = useSendMessage();

  const isCollab = conversation.kind === "collab";
  const isRecipient = !!user?.id && user.id === conversation.freelancer_id;

  const { data: row = null } = useQuery({
    queryKey: ["chat-collab-meta-panel", conversation.request_id],
    enabled: !!conversation.request_id && isCollab,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collab_requests")
        .select(
          "id, sender_id, recipient_id, status, message, timeline, collab_types, project_id, reject_reason, reject_note, keep_chat",
        )
        .eq("id", conversation.request_id!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CollabRow | null;
    },
  });

  const { data: senderName = null } = useQuery({
    queryKey: ["chat-collab-sender-name", row?.sender_id],
    enabled: !!row?.sender_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles_public")
        .select("display_name, username")
        .eq("user_id", row!.sender_id)
        .maybeSingle();
      return data?.display_name || data?.username || "ผู้ส่ง";
    },
  });

  if (!isCollab || !conversation.request_id || !row) return null;

  const canRespond =
    isRecipient && isCollabContactedNewStatus(row.status) && !row.reject_reason;
  const accepted = isCollabAcceptedStatus(row.status);
  const declined = isCollabDeclinedStatus(row.status);
  const busy = accept.isPending || reject.isPending || sendMessage.isPending;
  const publishPath = `/portfolio/new?collab_request_id=${encodeURIComponent(row.id)}`;

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["collab-requests"] });
    void qc.invalidateQueries({ queryKey: ["chat-collab-meta", conversation.request_id] });
    void qc.invalidateQueries({ queryKey: ["chat-collab-meta-panel", conversation.request_id] });
    void qc.invalidateQueries({ queryKey: ["chat-meta", "collab", conversation.request_id] });
  };

  return (
    <div className="space-y-2 pt-2 border-t border-border">
      {canRespond ? (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy}
            className="w-full rounded-full bg-[hsl(var(--chat-collab))] text-white hover:opacity-90"
            onClick={() => {
              void (async () => {
                try {
                  await accept.mutateAsync({
                    kind: "collab",
                    requestId: row.id,
                    clientId: row.sender_id,
                    freelancerId: row.recipient_id,
                    projectId: row.project_id ?? null,
                    projectTitle: conversation.project_title ?? "คอลแลปไอเดียใหม่",
                  });
                  try {
                    await sharedDb.from("collab_plans" as never).upsert(
                      {
                        conversation_id: conversation.id,
                        status: "draft",
                        current_step: "align",
                        payload: emptyPlanPayload(),
                        acks: {},
                        version: 1,
                        stages: emptyCollabPlanState().stages,
                        updated_at: new Date().toISOString(),
                      } as never,
                      { onConflict: "conversation_id", ignoreDuplicates: true },
                    );
                  } catch {
                    /* optional */
                  }
                  try {
                    await sendMessage.mutateAsync({
                      conversationId: conversation.id,
                      content: buildCollabPlanDocumentMessage({
                        projectTitle: conversation.project_title,
                      }),
                    });
                  } catch {
                    /* accept already succeeded */
                  }
                  invalidate();
                  void qc.invalidateQueries({ queryKey: ["collab-plan", conversation.id] });
                  void qc.invalidateQueries({ queryKey: ["collab-plan-doc", conversation.id] });
                  collabPlanUi.openFor(conversation.id);
                  toast.success("ตอบรับแล้ว — เปิดเอกสารแผนคอลแลปให้แล้ว");
                } catch (e: unknown) {
                  toast.error(e instanceof Error ? e.message : "ตอบรับไม่สำเร็จ");
                }
              })();
            }}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
            ตอบรับร่วมงาน
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            className="w-full rounded-full border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => setRejectOpen(true)}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            ยังไม่พร้อม
          </Button>
        </div>
      ) : null}

      {accepted ? (
        <div className="space-y-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full rounded-full"
            onClick={() => navigate(publishPath)}
          >
            <FileText className="w-3.5 h-3.5 mr-1" />
            ลงผลงานร่วมกัน
          </Button>
          <p className="text-[10px] text-muted-foreground leading-snug">
            แผนงานร่วมกันอยู่ด้านบนแผงนี้ หรือปุ่มหัวแชท「วางแผนงานร่วมกัน」
          </p>
        </div>
      ) : null}

      {declined ? (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {row.keep_chat || row.reject_reason === "busy_but_chat"
            ? "ยังไม่พร้อมร่วมงาน — คุยไอเดียต่อได้"
            : `แจ้งแล้ว: ${
                row.reject_note?.trim() ||
                collabRejectReasonLabel(row.reject_reason) ||
                "ยังไม่พร้อมร่วมงาน"
              }`}
        </p>
      ) : null}

      <CollabRejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        busy={busy}
        request={{
          id: row.id,
          sender_name: senderName,
          message: row.message,
          timeline: row.timeline,
          collab_types: row.collab_types,
          project_id: row.project_id,
        }}
        onConfirm={async ({ action, reason, note }) => {
          try {
            await reject.mutateAsync({
              kind: "collab",
              requestId: row.id,
              reason,
              note,
              keepChat: action === "busy_chat",
            });
            try {
              await sendMessage.mutateAsync({
                conversationId: conversation.id,
                content: buildCollabDeclineChatMessage({
                  reasonLabel: note || collabRejectReasonLabel(reason),
                  keepChat: action === "busy_chat",
                }),
              });
            } catch {
              /* status already saved */
            }
            invalidate();
            setRejectOpen(false);
            toast.success(
              action === "busy_chat"
                ? "แจ้งแล้ว — ยังคุยไอเดียต่อได้"
                : "แจ้งแล้วว่ายังไม่พร้อมร่วมงาน",
            );
          } catch (e: unknown) {
            toast.error(mapWriteFlowError(e, "บันทึกไม่สำเร็จ"));
          }
        }}
      />
    </div>
  );
}
