import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import {
  KANBAN_COLUMNS,
  PRIORITY_DOT,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type TicketStatus,
} from "@/lib/ticketSchema";
import type { SupportTicket } from "@/store/supportTickets";
import {
  TicketFeatureBadge,
  TicketRatingStars,
  TicketSourceBadge,
} from "@/components/support/TicketMetaBadges";

function TicketCard({
  ticket,
  userLabel,
  onClick,
  dragging = false,
}: {
  ticket: SupportTicket;
  userLabel: string;
  onClick: () => void;
  dragging?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border bg-card p-2.5 shadow-sm hover:shadow-md transition-shadow",
        dragging && "opacity-50",
      )}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className={cn("h-2 w-2 rounded-full shrink-0", PRIORITY_DOT[ticket.priority])} />
        <span className="text-[10px] font-mono font-bold text-[#FF5F05]">
          {ticket.ticketNumber}
        </span>
      </div>
      <p className="text-xs font-medium line-clamp-2">{ticket.title}</p>
      <div className="flex flex-wrap gap-1 mt-1">
        <TicketSourceBadge source={ticket.source} />
        {ticket.sourceFeature && <TicketFeatureBadge feature={ticket.sourceFeature} />}
      </div>
      {ticket.rating != null && <TicketRatingStars rating={ticket.rating} className="mt-1" />}
      <p className="text-[10px] text-muted-foreground mt-1 truncate">{userLabel}</p>
      <p className="text-[10px] text-muted-foreground">
        {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: th })}
      </p>
    </button>
  );
}

function DraggableCard(props: { ticket: SupportTicket; userLabel: string; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: props.ticket.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TicketCard {...props} dragging={isDragging} />
    </div>
  );
}

function KanbanColumn({
  status,
  tickets,
  userMap,
  onSelect,
}: {
  status: TicketStatus;
  tickets: SupportTicket[];
  userMap: Map<string, string>;
  onSelect: (t: SupportTicket) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-[200px] sm:w-[220px] rounded-xl border bg-muted/30 flex flex-col max-h-[calc(100vh-280px)]",
        isOver && "ring-2 ring-[#FF5F05]/40",
      )}
    >
      <div className="px-3 py-2 border-b shrink-0">
        <p className="text-xs font-semibold">{STATUS_LABELS[status]}</p>
        <p className="text-[10px] text-muted-foreground">{tickets.length} ใบ</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {tickets.map((t) => (
          <DraggableCard
            key={t.id}
            ticket={t}
            userLabel={userMap.get(t.userId) ?? t.userId.slice(0, 8)}
            onClick={() => onSelect(t)}
          />
        ))}
      </div>
    </div>
  );
}

export function TicketKanban({
  tickets,
  userMap,
  dragDisabled = false,
  onStatusChange,
  onSelect,
}: {
  tickets: SupportTicket[];
  userMap: Map<string, string>;
  dragDisabled?: boolean;
  onStatusChange: (id: string, status: TicketStatus) => void;
  onSelect: (t: SupportTicket) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const active = tickets.find((t) => t.id === activeId);

  const byStatus = React.useMemo(() => {
    const map = new Map<TicketStatus, SupportTicket[]>();
    for (const s of KANBAN_COLUMNS) map.set(s, []);
    for (const t of tickets) {
      if (t.status === "wont_fix") continue;
      const col = KANBAN_COLUMNS.includes(t.status as TicketStatus)
        ? (t.status as TicketStatus)
        : "new";
      map.get(col)!.push(t);
    }
    return map;
  }, [tickets]);

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (dragDisabled) return;
    const overId = e.over?.id;
    if (!overId || !e.active.id) return;
    const ticketId = String(e.active.id);
    const newStatus = String(overId) as TicketStatus;
    if (!KANBAN_COLUMNS.includes(newStatus)) return;
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket || ticket.status === newStatus) return;
    onStatusChange(ticketId, newStatus);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {KANBAN_COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tickets={byStatus.get(status) ?? []}
            userMap={userMap}
            onSelect={onSelect}
          />
        ))}
      </div>
      <DragOverlay>
        {active ? (
          <TicketCard
            ticket={active}
            userLabel={userMap.get(active.userId) ?? ""}
            onClick={() => {}}
            dragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export function TicketListTable({
  tickets,
  userMap,
  onSelect,
}: {
  tickets: SupportTicket[];
  userMap: Map<string, string>;
  onSelect: (t: SupportTicket) => void;
}) {
  return (
    <div className="rounded-xl border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2">ตั๋ว</th>
            <th className="px-3 py-2">หัวข้อ</th>
            <th className="px-3 py-2">ผู้แจ้ง</th>
            <th className="px-3 py-2">ความสำคัญ</th>
            <th className="px-3 py-2">สถานะ</th>
            <th className="px-3 py-2">อัปเดต</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr
              key={t.id}
              className="border-b hover:bg-muted/30 cursor-pointer"
              onClick={() => onSelect(t)}
            >
              <td className="px-3 py-2 font-mono text-xs text-[#FF5F05]">{t.ticketNumber}</td>
              <td className="px-3 py-2 max-w-[200px] truncate">{t.title}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[140px]">
                {userMap.get(t.userId) ?? "—"}
              </td>
              <td className="px-3 py-2 text-xs">{PRIORITY_LABELS[t.priority]}</td>
              <td className="px-3 py-2 text-xs">{STATUS_LABELS[t.status]}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true, locale: th })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
