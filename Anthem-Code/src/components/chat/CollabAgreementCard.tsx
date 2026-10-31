import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Check, HeartHandshake, History, Loader2, MapPin, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import { ChatCardShell, ChatCardStatusPill } from "@/components/chat/ChatCardShell";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useCollabAgreement } from "@/hooks/useCollabAgreement";
import { useMemberNames } from "@/components/chat/CollabAgreementSheet";
import { COLLAB_AGREEMENT_PREFIX, rightsLabel } from "@/lib/collabAgreement";

export function isCollabAgreementMessage(content: string | null | undefined) {
  return content?.trim() === COLLAB_AGREEMENT_PREFIX;
}

const shortDay = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" }).format(new Date(y, m - 1, d));
};

/** Live summary of the collab plan in the chat — everyone confirms here. */
export function CollabAgreementCard({
  conversationId,
  messageId,
  onOpenPlan,
}: {
  conversationId: string;
  messageId?: string;
  onOpenPlan?: () => void;
}) {
  const { user } = useAuth();
  // Every send / re-confirm posts a new card; only the newest one stays actionable.
  const { data: latestId } = useQuery({
    queryKey: ["collab-agreement-latest-card", conversationId],
    staleTime: 15_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("content", COLLAB_AGREEMENT_PREFIX)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data?.id as string | undefined) ?? null;
    },
  });
  const a = useCollabAgreement(conversationId);
  const { data: members = [] } = useMemberNames(a.memberIds, user?.id);
  const ag = a.agreement;
  const myName = members.find((m) => m.id === user?.id)?.name;

  const ack = async () => {
    try {
      await a.toggleAck(myName);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    }
  };

  if (messageId && latestId && latestId !== messageId) {
    return (
      <div className="flex w-full max-w-sm items-center gap-2 rounded-2xl border border-dashed border-border bg-card px-3.5 py-2.5 text-xs text-muted-foreground">
        <History className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">แผนเวอร์ชันเก่า — มีเวอร์ชันใหม่กว่าด้านล่าง</span>
        {onOpenPlan ? (
          <button type="button" onClick={onOpenPlan} className="shrink-0 font-medium text-foreground hover:underline">
            ดูแผน
          </button>
        ) : null}
      </div>
    );
  }

  const waiting = members.filter((m) => !a.acks[m.id]);
  const statusPill =
    a.status === "agreed" ? (
      <ChatCardStatusPill tone="ok">ตกลงแล้ว</ChatCardStatusPill>
    ) : a.status === "pending" ? (
      <ChatCardStatusPill tone="wait">
        ยืนยัน {a.ackCount}/{a.memberIds.length}
      </ChatCardStatusPill>
    ) : (
      <ChatCardStatusPill tone="closed">ร่าง</ChatCardStatusPill>
    );

  return (
    <ChatCardShell
      tone="collab"
      icon={HeartHandshake}
      title={a.status === "agreed" ? "แผนคอลแลป · ตกลงกันแล้ว" : "แผนคอลแลป"}
      meta={statusPill}
      footer={
        <div className="flex gap-2">
          {a.status === "pending" ? (
            <Button
              type="button"
              size="sm"
              variant={a.myAcked ? "outline" : "default"}
              className={cn("h-8 flex-1 gap-1", !a.myAcked && "bg-[hsl(var(--chat-collab))] text-[hsl(var(--chat-collab-foreground))] hover:opacity-90")}
              disabled={a.busy}
              onClick={() => void ack()}
            >
              {a.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Check className="h-3.5 w-3.5" aria-hidden />}
              {a.myAcked ? "ตกลงแล้ว · ยกเลิก" : "ตกลง"}
            </Button>
          ) : null}
          {onOpenPlan ? (
            <Button type="button" size="sm" variant="outline" className="h-8 flex-1" onClick={onOpenPlan}>
              ดูแผน
            </Button>
          ) : null}
        </div>
      }
    >
      <div>
        <p className="font-medium leading-snug break-words">{ag.what || "—"}</p>
        {ag.brief ? <p className="mt-1 line-clamp-3 text-xs text-muted-foreground break-words">{ag.brief}</p> : null}
      </div>
      {members.some((m) => ag.roles[m.id]?.trim()) ? (
        <ul className="space-y-0.5 text-xs">
          {members
            .filter((m) => ag.roles[m.id]?.trim())
            .map((m) => (
              <li key={m.id} className="flex gap-1.5">
                <span className="shrink-0 font-medium">{m.name}</span>
                <span className="min-w-0 break-words text-muted-foreground">{ag.roles[m.id]}</span>
              </li>
            ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {ag.destinations.length ? (
          <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-[hsl(var(--chat-collab-soft))] px-2 py-0.5 text-[11px] text-[hsl(var(--chat-collab))]">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{ag.destinations.join(" · ")}</span>
          </span>
        ) : null}
        {ag.dueAt ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--chat-collab-soft))] px-2 py-0.5 text-[11px] text-[hsl(var(--chat-collab))]">
            <CalendarDays className="h-3 w-3" aria-hidden /> {shortDay(ag.dueAt)}
          </span>
        ) : null}
        <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-[hsl(var(--chat-collab-soft))] px-2 py-0.5 text-[11px] text-[hsl(var(--chat-collab))]">
          <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{rightsLabel(ag)}</span>
        </span>
      </div>
      {a.status !== "draft" && members.length ? (
        <div className="flex items-center gap-2 rounded-2xl bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
          <span className="flex">
            {members.map((m, i) => (
              <span key={m.id} className={cn("relative", i > 0 && "-ml-2")}>
                <UserAvatar src={m.avatarUrl} name={m.name} username={m.name} className="h-6 w-6 ring-2 ring-card" fallbackClassName="text-[10px]" />
                {a.acks[m.id] ? (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 text-white ring-1 ring-card">
                    <Check className="h-2 w-2" strokeWidth={4} aria-hidden />
                  </span>
                ) : null}
              </span>
            ))}
          </span>
          <span className="min-w-0 truncate">
            {waiting.length ? (
              <>
                รอ <span className="font-medium text-foreground">{waiting.map((m) => m.name).join(", ")}</span> ตกลง
              </>
            ) : (
              "ทุกคนตกลงแล้ว"
            )}
          </span>
        </div>
      ) : null}
    </ChatCardShell>
  );
}
