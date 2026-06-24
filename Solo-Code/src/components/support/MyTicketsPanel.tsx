import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { Loader2, MessageSquareHeart, Ticket } from "lucide-react";
import { useMyTickets, type SupportTicket } from "@/store/supportTickets";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { TicketDetailPanel } from "./TicketDetailSheet";
import { TicketFeatureBadge, TicketRatingStars, TicketSourceBadge } from "./TicketMetaBadges";

export function MyTicketsPanel({
  onSelectTicket,
  selectedId,
}: {
  onSelectTicket?: (id: string | null) => void;
  selectedId?: string | null;
}) {
  const { tickets, isLoading } = useMyTickets();
  const [localId, setLocalId] = React.useState<string | null>(selectedId ?? null);
  const activeId = selectedId ?? localId;
  const selected = tickets.find((t) => t.id === activeId) ?? null;

  const pick = (t: SupportTicket | null) => {
    const id = t?.id ?? null;
    setLocalId(id);
    onSelectTicket?.(id);
  };

  if (selected) {
    return (
      <div className="h-full flex flex-col">
        <TicketDetailPanel ticket={selected} onBack={() => pick(null)} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="h-14 w-14 rounded-full bg-orange-50 flex items-center justify-center mb-3">
          <MessageSquareHeart className="h-6 w-6 text-[#FF5F05]" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-1">ยังไม่มีตั๋ว</h3>
        <p className="text-sm text-gray-500 max-w-[220px]">
          ส่ง Give Feedback จากแต่ละหน้า หรือแจ้งปัญหาผ่าน Support Hub — ตั๋วจะแสดงที่นี่
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full p-3 space-y-2">
      {tickets.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => pick(t)}
          className="w-full text-left rounded-xl border border-gray-200 bg-white p-3 hover:border-[#FF5F05]/40 hover:shadow-sm transition-all"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1 mb-1">
                <p className="text-[10px] font-mono font-bold text-[#FF5F05]">{t.ticketNumber}</p>
                <TicketSourceBadge source={t.source} />
                {t.sourceFeature && <TicketFeatureBadge feature={t.sourceFeature} />}
              </div>
              <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
              {t.rating != null && <TicketRatingStars rating={t.rating} className="mt-1" />}
              <p className="text-[10px] text-gray-400 mt-1">
                {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true, locale: th })}
              </p>
            </div>
            <TicketStatusBadge status={t.status} />
          </div>
        </button>
      ))}
    </div>
  );
}
