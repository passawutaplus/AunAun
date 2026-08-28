import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  MessageCircle,
  MessagesSquare,
  Settings,
  LogOut,
  MessageSquarePlus,
  Rocket,
} from "lucide-react";
import ManageWorkIcon from "@/components/icons/ManageWorkIcon";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import OpportunityStatusDialog from "@/components/opportunity/OpportunityStatusDialog";
import { FORUM_PATH, openBrandLineContact } from "@/lib/brandConfig";
import { signOutApp } from "@/lib/signOutApp";
import { useOpenFeedbackTicket } from "@/hooks/useOpenFeedbackTicket";
import LineMarkIcon from "@/components/icons/LineMarkIcon";
import { toast } from "sonner";

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
  const openFeedback = useOpenFeedbackTicket();
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
          <ManageWorkIcon className="w-4 h-4" /> My Studio
        </button>
        <button type="button" onClick={() => navigate("/chat")} className={item}>
          <MessageCircle className="w-4 h-4 text-primary" /> Chat
        </button>
        {!isVerified ? (
          <button type="button" onClick={() => navigate("/verify")} className={item}>
            <Rocket className="w-4 h-4 text-primary" /> Become a Creator
          </button>
        ) : null}
        <div className="my-2 border-t border-border" />
        <button type="button" onClick={openFeedback} className={item}>
          <MessageSquarePlus className="w-4 h-4 text-primary" /> ส่งฟีดแบ็ก
        </button>
        <button
          type="button"
          onClick={() => window.open(FORUM_PATH, "_blank", "noopener,noreferrer")}
          className={item}
        >
          <MessagesSquare className="w-4 h-4 text-primary" /> Community
        </button>
        <button
          type="button"
          onClick={() => {
            if (!openBrandLineContact()) {
              toast.message("กำลังเปิดช่องทางไลน์เร็วๆ นี้");
            }
          }}
          className={item}
        >
          <LineMarkIcon className="w-4 h-4 text-primary" /> ติดต่อเรา Line
        </button>
        <button type="button" onClick={() => navigate("/settings")} className={item}>
          <Settings className="w-4 h-4 text-primary" /> Setting
        </button>
        <button
          type="button"
          onClick={async () => {
            await signOutApp(queryClient);
            navigate("/");
          }}
          className={`${item} text-destructive hover:text-destructive`}
        >
          <LogOut className="w-4 h-4" /> Log Out
        </button>
      </nav>
      <OpportunityStatusDialog open={opportunityDialogOpen} onOpenChange={setOpportunityDialogOpen} />
    </>
  );
};

export default ProfileMenuCard;
