import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AtSign, Ban, Check, Clock, Plus, Search, UserRound, X } from "lucide-react";
import { CompactLoader } from "@/components/ui/BanterLoader";
import UserAvatar from "@/components/UserAvatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { TaggedUserSummary } from "@/lib/communityTaggedUsers";
import { fetchTaggableCollabCandidates, MAX_PORTFOLIO_COLLAB_USERS } from "@/lib/portfolioCollabInvites";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  userId: string;
  selected: TaggedUserSummary[];
  onChange: (users: TaggedUserSummary[]) => void;
  acceptedUsers?: TaggedUserSummary[];
  pendingUsers?: TaggedUserSummary[];
  /** Said no to this work: shown for the poster's information, cannot be tagged again here. */
  declinedUsers?: TaggedUserSummary[];
  /** Cancel a tag nobody has answered yet (saved works only). */
  onCancelPending?: (user: TaggedUserSummary) => void;
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
  declinedUsers = [],
  onCancelPending,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["mutual-follow-candidates", userId],
    enabled: open && !!userId,
    queryFn: () => fetchTaggableCollabCandidates(userId),
  });

  const lockedIds = useMemo(
    () => new Set([...acceptedUsers, ...pendingUsers, ...declinedUsers].map((u) => u.user_id)),
    [acceptedUsers, pendingUsers, declinedUsers],
  );
  const declinedIds = useMemo(() => new Set(declinedUsers.map((u) => u.user_id)), [declinedUsers]);
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
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-normal text-foreground">
            <AtSign className="w-4 h-4 text-primary shrink-0" />
            แท็กเพื่อนร่วมงาน
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            แท็กได้เฉพาะคนที่ติดตามกันทั้งคู่ เมื่อเผยแพร่ผลงาน เขาจะได้แจ้งเตือนให้ยืนยัน
            ชื่อจะขึ้นในผลงานเมื่อเขากดยอมรับ ถ้าปฏิเสธ ผลงานยังเผยแพร่ได้ตามปกติ
          </p>
        </div>
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
              aria-label="เลือกเพื่อนที่ติดตามกัน"
              title={totalCount >= maxTags ? `แท็กได้สูงสุด ${maxTags} คน` : "เลือกเพื่อนที่ติดตามกัน"}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground shadow-sm",
                "hover:border-primary/50 hover:text-primary",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              แท็กเพื่อน
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[min(100vw-2rem,360px)] p-0">
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
                <div className="py-6 px-4 text-center">
                  <p className="text-sm text-foreground">ยังไม่มีคนที่แท็กได้</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    ติดตามดีไซเนอร์ที่ร่วมงานด้วย เมื่อเขาติดตามกลับ จะแท็กกันในผลงานได้
                    (คนที่ปิดรับการแท็กจะไม่ขึ้นในรายชื่อ)
                  </p>
                  <Link
                    to="/?mode=designers"
                    className="mt-3 inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    ไปหน้า Designers
                  </Link>
                </div>
              )}
              {!isLoading && candidates.length > 0 && filtered.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6 px-3">
                  ไม่พบชื่อนี้ในคนที่ติดตามกันทั้งคู่
                </p>
              )}
              {filtered.map((u) => {
                const declined = declinedIds.has(u.user_id);
                const on = !declined && (selectedIds.has(u.user_id) || lockedIds.has(u.user_id));
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
                    {declined ? (
                      <span className="shrink-0 text-[11px] text-muted-foreground">ปฏิเสธแล้ว</span>
                    ) : on ? (
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
      </div>

      {(acceptedUsers.length > 0 || pendingUsers.length > 0 || declinedUsers.length > 0 || selected.length > 0) && (
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
              className="inline-flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 pl-1.5 pr-2 py-1"
            >
              <UserAvatar src={u.avatar_url} name={u.display_name} className="w-8 h-8" />
              <span className="text-xs font-medium max-w-[100px] truncate">{userLabel(u)}</span>
              <Badge variant="outline" className="text-[9px] h-4 px-1 gap-0.5 border-warning/40 text-warning">
                <Clock className="w-2.5 h-2.5" /> รอตอบรับ
              </Badge>
              {onCancelPending ? (
                <button
                  type="button"
                  onClick={() => onCancelPending(u)}
                  className="-mr-1 p-1 rounded-full hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`ยกเลิกการแท็ก ${u.display_name}`}
                  title="ยกเลิกการแท็ก (เขายังไม่ได้ตอบ)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </span>
          ))}
          {declinedUsers.map((u) => (
            <span
              key={u.user_id}
              title="ปฏิเสธการแท็กในผลงานนี้ — ชื่อจะไม่ขึ้นในผลงาน"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/40 pl-1.5 pr-2 py-1 opacity-70"
            >
              <UserAvatar src={u.avatar_url} name={u.display_name} className="w-8 h-8 grayscale" />
              <span className="text-xs font-medium max-w-[100px] truncate">{userLabel(u)}</span>
              <Badge variant="outline" className="text-[9px] h-4 px-1 gap-0.5 text-muted-foreground">
                <Ban className="w-2.5 h-2.5" /> ปฏิเสธ
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
    </section>
  );
}
