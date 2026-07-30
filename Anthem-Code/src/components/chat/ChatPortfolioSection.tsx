import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, ExternalLink, Loader2, Plus, Search, Send } from "lucide-react";
import { InlineLoader } from "@/components/ui/BanterLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ServiceDetailDialog from "@/components/services/ServiceDetailDialog";
import { sortPortfolioProjects } from "@/lib/portfolioSort";
import { useSendMessage } from "@/hooks/useChat";
import {
  formatServicePriceRange,
  useCreatorServices,
  type CreatorService,
} from "@/hooks/useCreatorServices";
import { cn } from "@/lib/utils";
import { getSupabaseErrorMessage } from "@/lib/supabaseErrors";
import { toast } from "sonner";
import { useChatPortfolio, type ChatPortfolioProject } from "@/components/chat/useChatPortfolio";

const PREVIEW_COUNT = 4;

export type { ChatPortfolioProject };

type PortfolioKind = "works" | "packages";

function KindToggle({
  value,
  onChange,
  worksCount,
  packagesCount,
}: {
  value: PortfolioKind;
  onChange: (v: PortfolioKind) => void;
  worksCount: number;
  packagesCount: number;
}) {
  return (
    <div
      role="tablist"
      aria-label="หมวดส่งในแชท"
      className="flex w-full rounded-full bg-muted/60 p-1"
    >
      {(
        [
          { id: "works" as const, label: "ผลงาน", count: worksCount },
          { id: "packages" as const, label: "Packages", count: packagesCount },
        ] as const
      ).map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex-1 rounded-full py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            <span className="ml-1 tabular-nums opacity-70">({tab.count})</span>
          </button>
        );
      })}
    </div>
  );
}

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
        <Link
          to={`/project/${project.id}`}
          className="block text-sm font-medium truncate hover:underline hover:text-primary"
        >
          {project.title}
        </Link>
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

