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
import { isAplus1GiftEconomyEnabled, isAplus1LaunchMinimal } from "@/lib/aplus1Launch";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Stretch chip to fill remaining feed right-rail width. */
  fillRail?: boolean;
  /** Chat, bell, and profile only — for the scrolled feed bar. */
  accountOnly?: boolean;
};

const ProfileButton = ({ className, fillRail = false, accountOnly = false }: Props) => {
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

  const accountMenu = (
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
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
        </button>
      }
    />
  );

  if (accountOnly) {
    if (!user) {
      return (
        <Button
          type="button"
          onClick={() => navigate("/auth")}
          size="sm"
          className={cn("rounded-full bg-gradient-brand text-white hover:opacity-90", className)}
        >
          <User className="mr-1.5 h-4 w-4" />
          เข้าสู่ระบบ
        </Button>
      );
    }
    return (
      <div className={cn("flex shrink-0 items-center gap-0.5", className)}>
        <ChatNavButton />
        <NotificationBell />
        {accountMenu}
      </div>
    );
  }

  if (!user) {
    return (
      <div className={cn("flex items-center gap-1.5", fillRail && "min-w-0 flex-1", className)}>
        <div className={cn("hidden lg:flex items-center gap-1.5", fillRail && "min-w-0 flex-1")}>
          <JobsNavButton />
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
        <JobsNavButton />
        <div
          className={cn(
            "flex items-center rounded-full glass-chip py-1 hover:shadow-md hover:shadow-primary/20 transition-all",
            fillRail ? "w-full min-w-0 justify-evenly gap-0 px-1" : "gap-0.5 pl-1 pr-1.5",
          )}
        >
          <ChatNavButton />
          <NotificationBell />
          {accountMenu}
        </div>
        {isAplus1GiftEconomyEnabled() && !isAplus1LaunchMinimal() && <WalletBadge />}
      </div>
    </div>
  );
};

export default ProfileButton;
