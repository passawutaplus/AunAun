import { MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useChatInboxBadgeCount } from "@/hooks/useChat";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

const ChatNavButton = ({ className }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: badgeCount = 0 } = useChatInboxBadgeCount();

  const label = `แชท${badgeCount > 0 ? ` (${badgeCount} รายการใหม่)` : ""}`;

  return (
    <button
      type="button"
      onClick={() => navigate(user ? "/chat" : "/auth?redirect=/chat")}
      aria-label={label}
      title="แชท"
      className={cn(
        "relative inline-flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
        className,
      )}
    >
      <MessageCircle className="w-5 h-5" />
      {user && badgeCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-semibold flex items-center justify-center leading-none">
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </button>
  );
};

export default ChatNavButton;
