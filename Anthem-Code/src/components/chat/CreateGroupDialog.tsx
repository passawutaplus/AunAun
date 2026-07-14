import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Handshake, Loader2, Search, Users, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCreateGroupConversation } from "@/hooks/useChat";
import { useFollowingList } from "@/hooks/useFollowLists";
import BriefcaseIcon from "@/components/icons/BriefcaseIcon";
import { groupTagLabel, type GroupTag } from "@/lib/groupChatTag";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type GroupMemberPick = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (conversationId: string) => void;
  /** Prefill members that cannot be removed (e.g. chat partner). */
  lockedMembers?: GroupMemberPick[];
  /** Only people the current user follows (invite-from-chat). */
  followingOnly?: boolean;
  /** Min people including you. Default 2; invite-from-chat uses 3. */
  minTotalMembers?: number;
  /** Auto tag from source hire/collab chat. */
  defaultGroupTag?: GroupTag | null;
  dialogTitle?: string;
  dialogDescription?: string;
}

const GROUP_TITLE_MAX = 80;

const CreateGroupDialog = ({
  open,
  onOpenChange,
  onCreated,
  lockedMembers = [],
  followingOnly = false,
  minTotalMembers = 2,
  defaultGroupTag = null,
  dialogTitle,
  dialogDescription,
}: Props) => {
  const { user } = useAuth();
  const create = useCreateGroupConversation();
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<GroupMemberPick[]>([]);

  const lockedIds = useMemo(
    () => new Set(lockedMembers.map((m) => m.id)),
    [lockedMembers],
  );
  const lockedKey = useMemo(
    () => lockedMembers.map((m) => m.id).sort().join(","),
    [lockedMembers],
  );

  useEffect(() => {
    if (!open) return;
    setMembers(lockedMembers);
    setTitle("");
    setSearch("");
  }, [open, lockedKey]);

  // Keep locked member labels in sync when profile loads after dialog opens
  useEffect(() => {
    if (!open || lockedMembers.length === 0) return;
    setMembers((prev) => {
      const lockedById = new Map(lockedMembers.map((m) => [m.id, m]));
      let changed = false;
      const next = prev.map((m) => {
        const locked = lockedById.get(m.id);
        if (!locked) return m;
        if (
          locked.display_name === m.display_name &&
          locked.avatar_url === m.avatar_url
        ) {
          return m;
        }
        changed = true;
        return { ...m, display_name: locked.display_name, avatar_url: locked.avatar_url };
      });
      for (const locked of lockedMembers) {
        if (!next.some((m) => m.id === locked.id)) {
          next.unshift(locked);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [open, lockedMembers]);

  const memberIdsKey = useMemo(
    () => members.map((m) => m.id).sort().join(","),
    [members],
  );
  const searchTerm = search.trim();
  const searchReady = searchTerm.length >= 2;

  const { data: following = [], isLoading: followingLoading } = useFollowingList(
    open && followingOnly ? user?.id : undefined,
  );

  const { data: searchResults = [], isFetching } = useQuery({
    queryKey: ["group-member-search", searchTerm, memberIdsKey],
    enabled: open && !followingOnly && searchReady,
    queryFn: async () => {
      const term = `%${searchTerm}%`;
      const { data } = await supabase
        .from("profiles_public")
        .select("user_id, display_name, avatar_url, username")
        .or(`display_name.ilike.${term},username.ilike.${term}`)
        .neq("user_id", user?.id ?? "")
        .limit(8);
      return (data ?? [])
        .map((p) => ({
          id: p.user_id,
          display_name: p.display_name || p.username || "ผู้ใช้",
          avatar_url: p.avatar_url,
        }))
        .filter((p) => p.id && !members.some((m) => m.id === p.id));
    },
  });

  const followingFiltered = useMemo(() => {
    if (!followingOnly) return [];
    const selected = new Set(members.map((m) => m.id));
    const q = searchTerm.toLowerCase();
    return following
      .filter((f) => f.userId !== user?.id && !selected.has(f.userId))
      .filter((f) => {
        if (!q) return true;
        return (
          f.displayName.toLowerCase().includes(q) ||
          (f.username?.toLowerCase().includes(q) ?? false)
        );
      })
      .slice(0, 40);
  }, [following, followingOnly, members, searchTerm, user?.id]);

  const showMemberSearchEmpty =
    !followingOnly && searchReady && !isFetching && searchResults.length === 0;
  const showFollowingEmpty =
    followingOnly && !followingLoading && following.length === 0;
  const showFollowingFilterEmpty =
    followingOnly &&
    !followingLoading &&
    following.length > 0 &&
    followingFiltered.length === 0;

  const totalPeople = 1 + members.length;
  const needMore = Math.max(0, minTotalMembers - totalPeople);

  const reset = () => {
    setTitle("");
    setSearch("");
    setMembers([]);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const addMember = (m: GroupMemberPick) => {
    if (members.some((x) => x.id === m.id)) return;
    if (members.length >= 19) {
      toast.error("เลือกได้สูงสุด 19 คน (รวมคุณ 20 คน)");
      return;
    }
    setMembers((prev) => [...prev, m]);
    if (!followingOnly) setSearch("");
  };

  const removeMember = (id: string) => {
    if (lockedIds.has(id)) return;
    setMembers((prev) => prev.filter((x) => x.id !== id));
  };

  const submit = async () => {
    if (!title.trim()) {
      toast.error("กรุณาตั้งชื่อกลุ่ม");
      return;
    }
    if (totalPeople < minTotalMembers) {
      toast.error(
        minTotalMembers <= 2
          ? "เลือกสมาชิกอย่างน้อย 1 คน"
          : `กลุ่มต้องมีอย่างน้อย ${minTotalMembers} คน — เลือกเพื่อนที่ติดตามเพิ่มอีก ${needMore} คน`,
      );
      return;
    }
    try {
      const id = await create.mutateAsync({
        title: title.trim(),
        memberIds: members.map((m) => m.id),
        groupTag: defaultGroupTag,
      });
      toast.success("สร้างกลุ่มแชทแล้ว");
      reset();
      onCreated(id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "สร้างกลุ่มไม่สำเร็จ");
    }
  };

  const partnerLabel = lockedMembers[0]?.display_name;
  const titleText = dialogTitle ?? (followingOnly ? "ชวนสร้างกลุ่ม" : "สร้างกลุ่มแชท");
  const descText =
    dialogDescription ??
    (followingOnly
      ? partnerLabel && partnerLabel !== "ผู้ใช้"
        ? `คุณและ ${partnerLabel} อยู่ในกลุ่มแล้ว — เลือกเพื่อนที่คุณติดตามให้ครบอย่างน้อย ${minTotalMembers} คน`
        : `คุณและคู่สนทนาอยู่ในกลุ่มแล้ว — เลือกเพื่อนที่คุณติดตามให้ครบอย่างน้อย ${minTotalMembers} คน`
      : "ตั้งชื่อกลุ่มและเชิญสมาชิกอย่างน้อย 1 คน (รวมคุณสูงสุด 20 คน)");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Users className="w-5 h-5" />
            {titleText}
            {defaultGroupTag ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full",
                  defaultGroupTag === "hire"
                    ? "bg-[hsl(var(--chat-hire-soft))] text-[hsl(var(--chat-hire))]"
                    : "bg-[hsl(var(--chat-collab-soft))] text-[hsl(var(--chat-collab))]",
                )}
              >
                {defaultGroupTag === "hire" ? (
                  <BriefcaseIcon className="w-3 h-3" />
                ) : (
                  <Handshake className="w-3 h-3" />
                )}
                {groupTagLabel(defaultGroupTag)}
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {descText}
            {defaultGroupTag
              ? " เปลี่ยนแท็กกลุ่มได้ทีหลังที่ตั้งค่ากลุ่ม"
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="group-title">ชื่อกลุ่ม</Label>
            <Input
              id="group-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ทีมออกแบบ UI"
              maxLength={GROUP_TITLE_MAX}
            />
            <p className="text-xs text-muted-foreground text-right">
              {title.length}/{GROUP_TITLE_MAX}
            </p>
          </div>

          <div className="space-y-2">
            <Label>สมาชิก ({totalPeople} คน)</Label>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-primary/10 text-sm">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px]">ฉัน</AvatarFallback>
                </Avatar>
                คุณ
              </span>
              {members.map((m) => {
                const locked = lockedIds.has(m.id);
                const label =
                  (locked
                    ? lockedMembers.find((x) => x.id === m.id)?.display_name
                    : null) || m.display_name;
                return (
                  <span
                    key={m.id}
                    className={cn(
                      "inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full text-sm",
                      locked ? "bg-primary/10" : "bg-muted",
                    )}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={m.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px]">{label[0]}</AvatarFallback>
                    </Avatar>
                    {label}
                    {!locked && (
                      <button
                        type="button"
                        onClick={() => removeMember(m.id)}
                        className="ml-0.5 text-muted-foreground hover:text-foreground"
                        aria-label={`ลบ ${label} ออกจากกลุ่ม`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{followingOnly ? "เลือกจากคนที่คุณติดตาม" : "เชิญสมาชิก"}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  followingOnly
                    ? "ค้นหาในรายชื่อที่ติดตาม"
                    : "ค้นหาชื่อหรือ @username"
                }
                className="pl-9"
              />
            </div>

            {followingOnly ? (
              <>
                {followingLoading && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> กำลังโหลด…
                  </p>
                )}
                {showFollowingEmpty && (
                  <p className="text-xs text-muted-foreground px-1">
                    ยังไม่ได้ติดตามใคร — ติดตามครีเอเตอร์ก่อนจึงจะชวนเข้ากลุ่มได้
                  </p>
                )}
                {showFollowingFilterEmpty && (
                  <p className="text-xs text-muted-foreground px-1">ไม่พบในรายชื่อที่ติดตาม</p>
                )}
                {followingFiltered.length > 0 && (
                  <ul className="border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                    {followingFiltered.map((f) => (
                      <li key={f.userId}>
                        <button
                          type="button"
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/60 text-left text-sm"
                          onClick={() =>
                            addMember({
                              id: f.userId,
                              display_name: f.displayName,
                              avatar_url: f.avatarUrl,
                            })
                          }
                        >
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={f.avatarUrl ?? undefined} />
                            <AvatarFallback className="text-xs">
                              {f.displayName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="min-w-0 truncate">
                            {f.displayName}
                            {f.username ? (
                              <span className="text-muted-foreground"> @{f.username}</span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <>
                {isFetching && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> กำลังค้นหา…
                  </p>
                )}
                {showMemberSearchEmpty && (
                  <p className="text-xs text-muted-foreground px-1">
                    ไม่พบผู้ใช้ — ลองค้นด้วยชื่อหรือ @username อื่น
                  </p>
                )}
                {searchResults.length > 0 && (
                  <ul className="border border-border rounded-lg divide-y divide-border max-h-40 overflow-y-auto">
                    {searchResults.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/60 text-left text-sm"
                          onClick={() => addMember(p)}
                        >
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={p.avatar_url ?? undefined} />
                            <AvatarFallback className="text-xs">{p.display_name[0]}</AvatarFallback>
                          </Avatar>
                          {p.display_name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button
            onClick={submit}
            disabled={create.isPending || totalPeople < minTotalMembers || !title.trim()}
          >
            {create.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            สร้างกลุ่ม
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
