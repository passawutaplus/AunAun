import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutGrid,
  MessageCircle,
  MessagesSquare,
  Settings,
  LogOut,
  Rocket,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import OpportunityStatusDialog from "@/components/opportunity/OpportunityStatusDialog";
import { FORUM_PATH } from "@/lib/brandConfig";
import { signOutApp } from "@/lib/signOutApp";

type ProfileMenuCardProps = {
  opportunityOpen?: boolean;
  onOpportunityOpenChange?: (open: boolean) => void;
};

const ProfileMenuCard = ({ opportunityOpen, onOpportunityOpenChange }: ProfileMenuCardProps = {}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const isVerified = !!(profile as { is_verified?: boolean } | null | undefined)?.is_verified;
  const opportunityDialogOpen = opportunityOpen ?? false;
  const setOpportunityDialogOpen = onOpportunityOpenChange ?? (() => undefined);

  const item =
    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-foreground hover:bg-accent hover:text-foreground transition-colors text-left";

  return (
    <>
      <nav
        aria-label="เมนูโปรไฟล์"
        className="rounded-3xl glass-panel p-3 space-y-0.5"
      >
        <button type="button" onClick={() => navigate("/dashboard")} className={item}>
          <LayoutGrid className="w-4 h-4 text-primary" /> จัดการงาน
        </button>
        <button type="button" onClick={() => navigate("/chat")} className={item}>
          <MessageCircle className="w-4 h-4 text-primary" /> Chat
        </button>
        {!isVerified ? (
          <button type="button" onClick={() => navigate("/hire/start")} className={item}>
            <Rocket className="w-4 h-4 text-primary" /> Become a Creator
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => window.open(FORUM_PATH, "_blank", "noopener,noreferrer")}
          className={item}
        >
          <MessagesSquare className="w-4 h-4 text-primary" /> ชุมชน
        </button>

        <div className="my-2 border-t border-border" />
        <button type="button" onClick={() => navigate("/settings")} className={item}>
          <Settings className="w-4 h-4 text-primary" /> ตั้งค่า
        </button>
        <button
          type="button"
          onClick={async () => {
            await signOutApp(queryClient);
            navigate("/");
          }}
          className={`${item} text-destructive hover:text-destructive`}
        >
          <LogOut className="w-4 h-4" /> ออกจากระบบ
        </button>
      </nav>
      <OpportunityStatusDialog open={opportunityDialogOpen} onOpenChange={setOpportunityDialogOpen} />
    </>
  );
};

export default ProfileMenuCard;
