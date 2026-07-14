import { useEffect, useMemo, useState } from "react";
import { Handshake, Loader2, Search, Settings2, UserPlus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  useAddGroupMembers,
  useConversation,
  useUpdateGroupSettings,
} from "@/hooks/useChat";
import { useFollowingList } from "@/hooks/useFollowLists";
import BriefcaseIcon from "@/components/icons/BriefcaseIcon";
import { groupTagLabel, normalizeGroupTag, type GroupTag } from "@/lib/groupChatTag";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
};

const TITLE_MAX = 80;

const TAG_OPTIONS: { id: GroupTag | "none"; label: string }[] = [
  { id: "hire", label: "กลุ่มจ้างงาน" },
  { id: "collab", label: "กลุ่มคอลแลป" },
  { id: "none", label: "ไม่ระบุ" },
];

const GroupSettingsDialog = ({ open, onOpenChange, conversationId }: Props) => {
  const { user } = useAuth();
  const { data: conv } = useConversation(open ? conversationId : undefined);
  const addMembers = useAddGroupMembers();
  const updateSettings = useUpdateGroupSettings();
  const [title, setTitle] = useState("");
  const [tagChoice, setTagChoice] = useState<GroupTag | "none">("none");
  const [search, setSearch] = useState("");
  const [picks, setPicks] = useState<
    { id: string; display_name: string; avatar_url: string | null }[]
  >([]);

  useEffect(() => {
    if (!open || !conv) return;
    setTitle(conv.title?.trim() || "");
    setTagChoice(normalizeGroupTag(conv.group_tag) ?? "none");
    setSearch("");
    setPicks([]);
  }, [open, conv?.id, conv?.title, conv?.group_tag]);

  const { data: existingIds = [], isLoading: membersLoading } = useQuery({
    queryKey: ["group-member-ids", conversationId],
    enabled: open && !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", conversationId);
      if (error) throw error;
      return (data ?? []).map((r) => r.user_id as string);
    },
  });

  const existingSet = useMemo(() => new Set(existingIds), [existingIds]);

  const { data: following = [], isLoading: followingLoading } = useFollowingList(
    open ? user?.id : undefined,
  );

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pickIds = new Set(picks.map((p) => p.id));
    return following
      .filter((u) => !existingSet.has(u.userId) && !pickIds.has(u.userId))
      .filter((u) => {
        if (!q) return true;
        return (
          u.displayName.toLowerCase().includes(q) ||
          (u.username?.toLowerCase().includes(q) ?? false)
        );
      })
      .slice(0, 40);
  }, [following, existingSet, picks, search]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSearch("");
      setPicks([]);
    }
    onOpenChange(next);
  };

  const currentTag = normalizeGroupTag(conv?.group_tag);
  const titleDirty = title.trim() !== (conv?.title?.trim() || "");
  const tagDirty =
    (tagChoice === "none" ? null : tagChoice) !== currentTag;
  const settingsDirty = titleDirty || tagDirty;
  const busy = addMembers.isPending || updateSettings.isPending;

  const submit = async () => {
    if (!title.trim()) {
      toast.error("กรุณาตั้งชื่อกลุ่ม");
      return;
    }
    try {
      if (settingsDirty) {
        await updateSettings.mutateAsync({
          conversationId,
          title: title.trim(),
          groupTag: tagChoice === "none" ? null : tagChoice,
          clearGroupTag: tagChoice === "none",
        });
      }
      if (picks.length > 0) {
        await addMembers.mutateAsync({
          conversationId,
          memberIds: picks.map((p) => p.id),
        });
      }
      if (!settingsDirty && picks.length === 0) {
        toast.message("ยังไม่มีการเปลี่ยนแปลง");
        return;
      }
      toast.success(
        picks.length > 0 && settingsDirty
          ? "บันทึกตั้งค่าและเพิ่มสมาชิกแล้ว"
          : picks.length > 0
            ? picks.length === 1
              ? "เพิ่มสมาชิกแล้ว"
              : `เพิ่ม ${picks.length} คนแล้ว`
            : "บันทึกตั้งค่ากลุ่มแล้ว",
      );
      handleOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    }
  };

  const loading = membersLoading || followingLoading;
  const previewTag = tagChoice === "none" ? null : tagChoice;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Settings2 className="w-5 h-5" />
            ตั้งค่ากลุ่ม
            {previewTag ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full",
                  previewTag === "hire"
                    ? "bg-[hsl(var(--chat-hire-soft))] text-[hsl(var(--chat-hire))]"
                    : "bg-[hsl(var(--chat-collab-soft))] text-[hsl(var(--chat-collab))]",
                )}
              >
                {previewTag === "hire" ? (
                  <BriefcaseIcon className="w-3 h-3" />
                ) : (
                  <Handshake className="w-3 h-3" />
                )}
                {groupTagLabel(previewTag)}
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            แก้ชื่อกลุ่ม แท็กประเภท และเพิ่มสมาชิกจากคนที่คุณติดตาม
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="group-settings-title">ชื่อกลุ่ม</Label>
            <Input
              id="group-settings-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={TITLE_MAX}
              placeholder="ชื่อกลุ่ม"
            />
          </div>

          <div className="space-y-2">
            <Label>แท็กกลุ่ม</Label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((opt) => {
                const active = tagChoice === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTagChoice(opt.id)}
                    className={cn(
                      "inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-colors",
                      active
                        ? opt.id === "hire"
                          ? "border-[hsl(var(--chat-hire))] bg-[hsl(var(--chat-hire-soft))] text-[hsl(var(--chat-hire))]"
                          : opt.id === "collab"
                            ? "border-[hsl(var(--chat-collab))] bg-[hsl(var(--chat-collab-soft))] text-[hsl(var(--chat-collab))]"
                            : "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted/60",
                    )}
                  >
                    {opt.id === "hire" ? <BriefcaseIcon className="w-3 h-3" /> : null}
                    {opt.id === "collab" ? <Handshake className="w-3 h-3" /> : null}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {picks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {picks.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-muted text-sm"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={m.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">{m.display_name[0]}</AvatarFallback>
                  </Avatar>
                  {m.display_name}
                  <button
                    type="button"
                    onClick={() => setPicks((prev) => prev.filter((x) => x.id !== m.id))}
                    className="ml-0.5 text-muted-foreground hover:text-foreground"
                    aria-label={`ลบ ${m.display_name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label className="inline-flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              เพิ่มสมาชิก
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อหรือ @username"
                className="pl-9"
              />
            </div>
            {loading ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> กำลังโหลด…
              </p>
            ) : following.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1">
                ยังไม่มีคนที่คุณติดตาม — ไปติดตามใครสักคนก่อนแล้วค่อยเพิ่ม
              </p>
            ) : candidates.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1">
                ไม่มีใครให้เพิ่ม หรืออยู่ในกลุ่มครบแล้ว
              </p>
            ) : (
              <ul className="border border-border rounded-lg divide-y divide-border max-h-40 overflow-y-auto">
                {candidates.map((u) => (
                  <li key={u.userId}>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/60 text-left text-sm"
                      onClick={() => {
                        if (picks.length >= 19) {
                          toast.error("เพิ่มได้สูงสุด 19 คนต่อครั้ง");
                          return;
                        }
                        setPicks((prev) => [
                          ...prev,
                          {
                            id: u.userId,
                            display_name: u.displayName,
                            avatar_url: u.avatarUrl,
                          },
                        ]);
                      }}
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={u.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs">{u.displayName[0]}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 truncate">
                        {u.displayName}
                        {u.username ? (
                          <span className="text-muted-foreground"> @{u.username}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
            ยกเลิก
          </Button>
          <Button onClick={submit} disabled={busy || (!settingsDirty && picks.length === 0)}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GroupSettingsDialog;