function PackageRow({
  service,
  onSend,
  onOpen,
  sending,
}: {
  service: CreatorService;
  onSend: (s: CreatorService) => void;
  onOpen: (s: CreatorService) => void;
  sending: boolean;
}) {
  const cover = service.cover_url?.trim() || service.gallery_urls[0] || "";
  return (
    <div className="flex items-center gap-2 p-2 rounded-xl border border-border bg-card/50 hover:bg-accent/30 transition-colors">
      {cover ? (
        <img src={cover} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-muted shrink-0 flex items-center justify-center text-muted-foreground">
          <Briefcase className="w-5 h-5 opacity-50" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => onOpen(service)}
          className="block w-full text-left text-sm font-medium truncate hover:underline hover:text-primary"
        >
          {service.title}
        </button>
        <p className="text-[11px] text-primary font-medium tabular-nums truncate">
          {formatServicePriceRange(service.price_min_thb, service.price_thb)}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="shrink-0 h-8 text-xs rounded-full"
        disabled={sending}
        onClick={() => onSend(service)}
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
          <Link
            to={`/project/${project.id}`}
            className="text-sm font-medium line-clamp-2 leading-snug hover:underline hover:text-primary"
          >
            {project.title}
          </Link>
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

function PackageGridCard({
  service,
  onSend,
  onOpen,
  sending,
}: {
  service: CreatorService;
  onSend: (s: CreatorService) => void;
  onOpen: (s: CreatorService) => void;
  sending: boolean;
}) {
  const cover = service.cover_url?.trim() || service.gallery_urls[0] || "";
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => onOpen(service)}
        className="block aspect-square bg-muted overflow-hidden relative group text-left"
      >
        {cover ? (
          <img
            src={cover}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Briefcase className="w-8 h-8 opacity-40" />
          </div>
        )}
      </button>
      <div className="p-2.5 space-y-2 flex-1 flex flex-col">
        <div className="min-h-0 flex-1">
          <button
            type="button"
            onClick={() => onOpen(service)}
            className="text-left text-sm font-medium line-clamp-2 leading-snug hover:underline hover:text-primary"
          >
            {service.title}
          </button>
          <p className="text-[11px] text-primary font-medium tabular-nums mt-0.5 truncate">
            {formatServicePriceRange(service.price_min_thb, service.price_thb)}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-1 h-8 text-xs rounded-lg px-2"
            onClick={() => onOpen(service)}
          >
            <ExternalLink className="w-3 h-3 mr-1 shrink-0" />
            ดูแพ็กเกจ
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs rounded-lg px-2"
            disabled={sending}
            onClick={() => onSend(service)}
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
  packages,
  kind,
  onKindChange,
  onSendProject,
  onSendPackage,
  onOpenPackage,
  sending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  projects: ChatPortfolioProject[];
  packages: CreatorService[];
  kind: PortfolioKind;
  onKindChange: (k: PortfolioKind) => void;
  onSendProject: (p: ChatPortfolioProject) => void;
  onSendPackage: (s: CreatorService) => void;
  onOpenPackage: (s: CreatorService) => void;
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

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      const hay = [p.title, p.category, ...(p.tags ?? [])].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [projects, search, category]);

  const filteredPackages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter((s) => {
      const hay = [s.title, s.summary].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [packages, search]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSearch("");
      setCategory("all");
    }
    onOpenChange(next);
  };

  const showingPackages = kind === "packages";
  const filteredCount = showingPackages ? filteredPackages.length : filteredProjects.length;
  const totalCount = showingPackages ? packages.length : projects.length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2 shrink-0">
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-3 space-y-2 shrink-0 border-b border-border">
          <KindToggle
            value={kind}
            onChange={onKindChange}
            worksCount={projects.length}
            packagesCount={packages.length}
          />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={showingPackages ? "ค้นหาชื่อแพ็กเกจ…" : "ค้นหาชื่อหรือแท็ก…"}
              className="pl-9 h-9 rounded-full bg-muted border-0"
            />
          </div>
          {!showingPackages && categories.length > 0 && (
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
          {showingPackages ? (
            filteredPackages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                ไม่พบแพ็กเกจที่ตรงกับตัวกรอง
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredPackages.map((s) => (
                  <PackageGridCard
                    key={s.id}
                    service={s}
                    onSend={onSendPackage}
                    onOpen={onOpenPackage}
                    sending={sending}
                  />
                ))}
              </div>
            )
          ) : filteredProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">ไม่พบผลงานที่ตรงกับตัวกรอง</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProjects.map((p) => (
                <PortfolioGridCard
                  key={p.id}
                  project={p}
                  onSend={onSendProject}
                  sending={sending}
                />
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border shrink-0 text-center">
          <p className="text-[11px] text-muted-foreground">
            แสดง {filteredCount} จาก {totalCount} {showingPackages ? "แพ็กเกจ" : "ผลงาน"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export interface ChatPortfolioSectionProps {
  userId: string;
  dialogTitle: string;
  conversationId: string;
}

const ChatPortfolioSection = ({
  userId,
  dialogTitle,
  conversationId,
}: ChatPortfolioSectionProps) => {
  const send = useSendMessage();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [kind, setKind] = useState<PortfolioKind>("works");
  const [detailService, setDetailService] = useState<CreatorService | null>(null);
  const { data: projects = [], isLoading: projectsLoading } = useChatPortfolio(userId);
  const { data: services = [], isLoading: servicesLoading } = useCreatorServices(userId);

  const ordered = useMemo(
    () => sortPortfolioProjects(projects as Parameters<typeof sortPortfolioProjects>[0]),
    [projects],
  );
  const publishedPackages = useMemo(
    () => services.filter((s) => s.status === "Published"),
    [services],
  );

  const previewProjects = ordered.slice(0, PREVIEW_COUNT);
  const previewPackages = publishedPackages.slice(0, PREVIEW_COUNT);
  const listCount = kind === "works" ? ordered.length : publishedPackages.length;
  const hasMore = listCount > PREVIEW_COUNT;

  const sendProject = async (project: ChatPortfolioProject) => {
    try {
      await send.mutateAsync({
        conversationId,
        content: project.title,
        messageType: "project",
        projectId: project.id,
        profileUserId: userId,
      });
      toast.success("ส่งผลงานในแชทแล้ว");
    } catch (e: unknown) {
      toast.error(getSupabaseErrorMessage(e, "ส่งไม่สำเร็จ"));
    }
  };

  const sendPackage = async (service: CreatorService) => {
    try {
      await send.mutateAsync({
        conversationId,
        content: service.title,
        messageType: "service",
        serviceId: service.id,
        profileUserId: userId,
      });
      toast.success("ส่งแพ็กเกจในแชทแล้ว");
    } catch (e: unknown) {
      toast.error(getSupabaseErrorMessage(e, "ส่งไม่สำเร็จ"));
    }
  };

  const isLoading = projectsLoading || servicesLoading;
  if (isLoading) {
    return <InlineLoader label="กำลังโหลด…" className="py-6" />;
  }

  const emptyWorks = ordered.length === 0;
  const emptyPackages = publishedPackages.length === 0;
  if (emptyWorks && emptyPackages) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        ยังไม่มีผลงานหรือแพ็กเกจที่เผยแพร่
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <KindToggle
          value={kind}
          onChange={setKind}
          worksCount={ordered.length}
          packagesCount={publishedPackages.length}
        />
        {kind === "works" ? (
          emptyWorks ? (
            <p className="text-sm text-muted-foreground py-6 text-center">ยังไม่มีผลงานที่เผยแพร่</p>
          ) : (
            <div className="space-y-2">
              {previewProjects.map((p) => (
                <PortfolioRow
                  key={p.id}
                  project={p}
                  onSend={sendProject}
                  sending={send.isPending}
                />
              ))}
            </div>
          )
        ) : emptyPackages ? (
          <p className="text-sm text-muted-foreground py-6 text-center">ยังไม่มีแพ็กเกจที่เผยแพร่</p>
        ) : (
          <div className="space-y-2">
            {previewPackages.map((s) => (
              <PackageRow
                key={s.id}
                service={s}
                onSend={sendPackage}
                onOpen={setDetailService}
                sending={send.isPending}
              />
            ))}
          </div>
        )}
        {(hasMore || listCount > 0) && (
          <Button
            type="button"
            variant="outline"
            className="w-full mt-2 rounded-full text-xs h-9"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            ส่งเพิ่มเติม ({listCount} {kind === "works" ? "ผลงาน" : "แพ็กเกจ"})
          </Button>
        )}
      </div>

      <ChatPortfolioDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={dialogTitle}
        projects={ordered}
        packages={publishedPackages}
        kind={kind}
        onKindChange={setKind}
        onSendProject={sendProject}
        onSendPackage={sendPackage}
        onOpenPackage={setDetailService}
        sending={send.isPending}
      />

      <ServiceDetailDialog
        open={!!detailService}
        onOpenChange={(next) => {
          if (!next) setDetailService(null);
        }}
        service={detailService}
        previewOnly
        onRequest={() => setDetailService(null)}
      />
    </>
  );
};

export default ChatPortfolioSection;
