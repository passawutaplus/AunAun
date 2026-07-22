import { HeartHandshake } from "lucide-react";
import { ChatCardShell, ChatCardStatus } from "@/components/chat/ChatCardShell";
import { COLLAB_DECLINE_PREFIX } from "@/lib/collabBrief";
import { cn } from "@/lib/utils";

type Props = {
  content: string;
  mine?: boolean;
};

/** Strip card title prefix; keep blank lines for paragraph spacing. */
function displayDeclineBody(content: string): string {
  const raw = content.replace(/\r\n/g, "\n").trimEnd();
  const lines = raw.split("\n");
  const first = lines[0]?.trim() ?? "";
  if (
    first === COLLAB_DECLINE_PREFIX ||
    first === "ปฏิเสธคำชวนคอลแลป" ||
    first === "🙏 ปฏิเสธคำชวนคอลแลป"
  ) {
    // Drop prefix + following blank line if present
    let start = 1;
    while (start < lines.length && lines[start].trim() === "") start += 1;
    return lines.slice(start).join("\n").trimEnd();
  }
  return raw.trim();
}

/** Soft decline notice card — polite rejection, chat can continue. */
const CollabDeclineCard = ({ content, mine }: Props) => {
  const body = displayDeclineBody(content);

  return (
    <ChatCardShell
      tone="collab"
      icon={HeartHandshake}
      title="ไม่สนใจคำชวนคอลแลป"
      meta="คุยต่อได้"
      className={cn("min-w-[16rem] max-w-[22rem]", mine && "ring-1 ring-[hsl(var(--chat-collab)/0.2)]")}
      footer={<ChatCardStatus>ยังแชทคุยไอเดียต่อได้ตามสบาย</ChatCardStatus>}
    >
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground">
        {body}
      </p>
    </ChatCardShell>
  );
};

export default CollabDeclineCard;
