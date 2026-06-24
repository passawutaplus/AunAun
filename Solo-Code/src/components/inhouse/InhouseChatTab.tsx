import * as React from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useInhouseChannels,
  useInhouseMessages,
  useSendInhouseMessage,
} from "@/hooks/inhouse/useInhouseChat";
import { useAuth } from "@/auth/AuthProvider";
import type { InhouseOrg, InhouseWorkspace } from "@/lib/inhouse/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  org: InhouseOrg;
  workspace: InhouseWorkspace;
}

export function InhouseChatTab({ org, workspace }: Props) {
  const { user } = useAuth();
  const { data: channels = [], isLoading: chLoading } = useInhouseChannels(workspace.id);
  const [activeChannelId, setActiveChannelId] = React.useState<string | undefined>();
  const activeChannel = channels.find((c) => c.id === activeChannelId) ?? channels[0];
  const { data: messages = [], isLoading: msgLoading } = useInhouseMessages(activeChannel?.id);
  const sendMessage = useSendInhouseMessage(org.id);
  const [body, setBody] = React.useState("");
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (channels[0] && !activeChannelId) setActiveChannelId(channels[0].id);
  }, [channels, activeChannelId]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!body.trim() || !activeChannel) return;
    try {
      await sendMessage.mutateAsync({
        channelId: activeChannel.id,
        workspaceId: workspace.id,
        body: body.trim(),
      });
      setBody("");
    } catch {
      toast.error("ส่งข้อความไม่สำเร็จ");
    }
  };

  if (chLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <h2 className="font-semibold">#{activeChannel?.name ?? "general"}</h2>
        {channels.length > 1 && (
          <div className="flex gap-1">
            {channels.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setActiveChannelId(ch.id)}
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  ch.id === activeChannel?.id ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                #{ch.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 py-4">
          {msgLoading ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          ) : messages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">เริ่มบทสนทนาในทีม</p>
          ) : (
            messages.map((msg) => {
              const mine = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={cn("flex gap-2", mine && "flex-row-reverse")}>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={msg.sender?.avatar_url ?? undefined} />
                    <AvatarFallback>{(msg.sender?.display_name ?? "?").slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className={cn("max-w-[75%]", mine && "text-right")}>
                    <p className="text-xs text-muted-foreground">
                      {msg.sender?.display_name ?? "Member"} ·{" "}
                      {new Date(msg.created_at).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <div
                      className={cn(
                        "mt-0.5 inline-block rounded-2xl px-3 py-2 text-sm",
                        mine ? "bg-primary text-primary-foreground" : "bg-muted",
                      )}
                    >
                      {msg.body}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="flex gap-2 border-t p-3">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="พิมพ์ข้อความ..."
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
        />
        <Button size="icon" onClick={handleSend} disabled={sendMessage.isPending || !body.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
