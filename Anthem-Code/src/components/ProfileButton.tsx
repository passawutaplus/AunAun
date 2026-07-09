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
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";

const ProfileButton = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ avatar_url: string | null; display_name: string | null } | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("avatar_url, display_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data ?? null));
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="hidden lg:flex items-center gap-1.5">
          <JobsNavButton />
          <ChatNavButton />
          <NotificationBell />
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
    <div className="flex items-center gap-1.5">
      <div className="hidden lg:flex items-center gap-1.5">
        <JobsNavButton />
        <ChatNavButton />
        <NotificationBell />
        <WalletBadge />
      </div>
      <ProfileMenuDropdown
        trigger={
          <button
            aria-label="โปรไฟล์"
            className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full glass-chip hover:shadow-md hover:shadow-primary/20 transition-all"
          >
            <UserAvatar
              src={profile?.avatar_url}
              name={profile?.display_name ?? "P"}
              className="w-8 h-8"
              fallbackClassName="text-sm"
            />
            <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
          </button>
        }
      />
    </div>
  );
};

export default ProfileButton;
