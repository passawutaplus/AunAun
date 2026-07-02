import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Mail, MessageCircle, Phone, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useHiringRequests, type HiringStatusDB } from "@/hooks/useHiringRequests";
import { useAcceptRequest, useRejectRequest, useFindConversationByRequest } from "@/hooks/useChat";
import { timeAgoTH } from "@/lib/format";
import { so1oQuotationUrl, trackCrossLink } from "@/lib/crossLink";
import { toast } from "sonner";

type HiringTab = HiringStatusDB | "ทั้งหมด";

const STATUSES: HiringStatusDB[] = ["ใหม่", "ที่ต้องตอบ", "ตอบรับ", "ปฏิเสธ", "ติดต่อแล้ว", "ปิดแล้ว"];

export function ProfileHiringRequestsSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: requests = [] } = useHiringRequests(user?.id);
  const accept = useAcceptRequest();
  const reject = useRejectRequest();
  const findConv = useFindConversationByRequest();
  const [hiringTab, setHiringTab] = useState<HiringTab>("ที่ต้องตอบ");

  const counts = useMemo(
    () =>
      STATUSES.reduce(
        (acc, s) => ({ ...acc, [s]: requests.filter((r) => r.status === s).length }),
        {} as Record<HiringStatusDB, number>,
      ),
    [requests],
  );

  const filteredHiring = hiringTab === "ทั้งหมด" ? requests : requests.filter((r) => r.status === hiringTab);
  const pendingCount = (counts["ใหม่"] ?? 0) + (counts["ที่ต้องตอบ"] ?? 0);

  return (
    <div className="space-y-3 scroll-mt-24 rounded-3xl glass-panel p-5 md:p-6" id="hiring-section">
      <div className="flex items-center gap-3">
        <div className="text-primary">
          <Mail className="w-5 h-5" strokeWidth={2.25} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-medium text-foreground">คำขอจ้างงาน</h2>
            {pendingCount > 0 && (
              <Badge className="bg-primary text-primary-foreground border-0 text-[10px] px-1.5">
                {pendingCount} รอตอบ
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            ลูกค้าที่ส่งคำขอจ้างงานมายังคุณ — เปลี่ยนสถานะเพื่อติดตาม
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {([...STATUSES, "ทั้งหมด"] as HiringTab[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setHiringTab(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              hiringTab === s
                ? "bg-primary text-primary-foreground"
                : "bg-card text-secondary-foreground border border-border hover:bg-secondary"
            }`}
          >
            {s} {s !== "ทั้งหมด" && counts[s] !== undefined ? `(${counts[s]})` : ""}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredHiring.map((req) => {
          const isDeclined = req.status === "ปฏิเสธ";
          const canQuote =
            req.status === "ตอบรับ" ||
            req.status === "ติดต่อแล้ว" ||
            req.status === "ใหม่" ||
            req.status === "ที่ต้องตอบ";

          const handleReject = async () => {
            try {
              await reject.mutateAsync({ kind: "hire", requestId: req.id });
              toast.success("ปฏิเสธคำขอแล้ว");
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
            }
          };

          const openChat = async () => {
            try {
              let id = await findConv("hire", req.id);
              if (!id && req.client_id && req.freelancer_id) {
                id = await accept.mutateAsync({
                  kind: "hire",
                  requestId: req.id,
                  clientId: req.client_id,
                  freelancerId: req.freelancer_id!,
                  projectId: req.project_id ?? null,
                  projectTitle: req.project_title,
                });
              }
              if (id) navigate(`/chat/${id}`);
              else toast.error("ไม่พบห้องสนทนา");
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
            }
          };

          const openQuote = async () => {
            const linkId = await trackCrossLink({
              source: "portfolio_hire",
              refId: req.id,
              meta: { request_id: req.id },
            });
            const url = so1oQuotationUrl({
              requestId: req.id,
              clientName: req.client_name ?? undefined,
              projectTitle: req.project_title ?? undefined,
              clientEmail: req.email ?? undefined,
              clientPhone: req.phone ?? undefined,
              message: req.message ?? undefined,
              deadline: req.deadline ?? undefined,
              linkId,
            });
            window.open(url, "_blank", "noopener,noreferrer");
          };

          return (
            <div key={req.id} className="rounded-xl glass-panel p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-[hsl(var(--chat-hire))] flex items-center justify-center shrink-0 text-white font-medium text-sm">
                  {req.client_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground text-sm">{req.client_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {req.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-xs bg-[hsl(var(--chat-hire-soft))] text-[hsl(var(--chat-hire))] border-[hsl(var(--chat-hire))/0.2]"
                    >
                      งบ {req.budget}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    อ้างอิง: <span className="text-foreground font-medium">{req.project_title}</span>
                  </p>
                  <p className="text-base text-foreground mt-2 line-clamp-2">{req.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                    <span>⏱ {timeAgoTH(req.created_at)}</span>
                    <a
                      href={`mailto:${req.email}`}
                      className="flex items-center gap-1 hover:text-[hsl(var(--chat-hire))]"
                    >
                      <Mail className="w-3 h-3" />
                      {req.email}
                    </a>
                    {req.phone && (
                      <a
                        href={`tel:${req.phone}`}
                        className="flex items-center gap-1 hover:text-[hsl(var(--chat-hire))]"
                      >
                        <Phone className="w-3 h-3" />
                        {req.phone}
                      </a>
                    )}
                    {req.deadline && <span>⏰ {req.deadline}</span>}
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-border/50 flex-wrap">
                    {!isDeclined && (
                      <>
                        {canQuote && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={openQuote}
                            className="rounded-full h-8 text-xs gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" /> ใบเสนอราคา
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleReject}
                          disabled={reject.isPending}
                          className="rounded-full h-8 text-xs text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-3.5 h-3.5 mr-1" /> ปฏิเสธ
                        </Button>
                        <Button
                          size="sm"
                          onClick={openChat}
                          disabled={accept.isPending}
                          className="rounded-full h-8 text-xs bg-[hsl(var(--chat-hire))] text-white hover:opacity-90"
                        >
                          <MessageCircle className="w-3.5 h-3.5 mr-1" /> เปิดแชท
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filteredHiring.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">ยังไม่มีคำขอจ้างงานในสถานะนี้</p>
        )}
      </div>
    </div>
  );
}
