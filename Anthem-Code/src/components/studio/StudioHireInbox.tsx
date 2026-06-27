import { useNavigate } from "react-router-dom";
import { Check, MessageCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStudioHiringRequests, type HiringRow } from "@/hooks/useHiringRequests";
import { useAcceptStudioHireRequest, useRejectRequest } from "@/hooks/useChat";
import { timeAgoTH } from "@/lib/format";
import { toast } from "sonner";

type Props = {
  studioId: string;
};

function statusTone(status: string) {
  if (status === "ตอบรับ" || status === "accepted") {
    return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  }
  if (status === "ปฏิเสธ" || status === "declined") {
    return "bg-muted text-muted-foreground border-border";
  }
  return "bg-primary/10 text-primary border-primary/20";
}

export function StudioHireInbox({ studioId }: Props) {
  const navigate = useNavigate();
  const { data: requests = [], isLoading } = useStudioHiringRequests(studioId);
  const accept = useAcceptStudioHireRequest();
  const reject = useRejectRequest();

  const handleAccept = async (req: HiringRow) => {
    try {
      const convId = await accept.mutateAsync(req.id);
      toast.success("ตอบรับคำขอแล้ว — เปิดแชทได้เลย");
      navigate(`/chat/${convId}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "ตอบรับไม่สำเร็จ");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await reject.mutateAsync({ kind: "hire", requestId: id });
      toast.success("ปฏิเสธคำขอแล้ว");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "ปฏิเสธไม่สำเร็จ");
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">กำลังโหลดคำขอจ้าง...</p>;
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        ยังไม่มีคำขอจ้าง Studio
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => {
        const pending = req.status === "pending" || req.status === "รอตอบ";
        return (
          <div key={req.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{req.project_title || "คำขอจ้าง Studio"}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {req.client_name} · {req.email}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">{timeAgoTH(req.created_at)}</p>
              </div>
              <Badge variant="outline" className={statusTone(req.status)}>
                {req.status}
              </Badge>
            </div>
            {req.message ? (
              <p className="text-base text-foreground whitespace-pre-wrap">{req.message}</p>
            ) : null}
            {pending ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="rounded-xl"
                  disabled={accept.isPending}
                  onClick={() => void handleAccept(req)}
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  ตอบรับ
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  disabled={reject.isPending}
                  onClick={() => void handleReject(req.id)}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  ปฏิเสธ
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() => navigate("/chat")}
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1" />
                ไปแชท
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
