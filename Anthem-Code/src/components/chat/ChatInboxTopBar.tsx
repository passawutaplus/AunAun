import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ManageWorkIcon from "@/components/icons/ManageWorkIcon";
import NotificationBell from "@/components/notifications/NotificationBell";
import { ProfileMenuDropdown } from "@/components/ProfileMenuDropdown";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/** Full-width chat shell header — matches works-page top nav height (`h-14`). */
export function ChatInboxTopBar() {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const goProjectsHome = () => {
    localStorage.setItem("feed-mode", "projects");
    navigate("/", { state: { feedHomeReset: Date.now() } });
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 sm:px-4">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        aria-label="กลับหน้าแรก"
        title="กลับหน้าแรก"
        onClick={goProjectsHome}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <h1 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight text-foreground">
        <MessageCircle className="h-4 w-4" aria-hidden />
        Chat
      </h1>
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
        <Button
          type="button"
          variant="outline"
          className="h-8 shrink-0 gap-1 rounded-full border-primary/40 px-2.5 text-xs text-primary hover:bg-primary/5 hover:text-primary"
          onClick={() => navigate("/dashboard")}
          aria-label="My Studio"
        >
          <ManageWorkIcon className="h-3.5 w-3.5" />
          My Studio
        </Button>
        {user ? (
          <>
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
          </>
        ) : null}
      </div>
    </header>
  );
}
