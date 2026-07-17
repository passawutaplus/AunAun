import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AtSign, Check, ChevronDown, Clock, Search, UserRound, X } from "lucide-react";
import { CompactLoader } from "@/components/ui/BanterLoader";
import UserAvatar from "@/components/UserAvatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  fetchMutualFollowCandidates,
  type TaggedUserSummary,
} from "@/lib/communityTaggedUsers";
import { MAX_PORTFOLIO_COLLAB_USERS } from "@/lib/portfolioCollabInvites";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  userId: string;
  selected: TaggedUserSummary[];
  onChange: (users: TaggedUserSummary[]) => void;
  acceptedUsers?: TaggedUserSummary[];
  pendingUsers?: TaggedUserSummary[];
};

function userLabel(u: TaggedUserSummary) {
  return u.username ? `@${u.username}` : u.display_name;
}

const maxTags = MAX_PORTFOLIO_COLLAB_USERS;

export function PortfolioCollabUserPicker({
  userId,
  selected,
  onChange,
  acceptedUsers = [],
  pendingUsers = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["mutual-follow-candidates", userId],
    enabled: open && !!userId,
    queryFn: () => fetchMutualFollowCandidates(userId),
  });

  const lockedIds = useMemo(
    () => new Set([...acceptedUsers, ...pendingUsers].map((u) => u.user_id)),
    [acceptedUsers, pendingUsers],
  );
  const selectedIds = useMemo(() => new Set(selected.map((u) => u.user_id)), [selected]);
  const totalCount = acceptedUsers.length + pendingUsers.length + selected.length;

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
    if (lockedIds.has(user.user_id)) return;
    if (selectedIds.has(user.user_id)) {
      onChange(selected.filter((u) => u.user_id !== user.user_id));
      return;
    }
    if (totalCount >= maxTags) {
      toast.info(`แท็กเพื่อนร่วมงานได้สูงสุด ${maxTags} คน`);
      return;
    }
    onChange([...selected, user]);
  };

  const remove = (id: string) => onChange(selected.filter((u) => u.user_id !== id));

  return (
    <section className="space-y-2">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <AtSign className="w-4 h-4 text-primary shrink-0" />
        แท็กเพื่อนร่วมงาน
      </p>

      {(acceptedUsers.length > 0 || pendingUsers.length > 0 || selected.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {acceptedUsers.map((u) => (
            <span
              key={u.user_id}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 pl-1.5 pr-2 py-1"
            >
              <UserAvatar src={u.avatar_url} name={u.display_name} className="w-8 h-8" />
              <span className="text-xs font-medium max-w-[100px] truncate">{userLabel(u)}</span>
              <Badge variant="outline" className="text-[9px] h-4 px-1 border-emerald-500/40 text-emerald-600">
                ร่วมงาน
              </Badge>
            </span>
          ))}
          {pendingUsers.map((u) => (
            <span
              key={u.user_id}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 pl-1.5 pr-2 py-1"
            >
              <UserAvatar src={u.avatar_url} name={u.display_name} className="w-8 h-8" />
              <span className="text-xs font-medium max-w-[100px] truncate">{userLabel(u)}</span>
              <Badge variant="outline" className="text-[9px] h-4 px-1 gap-0.5 border-amber-500/40 text-amber-600">
                <Clock className="w-2.5 h-2.5" /> รอตอบรับ
              </Badge>
            </span>
          ))}
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
            disabled={totalCount >= maxTags}
            className={cn(
              "w-full flex items-center justify-between gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-sm",
              "hover:border-primary/40 hover:bg-muted/30 transition-colors",
              totalCount >= maxTags && "opacity-50 cursor-not-allowed",
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
                ยังไม่มีเพื่อนที่ติดตามกันและกัน
              </p>
            )}
            {filtered.map((u) => {
              const on = selectedIds.has(u.user_id) || lockedIds.has(u.user_id);
              const locked = lockedIds.has(u.user_id);
              return (
                <button
                  key={u.user_id}
                  type="button"
                  onClick={() => toggle(u)}
                  disabled={locked}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                    on ? "bg-primary/10" : "hover:bg-muted/60",
                    locked && "opacity-60 cursor-default",
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
