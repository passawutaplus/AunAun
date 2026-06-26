import { useMemo, useState } from "react";
import { Check, ChevronDown, FolderOpen, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMyProjects } from "@/hooks/useProjects";
import {
  MAX_COMMUNITY_PROJECT_MENTIONS,
  type MentionedProjectSummary,
} from "@/lib/communityMentionedProjects";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  userId: string;
  selected: MentionedProjectSummary[];
  onChange: (projects: MentionedProjectSummary[]) => void;
};

function projectThumb(p: { cover_url: string | null; gallery_urls?: string[] | null }) {
  return p.cover_url || p.gallery_urls?.[0] || null;
}

export function CommunityProjectMentionPicker({ userId, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data: myProjects = [], isLoading } = useMyProjects(userId);

  const published = useMemo(
    () =>
      myProjects
        .filter((p) => p.status === "Published")
        .map((p) => ({
          id: p.id,
          title: p.title,
          cover_url: projectThumb(p),
        })),
    [myProjects],
  );

  const selectedIds = useMemo(() => new Set(selected.map((p) => p.id)), [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return published;
    return published.filter((p) => p.title.toLowerCase().includes(q));
  }, [published, query]);

  const toggle = (project: MentionedProjectSummary) => {
    if (selectedIds.has(project.id)) {
      onChange(selected.filter((p) => p.id !== project.id));
      return;
    }
    if (selected.length >= MAX_COMMUNITY_PROJECT_MENTIONS) {
      toast.info(`เมนชันผลงานได้สูงสุด ${MAX_COMMUNITY_PROJECT_MENTIONS} ชิ้น`);
      return;
    }
    onChange([...selected, project]);
  };

  const remove = (id: string) => onChange(selected.filter((p) => p.id !== id));

  return (
    <section className="px-4 py-3 border-t border-border/60">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-sm font-medium">อ้างอิงผลงาน</p>
        <span className="text-[11px] text-muted-foreground">
          {selected.length}/{MAX_COMMUNITY_PROJECT_MENTIONS}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        เลือกผลงานที่โพสต์นี้พูดถึง — จะแสดงในโพสต์และตัวอย่าง
      </p>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selected.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 pl-1.5 pr-1 py-1"
            >
              {p.cover_url ? (
                <img src={p.cover_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <span className="w-8 h-8 rounded-lg bg-muted grid place-items-center">
                  <FolderOpen className="w-4 h-4 text-muted-foreground" />
                </span>
              )}
              <span className="text-xs font-medium max-w-[120px] truncate">{p.title}</span>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="p-1 rounded-full hover:bg-destructive/10 hover:text-destructive"
                aria-label={`ลบ ${p.title}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={selected.length >= MAX_COMMUNITY_PROJECT_MENTIONS}
            className={cn(
              "w-full flex items-center justify-between gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-sm",
              "hover:border-primary/40 hover:bg-muted/30 transition-colors",
              selected.length >= MAX_COMMUNITY_PROJECT_MENTIONS && "opacity-50 cursor-not-allowed",
            )}
          >
            <span className="text-muted-foreground">
              {published.length === 0 ? "ยังไม่มีผลงานที่เผยแพร่" : "เลือกผลงาน…"}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(100vw-2rem,360px)] p-0">
          <div className="p-3 border-b border-border/60">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาชื่อผลงาน"
                className="pl-8 h-9 rounded-lg"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {isLoading && (
              <p className="text-xs text-muted-foreground text-center py-6">กำลังโหลดผลงาน…</p>
            )}
            {!isLoading && published.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6 px-3">
                เผยแพร่ผลงานในพอร์ตก่อน แล้วค่อยอ้างอิงในโพสต์
              </p>
            )}
            {!isLoading && published.length > 0 && filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">ไม่พบผลงานที่ตรงกับคำค้น</p>
            )}
            {filtered.map((p) => {
              const on = selectedIds.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                    on ? "bg-primary/10" : "hover:bg-muted/60",
                  )}
                >
                  {p.cover_url ? (
                    <img src={p.cover_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <span className="w-10 h-10 rounded-lg bg-muted shrink-0 grid place-items-center">
                      <FolderOpen className="w-4 h-4 text-muted-foreground" />
                    </span>
                  )}
                  <span className="flex-1 min-w-0 text-sm font-medium truncate">{p.title}</span>
                  {on && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </section>
  );
}
