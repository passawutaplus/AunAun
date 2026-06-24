import * as React from "react";
import { Button } from "@/components/ui/button";
import { ClientsProvider, useClients, clientsKey } from "@/store/clients";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { Post, Platform, Status, ApprovalStatus, todayISO, addDays } from "./planner/contentMeta";
import { PostFormModal } from "./planner/PostFormModal";
import { ShareLinkDialog } from "./planner/ShareLinkDialog";
import { PlannerFilters } from "./planner/PlannerFilters";
import { ContentCalendar } from "./planner/ContentCalendar";
import { UpcomingSidebar } from "./planner/UpcomingSidebar";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageFooterActions } from "./PageFooterActions";
import { useSupabaseRecords } from "@/hooks/useSupabaseRecords";
import { supabase } from "@/integrations/supabase/client";

type PlannerRow = {
  id: string;
  client_id: string;
  title: string;
  post_date: string;
  post_time: string;
  platforms: string[];
  custom_platforms: string[] | null;
  status: string;
  link: string | null;
  caption: string | null;
  image_url: string | null;
  vision_canvas_id: string | null;
  approval_status: string | null;
  client_feedback: string | null;
};

export function ContentPlannerTab() {
  return (
    <ClientsProvider>
      <ContentPlannerInner />
    </ClientsProvider>
  );
}

function ContentPlannerInner() {
  const { list: clients, add: addSavedClient } = useClients();
  const qc = useQueryClient();
  const { user } = useAuth();

  const {
    items: posts,
    setItems: setPosts,
    isLoading,
  } = useSupabaseRecords<Post, PlannerRow>({
    table: "planner_posts",
    cacheKey: "planner_posts",
    orderBy: { column: "post_date", ascending: true },
    fromRow: (r) => ({
      id: r.id,
      clientId: r.client_id,
      title: r.title,
      date: r.post_date,
      time: r.post_time,
      platforms: (r.platforms as Platform[]) ?? [],
      customPlatforms: r.custom_platforms ?? [],
      status: (r.status as Status) ?? "draft",
      link: r.link ?? undefined,
      caption: r.caption ?? undefined,
      imageUrl: r.image_url ?? undefined,
      visionCanvasId: r.vision_canvas_id ?? undefined,
      approvalStatus: (r.approval_status as ApprovalStatus) ?? "none",
      clientFeedback: r.client_feedback ?? "",
    }),
    toRow: (p, userId) => ({
      id: p.id,
      user_id: userId,
      client_id: p.clientId,
      title: p.title,
      post_date: p.date,
      post_time: p.time,
      platforms: p.platforms,
      custom_platforms: p.customPlatforms ?? [],
      status: p.status,
      link: p.link ?? null,
      caption: p.caption ?? null,
      image_url: p.imageUrl ?? null,
      vision_canvas_id: p.visionCanvasId ?? null,
      approval_status: p.approvalStatus ?? "none",
      client_feedback: p.clientFeedback ?? "",
    }),
  });

  // Realtime subscribe to client approvals
  React.useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`planner-approvals-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "planner_posts",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newRow = payload.new as PlannerRow;
          const oldRow = payload.old as PlannerRow;
          if (newRow.approval_status !== oldRow.approval_status) {
            if (newRow.approval_status === "approved") {
              toast.success(`✅ ลูกค้าอนุมัติโพสต์ "${newRow.title}" แล้ว`);
            } else if (newRow.approval_status === "changes_requested") {
              toast.info(`✏️ ลูกค้าขอแก้ "${newRow.title}"`);
            }
            qc.invalidateQueries({ queryKey: ["planner_posts", user.id] });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, qc]);

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

  const [cursor, setCursor] = React.useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [filterClient, setFilterClient] = React.useState<string>("all");
  const [filterStatus, setFilterStatus] = React.useState<string>("all");
  const [editingPost, setEditingPost] = React.useState<Post | null>(null);

  const clientOptionsForAdd = React.useMemo(
    () => clients.map((c) => ({ id: c.id, name: c.name })),
    [clients],
  );

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "ลูกค้า";

  const filtered = posts.filter(
    (p) =>
      (filterClient === "all" || p.clientId === filterClient) &&
      (filterStatus === "all" || p.status === filterStatus),
  );

  const upcoming = filtered
    .filter((p) => p.date >= todayISO && p.date <= addDays(7))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const upcomingByClient = upcoming.reduce<Record<string, Post[]>>((acc, p) => {
    (acc[p.clientId] ||= []).push(p);
    return acc;
  }, {});

  const handleSavePost = (p: Post) => {
    setPosts((arr) => {
      const idx = arr.findIndex((x) => x.id === p.id);
      if (idx === -1) return [p, ...arr];
      const next = [...arr];
      next[idx] = p;
      return next;
    });
    setEditingPost(null);
  };
  const handleDeletePost = (id: string) => {
    setPosts((arr) => arr.filter((x) => x.id !== id));
    setEditingPost(null);
  };
  const handlePublishNow = (p: Post) => {
    handleSavePost({ ...p, status: "published" });
    toast.success("ตั้งสถานะเป็น Published แล้ว");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Content Planner</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            วางแผนคอนเทนต์ลูกค้าทุกแพลตฟอร์ม · ข้อมูลถูกบันทึกในบัญชีของคุณอัตโนมัติ
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
          <ShareLinkDialog clients={clientOptionsForAdd} />
          <PostFormModal
            mode="create"
            clientOptions={clientOptionsForAdd}
            onSave={handleSavePost}
            onAddClient={handleAddClient}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดโพสต์ของคุณ…
        </div>
      ) : (
        <>
          <PlannerFilters
            filterClient={filterClient}
            setFilterClient={setFilterClient}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            clients={clientOptionsForAdd}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <ContentCalendar
              cursor={cursor}
              setCursor={setCursor}
              posts={filtered}
              clientName={clientName}
              onEditPost={(p) => setEditingPost(p)}
            />
            <UpcomingSidebar
              upcomingByClient={upcomingByClient}
              clientName={clientName}
              onEditPost={(p) => setEditingPost(p)}
              onPublishNow={handlePublishNow}
            />
          </div>
        </>
      )}

      {editingPost && (
        <PostFormModal
          mode="edit"
          open={!!editingPost}
          onOpenChange={(o) => {
            if (!o) setEditingPost(null);
          }}
          initial={editingPost}
          clientOptions={clientOptionsForAdd}
          onSave={handleSavePost}
          onDelete={handleDeletePost}
          onAddClient={handleAddClient}
        />
      )}

      <PageFooterActions feature="content" label="ปฏิทินคอนเทนต์" />
    </div>
  );
}
