import { useEffect, useMemo, useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/useAuth";
import { useFollowingList } from "@/hooks/useFollowLists";
import { useSubmitCollabGroupExpandRequest } from "@/hooks/useCollabGroupExpand";
import type { GroupMemberPick } from "@/components/chat/CreateGroupDialog";
import {
  ackPreviewText,
  computeGroupExpandAckPreview,
  planModeLabel,
  type CollabGroupExpandPlanMode,
} from "@/lib/collabGroupExpand";
import type { CollabPlanDocument } from "@/lib/collabPlanDoc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lockedMembers: GroupMemberPick[];
  sourceConversationId: string;
  collabRequestId?: string | null;
  partnerUserId: string;
  planDoc: CollabPlanDocument;
  sourceMemberIds: string[];
  onSubmitted: (expandRequestId: string) => void | Promise<void>;
}

const GROUP_TITLE_MAX = 80;

const CreateCollabGroupDialog = ({
  open,
  onOpenChange,
  lockedMembers,
  sourceConversationId,
  collabRequestId,
  partnerUserId,
  planDoc,
  sourceMemberIds,
  onSubmitted,
}: Props) => {
  const { user } = useAuth();
  const submit = useSubmitCollabGroupExpandRequest();
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<GroupMemberPick[]>([]);
  const [planMode, setPlanMode] = useState<CollabGroupExpandPlanMode>("migrate");

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
    setStep(1);
    setMembers(lockedMembers);
    setTitle("");
    setSearch("");
    setPlanMode("migrate");
  }, [open, lockedKey]);

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

  const { data: following = [], isLoading: followingLoading } = useFollowingList(
    open ? user?.id : undefined,
  );

  const searchTerm = search.trim().toLowerCase();
  const followingFiltered = useMemo(() => {
    const selected = new Set(members.map((m) => m.id));
    return following
      .filter((f) => f.userId !== user?.id && !selected.has(f.userId))
      .filter((f) => {
        if (!searchTerm) return true;
        return (
          f.displayName.toLowerCase().includes(searchTerm) ||
          (f.username?.toLowerCase().includes(searchTerm) ?? false)
        );
      })
      .slice(0, 40);
  }, [following, members, searchTerm, user?.id]);

  const totalPeople = 1 + members.length;
  const minTotalMembers = 3;
  const needMore = Math.max(0, minTotalMembers - totalPeople);

  const allMemberIds = useMemo(() => {
    const ids = new Set(sourceMemberIds);
    if (user?.id) ids.add(user.id);
    for (const m of members) ids.add(m.id);
    return Array.from(ids);
  }, [members, sourceMemberIds, user?.id]);

  const ackPreview = useMemo(
    () => computeGroupExpandAckPreview(planDoc, sourceMemberIds, allMemberIds),
    [planDoc, sourceMemberIds, allMemberIds],
  );

  const reset = () => {
    setStep(1);
    setTitle("");
    setSearch("");
    setMembers([]);
    setPlanMode("migrate");
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
  };

  const removeMember = (id: string) => {
    if (lockedIds.has(id)) return;
    setMembers((prev) => prev.filter((x) => x.id !== id));
  };

  const goStep2 = () => {
    if (!title.trim()) {
      toast.error("กรุณาตั้งชื่อกลุ่ม");
      return;
    }
    if (totalPeople < minTotalMembers) {
      toast.error(`เลือกเพื่อนที่ติดตามเพิ่มอีก ${needMore} คน (รวมอย่างน้อย ${minTotalMembers} คน)`);
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    const invitedOnly = members
      .map((m) => m.id)
      .filter((id) => !sourceMemberIds.includes(id));
    try {
      const row = await submit.mutateAsync({
        sourceConversationId,
        collabRequestId,
        proposedBy: user.id,
        partnerUserId,
        groupTitle: title.trim(),
        newMemberIds: invitedOnly,
        planMode,
        planDoc,
        sourceMemberIds,
        ackPreview: ackPreview as unknown as Record<string, unknown>,
      });
      toast.success("ส่งคำขอสร้างกลุ่มแล้ว — รอคู่แชทยืนยัน");
      reset();
      await onSubmitted(row.id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "ส่งคำขอไม่สำเร็จ");
    }
  };

  const partnerLabel = lockedMembers[0]?.display_name;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Users className="w-5 h-5" />
            ชวนสร้างกลุ่มคอลแลป
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[hsl(var(--chat-collab-soft))] text-[hsl(var(--chat-collab))]">
              <Handshake className="w-3 h-3" />
              คอลแลป
            </span>
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? partnerLabel && partnerLabel !== "ผู้ใช้"
                ? `คุณและ ${partnerLabel} อยู่ในกลุ่มแล้ว — เลือกเพื่อนที่ติดตามเพิ่ม (ขั้นที่ ${step}/2)`
                : `เลือกเพื่อนที่ติดตามให้ครบอย่างน้อย ${minTotalMembers} คน (ขั้นที่ ${step}/2)`
              : "เลือกว่าจะย้ายแผนปัจจุบันไปกลุ่มใหม่ หรือเริ่มแผนใหม่ — คู่แชทต้องยืนยันก่อนสร้างจริง"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="collab-group-title">ชื่อกลุ่ม</Label>
              <Input
                id="collab-group-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น ทีมคอลแลป UI"
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
                          aria-label={`ลบ ${label}`}
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
              <Label htmlFor="collab-group-search">เพิ่มจากคนที่ติดตาม</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="collab-group-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาชื่อหรือ @username"
                  className="pl-9"
                />
              </div>
              {followingLoading ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> โหลดรายชื่อ…
                </p>
              ) : following.length === 0 ? (
                <p className="text-xs text-muted-foreground">ยังไม่มีรายชื่อที่ติดตาม</p>
              ) : followingFiltered.length === 0 ? (
                <p className="text-xs text-muted-foreground">ไม่พบ — ลองคำค้นอื่น</p>
              ) : (
                <ul className="max-h-40 overflow-y-auto space-y-1">
                  {followingFiltered.map((f) => (
                    <li key={f.userId}>
                      <button
                        type="button"
                        onClick={() =>
                          addMember({
                            id: f.userId,
                            display_name: f.displayName,
                            avatar_url: f.avatarUrl,
                          })
                        }
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted text-left text-sm"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={f.avatarUrl ?? undefined} />
                          <AvatarFallback>{f.displayName[0]}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{f.displayName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">ชื่อกลุ่ม: </span>
                {title.trim()}
              </p>
              <p>
                <span className="text-muted-foreground">สมาชิก: </span>
                {totalPeople} คน
              </p>
            </div>

            <RadioGroup
              value={planMode}
              onValueChange={(v) => setPlanMode(v as CollabGroupExpandPlanMode)}
              className="space-y-3"
            >
              <label
                htmlFor="plan-migrate"
                className={cn(
                  "flex gap-3 rounded-xl border p-3 cursor-pointer",
                  planMode === "migrate"
                    ? "border-[hsl(var(--chat-collab))] bg-[hsl(var(--chat-collab-soft)/0.5)]"
                    : "border-border",
                )}
              >
                <RadioGroupItem value="migrate" id="plan-migrate" className="mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">{planModeLabel("migrate")}</p>
                  <p className="text-xs text-muted-foreground">
                    ย้ายแผนและความคืบหน้าปัจจุบัน — สมาชิกใหม่ต้องยืนยันขั้น「{ackPreview.stepTitle}」
                  </p>
                  <p className="text-xs font-medium text-[hsl(var(--chat-collab))]">
                    {ackPreviewText(ackPreview)}
                  </p>
                </div>
              </label>
              <label
                htmlFor="plan-fresh"
                className={cn(
                  "flex gap-3 rounded-xl border p-3 cursor-pointer",
                  planMode === "fresh"
                    ? "border-[hsl(var(--chat-collab))] bg-[hsl(var(--chat-collab-soft)/0.5)]"
                    : "border-border",
                )}
              >
                <RadioGroupItem value="fresh" id="plan-fresh" className="mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">{planModeLabel("fresh")}</p>
                  <p className="text-xs text-muted-foreground">
                    เริ่มแผนใหม่ที่ขั้น 1 (Align) ในกลุ่ม — แชทคู่ยังเก็บแผนเดิมไว้
                  </p>
                </div>
              </label>
            </RadioGroup>

            <p className="text-[11px] text-muted-foreground">
              คู่แชทต้องกดยืนยันก่อนสร้างกลุ่มจริง (ภายใน 48 ชม.)
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 2 ? (
            <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={submit.isPending}>
              ย้อนกลับ
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submit.isPending}>
            ยกเลิก
          </Button>
          {step === 1 ? (
            <Button type="button" onClick={goStep2}>
              ถัดไป — เลือกแผน
            </Button>
          ) : (
            <Button
              type="button"
              disabled={submit.isPending}
              className="bg-[hsl(var(--chat-collab))] hover:opacity-90"
              onClick={() => void handleSubmit()}
            >
              {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              ส่งคำขอให้คู่แชทยืนยัน
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCollabGroupDialog;
