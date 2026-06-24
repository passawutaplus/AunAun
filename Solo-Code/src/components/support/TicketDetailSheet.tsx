import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TicketStatusBadge } from "./TicketStatusBadge";
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  CATEGORY_LABELS,
  type TicketStatus,
} from "@/lib/ticketSchema";
import {
  useMyTickets,
  useTicketEvents,
  useTicketAttachments,
  getTicketAttachmentUrl,
  type SupportTicket,
} from "@/store/supportTickets";
import { toast } from "sonner";
import { TicketFeatureBadge, TicketRatingStars, TicketSourceBadge } from "./TicketMetaBadges";

function eventLabel(eventType: string, oldVal: string | null, newVal: string | null): string {
  if (eventType === "created") return "สร้างตั๋ว";
  if (eventType === "status_change") {
    const from = oldVal ? (STATUS_LABELS[oldVal as TicketStatus] ?? oldVal) : "";
    const to = newVal ? (STATUS_LABELS[newVal as TicketStatus] ?? newVal) : "";
    return `สถานะ: ${from} → ${to}`;
  }
  if (eventType === "priority_change") {
    return `ความสำคัญเปลี่ยนเป็น ${newVal ?? ""}`;
  }
  if (eventType === "comment") return "ความคิดเห็น";
  return eventType;
}

export function TicketDetailPanel({
  ticket,
  showAdminFields = false,
  onBack,
}: {
  ticket: SupportTicket;
  showAdminFields?: boolean;
  onBack?: () => void;
}) {
  const { addComment } = useMyTickets();
  const { data: events = [], isLoading: eventsLoading } = useTicketEvents(ticket.id);
  const { data: attachments = [] } = useTicketAttachments(ticket.id);
  const [comment, setComment] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [imgUrls, setImgUrls] = React.useState<Record<string, string>>({});
  const canComment = !showAdminFields && !["closed", "wont_fix"].includes(ticket.status);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const map: Record<string, string> = {};
      for (const a of attachments) {
        try {
          map[a.id] = await getTicketAttachmentUrl(a.storagePath);
        } catch {
          /* skip */
        }
      }
      if (!cancelled) setImgUrls(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [attachments]);

  const sendComment = async () => {
    if (!comment.trim() || sending) return;
    setSending(true);
    try {
      await addComment({ ticketId: ticket.id, body: comment.trim() });
      setComment("");
      toast.success("ส่งความคิดเห็นแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="overflow-y-auto h-full p-4 space-y-4">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          กลับรายการตั๋ว
        </button>
      )}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-mono text-[#FF5F05] font-bold">{ticket.ticketNumber}</p>
          <h3 className="font-semibold text-gray-900 mt-0.5">{ticket.title}</h3>
          <div className="flex flex-wrap items-center gap-1 mt-1.5">
            <TicketSourceBadge source={ticket.source} />
            {ticket.sourceFeature && <TicketFeatureBadge feature={ticket.sourceFeature} />}
            {ticket.rating != null && <TicketRatingStars rating={ticket.rating} />}
          </div>
        </div>
        <TicketStatusBadge status={ticket.status} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500">
        <div>ประเภท: {CATEGORY_LABELS[ticket.category]}</div>
        <div>ความสำคัญ: {PRIORITY_LABELS[ticket.priority]}</div>
        <div className="col-span-2">
          อัปเดต {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true, locale: th })}
        </div>
      </div>

      {ticket.description && (
        <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap">
          {ticket.description}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a) =>
            imgUrls[a.id] ? (
              <a key={a.id} href={imgUrls[a.id]} target="_blank" rel="noopener noreferrer">
                <img
                  src={imgUrls[a.id]}
                  alt={a.fileName}
                  className="h-20 w-20 rounded-lg object-cover border hover:opacity-90"
                />
              </a>
            ) : null,
          )}
        </div>
      )}

      {ticket.resolutionNote && ["resolved", "closed"].includes(ticket.status) && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3">
          <p className="text-[10px] font-semibold text-green-800 mb-1">คำตอบจากทีมงาน</p>
          <p className="text-sm text-green-900 whitespace-pre-wrap">{ticket.resolutionNote}</p>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-700 mb-2">ไทม์ไลน์</p>
        {eventsLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        ) : (
          <ul className="space-y-2">
            {events
              .filter((e) => showAdminFields || e.eventType !== "note")
              .map((e) => (
                <li key={e.id} className="text-[11px] border-l-2 border-[#FF5F05]/30 pl-3 py-0.5">
                  <span className="text-gray-400">
                    {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true, locale: th })}
                  </span>
                  <p className="text-gray-700 font-medium">
                    {eventLabel(e.eventType, e.oldValue, e.newValue)}
                  </p>
                  {e.body && <p className="text-gray-600 mt-0.5 whitespace-pre-wrap">{e.body}</p>}
                </li>
              ))}
          </ul>
        )}
      </div>

      {canComment && (
        <div className="space-y-2 pt-2 border-t">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="เพิ่มรายละเอียดหรือถามสถานะ..."
            rows={2}
            maxLength={500}
            className="resize-none text-sm"
          />
          <Button
            size="sm"
            className="gap-1.5 text-white"
            style={{ background: "#FF5F05" }}
            disabled={!comment.trim() || sending}
            onClick={sendComment}
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            ส่งความคิดเห็น
          </Button>
        </div>
      )}
    </div>
  );
}
