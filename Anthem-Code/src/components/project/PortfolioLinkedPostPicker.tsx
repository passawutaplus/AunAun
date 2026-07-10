import { useMemo, useState } from "react";
import { Check, ChevronDown, MessageSquare, Search, X } from "lucide-react";
import { CompactLoader } from "@/components/ui/BanterLoader";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCommunityPostsByAuthor } from "@/hooks/useCommunityPosts";
import {
  MAX_PORTFOLIO_LINKED_POSTS,
  type LinkedPostSummary,
} from "@/lib/portfolioLinkedPosts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  userId: string;
  selected: LinkedPostSummary[];
  onChange: (posts: LinkedPostSummary[]) => void;
  readOnlyPosts?: LinkedPostSummary[];
};

function postThumb(p: LinkedPostSummary) {
  return p.gallery_urls?.[0] ?? null;
}

export function PortfolioLinkedPostPicker({
  userId,
  selected,
  onChange,
  readOnlyPosts = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data: myPosts = [], isLoading } = useCommunityPostsByAuthor(userId);

  const selectedIds = useMemo(() => new Set(selected.map((p) => p.id)), [selected]);
  const readOnlyIds = useMemo(() => new Set(readOnlyPosts.map((p) => p.id)), [readOnlyPosts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = myPosts.map((p) => ({
      id: p.id,
      title: p.title,
      author_id: p.author_id,
      gallery_urls: p.gallery_urls ?? [],
    }));
    if (!q) return base;
    return base.filter((p) => p.title.toLowerCase().includes(q));
  }, [myPosts, query]);

  const toggle = (post: LinkedPostSummary) => {
    if (readOnlyIds.has(post.id)) return;
    if (selectedIds.has(post.id)) {
      onChange(selected.filter((p) => p.id !== post.id));
      return;
    }
    if (selected.length + readOnlyPosts.length >= MAX_PORTFOLIO_LINKED_POSTS) {
      toast.info(`ลิงก์โพสต์ได้สูงสุด ${MAX_PORTFOLIO_LINKED_POSTS} โพสต์`);
      return;
    }
    onChange([...selected, post]);
  };

  const remove = (id: string) => onChange(selected.filter((p) => p.id !== id));

  return (
    <section className="space-y-2">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <MessageSquare className="w-4 h-4 text-primary shrink-0" />
        ลิงก์โพสต์ Area
      </p>
      <p className="text-xs text-muted-foreground">
        เชื่อมโพสต์กับผลงาน — คนดูจะไล่ตามได้ทั้งสองทาง
      </p>

      {(readOnlyPosts.length > 0 || selected.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {readOnlyPosts.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/40 pl-1.5 pr-2 py-1"
            >
              {postThumb(p) ? (
                <img src={postThumb(p)!} alt="" className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <span className="w-8 h-8 rounded-lg bg-muted grid place-items-center">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                </span>
              )}
              <span className="text-xs font-medium max-w-[100px] truncate">{p.title}</span>
              {p.author_name && p.author_id !== userId && (
                <span className="text-[10px] text-muted-foreground">· {p.author_name}</span>
              )}
            </span>
          ))}
          {selected.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 pl-1.5 pr-1 py-1"
            >
              {postThumb(p) ? (
                <img src={postThumb(p)!} alt="" className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <span className="w-8 h-8 rounded-lg bg-muted grid place-items-center">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
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
            disabled={selected.length + readOnlyPosts.length >= MAX_PORTFOLIO_LINKED_POSTS}
            className={cn(
              "w-full flex items-center justify-between gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-sm",
              "hover:border-primary/40 hover:bg-muted/30 transition-colors",
              selected.length + readOnlyPosts.length >= MAX_PORTFOLIO_LINKED_POSTS &&
                "opacity-50 cursor-not-allowed",
            )}
          >
            <span className="text-muted-foreground">
              {myPosts.length === 0 ? "ยังไม่มีโพสต์ที่เผยแพร่" : "เลือกโพสต์ของคุณ…"}
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
                placeholder="ค้นหาชื่อโพสต์"
                className="pl-8 h-9 rounded-lg"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {isLoading && (
              <CompactLoader label="กำลังโหลดโพสต์…" className="py-6" />
            )}
            {!isLoading && myPosts.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6 px-3">
                โพสต์ใน Area ก่อน แล้วค่อยลิงก์กับผลงาน
              </p>
            )}
            {!isLoading && filtered.length === 0 && myPosts.length > 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">ไม่พบโพสต์ที่ตรงกับคำค้น</p>
            )}
            {filtered.map((p) => {
              const on = selectedIds.has(p.id) || readOnlyIds.has(p.id);
              const locked = readOnlyIds.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p)}
                  disabled={locked}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                    on ? "bg-primary/10" : "hover:bg-muted/60",
                    locked && "opacity-60 cursor-default",
                  )}
                >
                  {postThumb(p) ? (
                    <img src={postThumb(p)!} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <span className="w-10 h-10 rounded-lg bg-muted shrink-0 grid place-items-center">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
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
