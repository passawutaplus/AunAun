import { useEffect, useState } from "react";
import { ChevronDown, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ChatNavButton from "@/components/chat/ChatNavButton";
import NotificationBell from "@/components/notifications/NotificationBell";
import { ProfileMenuDropdown } from "@/components/ProfileMenuDropdown";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { navigateToAuth } from "@/lib/authRedirect";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/** Chat / notifications / profile — or homepage-style login when guest. */
export function HeaderAccountActions({ className }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{
    avatar_url: string | null;
    display_name: string | null;
    username: string | null;
  } | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("avatar_url, display_name, username")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data ?? null));
  }, [user]);

  if (!user) {
    return (
      <Button
        type="button"
        size="sm"
        onClick={() => navigateToAuth(navigate)}
        className={cn("rounded-full bg-gradient-brand text-white hover:opacity-90 shrink-0", className)}
      >
        <User className="mr-1.5 h-4 w-4" />
        เข้าสู่ระบบ
      </Button>
    );
  }

  return (
    <div className={cn("flex shrink-0 items-center gap-1 sm:gap-2", className)}>
      <ChatNavButton />
      <NotificationBell />
      <ProfileMenuDropdown
        trigger={
          <button
            type="button"
            aria-label="โปรไฟล์"
            className="flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-1 transition-colors hover:bg-accent/60"
          >
            <UserAvatar
              src={profile?.avatar_url}
              name={profile?.display_name}
              username={profile?.username}
              className="h-8 w-8"
              fallbackClassName="text-xs"
            />
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        }
      />
    </div>
  );
}
