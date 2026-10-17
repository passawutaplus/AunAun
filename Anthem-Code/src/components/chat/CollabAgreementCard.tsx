import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Check, HeartHandshake, History, Loader2, MapPin, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCollabAgreement } from "@/hooks/useCollabAgreement";
import { AgreementStatusPill, useMemberNames } from "@/components/chat/CollabAgreementSheet";
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

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-3.5 text-sm shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <HeartHandshake className="h-3.5 w-3.5" aria-hidden /> แผนคอลแลป
        </span>
        <AgreementStatusPill status={a.status} ackCount={a.ackCount} total={a.memberIds.length} />
      </div>
      <p className="mt-2 font-medium break-words">{ag.what || "—"}</p>
      {ag.brief ? <p className="mt-1 line-clamp-3 text-xs text-muted-foreground break-words">{ag.brief}</p> : null}
      {members.some((m) => ag.roles[m.id]?.trim()) ? (
        <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
          {members
            .filter((m) => ag.roles[m.id]?.trim())
            .map((m) => (
              <li key={m.id} className="flex gap-1.5">
                <span className="shrink-0 text-foreground/80">{m.name}</span>·<span className="min-w-0 break-words">{ag.roles[m.id]}</span>
                {a.acks[m.id] ? <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-500" aria-label="ตกลงแล้ว" /> : null}
              </li>
            ))}
        </ul>
      ) : null}
      <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
        {ag.destinations.length ? (
          <p className="flex gap-1.5">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="break-words">{ag.destinations.join(" · ")}</span>
          </p>
        ) : null}
        <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          {ag.dueAt ? (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden /> {shortDay(ag.dueAt)}
            </span>
          ) : null}
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> {rightsLabel(ag)}
          </span>
        </p>
      </div>
      <div className="mt-3 flex gap-2">
        {a.status !== "draft" ? (
          <Button
            type="button"
            size="sm"
            variant={a.myAcked ? "outline" : "default"}
            className="h-8 flex-1 rounded-full gap-1"
            disabled={a.busy}
            onClick={() => void ack()}
          >
            {a.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Check className="h-3.5 w-3.5" aria-hidden />}
            {a.myAcked ? "ตกลงแล้ว" : "ตกลง"}
          </Button>
        ) : null}
        {onOpenPlan ? (
          <Button type="button" size="sm" variant="outline" className="h-8 flex-1 rounded-full" onClick={onOpenPlan}>
            ดูแผน
          </Button>
        ) : null}
      </div>
    </div>
  );
}
