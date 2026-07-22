import { useEffect, useState } from "react";
import { ChevronDown, User } from "lucide-react";
import WalletBadge from "@/components/gifting/WalletBadge";
import NotificationBell from "@/components/notifications/NotificationBell";
import ChatNavButton from "@/components/chat/ChatNavButton";
import JobsNavButton from "@/components/jobs/JobsNavButton";
import { ProfileMenuDropdown } from "@/components/ProfileMenuDropdown";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isAplus1LaunchMinimal } from "@/lib/aplus1Launch";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Stretch chip to fill remaining feed right-rail width. */
  fillRail?: boolean;
};

const ProfileButton = ({ className, fillRail = false }: Props) => {
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
      <div className={cn("flex items-center gap-1.5", fillRail && "min-w-0 flex-1", className)}>
        <div className={cn("hidden lg:flex items-center gap-1.5", fillRail && "min-w-0 flex-1")}>
          {!isAplus1LaunchMinimal() && <JobsNavButton />}
          <div
            className={cn(
              "flex items-center rounded-full glass-chip px-1 py-1",
              fillRail ? "w-full min-w-0 justify-evenly gap-0" : "gap-0.5",
            )}
          >
            <ChatNavButton />
            <NotificationBell />
          </div>
        </div>
        <Button
          onClick={() => navigate("/auth")}
          size="sm"
          className="rounded-full bg-gradient-brand text-white hover:opacity-90"
        >
          <User className="w-4 h-4 mr-1.5" /> <span className="hidden sm:inline">เข้าสู่ระบบ</span>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5", fillRail && "min-w-0 flex-1", className)}>
      <div className={cn("hidden lg:flex items-center gap-1.5", fillRail && "min-w-0 flex-1")}>
        {!isAplus1LaunchMinimal() && <JobsNavButton />}
        <div
          className={cn(
            "flex items-center rounded-full glass-chip py-1 hover:shadow-md hover:shadow-primary/20 transition-all",
            fillRail ? "w-full min-w-0 justify-evenly gap-0 px-1" : "gap-0.5 pl-1 pr-1.5",
          )}
        >
          <ChatNavButton />
          <NotificationBell />
          <ProfileMenuDropdown
            trigger={
              <button
                aria-label="โปรไฟล์"
                className="flex items-center gap-1.5 pl-0.5 pr-1 py-0.5 rounded-full hover:bg-accent/60 transition-colors"
              >
                <UserAvatar
                  src={profile?.avatar_url}
                  name={profile?.display_name}
                  username={profile?.username}
                  className="w-8 h-8"
                  fallbackClassName="text-xs"
                />
                <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
              </button>
            }
          />
        </div>
        {!isAplus1LaunchMinimal() && <WalletBadge />}
      </div>
    </div>
  );
};

export default ProfileButton;
