import { useState } from "react";
import { Loader2, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useFollowingList } from "@/hooks/useFollowLists";
import { HIRE_REJECT_REASONS, type HireRejectReasonId } from "@/lib/hireBrief";

export type HireForwardPick = {
  userId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  /** Client-facing reason text (same options as reject dialog). */
  clientMessage: string;
  reason: HireRejectReasonId;
  /** Optional note to the friend. */
  note: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy?: boolean;
  projectTitle?: string | null;
  onConfirm: (pick: HireForwardPick) => void | Promise<void>;
};

const HireForwardInChatDialog = ({
  open,
  onOpenChange,
  busy,
  projectTitle,
  onConfirm,
}: Props) => {
  const { user } = useAuth();
  const { data: following = [], isLoading } = useFollowingList(open ? user?.id : undefined);
  const [forwardTo, setForwardTo] = useState<string | null>(null);
  const [reason, setReason] = useState<HireRejectReasonId>("queue_full");
  const [otherNote, setOtherNote] = useState("");
  const [friendNote, setFriendNote] = useState("");

  const reset = () => {
    setForwardTo(null);
    setReason("queue_full");
    setOtherNote("");
    setFriendNote("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const selected = following.find((f) => f.userId === forwardTo) ?? null;
  const clientMessage =
    reason === "other"
      ? otherNote.trim()
      : (HIRE_REJECT_REASONS.find((r) => r.id === reason)?.label ?? "");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[hsl(var(--chat-hire))]" />
            ส่งต่องาน
          </DialogTitle>
          <DialogDescription>
            เลือกเพื่อนที่ติดตามได้ทีละ 1 คน — ระบบจะแจ้งในแชทนี้ให้ผู้จ้างกดคุยต่อได้เลย
            {projectTitle ? (
              <span className="block mt-1 text-foreground/80">งาน: {projectTitle}</span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div>
          <Label className="text-xs">ส่งต่อให้เพื่อน</Label>
          {isLoading ? (
            <div className="flex items-center h-10 mt-1.5 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : following.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-1.5">
              ยังไม่ได้ติดตามใคร — ติดตามครีเอเตอร์ก่อนจึงจะส่งต่องานได้
            </p>
          ) : (
            <Select value={forwardTo ?? undefined} onValueChange={setForwardTo}>
              <SelectTrigger className="mt-1.5 rounded-xl">
                <SelectValue placeholder="เลือกเพื่อนที่ติดตาม" />
              </SelectTrigger>
              <SelectContent>
                {following.map((f) => (
                  <SelectItem key={f.userId} value={f.userId}>
                    {f.displayName}
                    {f.username ? ` (@${f.username})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div>
          <Label htmlFor="hire-forward-chat-friend-note" className="text-xs">
            ข้อความถึงเพื่อน
          </Label>
          <Textarea
            id="hire-forward-chat-friend-note"
            rows={2}
            value={friendNote}
            onChange={(e) => setFriendNote(e.target.value)}
            placeholder="ข้อความถึงเพื่อน (ไม่บังคับ)"
            className="rounded-xl mt-1.5"
          />
        </div>

        <div>
          <Label className="text-xs">ข้อความถึงผู้จ้าง</Label>
          <div className="flex flex-col gap-1.5 mt-2">
            {HIRE_REJECT_REASONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setReason(r.id)}
                className={cn(
                  "text-left px-3 py-2 rounded-xl text-sm border transition-colors",
                  reason === r.id
                    ? "border-[hsl(var(--chat-hire))] bg-[hsl(var(--chat-hire-soft))] text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          {reason === "other" ? (
            <Textarea
              rows={2}
              value={otherNote}
              onChange={(e) => setOtherNote(e.target.value)}
              placeholder="รายละเอียดถึงผู้จ้าง *"
              className="rounded-xl mt-2"
            />
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="ghost" disabled={busy} onClick={() => handleOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button
            type="button"
            disabled={busy || !selected || (reason === "other" && !otherNote.trim())}
            className="rounded-full bg-[hsl(var(--chat-hire))] text-white hover:opacity-90"
            onClick={() =>
              selected &&
              void onConfirm({
                userId: selected.userId,
                displayName: selected.displayName,
                username: selected.username,
                avatarUrl: selected.avatarUrl,
                clientMessage,
                reason,
                note: friendNote.trim(),
              })
            }
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "ส่งต่องาน"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HireForwardInChatDialog;
