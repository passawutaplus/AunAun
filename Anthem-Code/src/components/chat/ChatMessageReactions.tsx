import { useEffect, useState } from "react";
import { SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CHAT_REACTION_EMOJIS,
  fetchMessageReactions,
  toggleMessageReaction,
  type ReactionTally,
} from "@/lib/chatMessageReactions";

type Props = {
  messageId: string;
  userId?: string;
};

export function ChatMessageReactions({ messageId, userId }: Props) {
  const [tallies, setTallies] = useState<ReactionTally[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    void fetchMessageReactions(messageId, userId).then(setTallies);
  }, [messageId, userId]);

  if (!userId) return null;

  const onToggle = async (emoji: string, mine: boolean) => {
    await toggleMessageReaction({
      messageId,
      userId,
      emoji,
      currentlyMine: mine,
    });
    setTallies(await fetchMessageReactions(messageId, userId));
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      {tallies.map((t) => (
        <button
          key={t.emoji}
          type="button"
          onClick={() => void onToggle(t.emoji, t.mine)}
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px]",
            t.mine ? "border-primary/40 bg-primary/10" : "border-border bg-secondary/60",
          )}
        >
          <span>{t.emoji}</span>
          <span className="tabular-nums text-muted-foreground">{t.count}</span>
        </button>
      ))}
      <div className="relative">
        <button
          type="button"
          aria-label="เพิ่มอีโมจิ"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <SmilePlus className="w-3.5 h-3.5" />
        </button>
        {open ? (
          <div className="absolute bottom-full left-0 mb-1 z-20 flex gap-0.5 rounded-full border border-border bg-card p-1 shadow-md">
            {CHAT_REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="h-7 w-7 rounded-full text-sm hover:bg-secondary"
                onClick={() =>
                  void onToggle(emoji, tallies.some((t) => t.emoji === emoji && t.mine))
                }
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
