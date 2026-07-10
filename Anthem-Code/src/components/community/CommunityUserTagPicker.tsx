import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AtSign, Check, ChevronDown, Search, UserRound, X } from "lucide-react";
import { CompactLoader } from "@/components/ui/BanterLoader";
import UserAvatar from "@/components/UserAvatar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  fetchMutualFollowCandidates,
  MAX_COMMUNITY_USER_TAGS,
  type TaggedUserSummary,
} from "@/lib/communityTaggedUsers";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  userId: string;
  selected: TaggedUserSummary[];
  onChange: (users: TaggedUserSummary[]) => void;
};

function userLabel(u: TaggedUserSummary) {
  return u.username ? `@${u.username}` : u.display_name;
}

export function CommunityUserTagPicker({ userId, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["mutual-follow-candidates", userId],
    enabled: open && !!userId,
    queryFn: () => fetchMutualFollowCandidates(userId),
  });

  const selectedIds = useMemo(() => new Set(selected.map((u) => u.user_id)), [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      (u) =>
        u.display_name.toLowerCase().includes(q) ||
        (u.username?.toLowerCase().includes(q) ?? false),
    );
  }, [candidates, query]);

  const toggle = (user: TaggedUserSummary) => {
    if (selectedIds.has(user.user_id)) {
      onChange(selected.filter((u) => u.user_id !== user.user_id));
      return;
    }
    if (selected.length >= MAX_COMMUNITY_USER_TAGS) {
      toast.info(`แท็กเพื่อนได้สูงสุด ${MAX_COMMUNITY_USER_TAGS} คน`);
      return;
    }
    onChange([...selected, user]);
  };

  const remove = (id: string) => onChange(selected.filter((u) => u.user_id !== id));

  return (
    <section className="px-4 py-3 border-t border-border/60">
      <p className="flex items-center gap-1.5 text-sm font-medium mb-2.5">
        <AtSign className="w-4 h-4 text-primary shrink-0" />
        แท็กเพื่อน
      </p>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2.5">
          {selected.map((u) => (
            <span
              key={u.user_id}
              className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 pl-1.5 pr-1 py-1"
            >
              <UserAvatar src={u.avatar_url} name={u.display_name} className="w-8 h-8" />
              <span className="text-xs font-medium max-w-[120px] truncate">{userLabel(u)}</span>
              <button
                type="button"
                onClick={() => remove(u.user_id)}
                className="p-1 rounded-full hover:bg-destructive/10 hover:text-destructive"
                aria-label={`ลบ ${u.display_name}`}
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
            disabled={selected.length >= MAX_COMMUNITY_USER_TAGS}
            className={cn(
              "w-full flex items-center justify-between gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-sm",
              "hover:border-primary/40 hover:bg-muted/30 transition-colors",
              selected.length >= MAX_COMMUNITY_USER_TAGS && "opacity-50 cursor-not-allowed",
            )}
          >
            <span className="text-muted-foreground">เลือกเพื่อนที่ติดตามกัน…</span>
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
                placeholder="ค้นหาชื่อหรือ @username"
                className="pl-8 h-9 rounded-lg"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {isLoading && (
              <CompactLoader label="กำลังโหลดรายชื่อ…" className="py-6" />
            )}
            {!isLoading && candidates.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6 px-3">
                ยังไม่มีเพื่อนที่ติดตามกันและกัน — ติดตามกันก่อนแล้วค่อยแท็ก
              </p>
            )}
            {!isLoading && candidates.length > 0 && filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">ไม่พบชื่อที่ตรงกับคำค้น</p>
            )}
            {filtered.map((u) => {
              const on = selectedIds.has(u.user_id);
              return (
                <button
                  key={u.user_id}
                  type="button"
                  onClick={() => toggle(u)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                    on ? "bg-primary/10" : "hover:bg-muted/60",
                  )}
                >
                  <UserAvatar src={u.avatar_url} name={u.display_name} className="w-10 h-10 shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{u.display_name}</span>
                    {u.username && (
                      <span className="block text-xs text-muted-foreground truncate">@{u.username}</span>
                    )}
                  </span>
                  {on ? (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <UserRound className="w-4 h-4 text-muted-foreground shrink-0 opacity-40" />
                  )}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </section>
  );
}
