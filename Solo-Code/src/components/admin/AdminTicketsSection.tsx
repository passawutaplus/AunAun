import * as React from "react";
import { Loader2, LayoutGrid, List, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAllTickets, type SupportTicket } from "@/store/supportTickets";
import { useAllBetaFeedback } from "@/store/betaFeedback";
import { TicketKanban, TicketListTable } from "./TicketKanban";
import { AdminTicketDetail } from "./AdminTicketDetail";
import { BetaFeedbackPanel } from "./BetaFeedbackPanel";
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_SOURCES,
  SOURCE_LABELS,
  type TicketCategory,
  type TicketPriority,
  type TicketSource,
  type TicketStatus,
} from "@/lib/ticketSchema";
import {
  formatMemberCode,
  memberCodeMatchesUserId,
  userLabelWithMemberCode,
} from "@/lib/userDisplayId";

export function AdminTicketsSection() {
  const { tickets, isLoading, newCount, criticalCount, update } = useAllTickets();
  const { items: betaItems } = useAllBetaFeedback();
  const [tab, setTab] = React.useState<"tickets" | "raw">("tickets");
  const [view, setView] = React.useState<"kanban" | "list">("kanban");
  const [selected, setSelected] = React.useState<SupportTicket | null>(null);
  const [search, setSearch] = React.useState("");
  const [priorityFilter, setPriorityFilter] = React.useState<TicketPriority | "all">("all");
  const [categoryFilter, setCategoryFilter] = React.useState<TicketCategory | "all">("all");
  const [sourceFilter, setSourceFilter] = React.useState<TicketSource | "all">("all");
  const [ratingFilter, setRatingFilter] = React.useState<"all" | "low" | "high">("all");
  const [userMap, setUserMap] = React.useState<Map<string, string>>(new Map());

  const recentBeta = betaItems.filter(
    (b) => Date.now() - new Date(b.createdAt).getTime() < 7 * 86_400_000,
  ).length;

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await (
        supabase.rpc as unknown as (fn: string) => Promise<{
          data: Array<{
            user_id: string;
            email: string | null;
            display_name: string | null;
          }> | null;
          error: { message: string } | null;
        }>
      ).call(supabase, "admin_list_profiles_safe");
      if (cancelled) return;
      if (error) {
        toast.error("โหลดรายชื่อผู้ใช้ไม่สำเร็จ", { description: error.message });
        return;
      }
      if (!data) return;
      const map = new Map<string, string>();
      for (const p of data) {
        const base = p.display_name || p.email || p.user_id.slice(0, 8);
        map.set(p.user_id, userLabelWithMemberCode(base, p.user_id));
      }
      setUserMap(map);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (sourceFilter !== "all" && t.source !== sourceFilter) return false;
      if (ratingFilter === "low" && (t.rating == null || t.rating > 2)) return false;
      if (ratingFilter === "high" && (t.rating == null || t.rating < 4)) return false;
      if (!q) return true;
      const memberHit = memberCodeMatchesUserId(q, t.userId);
      return (
        memberHit ||
        t.ticketNumber.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q) ||
        (t.sourceFeature ?? "").toLowerCase().includes(q) ||
        (userMap.get(t.userId) ?? "").toLowerCase().includes(q) ||
        formatMemberCode(t.userId).toLowerCase().includes(q)
      );
    });
  }, [tickets, search, priorityFilter, categoryFilter, sourceFilter, ratingFilter, userMap]);

  const liveSelected = React.useMemo(() => {
    if (!selected) return null;
    return tickets.find((t) => t.id === selected.id) ?? null;
  }, [selected, tickets]);

  const updatingIdsRef = React.useRef(new Set<string>());
  const [dragDisabled, setDragDisabled] = React.useState(false);

  const onStatusChange = async (id: string, status: TicketStatus) => {
    if (updatingIdsRef.current.has(id)) return;
    updatingIdsRef.current.add(id);
    setDragDisabled(true);
    try {
      await update({ id, status });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปเดตสถานะตั๋วไม่สำเร็จ");
    } finally {
      updatingIdsRef.current.delete(id);
      if (updatingIdsRef.current.size === 0) setDragDisabled(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Feedback & Tickets</h2>
          <p className="text-sm text-muted-foreground">
            ตั๋วจาก Give Feedback และ Support Hub — ติดตามจนปิดงาน
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {newCount > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              ตั๋วใหม่ {newCount}
            </Badge>
          )}
          {criticalCount > 0 && <Badge variant="destructive">ด่วน {criticalCount}</Badge>}
          {recentBeta > 0 && (
            <Badge variant="outline" className="text-primary border-primary/30">
              ฟีดแบ็ก 7 วัน {recentBeta}
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "tickets" | "raw")}>
        <TabsList>
          <TabsTrigger value="tickets">ตั๋ว ({tickets.length})</TabsTrigger>
          <TabsTrigger value="raw">ฟีดแบ็กดิบ ({betaItems.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาเลขตั๋ว รหัสสมาชิก หัวข้อ..."
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select
              value={sourceFilter}
              onValueChange={(v) => setSourceFilter(v as TicketSource | "all")}
            >
              <SelectTrigger className="w-full sm:w-[150px] h-9 text-xs">
                <SelectValue placeholder="แหล่ง" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกแหล่ง</SelectItem>
                {TICKET_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SOURCE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={ratingFilter}
              onValueChange={(v) => setRatingFilter(v as typeof ratingFilter)}
            >
              <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs">
                <SelectValue placeholder="คะแนน" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกคะแนน</SelectItem>
                <SelectItem value="low">ต่ำ 1–2 (ด่วน)</SelectItem>
                <SelectItem value="high">สูง 4–5</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={priorityFilter}
              onValueChange={(v) => setPriorityFilter(v as TicketPriority | "all")}
            >
              <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs">
                <SelectValue placeholder="ความสำคัญ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกความสำคัญ</SelectItem>
                {TICKET_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={categoryFilter}
              onValueChange={(v) => setCategoryFilter(v as TicketCategory | "all")}
            >
              <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs">
                <SelectValue placeholder="ประเภท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกประเภท</SelectItem>
                {TICKET_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex rounded-lg border p-0.5 shrink-0">
              <Button
                size="sm"
                variant={view === "kanban" ? "secondary" : "ghost"}
                className="h-8 px-2"
                onClick={() => setView("kanban")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant={view === "list" ? "secondary" : "ghost"}
                className="h-8 px-2"
                onClick={() => setView("list")}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
              ยังไม่มีตั๋ว — ผู้ใช้ส่งผ่าน Give Feedback หรือ Support Hub
            </div>
          ) : view === "kanban" ? (
            <TicketKanban
              tickets={filtered}
              userMap={userMap}
              dragDisabled={dragDisabled}
              onStatusChange={onStatusChange}
              onSelect={setSelected}
            />
          ) : (
            <TicketListTable tickets={filtered} userMap={userMap} onSelect={setSelected} />
          )}
        </TabsContent>

        <TabsContent value="raw" className="mt-4">
          <BetaFeedbackPanel />
        </TabsContent>
      </Tabs>

      {liveSelected && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setSelected(null)}
            aria-hidden
          />
          <AdminTicketDetail
            ticket={liveSelected}
            userLabel={userMap.get(liveSelected.userId) ?? liveSelected.userId}
            onClose={() => setSelected(null)}
          />
        </>
      )}
    </div>
  );
}
