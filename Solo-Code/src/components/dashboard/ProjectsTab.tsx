import * as React from "react";
import { safeHref } from "@/lib/security";
import { useSupabaseRecords } from "@/hooks/useSupabaseRecords";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Kanban,
  Clock,
  Link2,
  Plus,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  X,
  Flag,
  MessageSquare,
  Archive,
  Receipt,
  GripVertical,
  Trash2,
} from "lucide-react";
import { ClientsProvider, useClients, clientsKey } from "@/store/clients";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { toast } from "sonner";
import { PageFooterActions } from "./PageFooterActions";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";

type Status = "todo" | "doing" | "pending" | "done";
type Priority = "low" | "medium" | "high";

type VersionLink = { label: string; url: string };
type Comment = { author: string; text: string; at: string };

type Project = {
  id: string;
  title: string;
  client: string;
  clientId?: string;
  status: Status;
  deadline: string;
  priority: Priority;
  versions: VersionLink[];
  revisions: number;
  revisionLimit: number;
  comments: Comment[];
  doneAt?: string;
  archived?: boolean;
  rate?: number;
};

const COLS: { key: Status; label: string; tint: string }[] = [
  { key: "todo", label: "To-do", tint: "bg-muted/60 text-foreground" },
  { key: "doing", label: "Doing", tint: "bg-primary-soft text-primary" },
  { key: "pending", label: "Pending Feedback", tint: "bg-warning/20 text-warning-foreground" },
  { key: "done", label: "Done", tint: "bg-success/15 text-success" },
];

const PRIORITY_META: Record<Priority, { label: string; cls: string; dot: string }> = {
  low: { label: "ต่ำ", cls: "text-muted-foreground border-border", dot: "bg-muted-foreground" },
  medium: {
    label: "กลาง",
    cls: "text-warning-foreground border-warning/40 bg-warning/10",
    dot: "bg-warning",
  },
  high: {
    label: "ด่วน!",
    cls: "text-destructive border-destructive/40 bg-destructive/10",
    dot: "bg-destructive",
  },
};

function addDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysLeft(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

type ProjectRow = {
  id: string;
  title: string;
  client: string;
  client_id: string | null;
  status: string;
  deadline: string | null;
  priority: string;
  versions: unknown;
  comments: unknown;
  revisions: number;
  revision_limit: number;
  done_at: string | null;
  archived: boolean;
  rate: number | null;
};

export function ProjectsTab() {
  return (
    <ClientsProvider>
      <TooltipProvider delayDuration={150}>
        <ProjectsTabInner />
      </TooltipProvider>
    </ClientsProvider>
  );
}

function ProjectsTabInner() {
  const { list: savedClients } = useClients();
  const qc = useQueryClient();
  const { user } = useAuth();

  // persist projects to Lovable Cloud (per user)
  const {
    items: projects,
    setItems: setProjects,
    isLoading,
  } = useSupabaseRecords<Project, ProjectRow>({
    table: "work_projects",
    cacheKey: "work_projects",
    orderBy: { column: "created_at", ascending: false },
    fromRow: (r) => ({
      id: r.id,
      title: r.title,
      client: r.client,
      clientId: r.client_id ?? undefined,
      status: r.status as Status,
      deadline: r.deadline ?? addDays(7),
      priority: (r.priority as Priority) ?? "medium",
      versions: Array.isArray(r.versions) ? (r.versions as VersionLink[]) : [],
      comments: Array.isArray(r.comments) ? (r.comments as Comment[]) : [],
      revisions: r.revisions ?? 0,
      revisionLimit: r.revision_limit ?? 2,
      doneAt: r.done_at ?? undefined,
      archived: r.archived ?? false,
      rate: r.rate ?? undefined,
    }),
    toRow: (p, userId) => ({
      id: p.id,
      user_id: userId,
      title: p.title,
      client: p.client,
      client_id: p.clientId ?? null,
      status: p.status,
      deadline: p.deadline || null,
      priority: p.priority,
      versions: p.versions as unknown,
      comments: p.comments as unknown,
      revisions: p.revisions,
      revision_limit: p.revisionLimit,
      done_at: p.doneAt ?? null,
      archived: p.archived ?? false,
      rate: p.rate ?? null,
    }),
  });

  // Auto-archive done > 7 days
  React.useEffect(() => {
    if (isLoading) return;
    const needsUpdate = projects.some(
      (p) =>
        p.status === "done" &&
        p.doneAt &&
        !p.archived &&
        (Date.now() - new Date(p.doneAt).getTime()) / 86400000 > 7,
    );
    if (!needsUpdate) return;
    setProjects((arr) =>
      arr.map((p) => {
        if (p.status === "done" && p.doneAt && !p.archived) {
          const ageDays = (Date.now() - new Date(p.doneAt).getTime()) / 86400000;
          if (ageDays > 7) return { ...p, archived: true };
        }
        return p;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const [newTitle, setNewTitle] = React.useState("");
  const [newClient, setNewClient] = React.useState<string>("__none__");
  const [newStatus, setNewStatus] = React.useState<Status>("todo");
  const [newDeadline, setNewDeadline] = React.useState<string>(addDays(7));
  const [newPriority, setNewPriority] = React.useState<Priority>("medium");
  const [filterClientName, setFilterClientName] = React.useState<string>("all");
  const [showArchive, setShowArchive] = React.useState(false);

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [shakeEnabled, setShakeEnabled] = React.useState(true);
  React.useEffect(() => {
    const t = setTimeout(() => setShakeEnabled(false), 3000);
    return () => clearTimeout(t);
  }, []);
  const [invoiceFor, setInvoiceFor] = React.useState<Project | null>(null);
  const [versionEditor, setVersionEditor] = React.useState<Project | null>(null);
  const [commentEditor, setCommentEditor] = React.useState<Project | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const addProject = () => {
    const title = newTitle.trim();
    if (!title) {
      toast.error("กรุณากรอกชื่องาน / Task ก่อนเพิ่ม");
      return;
    }
    const sc = newClient !== "__none__" ? savedClients.find((c) => c.id === newClient) : null;
    const newProj: Project = {
      id: crypto.randomUUID(),
      title,
      client: sc?.name ?? "—",
      clientId: sc?.id,
      status: newStatus,
      deadline: newDeadline || addDays(7),
      priority: newPriority,
      versions: [],
      revisions: 0,
      revisionLimit: 3,
      comments: [],
      rate: sc?.rate ?? undefined,
    };
    setProjects((p) => [...p, newProj]);
    if (sc?.rate) {
      toast.success(`เพิ่ม "${title}" — ดึงเรตลูกค้า ${sc.rate.toLocaleString()}฿ มาให้แล้ว`);
    } else {
      toast.success(`เพิ่ม "${title}" แล้ว`);
    }
    setNewTitle("");
    setNewClient("__none__");
    setNewStatus("todo");
    setNewDeadline(addDays(7));
    setNewPriority("medium");
  };

  const handleResync = () => {
    qc.invalidateQueries({ queryKey: clientsKey(user?.id ?? null) });
    toast.success("ซิงค์รายชื่อลูกค้าแล้ว");
  };

  const moveTo = (id: string, status: Status) => {
    let convertedToInvoice: Project | null = null;
    setProjects((arr) =>
      arr.map((p) => {
        if (p.id !== id) return p;
        if (status === "done" && p.status !== "done") {
          convertedToInvoice = { ...p, status, doneAt: new Date().toISOString() };
          return convertedToInvoice;
        }
        return { ...p, status };
      }),
    );
    if (convertedToInvoice) setInvoiceFor(convertedToInvoice);
  };

  const updateProject = (id: string, patch: Partial<Project>) => {
    setProjects((arr) => arr.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const removeProject = (id: string) => {
    setProjects((arr) => arr.filter((p) => p.id !== id));
    toast.success("ลบงานแล้ว");
  };

  const cyclePriority = (id: string) => {
    setProjects((arr) =>
      arr.map((p) => {
        if (p.id !== id) return p;
        const next: Priority =
          p.priority === "low" ? "medium" : p.priority === "medium" ? "high" : "low";
        return { ...p, priority: next };
      }),
    );
  };

  const bumpRevision = (id: string) => {
    setProjects((arr) => arr.map((p) => (p.id === id ? { ...p, revisions: p.revisions + 1 } : p)));
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const overId = e.over?.id;
    if (!overId) return;
    const targetStatus = String(overId).replace("col-", "") as Status;
    if (!COLS.find((c) => c.key === targetStatus)) return;
    const id = String(e.active.id);
    const proj = projects.find((p) => p.id === id);
    if (!proj || proj.status === targetStatus) return;
    moveTo(id, targetStatus);
  };

  const clientOptions = React.useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => p.client && p.client !== "—" && set.add(p.client));
    savedClients.forEach((c) => set.add(c.name));
    return Array.from(set);
  }, [projects, savedClients]);

  const visibleProjects = React.useMemo(() => {
    return projects.filter((p) => {
      if (!showArchive && p.archived) return false;
      if (showArchive && !p.archived) return false;
      if (filterClientName !== "all" && p.client !== filterClientName) return false;
      return true;
    });
  }, [projects, filterClientName, showArchive]);

  const archivedCount = projects.filter((p) => p.archived).length;
  const activeProj = activeId ? projects.find((p) => p.id === activeId) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดงานของคุณ…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="animate-fade-up">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Kanban className="h-4 w-4 text-primary" /> To Do List
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={showArchive ? "default" : "outline"}
                size="sm"
                onClick={() => setShowArchive((v) => !v)}
                className="h-8 gap-1.5 rounded-xl text-xs"
              >
                <Archive className="h-3.5 w-3.5" />
                {showArchive ? "กลับสู่บอร์ด" : `งานที่เสร็จแล้ว (${archivedCount})`}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResync}
                className="h-8 gap-1.5 rounded-xl text-xs"
                title="ดึงรายชื่อลูกค้าล่าสุด"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Resync ลูกค้า
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <Input
              placeholder="ชื่องาน / Task…"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addProject();
              }}
              className="sm:col-span-3"
            />
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as Status)}>
              <SelectTrigger className="sm:col-span-2">
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                {COLS.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={newPriority} onValueChange={(v) => setNewPriority(v as Priority)}>
              <SelectTrigger className="sm:col-span-2">
                <SelectValue placeholder="ความด่วน" />
              </SelectTrigger>
              <SelectContent>
                {(["low", "medium", "high"] as Priority[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    <span className="inline-flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${PRIORITY_META[p].dot}`} />
                      {PRIORITY_META[p].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={newClient} onValueChange={setNewClient}>
              <SelectTrigger className="sm:col-span-2">
                <SelectValue placeholder="ลูกค้า" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">ลูกค้า</SelectItem>
                {savedClients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.rate ? ` · ${c.rate.toLocaleString()}฿` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              className="sm:col-span-2"
              title="กำหนดเวลา"
            />
            <Button
              type="button"
              onClick={addProject}
              className="sm:col-span-1 bg-gradient-primary text-primary-foreground whitespace-nowrap"
            >
              <Plus className="h-4 w-4 mr-1" /> เพิ่ม
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[11px] text-muted-foreground">กรองตามลูกค้า:</span>
            <Select value={filterClientName} onValueChange={setFilterClientName}>
              <SelectTrigger className="h-8 w-[200px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ลูกค้าทั้งหมด</SelectItem>
                {clientOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterClientName !== "all" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1 text-xs"
                onClick={() => setFilterClientName("all")}
              >
                <X className="h-3 w-3" /> ล้างตัวกรอง
              </Button>
            )}
            <span className="text-[11px] text-muted-foreground ml-auto">
              💡 ลากการ์ดข้ามคอลัมน์ได้เลย • คลิกธงเพื่อปรับความด่วน
            </span>
          </div>

          {savedClients.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              ยังไม่มีลูกค้าที่บันทึกไว้ — ไปเพิ่มได้ที่ฟีเจอร์ "ลูกค้า" แล้วกด Resync
            </p>
          )}
        </CardContent>
      </Card>

      <PageFooterActions feature="To Do List" label="To Do List" />

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {COLS.map((col) => {
            const items = visibleProjects.filter((p) => p.status === col.key);
            return (
              <ColumnDroppable key={col.key} col={col} count={items.length}>
                {items.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
                    {showArchive ? "ว่าง" : "ลากงานมาวางที่นี่"}
                  </p>
                )}
                {items.map((proj) => (
                  <TaskCard
                    key={proj.id}
                    proj={proj}
                    shakeEnabled={shakeEnabled}
                    onCyclePriority={() => cyclePriority(proj.id)}
                    onMove={(dir) => {
                      const idx = COLS.findIndex((c) => c.key === proj.status);
                      const next = COLS[Math.min(COLS.length - 1, Math.max(0, idx + dir))];
                      moveTo(proj.id, next.key);
                    }}
                    onEditVersions={() => setVersionEditor(proj)}
                    onAddRevision={() => bumpRevision(proj.id)}
                    onSubRevision={() =>
                      updateProject(proj.id, { revisions: Math.max(0, proj.revisions - 1) })
                    }
                    onShowComments={() => setCommentEditor(proj)}
                    onDelete={() => removeProject(proj.id)}
                  />
                ))}
              </ColumnDroppable>
            );
          })}
        </div>
        <DragOverlay>
          {activeProj ? (
            <div className="rotate-2 opacity-90">
              <TaskCard proj={activeProj} dragOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <InvoiceDialog proj={invoiceFor} onClose={() => setInvoiceFor(null)} userId={user?.id} />
      <VersionDialog
        proj={versionEditor}
        onClose={() => setVersionEditor(null)}
        onSave={(versions) => {
          if (versionEditor) updateProject(versionEditor.id, { versions });
          setVersionEditor(null);
        }}
      />
      <CommentDialog
        proj={commentEditor}
        onClose={() => setCommentEditor(null)}
        onSave={(comments, revisionLimit) => {
          if (commentEditor) updateProject(commentEditor.id, { comments, revisionLimit });
          setCommentEditor(null);
        }}
      />
    </div>
  );
}

// ============= Column =============

function ColumnDroppable({
  col,
  count,
  children,
}: {
  col: (typeof COLS)[number];
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${col.key}` });
  return (
    <Card
      ref={setNodeRef}
      className={`animate-fade-up transition-colors ${isOver ? "ring-2 ring-primary/50" : ""}`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className={`px-2 py-0.5 rounded-md text-xs ${col.tint}`}>{col.label}</span>
          <span className="text-xs text-muted-foreground">{count}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 min-h-[80px]">{children}</CardContent>
    </Card>
  );
}

// ============= Task Card =============

// React.memo: TaskCard เป็นการ์ดที่อาจมีหลายสิบใบในบอร์ด — กันการ re-render เวลา parent อัปเดต state อื่น
const TaskCard = React.memo(function TaskCard({
  proj,
  shakeEnabled = true,
  onCyclePriority,
  onMove,
  onEditVersions,
  onAddRevision,
  onSubRevision,
  onShowComments,
  onDelete,
  dragOverlay,
}: {
  proj: Project;
  shakeEnabled?: boolean;
  onCyclePriority?: () => void;
  onMove?: (dir: 1 | -1) => void;
  onEditVersions?: () => void;
  onAddRevision?: () => void;
  onSubRevision?: () => void;
  onShowComments?: () => void;
  onDelete?: () => void;
  dragOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: proj.id,
    disabled: dragOverlay,
  });

  const dl = daysLeft(proj.deadline);
  const overdue = dl < 0 && proj.status !== "done";
  const prio = PRIORITY_META[proj.priority];
  const lastComment = proj.comments[proj.comments.length - 1];
  const overLimit = proj.revisions > proj.revisionLimit;

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border border-border/60 bg-card p-3 hover:shadow-card transition-all ${
        isDragging ? "opacity-30" : ""
      } ${overdue && shakeEnabled ? "animate-overdue-shake" : ""}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-start gap-1.5 min-w-0 flex-1">
          {!dragOverlay && (
            <button
              {...attributes}
              {...listeners}
              className="mt-0.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
              aria-label="ลากเพื่อย้าย"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          )}
          <p className="text-sm font-medium leading-snug truncate">{proj.title}</p>
        </div>
        {onCyclePriority && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onCyclePriority}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${prio.cls}`}
              >
                <Flag className="h-2.5 w-2.5" /> {prio.label}
              </button>
            </TooltipTrigger>
            <TooltipContent>คลิกเพื่อสลับความด่วน</TooltipContent>
          </Tooltip>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground mb-2">
        {proj.client}
        {proj.rate ? ` · ${proj.rate.toLocaleString()}฿` : ""}
      </p>

      <div className="flex items-center gap-1 mb-2">
        <Clock className="h-3 w-3 text-muted-foreground" />
        <span
          className={`text-[11px] num ${overdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}
        >
          {overdue
            ? `เลยกำหนด ${Math.abs(dl)} วัน`
            : proj.status === "done"
              ? "เสร็จแล้ว"
              : `เหลือ ${dl} วัน`}
        </span>
        {overdue && <AlertCircle className="h-3 w-3 text-destructive" />}
      </div>

      {/* Revision counter */}
      {onAddRevision && onShowComments && (
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`inline-flex items-center rounded text-[10px] border overflow-hidden ${
              overLimit
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-border bg-muted/40 text-muted-foreground"
            }`}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onSubRevision}
                  disabled={proj.revisions <= 0}
                  className="px-1.5 py-0.5 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed border-r border-border/60"
                  aria-label="ลดรอบแก้"
                >
                  −
                </button>
              </TooltipTrigger>
              <TooltipContent>ลด 1 รอบแก้</TooltipContent>
            </Tooltip>
            <span className="px-2 py-0.5 select-none">
              แก้รอบที่ {proj.revisions}/{proj.revisionLimit}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onAddRevision}
                  className="px-1.5 py-0.5 hover:bg-muted border-l border-border/60"
                  aria-label="เพิ่มรอบแก้"
                >
                  +
                </button>
              </TooltipTrigger>
              <TooltipContent>เพิ่ม 1 รอบแก้</TooltipContent>
            </Tooltip>
          </div>

          {lastComment ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onShowComments}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border border-border bg-muted/40 text-muted-foreground hover:bg-muted truncate max-w-[140px]"
                >
                  <MessageSquare className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{lastComment.text}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium mb-1">{lastComment.author}</p>
                <p className="text-xs whitespace-pre-wrap">{lastComment.text}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={onShowComments}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border border-dashed border-border text-muted-foreground hover:bg-muted"
            >
              <MessageSquare className="h-2.5 w-2.5" /> + คอมเมนต์
            </button>
          )}
        </div>
      )}

      {/* Version links */}
      <div className="flex flex-wrap items-center gap-1 mb-2">
        {proj.versions.map((v) => {
          const safe = v.url ? safeHref(v.url) : null;
          return safe ? (
            <a
              key={v.label + v.url}
              href={safe}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-primary-soft text-primary hover:underline"
            >
              <Link2 className="h-2.5 w-2.5" /> {v.label}
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          ) : (
            <span
              key={v.label}
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
            >
              {v.label}
            </span>
          );
        })}
        {onEditVersions && (
          <button
            type="button"
            onClick={onEditVersions}
            className="text-[10px] px-1.5 py-0.5 rounded border border-dashed border-border text-muted-foreground hover:bg-muted"
          >
            + Version
          </button>
        )}
      </div>

      {/* Actions */}
      {onMove && (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 flex-1"
            onClick={() => onMove(-1)}
          >
            ←
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 flex-1"
            onClick={() => onMove(1)}
          >
            →
          </Button>
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              title="ลบ"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

// ============= Invoice Dialog =============

function InvoiceDialog({
  proj,
  onClose,
  userId,
}: {
  proj: Project | null;
  onClose: () => void;
  userId?: string;
}) {
  const [amount, setAmount] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (proj) setAmount(proj.rate ? String(proj.rate) : "");
  }, [proj]);

  if (!proj) return null;

  const submit = async () => {
    if (!userId) {
      toast.error("ต้องเข้าสู่ระบบก่อน");
      return;
    }
    const num = Number(amount);
    if (!num || num <= 0) {
      toast.error("กรอกยอดเงินให้ถูกต้อง");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("finance_clients_invoices").insert({
      user_id: userId,
      name: proj.client,
      project: proj.title,
      amount: num,
      status: "ontime",
      due_date: addDays(7),
    });
    setSaving(false);
    if (error) {
      toast.error("บันทึกใบแจ้งหนี้ไม่สำเร็จ: " + error.message);
      return;
    }
    toast.success(`ออกใบแจ้งหนี้ ${num.toLocaleString()}฿ ให้ ${proj.client} แล้ว`);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-success" /> งานจบแล้ว 🎉 ออกใบแจ้งหนี้เลยไหม?
          </DialogTitle>
          <DialogDescription>
            "{proj.title}" — {proj.client}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">ยอดเงิน (บาท)</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
          <p className="text-[11px] text-muted-foreground">
            จะถูกบันทึกในฟีเจอร์ "ใบแจ้งหนี้ลูกค้า" ครบกำหนด {addDays(7)}
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            ไว้ก่อน
          </Button>
          <Button
            onClick={submit}
            disabled={saving}
            className="bg-gradient-primary text-primary-foreground"
          >
            {saving ? "กำลังบันทึก…" : "ออกใบแจ้งหนี้"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= Version Dialog =============

function VersionDialog({
  proj,
  onClose,
  onSave,
}: {
  proj: Project | null;
  onClose: () => void;
  onSave: (versions: VersionLink[]) => void;
}) {
  const [items, setItems] = React.useState<VersionLink[]>([]);
  React.useEffect(() => {
    if (proj) setItems(proj.versions.length ? proj.versions : [{ label: "v1", url: "" }]);
  }, [proj]);

  if (!proj) return null;

  const update = (i: number, patch: Partial<VersionLink>) =>
    setItems((arr) => arr.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const remove = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i));
  const add = () => {
    const nextLabel = `v${items.filter((x) => /^v\d+$/.test(x.label)).length + 1}`;
    setItems((arr) => [...arr, { label: nextLabel, url: "" }]);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>ลิงก์ Version — {proj.title}</DialogTitle>
          <DialogDescription>วาง URL จาก Drive / Figma / Canva ฯลฯ</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {items.map((v, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <Input
                className="col-span-3"
                value={v.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="v1 / final"
              />
              <Input
                className="col-span-8"
                value={v.url}
                onChange={(e) => update(i, { url: e.target.value })}
                placeholder="https://…"
              />
              <Button variant="ghost" size="icon" className="col-span-1" onClick={() => remove(i)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={add} className="gap-1">
            <Plus className="h-3 w-3" /> เพิ่ม Version
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={() => onSave(items.filter((x) => x.label.trim()))}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= Comment Dialog =============

function CommentDialog({
  proj,
  onClose,
  onSave,
}: {
  proj: Project | null;
  onClose: () => void;
  onSave: (comments: Comment[], revisionLimit: number) => void;
}) {
  const [items, setItems] = React.useState<Comment[]>([]);
  const [limit, setLimit] = React.useState(3);
  const [text, setText] = React.useState("");
  const [author, setAuthor] = React.useState("ลูกค้า");

  React.useEffect(() => {
    if (proj) {
      setItems(proj.comments);
      setLimit(proj.revisionLimit);
      setText("");
    }
  }, [proj]);

  if (!proj) return null;

  const add = () => {
    if (!text.trim()) return;
    setItems((arr) => [
      ...arr,
      { author: author || "ลูกค้า", text: text.trim(), at: new Date().toISOString() },
    ]);
    setText("");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>คอมเมนต์ & Scope — {proj.title}</DialogTitle>
          <DialogDescription>เก็บฟีดแบ็กลูกค้าและคุมจำนวนรอบแก้</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">จำนวนรอบแก้สูงสุดในสโคป:</span>
            <Input
              type="number"
              min={1}
              className="w-20"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) || 1)}
            />
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {items.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">ยังไม่มีคอมเมนต์</p>
            )}
            {items.map((c, i) => (
              <div key={i} className="rounded-lg border border-border bg-muted/40 p-2 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{c.author}</span>
                  <button
                    onClick={() => setItems((arr) => arr.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <p className="whitespace-pre-wrap">{c.text}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-12 gap-2">
            <Input
              className="col-span-3"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="ชื่อผู้คอมเมนต์"
            />
            <Input
              className="col-span-7"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") add();
              }}
              placeholder="ลูกค้าอยากให้แก้อะไร…"
            />
            <Button className="col-span-2" onClick={add}>
              เพิ่ม
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={() => onSave(items, limit)}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
