import { MessageCircle, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import { ChatCardShell, ChatCardStatus } from "@/components/chat/ChatCardShell";
import { useAuth } from "@/hooks/useAuth";
import { useOpenHireCollabChat } from "@/hooks/useChat";
import type { HireForwardChatPayload } from "@/lib/hireForwardChat";
import { toast } from "sonner";

type Props = {
  payload: HireForwardChatPayload;
  mine?: boolean;
  /** Current viewer is the hiring client (can open chat with forwarded creator). */
  canOpenChat: boolean;
};

const HireForwardCard = ({ payload, canOpenChat }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const openChat = useOpenHireCollabChat();

  const openForwardedChat = async () => {
    if (!user?.id) {
      toast.info("กรุณาเข้าสู่ระบบก่อน");
      return;
    }
    try {
      const convId = await openChat.mutateAsync({
        kind: "hire",
        requestId: payload.requestId,
        clientId: user.id,
        freelancerId: payload.toUserId,
        projectTitle: `งานที่ส่งต่อ · ${payload.toName}`,
        contextMessage: "สวัสดีครับ/ค่ะ — สนใจคุยต่อจากงานที่ถูกส่งต่อมา",
        // Keep status pending so the friend can accept / reject in chat.
        skipStatusUpdate: true,
      });
      navigate(`/chat/${convId}`);
      toast.success("เปิดแชทแล้ว — รอครีเอเตอร์ตอบรับหรือปฏิเสธ");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "เปิดแชทไม่สำเร็จ");
    }
  };

  return (
    <ChatCardShell
      tone="hire"
      icon={Share2}
      title="ส่งต่องานให้ครีเอเตอร์คนอื่น"
      footer={
        canOpenChat ? (
          <Button
            type="button"
            size="sm"
            disabled={openChat.isPending}
            onClick={() => void openForwardedChat()}
            className="w-full rounded-full h-9 gap-1.5 bg-[hsl(var(--chat-hire))] text-white hover:opacity-90"
          >
            <MessageCircle className="w-4 h-4" />
            แชทกับ {payload.toName}
          </Button>
        ) : (
          <ChatCardStatus>รอผู้จ้างกดแชทกับคนที่ส่งต่อ</ChatCardStatus>
        )
      }
    >
      <div className="flex items-center gap-3">
        <UserAvatar src={payload.toAvatarUrl} name={payload.toName} className="w-11 h-11" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{payload.toName}</p>
          {payload.toUsername ? (
            <p className="text-[11px] text-muted-foreground truncate">@{payload.toUsername}</p>
          ) : null}
        </div>
      </div>
    </ChatCardShell>
  );
};

export default HireForwardCard;
