import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Loader2, Plus, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { sortPortfolioProjects } from "@/lib/portfolioSort";
import { useSendMessage } from "@/hooks/useChat";
import { cn } from "@/lib/utils";
import { getSupabaseErrorMessage } from "@/lib/supabaseErrors";
import { toast } from "sonner";
import { useChatPortfolio, type ChatPortfolioProject } from "@/components/chat/useChatPortfolio";

const PREVIEW_COUNT = 4;

export type { ChatPortfolioProject };

function PortfolioRow({
  project,
  onSend,
  sending,
}: {
  project: ChatPortfolioProject;
  onSend: (p: ChatPortfolioProject) => void;
  sending: boolean;
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-xl border border-border bg-card/50 hover:bg-accent/30 transition-colors">
      {project.cover_url ? (
        <img src={project.cover_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-muted shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{project.title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{project.category ?? "—"}</p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="shrink-0 h-8 text-xs rounded-full"
        disabled={sending}
        onClick={() => onSend(project)}
      >
        {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
        ส่งในแชท
      </Button>
    </div>
  );
}

function PortfolioGridCard({
  project,
  onSend,
  sending,
}: {
  project: ChatPortfolioProject;
  onSend: (p: ChatPortfolioProject) => void;
  sending: boolean;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
      <Link to={`/project/${project.id}`} className="block aspect-square bg-muted overflow-hidden relative group">
        {project.cover_url ? (
          <img
            src={project.cover_url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            ไม่มีรูป
          </div>
        )}
      </Link>
      <div className="p-2.5 space-y-2 flex-1 flex flex-col">
        <div className="min-h-0 flex-1">
          <p className="text-sm font-medium line-clamp-2 leading-snug">{project.title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{project.category ?? "—"}</p>
        </div>
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-1 h-8 text-xs rounded-lg px-2"
            asChild
          >
            <Link to={`/project/${project.id}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3 mr-1 shrink-0" />
              ดูผลงาน
            </Link>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs rounded-lg px-2"
            disabled={sending}
            onClick={() => onSend(project)}
          >
            {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 mr-1 shrink-0" />}
            ส่ง
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ChatPortfolioDialog({
  open,
  onOpenChange,
  title,
  projects,
  onSend,
  sending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  projects: ChatPortfolioProject[];
  onSend: (p: ChatPortfolioProject) => void;
  sending: boolean;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"));
  }, [projects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      const hay = [p.title, p.category, ...(p.tags ?? [])].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [projects, search, category]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSearch("");
      setCategory("all");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2 shrink-0">
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-3 space-y-2 shrink-0 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อหรือแท็ก…"
              className="pl-9 h-9 rounded-full bg-muted border-0"
            />
          </div>
          {categories.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
              <button
                type="button"
                onClick={() => setCategory("all")}
                className={cn(
                  "shrink-0 text-xs px-3 py-1 rounded-full border transition-colors",
                  category === "all"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                ทั้งหมด
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "shrink-0 text-xs px-3 py-1 rounded-full border transition-colors",
                    category === c
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">ไม่พบผลงานที่ตรงกับตัวกรอง</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((p) => (
                <PortfolioGridCard key={p.id} project={p} onSend={onSend} sending={sending} />
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border shrink-0 text-center">
          <p className="text-[11px] text-muted-foreground">
            แสดง {filtered.length} จาก {projects.length} ผลงาน
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export interface ChatPortfolioSectionProps {
  userId: string;
  label: string;
  dialogTitle: string;
  conversationId: string;
}

const ChatPortfolioSection = ({
  userId,
  label,
  dialogTitle,
  conversationId,
}: ChatPortfolioSectionProps) => {
  const send = useSendMessage();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: projects = [], isLoading } = useChatPortfolio(userId);

  const ordered = useMemo(
    () => sortPortfolioProjects(projects as Parameters<typeof sortPortfolioProjects>[0]),
    [projects],
  );

  const preview = ordered.slice(0, PREVIEW_COUNT);
  const hasMore = ordered.length > PREVIEW_COUNT;

  const sendProject = async (project: ChatPortfolioProject) => {
    try {
      await send.mutateAsync({
        conversationId,
        content: project.title,
        messageType: "project",
        projectId: project.id,
      });
      toast.success("ส่งผลงานในแชทแล้ว");
    } catch (e: unknown) {
      toast.error(getSupabaseErrorMessage(e, "ส่งไม่สำเร็จ"));
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-6 text-center">กำลังโหลดผลงาน…</p>;
  }
  if (ordered.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">ยังไม่มีผลงานที่เผยแพร่</p>;
  }

  return (
    <>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground px-1">{label}</p>
        <div className="space-y-2">
          {preview.map((p) => (
            <PortfolioRow
              key={p.id}
              project={p}
              onSend={sendProject}
              sending={send.isPending}
            />
          ))}
        </div>
        {(hasMore || ordered.length > 0) && (
          <Button
            type="button"
            variant="outline"
            className="w-full mt-2 rounded-full text-xs h-9"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            ส่งเพิ่มเติม ({ordered.length} ผลงาน)
          </Button>
        )}
      </div>

      <ChatPortfolioDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={dialogTitle}
        projects={ordered}
        onSend={sendProject}
        sending={send.isPending}
      />
    </>
  );
};

export default ChatPortfolioSection;
